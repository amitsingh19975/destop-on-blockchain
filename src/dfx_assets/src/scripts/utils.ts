import { isRef, Ref } from 'vue';
import * as htmlToImage from 'html-to-image';
import { IContextMenuValue } from '../stores/contextMenu';
import useIcons from '../stores/icons';
import useLocalClipboard from '../stores/localClipboard';
import {
    addChild, IDirectory, IFile, IFileSystem, makeFile,
} from './fs';
import { copyFsNode } from './fs/commands';
import { notifyNeg } from './notify';
import { readFile, writeFile } from './storage';
import {
    IPosition, MediaType, PIDType, PositionKindType, PositionType, ShapeType,
} from './types';
import useProcess from '../stores/process';

export const isDef = <T>(val: T): val is NonNullable<T> => (typeof val !== 'undefined' && val !== null);

export type GenericObjType = Record<string | number | symbol, unknown>;

export const checkKeys = <T>(
    data: Object,
    keys: (keyof T)[],
): boolean => keys.every((key) => key in data);

export type PointerToType<T> = {
    value: T;
};

export const HTMLElementFromVueRef = (el: unknown): HTMLElement | HTMLElement[] | undefined => {
    if (typeof el === 'undefined' || el === null) return undefined;
    if (el instanceof HTMLElement) return el;
    if (Array.isArray(el)) {
        if (el.length === 0) return undefined;
        const res = el
            .map(HTMLElementFromVueRef)
            .filter((e) => typeof e !== 'undefined') as HTMLElement[];
        if (res.length === 0) return undefined;
        return res;
    }
    if (typeof el === 'object' && '$el' in el) {
        return HTMLElementFromVueRef((el as { $el: unknown }).$el);
    }
    return undefined;
};

const windowPositionHelper = (
    { x, y }: IPosition,
    { width, height }: ShapeType,
    { width: vW, height: vH }: ShapeType,
): IPosition & ShapeType => ({
    x,
    y,
    width: Math.min(vW - x, width),
    height: Math.min(vH - y, height),
});

const positionKind: PositionKindType[] = [
    'centre',
    'centre-left',
    'centre-right',
    'centre-top',
    'centre-bottom',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
];

const coordinatesFromPosition = (
    pos: PositionKindType,
    { width: w, height: h }: ShapeType,
    { width: vW, height: vH }: ShapeType,
): IPosition => {
    switch (pos) {
        case 'bottom-left':
            return { x: 0, y: vH - h };
        case 'bottom-right':
            return { x: vW - w, y: vH - h };
        case 'top-left':
            return { x: 0, y: 0 };
        case 'top-right':
            return { x: vW - w, y: 0 };
        case 'centre-left':
            return { x: 0, y: (vH - h) / 2 };
        case 'centre-right':
            return { x: vW - w, y: (vH - h) / 2 };
        case 'centre-top':
            return { x: (vW - w) / 2, y: 0 };
        case 'centre-bottom':
            return { x: (vW - w) / 2, y: vH - h };
        case 'centre':
            return { x: (vW - w) / 2, y: (vH - h) / 2 };
        default:
            return { x: 0, y: 0 };
    }
};

export const windowPosition = (
    pos: PositionType,
    size: ShapeType,
    viewPortSize: ShapeType,
): IPosition & ShapeType => {
    let wPos = {
        x: 0,
        y: 0,
    };

    if (typeof pos === 'string') {
        wPos = coordinatesFromPosition(
            positionKind.includes(pos) ? pos : 'centre',
            size,
            viewPortSize,
        );
    } else if (Array.isArray(pos)) {
        const [x, y] = pos;
        wPos.x = x;
        wPos.y = y;
    } else {
        wPos = { ...(pos as IPosition) };
    }
    const temp = windowPositionHelper(wPos, size, viewPortSize);
    return temp;
};

export const randInt = (
    min: number,
    max: number,
) => Math.floor(Math.random() * (max - min + 1) + min);

const randSign = () => (Math.random() >= 0.5 ? -1 : 1);

export const addVariationToPosition = (pos: IPosition): IPosition => ({
    x: pos.x + randSign() * randInt(3, 8),
    y: pos.y + randSign() * randInt(3, 8),
});

const URI_REGEX = /^(data:[A-Za-z]+\/)/;
const URL_REGEX = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi;

export const isURI = (str: string) => URI_REGEX.test(str);
export const isLink = (str: string) => URL_REGEX.test(str);
export const typeFromURI = (str: string): string | undefined => {
    if (!isURI(str)) return undefined;
    return str.substring(str.indexOf(':') + 1, str.indexOf(';'));
};

export const capitalize = (str: string) => {
    const temp = str.trim();
    return temp[0].toUpperCase() + temp.substring(1).toLowerCase();
};

export const getDomHW = (el: HTMLElement, type: 'width' | 'height', computed = false) => {
    if (computed) {
        const temp = el.style[type].match(/(\d+)/);
        if (temp) {
            const num = parseInt(temp[0], 10);
            return Number.isNaN(num) ? 0 : num;
        }
        return 0;
    }
    const { width, height } = el.getBoundingClientRect();
    if (type === 'height') return height === 0 ? el.clientHeight : height;
    return width === 0 ? el.clientWidth : width;
};

export const elementShape = (el: unknown, computed = false): ShapeType | ShapeType[] | undefined => {
    const temp = HTMLElementFromVueRef(el);
    if (!isDef(temp)) return undefined;
    const fn = (elem: HTMLElement) => ({
        width: getDomHW(elem, 'width', computed),
        height: getDomHW(elem, 'height', computed),
    } as ShapeType);

    if (Array.isArray(temp)) return temp.map(fn);
    return fn(temp);
};

export const getCaretCharacterOffsetWithin = (element?: HTMLElement): number => {
    if (!isDef(element)) return 0;
    let caretOffset = 0;
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || window;
    const sel = win.getSelection();
    if (isDef(sel) && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
};

export const isInputElement = (element?: unknown): element is HTMLInputElement => element instanceof HTMLInputElement;
export const isTextAreaElement = (element?: unknown): element is HTMLTextAreaElement => element instanceof HTMLTextAreaElement;

export const isCustomInput = (el?: unknown): el is HTMLElement => {
    if (typeof el !== 'object') return false;
    if (!(el instanceof HTMLElement)) return false;
    return el.hasAttribute('vinput') && el.isContentEditable;
};

export const getCustomInputKind = (el?: unknown): string | null => {
    if (!isCustomInput(el)) return null;
    return el.getAttribute('vinput');
};

export const isEditable = (el?: unknown): boolean => {
    if (!isDef(el)) return false;
    if (!(el instanceof HTMLElement || el instanceof Document || el instanceof Window)) return false;
    if (('isContentEditable' in el) && el.isContentEditable) return true;
    if ('hasAttribute' in el && el.hasAttribute('vinput')) return true;
    if (document.designMode === 'on') return true;
    if (isInputElement(el) || isTextAreaElement(el)) return !el.disabled;
    return false;
};

export const CLIPBOARD_IDS = {
    filesystem: 'FSNODE',
} as const;

export const clipboardPasteFsNode = (
    curDir: Ref<IDirectory> | IDirectory,
    options?: {
        force?: boolean,
        renameIfCollide?: boolean,
        before?: () => void,
        after?: (err?: Error) => void
        icon?: string,
    },
): IContextMenuValue => ({
    icon: options?.icon || useIcons().qIcon('paste'),
    showCondition: () => useLocalClipboard().has(CLIPBOARD_IDS.filesystem),
    action: async () => {
        const {
            force = false,
            renameIfCollide = false,
            before = (() => void 0),
            after = (err?: Error) => notifyNeg(err),
        } = options || {};

        before();
        const data = (await useLocalClipboard().read(CLIPBOARD_IDS.filesystem, 'json')) as unknown as IFileSystem;
        const temp = await copyFsNode(isRef(curDir) ? curDir.value : curDir, data, { force, renameIfCollide });
        after(temp);
    },
});

export const isBlob = (blob: unknown): blob is Blob => blob instanceof Blob;

export const getNodeRoot = (node: Node): Document | ShadowRoot | null => {
    if (typeof node.getRootNode !== 'function') {
        let temp = node;
        while (temp.parentNode) temp = temp.parentNode;

        return temp === document ? document : null;
    }

    const root = node.getRootNode();
    const croot = node.getRootNode({ composed: true });

    return (root !== document && croot !== document) ? null : (root as Document | ShadowRoot);
};

export const getParentElement = (child?: HTMLElement | null): HTMLElement | null => {
    if (!isDef(child)) return null;
    return child.parentElement;
};

type AcceptableMIMEType = 'text' | 'image' | 'video' | 'audio';

export const acceptableMIMEType = (mime: string): boolean => {
    if (mime.indexOf('text') >= 0) return true;
    if (mime.indexOf('image') >= 0) return true;
    if (mime.indexOf('video') >= 0) return true;
    if (mime.indexOf('audio') >= 0) return true;
    return false;
};

export const isMIMEType = (mime: string, type: AcceptableMIMEType): boolean => {
    if (mime.indexOf(type) >= 0) return true;
    return false;
};

const invokeMatchCallback = async (data: File, callback?: (data: File) => Promise<void> | void) => {
    const res = callback?.(data);
    if (res instanceof Promise) await res;
};

export const matchMIMEType = async (file: File, {
    text, image, video, unknown, audio,
}: {
    text?: (text: File) => void,
    image?: (image: File) => void,
    video?: (video: File) => void,
    audio?: (audio: File) => void,
    unknown?: (data: File) => void;
}) => {
    const { type } = file;
    if (type.indexOf('text') >= 0) {
        await invokeMatchCallback(file, text);
    } else if (type.indexOf('image') >= 0) {
        await invokeMatchCallback(file, image);
    } else if (type.indexOf('video') >= 0) {
        await invokeMatchCallback(file, video);
    } else if (type.indexOf('audio') >= 0) {
        await invokeMatchCallback(file, audio);
    } else {
        await invokeMatchCallback(file, unknown);
    }
};

const dataURItoBlob = async (dataURI: string) => {
    const byteString = window.atob(dataURI.split(',')[1]);

    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    const arrayBuffer = new ArrayBuffer(byteString.length);
    const _ia = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i += 1) {
        _ia[i] = byteString.charCodeAt(i);
    }

    const dataView = new DataView(arrayBuffer);
    const blob = new Blob([dataView], { type: mimeString });
    return blob;
};

export const saveMedia = async (node: IFile, src: Blob | string, type: string) => {
    if (typeof src === 'string') {
        if (isURI(src)) {
            const blob = await dataURItoBlob(src);
            await writeFile<MediaType>({ node, data: blob });
        } else {
            await writeFile<MediaType>({
                node,
                data: {
                    data: src,
                    type,
                },
            });
        }
        return;
    }
    await writeFile<MediaType>({ node, data: src });
};

export const saveImage = (node: IFile, src: Blob | string, type = 'image/png') => saveMedia(node, src, type);
export const saveVideo = (node: IFile, src: Blob | string, type = 'video/mp4') => saveMedia(node, src, type);
export const saveAudio = (node: IFile, src: Blob | string, type = 'audio/mp3') => saveMedia(node, src, type);

export const readAsDataURL = async (f: Blob): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = (e) => {
            if (isDef(e.target)) resolve(e.target.result as string);
            else {
                notifyNeg('unable to read file');
            }
        };
        reader.readAsDataURL(f);
    });
};

const createObjectURL = (blob: Blob | MediaSource): string | undefined => {
    // @ts-ignore
    if (isDef(window.webkitURL)) return window.webkitURL.createObjectURL(blob);
    // @ts-ignore
    if (isDef(window.URL) && isDef(window.URL.createObjectURL)) return window.URL.createObjectURL(blob);
    return undefined;
};

export const loadMedia = async (node: IFile, { matchType, asBase64 = false }: {
    matchType?: AcceptableMIMEType,
    asBase64?: boolean,
}): Promise<{ data: string, type: string } | Error> => {
    const data = await readFile<MediaType>({ node });
    if (!isDef(data)) return new Error('[loadMedia]: media file does not exist!');
    if (isDef(matchType) && !isMIMEType(data.type, matchType)) {
        return new Error('[loadMedia]: mime type does not match');
    }

    if (data instanceof Blob) {
        return {
            data: asBase64 ? await readAsDataURL(data) : (createObjectURL(data) || ''),
            type: data.type,
        };
    }
    return data;
};

export const saveFileToAccount = async (file: File, curDir: IDirectory) => {
    try {
        const createFile = (f: File) => {
            const { name, size } = f;
            return makeFile({
                name,
                size,
                useNameToGetExt: true,
            });
        };

        await matchMIMEType(file, {
            text: async (f) => {
                const txt = await f.text();
                const node = createFile(f);
                await writeFile<string>({ node, data: txt });
                addChild(curDir, node);
            },
            image: async (f) => {
                const node = createFile(f);
                await saveImage(node, f);
                addChild(curDir, node);
            },
            video: async (f) => {
                const node = createFile(f);
                await saveVideo(node, f);
                addChild(curDir, node);
            },
            audio: async (f) => {
                const node = createFile(f);
                await saveAudio(node, f);
                addChild(curDir, node);
            },
        });
    } catch (e) {
        notifyNeg(e);
    }
};

export const validateImage = async (url: unknown): Promise<boolean> => new Promise((resolve, reject) => {
    if (typeof url !== 'string') {
        resolve(false);
        return;
    }
    try {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    } catch (e) {
        reject(e);
    }
});

const processSnapshotPromiseRegistry = {} as Record<PropertyKey, Promise<string | undefined>>;

export const processSnapshot = async (pid: PIDType): Promise<string | undefined> => {
    const proc = useProcess().process[pid];
    if (!isDef(proc)) return undefined;

    const { el } = proc;

    if (!isDef(el)) return undefined;

    if (pid in processSnapshotPromiseRegistry) return processSnapshotPromiseRegistry[pid];
    // const func = JSONFn.stringify((elem: HTMLElement): Promise<string> => htmlToImage.toSvg(elem));
    // const res = await processOnThread(pid, func, el) as string;
    const promise = new Promise<string | undefined>((resolve) => {
        try {
            htmlToImage.toSvg(el)
                .then((res) => {
                    resolve(res);
                    if (pid in processSnapshotPromiseRegistry) {
                        delete processSnapshotPromiseRegistry[pid];
                    }
                });
        } catch {
            resolve(undefined);
            if (pid in processSnapshotPromiseRegistry) {
                delete processSnapshotPromiseRegistry[pid];
            }
        }
    });

    processSnapshotPromiseRegistry[pid] = promise;
    return promise;
};

export const div = (a: number, b: number) => {
    const na = Math.floor(a);
    const nb = Math.floor(b);
    return {
        q: Math.floor(na / nb),
        r: na % nb,
    };
};

export const formatTime = (time: number, {
    hours = false,
    minutes = true,
    allowOverflow = false,
    auto = false,
}: {
    hours?: boolean,
    minutes?: boolean,
    allowOverflow?: boolean,
    auto?: boolean,
}): string => {
    const helper = (t: number) => (t < 10 ? `0${t}` : `${t}`);
    const { q: tmin, r: sec } = div(time, 60);
    const { q: hr, r: min } = div(tmin, 60);
    if (auto) {
        if (hr !== 0) return `${helper(hr)}:${helper(min)}:${helper(sec)}`;
        if (min !== 0) return `${helper(allowOverflow ? tmin : min)}:${helper(sec)}`;
    } else {
        if (hours) return `${helper(hr)}:${helper(min)}:${helper(sec)}`;
        if (minutes) return `${helper(allowOverflow ? tmin : min)}:${helper(sec)}`;
    }
    return `${helper(allowOverflow ? time : sec)}`;
};

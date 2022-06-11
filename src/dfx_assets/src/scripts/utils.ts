import { isRef, Ref } from 'vue';
import * as htmlToImage from 'html-to-image';
import { IContextMenuValue } from '../stores/contextMenu';
import useIcons from '../stores/icons';
import useLocalClipboard from '../stores/localClipboard';
import {
    IDirectory, IFileSystem,
} from './fs';
import { copyFsNode } from './fs/commands';
import { notifyNeg } from './notify';
import {
    IPosition, PIDType, PositionKindType, PositionType, ShapeType,
} from './types';
import useProcess from '../stores/process';
import { isDef } from './basic';

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

export const didTimeExpired = (timer: number, unit: 'min' | 'sec' | 'hour', currentTime: number) => {
    const factor = (unit === 'min' ? 60 : (unit === 'hour' ? 60 * 60 : 1)) * 1000;
    return (Date.now() - currentTime) > timer * factor;
};

import { isDef } from './basic';
import {
    IFile, IDirectory, makeFile, addChild,
} from './fs';
import { notifyNeg } from './notify';
import { writeFile, readFile } from './storage';
import { MediaType } from './types';
import { isURI } from './utils';

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
    const data = await readFile<'generic', MediaType>({ node });
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

export const validateImage = async (url: unknown): Promise<boolean> => new Promise((resolve) => {
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
        resolve(false);
    }
});

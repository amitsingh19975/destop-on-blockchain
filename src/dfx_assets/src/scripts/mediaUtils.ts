import useUser from '../stores/user';
import { isDef } from './basic';
import { CanisterCommitCallbackType } from './canisterHelper';
import {
    IFile, IDirectory, makeFile,
} from './fs';
import { notifyNeg } from './notify';
import { writeFile, readFile, removeFSNode } from './storage';
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
    await callback?.(data);
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
    let payload: Blob | MediaType | string = src;
    if (typeof src === 'string') {
        if (isURI(src)) {
            const blob = await dataURItoBlob(src);
            payload = blob;
        } else {
            payload = {
                data: src,
                type,
            };
        }
        return;
    }
    const handler: CanisterCommitCallbackType = (args) => {
        if ('error' in args) throw args.error;
    };
    await new Promise<void>((resolve, reject) => {
        writeFile<MediaType | Blob | string>({
            node,
            data: payload,
            canisterCommitCallback: (args) => {
                if ('error' in args) {
                    reject(args.error);
                    return;
                }
                resolve();
            },
            localCommitCompletionCallback: handler,
            mode: 'overwrite',
            lazyCommit: false,
        });
    });
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
    let tempNode: IFile | undefined;
    try {
        const node = makeFile({
            name: file.name,
            size: file.size,
            useNameToGetExt: true,
            _isCommitted: false,
        }, curDir);
        tempNode = node;
        const handler: CanisterCommitCallbackType = (args) => {
            if ('error' in args) throw args.error;
        };
        await matchMIMEType(file, {
            text: async (f) => {
                const txt = await f.text();
                await new Promise<void>((resolve, reject) => {
                    writeFile<MediaType | Blob | string>({
                        node,
                        data: txt,
                        canisterCommitCallback: (args) => {
                            if ('error' in args) {
                                reject(args.error);
                                return;
                            }
                            resolve();
                        },
                        localCommitCompletionCallback: handler,
                        mode: 'overwrite',
                        lazyCommit: false,
                    });
                });
            },
            image: async (f) => {
                await saveImage(node, f);
            },
            video: async (f) => {
                await saveVideo(node, f);
            },
            audio: async (f) => {
                await saveAudio(node, f);
            },
        });
        node._isCommitted = true;
    } catch (e) {
        notifyNeg(e);
        if (isDef(tempNode)) removeFSNode(tempNode);
    }
    await useUser().updateFileSystem();
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

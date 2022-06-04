import CacheManager, {
    CanisterCommitCallbackType, ErrCallbackType, LocalCommitCompletionCallbackType, WriteType,
} from './cacheManager';
import { AcceptableType } from './canisterHelper';
import {
    IDirectory, IFile, makeFileUsingPath, Path, propogateSize,
} from './fs';

import { addCanisterEvent, removeCanisterEvent } from './events';

const gCacheManager: CacheManager = new CacheManager();

interface IOpenFileArgs<T extends AcceptableType> {
    def: T,
    root?: IDirectory,
    curDir?: IDirectory,
    path?: string | string[],
    node?: IFile,
    create?: boolean,
    errCallback?: ErrCallbackType,
}

interface IReadFileArgs {
    node?: IFile,
    uid?: string,
    errCallback?: ErrCallbackType,
    createIfRequired?: boolean,
    def?: AcceptableType,
}

interface IWriteFileArgs<T extends AcceptableType> extends IReadFileArgs {
    mode?: WriteType,
    data: T,
    lazy?: boolean,
    timeout?: number,
    errCallback?: ErrCallbackType,
    canisterCommitCallback?: CanisterCommitCallbackType,
    localCommitCompletionCallback?: LocalCommitCompletionCallbackType,
}

export const readFile = async <T extends AcceptableType>(
    {
        node, uid, errCallback, createIfRequired, def,
    }: IReadFileArgs,
): Promise<T | undefined> => {
    const tempUID = node?._uid || uid;
    if (typeof tempUID === 'undefined') {
        errCallback?.(new Error('[readFile]: unknown file; please provide a node or a uid'));
        return undefined;
    }
    return gCacheManager.get(node?.name || '?', tempUID, { errCallback, createIfRequired, def }) as Promise<T | undefined>;
};

export const writeFile = async <T extends AcceptableType>(
    {
        node, uid, errCallback, data, mode,
        lazy, timeout, canisterCommitCallback, localCommitCompletionCallback,
    }: IWriteFileArgs<T>,
): Promise<void> => {
    const tempUID = node?._uid || uid;
    if (typeof tempUID === 'undefined') {
        errCallback?.(new Error('[writeFile]: unknown file; please provide a node or a uid'));
        return;
    }

    gCacheManager.set(node?.name || '?', tempUID, data, {
        mode,
        lazy,
        timeout,
        canisterCommitCallback,
        localCommitCompletionCallback,
    }).then((size) => propogateSize(size, node));
};

export const openFile = async <T extends AcceptableType>(
    args: IOpenFileArgs<T>,
): Promise<IFile | undefined> => {
    const {
        node, root, curDir, path, errCallback, def,
        create,
    } = args;
    if (typeof node === 'undefined' && typeof path === 'undefined') {
        errCallback?.(new Error('[readFile]: unknown file; please provide a node'));
        return undefined;
    }

    let res = node;

    if (path && !node) {
        res = Path.fsFromPath('File', path, { curDir, root });
        if (!res && create) {
            res = makeFileUsingPath(path, { curDir, root });
            writeFile<T>({ node: res, errCallback, data: def });
        }
    }

    return res;
};

export const commitAll = async (
    errCallback?: ErrCallbackType,
) => gCacheManager.commitAll(errCallback);

export const forceCommit = async (
    uid: string,
    errCallback?: ErrCallbackType,
) => gCacheManager.forceCommit(uid, errCallback);

export { addCanisterEvent, removeCanisterEvent };

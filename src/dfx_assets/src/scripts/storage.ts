import { CacheManager, CanisterAssetCommitCallbackType, LocalAssetCommitCallbackType } from './cacheManager';
import { AcceptableType, Type, UIDType } from './canisterHelper';
import {
    IDirectory, IFile, makeFileUsingPath, Path, propogateSize,
} from './fs';

type ErrorCallbackType = (error: unknown) => void;

export type WriteType =
    'append'
    | 'overwrite'
    | 'prepend';

interface ICommitCallbacks {
    canisterCommitCallback?: CanisterAssetCommitCallbackType,
    localCommitCompletionCallback?: LocalAssetCommitCallbackType,
}

interface IOpenFileArgs<T extends Type> extends ICommitCallbacks {
    type?: T,
    root?: IDirectory,
    curDir?: IDirectory,
    path?: string | string[],
    node?: IFile,
    createIfRequired?: boolean,
}

interface IReadFileArgs<T extends Type> extends ICommitCallbacks {
    node?: IFile,
    uid?: string,
    createIfRequired?: boolean,
    type?: T,
}

interface IWriteFileArgs<T extends AcceptableType> extends ICommitCallbacks {
    node?: IFile,
    uid?: string,
    mode?: WriteType,
    data: T,
}

export const readFile = async <T extends Type, R = unknown>(
    {
        node, uid, createIfRequired, type,
        localCommitCompletionCallback, canisterCommitCallback,
    }: IReadFileArgs<T>,
) => {
    const tempUID = node?._uid || uid;
    if (typeof tempUID === 'undefined') {
        localCommitCompletionCallback?.({ error: new Error('[readFile]: unknown file; please provide a node or a uid') });
        return undefined;
    }
    try {
        return CacheManager.get<T, R>(tempUID, node?.name || '?', {
            createIfRequired,
            type,
            assetCommitCallbacks: {
                localCallback: localCommitCompletionCallback,
                canisterCallback: canisterCommitCallback,
            },
        });
    } catch (e) {
        if (localCommitCompletionCallback) localCommitCompletionCallback({ error: e });
        else throw e;
    }
    return undefined;
};

export const writeFile = async <T extends AcceptableType>(
    {
        node, uid, data, mode, canisterCommitCallback, localCommitCompletionCallback,
    }: IWriteFileArgs<T>,
): Promise<void> => {
    const tempUID = node?._uid || uid;
    if (typeof tempUID === 'undefined') {
        canisterCommitCallback?.({ error: new Error('[writeFile]: unknown file; please provide a node or a uid') });
        return;
    }

    CacheManager.put(tempUID, node?.name || '?', data, {
        assetCommitCallbacks: {
            localCallback: localCommitCompletionCallback,
            canisterCallback: canisterCommitCallback,
        },
        sizeCallback: (size) => propogateSize(size, node),
        mode,
    });
};

export const openFile = async <T extends Type, R = unknown>(
    args: IOpenFileArgs<T>,
): Promise<IFile | undefined> => {
    const {
        node, root, curDir, path, type,
        createIfRequired, localCommitCompletionCallback, canisterCommitCallback,
    } = args;
    if (typeof node === 'undefined' && typeof path === 'undefined') {
        localCommitCompletionCallback?.({ error: new Error('[readFile]: unknown file; please provide a node') });
        return undefined;
    }

    let res = node;

    if (path && !node) {
        res = Path.fsFromPath('File', path, { curDir, root });
        if (!res && createIfRequired) {
            res = makeFileUsingPath(path, { curDir, root });
            readFile<T, R>({
                node: res, type, createIfRequired: true, localCommitCompletionCallback, canisterCommitCallback,
            });
        }
    }

    return res;
};

export const commitAll = async (
    errCallback?: ErrorCallbackType,
) => CacheManager.commitAllIfDataIsDirty(errCallback);

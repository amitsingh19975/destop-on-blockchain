import { isDef } from './basic';
import { CacheManager, LocalCommitCallbackType } from './cacheManager';
import {
    AcceptableType, CanisterCommitCallbackType, Type,
} from './canisterHelper';
import {
    IDirectory, IFile, IFileSystem, isDir, isFile, makeFileUsingPath, Path, propogateSize,
} from './fs';
import { makeFsId } from './fs/utils';
import { ItemCompletionCallbackType } from './types';

export type WriteType =
    'append'
    | 'overwrite'
    | 'prepend';

interface ICommitCallbacks {
    canisterCommitCallback?: CanisterCommitCallbackType,
    localCommitCompletionCallback?: LocalCommitCallbackType,
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
    lazyCommit?: boolean,
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
        return CacheManager.getAsset<T, R>(tempUID, node?.name || '?', {
            createIfRequired,
            type,
            commitCallbacks: {
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
        lazyCommit,
    }: IWriteFileArgs<T>,
): Promise<void> => {
    const tempUID = node?._uid || uid;
    if (typeof tempUID === 'undefined') {
        canisterCommitCallback?.({ error: new Error('[writeFile]: unknown file; please provide a node or a uid') });
        return;
    }

    CacheManager.putAsset(tempUID, node?.name || '?', data, {
        commitCallbacks: {
            localCallback: localCommitCompletionCallback,
            canisterCallback: canisterCommitCallback,
        },
        sizeCallback: (size) => propogateSize(size, node),
        mode,
        lazyCommit,
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

export const commitAll = async (args?: {
    errorCallback?: (e: unknown) => void,
    itemCompletionCallback?: ItemCompletionCallbackType,
}) => CacheManager.commitAllIfDataIsDirty(args);

export const removeFSNode = async (node: IFileSystem) => {
    const parent = node.parent as IDirectory | undefined;

    if (isFile(node)) {
        await CacheManager.remove('asset', node._uid);
    } else if (isDir(node)) {
        const promises = [] as Promise<void>[];
        Object.values(node._children).forEach((n) => {
            promises.push(removeFSNode(n));
        });
        await Promise.all(promises);
    }

    if (!isDef(parent)) return;
    const id = makeFsId(node);
    node.parent = undefined;

    if (id in parent._children) {
        delete parent._children[id];
    }
};

import { uid } from 'quasar';
import { checkKeys, GenericObjType, isDef } from '../basic';
import {
    getFileComponent,
    IComponent,
    IFileComponent,
    makeComponents,
    makeFsId,
} from './utils';

export type NodeKind = 'Dir' | 'File';

export interface IFileSystem {
    _uid: Readonly<string>;
    name: string;
    size: number;
    parent?: IFileSystem;
    _nodeKind: Readonly<NodeKind>;
    _isCommitted: boolean;
}

export interface IFile extends IFileSystem {
    ext: string;
    stem: string;
    _nodeKind: 'File';
}

export interface IDirectory extends IFileSystem {
    _children: Record<string, IFileSystem>;
    _isRoot: Readonly<boolean>;
    _nodeKind: 'Dir';
}

export const isDir = (node: IFileSystem): node is IDirectory => {
    if (node._nodeKind === 'Dir') return true;
    return false;
};

export const isFile = (node: IFileSystem): node is IFile => {
    if (node._nodeKind === 'File') return true;
    return false;
};

export const asDir = (node: IFileSystem): IDirectory | undefined => {
    if (node._nodeKind === 'Dir') return node as IDirectory;
    return undefined;
};

export const asFile = (node: IFileSystem): IFile | undefined => {
    if (node._nodeKind === 'File') return node as IFile;
    return undefined;
};

export const addChild = (dir: IDirectory, child: IFileSystem) => {
    dir._children[makeFsId(child)] = child;
};

export const removeAllChildren = (node: IFileSystem) => {
    if (isDir(node)) {
        const children = node._children;
        Object.values(children).forEach(removeAllChildren);
        node._children = {};
    }
};

export const removeChild = (dir: IDirectory, name: string, type: NodeKind) => {
    const { _children } = dir;
    const id = makeFsId({ name, _nodeKind: type });
    if (id in _children) {
        removeAllChildren(_children[id]);
        delete _children[id];
    }
};

const makeCommonFields = <K extends NodeKind>(
    args: Omit<IFileSystem, '_uid' | '_nodeKind'> & { _nodeKind: K },
) => ({
    ...args,
    _uid: `${args._nodeKind}#${uid()}`,
});

export const makeRoot = (): IDirectory => ({
    ...makeCommonFields({
        name: '', size: 0, _nodeKind: 'Dir', _isCommitted: true,
    }),
    _children: {},
    _isRoot: true,
});

const ROOT: IDirectory = makeRoot();

export type PathOptionsType = {
    curDir?: IDirectory;
    root?: IDirectory;
};

const normalizePathOptions = (
    args?: PathOptionsType,
): Required<PathOptionsType> => ({
    curDir: args?.curDir || args?.root || ROOT,
    root: args?.root || ROOT,
});

export type KindToType<K> = K extends 'Dir'
    ? IDirectory : IFile;

export interface IPath {
    stem(path: string | string[]): string;
    extention(path: string | string[]): string;
    pathFromFS(node: IFileSystem, encodeKind?: boolean): string;
    pathArrayFromFS(node: IFileSystem, encodeKind?: boolean): string[]
    comps(path: string | string[]): IComponent[];
    absolute(path: string | string[], args?: PathOptionsType): string | undefined;
    realname(node: IFileSystem): string;
    fsFromPath<K extends NodeKind>(
        kind: K,
        path: string | string[],
        options?: PathOptionsType,
    ): KindToType<K> | undefined
    exists(path: string | string[], args?: PathOptionsType): boolean;
}

export const findChild = <K extends NodeKind>(
    dir: IDirectory,
    name: string,
    kind: K,
    ext?: string,
): KindToType<K> | undefined => {
    const temp = dir._children[makeFsId({ name, _nodeKind: kind })];
    return temp as KindToType<K>;
};

enum Loop {
    CONTINUE,
    BREAK
}

interface IIteratorPathFunctions {
    before?: () => Loop,
    normalKind: (name: string, idx: number, len: number) => Loop,
    parKind?: (name: string, idx: number, len: number) => Loop,
    rootKind?: (name: string, idx: number, len: number) => Loop,
    curKind?: (name: string, idx: number, len: number) => Loop,
    after?: () => void,
}

const normalizeIteratorFunctions = (
    fns: IIteratorPathFunctions,
): Required<IIteratorPathFunctions> => ({
    before: fns.before || (() => Loop.CONTINUE),
    normalKind: fns.normalKind,
    parKind: fns.parKind || (() => Loop.CONTINUE),
    rootKind: fns.rootKind || (() => Loop.CONTINUE),
    curKind: fns.curKind || (() => Loop.CONTINUE),
    after: fns.after || (() => Loop.CONTINUE),
});

const iteratePath = (
    path: string | string[],
    funcs: IIteratorPathFunctions,
) => {
    const {
        before, after, normalKind, parKind, rootKind, curKind,
    } = normalizeIteratorFunctions(funcs);
    if (before() === Loop.BREAK) return;

    const comps = makeComponents(path);
    const len = comps.length;

    for (let i = 0; i < len; i += 1) {
        const { kind, name } = comps[i];
        switch (kind) {
            case 'Normal': {
                if (normalKind(name, i, len) === Loop.BREAK) return;
                break;
            }
            case 'ParDir': {
                if (parKind(name, i, len) === Loop.BREAK) return;
                break;
            }
            case 'RootDir':
                if (rootKind(name, i, len) === Loop.BREAK) return;
                break;
            case 'CurDir':
                if (curKind(name, i, len) === Loop.BREAK) return;
                break;
            default:
                break;
        }
    }
    after();
};

type CDResultType = {
    result?: IFileSystem;
    lastDir?: IFileSystem;
};

export const cd = (
    path: string | string[],
    args?: PathOptionsType,
): CDResultType => {
    const { curDir, root } = normalizePathOptions(args);
    let temp = curDir as IFileSystem;
    let result = {} as CDResultType;

    iteratePath(path, {
        normalKind: (name) => {
            const dir = asDir(temp);
            result = { lastDir: temp };
            if (!dir) return Loop.BREAK;
            const child = findChild(dir, name, 'Dir');
            if (!child) return Loop.BREAK;
            temp = child;
            return Loop.CONTINUE;
        },
        parKind: () => {
            temp = temp.parent || root;
            return Loop.CONTINUE;
        },
        rootKind: () => {
            temp = root;
            return Loop.CONTINUE;
        },
        after: () => {
            result = { result: temp };
        },
    });

    return result;
};

const _filePathOpHelper = (
    path: string | string[],
    type: keyof IFileComponent,
) => {
    const _helper = (name: string) => getFileComponent(name)[type];

    if (Array.isArray(path)) return _helper(path.pop() || '');

    const pos = path.lastIndexOf('/');
    return _helper(path.substring(pos + 1));
};

export const Path: IPath = {
    comps(path: string | string[]): IComponent[] {
        return makeComponents(path);
    },
    realname(node: IFileSystem): string {
        if (isDir(node) && node._isRoot) return '/';
        if (isFile(node)) return node.stem;
        return node.name;
    },
    stem(path: string | string[]): string {
        return _filePathOpHelper(path, 'stem');
    },
    extention(path: string | string[]): string {
        return _filePathOpHelper(path, 'extention');
    },

    absolute(path: string | string[], args?: PathOptionsType): string | undefined {
        const temp = this.fsFromPath('Dir', path, args);
        return temp && this.pathFromFS(temp);
    },

    pathFromFS(node: IFileSystem, encodeKind = false): string {
        return this.pathArrayFromFS(node, encodeKind).join('/');
    },

    pathArrayFromFS(node: IFileSystem, encodeKind = false): string[] {
        const res = [] as string[];
        let temp: IFileSystem | undefined = node;
        const fn = encodeKind ? makeFsId : (fs: IFileSystem) => fs.name;
        while (temp) {
            res.push(fn(temp));
            temp = temp.parent;
        }
        return res.reverse();
    },

    fsFromPath<K extends NodeKind>(
        kind: K,
        path: string | string[],
        options?: PathOptionsType,
    ): KindToType<K> | undefined {
        const { curDir, root } = normalizePathOptions(options);
        let temp: IFileSystem | undefined = curDir as IFileSystem;

        iteratePath(path, {
            normalKind: (name, i, len) => {
                if (!temp) return Loop.BREAK;
                if (!isDir(temp)) return Loop.BREAK;
                temp = findChild(temp, name, (i === len - 1) ? kind : 'Dir');
                return Loop.CONTINUE;
            },
            parKind: () => {
                temp = temp?.parent || root;
                return Loop.CONTINUE;
            },
            rootKind: () => {
                temp = root;
                return Loop.CONTINUE;
            },
        });

        return temp as (KindToType<K> | undefined);
    },

    exists(path: string | string[], args?: PathOptionsType): boolean {
        const { result } = cd(path, args);
        return isDef(result);
    },
};

export const propogateSize = (size: number, node?: IFileSystem) => {
    if (!node) return;
    node.size += size;
    propogateSize(size, node.parent);
};

type MakeFileArgsType = {
    name: string;
    size?: number;
    parent?: IDirectory;
    ext?: string;
    useNameToGetExt?: boolean;
    _isCommitted?: boolean;
};

type MakeDirArgsType = {
    name: string;
    size?: number;
    parent?: IDirectory;
    children?: IDirectory['_children'];
    _isCommitted?: boolean;
};

const makeFileHelper = (args: MakeFileArgsType): IFile => {
    const {
        name: tempName,
        size = 0,
        parent,
        ext: tempExt,
        useNameToGetExt,
        _isCommitted = true,
    } = args;

    let name = tempName.trim();
    let stem = name;

    const ext = tempExt || (useNameToGetExt ? Path.extention(name) : '');

    if (!tempExt) {
        if (useNameToGetExt) stem = Path.stem(name);
    }

    name = `${stem}${ext.length === 0 ? '' : '.'}${ext}`;

    if (name.length === 0) {
        throw new Error('[makeFile]: name cannot be empty');
    }

    if (size) propogateSize(size, parent);

    const res: IFile = {
        ...makeCommonFields({
            name, size, _nodeKind: 'File', _isCommitted,
        }),
        stem,
        parent,
        ext,
    };
    if (parent) addChild(parent, res);
    return res;
};

const makeDirHelper = (args: MakeDirArgsType): IDirectory => {
    const {
        name: tempName, size = 0, parent, children,
        _isCommitted = true,
    } = args;

    const name = tempName.trim();
    if (name.length === 0) {
        throw new Error('[makeDir]: name cannot be empty');
    }

    if (size) propogateSize(size, parent);

    const res: IDirectory = {
        ...makeCommonFields({
            name, size, _nodeKind: 'Dir', _isCommitted,
        }),
        parent,
        _children: children || {},
        _isRoot: false,
    };

    if (parent) addChild(parent, res);
    return res;
};

const makeDirRec = (
    path?: string | string[],
    options?: PathOptionsType,
): IDirectory => {
    const { curDir, root } = normalizePathOptions(options);
    if (typeof path === 'undefined') return curDir;
    let tempPar = curDir;

    iteratePath(path, {
        normalKind: (name, i, len) => {
            const dir = findChild(tempPar, name, 'Dir');
            // const str = Object.values(tempPar._children || {})
            //     .map(({ name: cname, parent }) =>
            // `[Parent: ${parent?.name || '?'}, Child: ${cname}]`)
            //     .join(' => ');

            if (dir) {
                tempPar = dir;
            } else {
                tempPar = makeDirHelper({
                    name,
                    parent: tempPar,
                });
            }
            return Loop.CONTINUE;
        },
        parKind: () => {
            const dir = tempPar.parent ? asDir(tempPar.parent) : undefined;
            tempPar = dir || root;
            return Loop.CONTINUE;
        },
        rootKind: () => {
            tempPar = root;
            return Loop.CONTINUE;
        },
    });

    return tempPar;
};

export const makeDirOrGetIfExists = (
    args: Omit<MakeDirArgsType, 'parent'>,
    pathOrParent?: string | string[] | IDirectory,
    options?: PathOptionsType,
): IDirectory => {
    let parent: IDirectory | undefined;

    if (typeof pathOrParent === 'string' || Array.isArray(pathOrParent)) {
        parent = makeDirRec(pathOrParent, options);
    } else {
        parent = pathOrParent;
    }

    if (parent) {
        const child = findChild(parent, args.name, 'Dir');
        if (child) return child;
    }
    return makeDirHelper({ ...args, parent });
};

export const makeDir = (
    args: Omit<MakeDirArgsType, 'parent'>,
    pathOrParent?: string | string[] | IDirectory,
    options?: PathOptionsType,
): IDirectory => {
    let parent: IDirectory | undefined;

    if (typeof pathOrParent === 'string' || Array.isArray(pathOrParent)) {
        parent = makeDirRec(pathOrParent, options);
    } else {
        parent = pathOrParent;
    }

    if (parent) {
        const child = findChild(parent, args.name, 'Dir');
        if (child) {
            throw new Error('[makeDir]: directory already exists');
        }
    }
    return makeDirHelper({ ...args, parent });
};

export const makeFile = (
    args: Omit<MakeFileArgsType, 'parent'>,
    pathOrParent?: string | string[] | IDirectory,
    options?: PathOptionsType,
): IFile => {
    let parent: IDirectory | undefined;
    if (typeof pathOrParent === 'string' || Array.isArray(pathOrParent)) {
        parent = makeDirRec(pathOrParent, options);
    } else {
        parent = pathOrParent;
    }

    if (parent) {
        const child = findChild(parent, args.name, 'File');
        if (child) {
            throw new Error('[makeFile]: file already exists');
        }
    }

    return makeFileHelper({
        ...args,
        parent,
    });
};

export const makeFileUsingPath = (
    path: string | string[],
    options?: PathOptionsType,
): IFile | undefined => {
    if (path.length === 0) return undefined;

    let filename: string;
    let nPath = path;

    if (typeof path === 'string') {
        const pos = path.lastIndexOf('/');
        if (pos < 0) return undefined;
        filename = path.substring(pos + 1).trim();
        nPath = path.substring(0, pos);
    } else {
        filename = path.pop()?.trim() || '';
        nPath = path;
    }
    if (filename.length === 0) return undefined;

    return makeFile({
        name: filename,
        useNameToGetExt: true,
    }, nPath, options);
};

type SerializeType =
    | Omit<IFileSystem, 'parent'>
    | Omit<IFile, 'parent'>
    | Omit<IDirectory, 'parent'>

export const serialize = (
    node: IFileSystem,
): SerializeType => {
    if (isFile(node)) {
        const temp = {
            ...node,
        };
        delete temp.parent;
        return temp;
    }
    if (isDir(node)) {
        const children: IDirectory['_children'] = {};
        Object.entries(node._children).forEach(([k, v]) => {
            if (!v._isCommitted) return;
            children[k] = serialize(v);
        });
        return {
            name: node.name,
            size: node.size,
            _children: children,
            _isRoot: node._isRoot,
            _nodeKind: node._nodeKind,
            _uid: node._uid,
            _isCommitted: node._isCommitted,
        };
    }
    throw new Error('[serialize]: unknown type');
};

const _checkFsKeys = (data: GenericObjType): boolean => checkKeys<IFileSystem>(data, ['_nodeKind', 'name', 'size']);
const _checkDirKeys = (data: GenericObjType): boolean => checkKeys<IDirectory>(data, ['_children', '_isRoot']);
const _checkFileKeys = (data: GenericObjType): boolean => checkKeys<IFile>(data, ['ext']);

export const deserialize = (
    data: unknown,
    parent?: IFileSystem,
): IFileSystem => {
    if (typeof data !== 'object') {
        throw new Error(
            '[deserialize] "data" parameter must be a key-value pair',
        );
    }
    const check = (pred: (data: GenericObjType) => boolean) => {
        const temp = data as GenericObjType;
        if (!pred(temp)) {
            throw new Error(
                `[deserialize${pred.name}] cannot deserialize unrelated or unknown data`,
            );
        }
    };

    check(_checkFsKeys);

    const temp = data as IFileSystem;

    const checkAndAssignParent = () => {
        if (!parent) {
            throw new Error('[deserialize] Files cannot be orphans');
        }
        temp.parent = parent;
        return temp;
    };

    switch (temp._nodeKind) {
        case 'Dir': {
            check(_checkDirKeys);
            const dir = temp as IDirectory;
            dir.parent = parent;
            if (dir._isRoot) delete dir.parent;
            Object.values(dir._children).forEach((v) => deserialize(v, dir));
            return dir;
        }
        case 'File': {
            check(_checkFileKeys);
            return checkAndAssignParent();
        }
        default:
            throw new Error('[deserialize] unknown type');
    }
};

export default ROOT;

import { IFileSystem, NodeKind } from '.';

type ComponentKind = 'RootDir' | 'ParDir' | 'CurDir' | 'Normal';

export interface IComponent {
    kind: ComponentKind;
    name: string;
}

const componentsHelper = (path: string[]): IComponent[] => {
    const res = [] as IComponent[];
    let i = 0;
    if (path[0].length === 0) {
        res.push({ kind: 'RootDir', name: '/' });
        i += 1;
    }

    for (; i < path.length; i += 1) {
        const comp = path[i];
        if (comp.length === 0 || comp === '.') {
            res.push({ kind: 'CurDir', name: comp });
        } else if (comp === '..') {
            res.push({ kind: 'ParDir', name: comp });
        } else {
            res.push({ kind: 'Normal', name: comp });
        }
    }
    return res;
};

export const makeComponents = (path: string | string[]) => componentsHelper(
    Array.isArray(path) ? path : path.split('/').map((el) => el.trim()),
);

export interface IFileComponent {
    fullname: string;
    stem: string;
    extention: string;
}

export const getFileComponent = (filename: string): IFileComponent => {
    if (filename.indexOf('.') < 0) {
        return {
            fullname: filename,
            stem: filename,
            extention: '',
        };
    }
    const temp = filename.trim();
    const pos = temp.lastIndexOf('.');
    const stem = temp.substring(0, pos);
    const extention = temp.substring(pos + 1);
    return {
        fullname: temp,
        stem,
        extention,
    };
};

export const makeFsId = <
    T extends { name: string, _nodeKind: NodeKind }
>(
    fs: T,
): string => `${fs._nodeKind}#${fs.name}`;

export const equalFs = (
    lhs?: IFileSystem,
    rhs?: IFileSystem,
) => (lhs?._uid === rhs?._uid);

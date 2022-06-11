import {
    addChild,
    asDir,
    findChild, IDirectory, IFileSystem, isDir, isFile, makeDir, makeFile, NodeKind, Path, removeAllChildren,
} from '.';
import { AcceptableType } from '../canisterHelper';
import { readFile, writeFile } from '../storage';
import { isDef } from '../basic';
import { makeFsId } from './utils';

export const renameFsNode = (node: IFileSystem, name: string): Error | undefined => {
    const nName = name.trim();
    if (nName.length === 0) return new Error('File name cannot be empty');
    const rname = (n: IFileSystem) => { n.name = nName; };
    const { parent } = node;
    const prevID = makeFsId(node);

    if (isDef(parent)) {
        const sib = findChild(parent as IDirectory, nName, 'File');
        if (isDef(sib)) return new Error('File name already exists!');
    }
    if (isDir(node)) rname(node);
    else if (isFile(node)) {
        const stem = Path.stem(nName);
        const ext = Path.extention(nName);
        rname(node);
        node.ext = ext;
        node.stem = stem;
    }
    if (isDef(parent) && isDir(parent)) {
        delete parent._children[prevID];
        addChild(parent, node);
    }
    return undefined;
};

const cloneNode = async (node: IFileSystem, parent?: IDirectory): Promise<IFileSystem | undefined> => {
    if (isFile(node)) {
        const temp = makeFile({
            name: node.name,
            size: node.size,
            useNameToGetExt: true,
        }, parent);
        const fileContent = await readFile<'generic', AcceptableType>({ node });
        if (isDef(fileContent)) await writeFile({ node: temp, data: fileContent });
        return temp;
    }

    if (isDir(node)) {
        const parNode = makeDir({
            name: node.name,
            size: node.size,
            children: {},
        }, parent);

        const children: Record<string, IFileSystem> = {};
        const parChildren = Object.entries(node._children);
        parChildren.forEach(async ([k, v]) => {
            const temp = await cloneNode(v, parNode);
            if (isDef(temp)) children[k] = temp;
        });

        parNode._children = children;
        return parNode;
    }
    return undefined;
};

const getNewName = (par: IDirectory, node: IFileSystem) => {
    let i = 0;
    const helper = (name: string, idx: number, ext?: string) => `${name}${i}${isDef(ext) ? `.${ext}` : ''}`;
    const rootName = isFile(node) ? node.stem : node.name;
    let { name } = node;
    while (isDef(findChild(par, name, node._nodeKind))) {
        name = helper(rootName, i, isFile(node) ? node.ext : undefined);
        i += 1;
    }
    return name;
};

export const copyFsNode = async (curDir: IDirectory, node: IFileSystem, { renameIfCollide = false, force = false }: {
    renameIfCollide?: boolean,
    force?: boolean,
}): Promise<Error | undefined> => {
    const child = findChild(curDir, node.name, node._nodeKind);

    let nNode: IFileSystem = node;
    if (isDef(child)) {
        if (!force) {
            if (!renameIfCollide) {
                return new Error(`[copy]: ${node._nodeKind}["${node.name}"] with same name found in the same directory`);
            }
            const nName = getNewName(curDir, node);
            const temp = await cloneNode(node);
            if (!isDef(temp)) return new Error(`[copy]: unable to copy ${node._nodeKind}["${node.name}"]`);
            nNode = temp;
            renameFsNode(nNode, nName);
        } else {
            const temp = await cloneNode(node);
            if (!isDef(temp)) return new Error(`[copy]: unable to copy ${node._nodeKind}["${node.name}"]`);
            nNode = temp;
            removeAllChildren(child);
        }
    } else {
        const temp = await cloneNode(node);
        if (!isDef(temp)) return new Error(`[copy]: unable to copy ${node._nodeKind}["${node.name}"]`);
        nNode = temp;
    }

    addChild(curDir, nNode);

    return undefined;
};

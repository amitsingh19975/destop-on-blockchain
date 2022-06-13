import { IFileSystem } from './fs';
import { makeFsId } from './fs/utils';
import { IPosition, ShapeType } from './types';

export const ascendingOrder = (
    direction: 'row' | 'col',
    out: Record<string, IPosition>,
    children: Record<string, IFileSystem> | IFileSystem[],
    { width: w, height: h }: ShapeType,
    { width: vW, height: vH }: ShapeType,
) => {
    const rows = Math.floor(vH / h);
    const cols = Math.floor(vW / w);
    if (rows === 0 || cols === 0) return;
    const temp = (Array.isArray(children)
        ? children
        : Object.values(children))
        .map((f) => [f, { x: 0, y: 0 }] as [IFileSystem, IPosition])
        .sort(([a], [b]) => a.name.localeCompare(b.name));

    const len = temp.length;
    let i = 0;
    let j = 0;
    let k = 0;

    while (k < len && j < cols) {
        const [_, p] = temp[k];
        p.y = i * h;
        p.x = j * w;
        k += 1;
        if (direction === 'row') {
            i = (i + 1) % rows;
            j += (i === 0 ? 1 : 0);
        } else {
            j = (j + 1) % cols;
            i += (j === 0 ? 1 : 0);
        }
    }

    temp.forEach((el) => {
        const [f, p] = el;
        const id = makeFsId(f);
        out[id] = p;
    });
};

export const ascendingOrderAndSavePostiion = async (
    direction: 'row' | 'col',
    out: Record<string, IPosition>,
    children: Record<string, IFileSystem>,
    iconShape: ShapeType,
    viewBox: ShapeType,
) => {
    const childrenNodes = Object.values(children);
    if (childrenNodes.length === 0) return;

    ascendingOrder(direction, out, childrenNodes, iconShape, viewBox);
};

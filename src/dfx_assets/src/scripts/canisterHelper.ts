import { GenericObjType } from './utils';

export type AcceptableType = GenericObjType | string | {} | Blob;
export type UIDType = string;

const _storedData = {} as Record<string, AcceptableType>;

export const commit = async (uid: UIDType, data: AcceptableType) => {
    // TODO: make API request to store data
    _storedData[uid] = data;
};

export const commitBatch = async (data: [UIDType, string][]) => {
    // TODO: make API request to store data
};

export const fetchFromCanister = async (uid: UIDType, args = { createIfRequired: false, def: {} }): Promise<AcceptableType | undefined> => {
    if (uid in _storedData) return _storedData[uid];
    if (args.createIfRequired) _storedData[uid] = args.def;
    return _storedData[uid];
};
export const deleteFromCanister = async (uid: UIDType): Promise<void> => {
    if (uid in _storedData) delete _storedData[uid];
};

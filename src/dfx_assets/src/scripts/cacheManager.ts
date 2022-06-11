import { isDef } from './basic';
import {
    AcceptableType, fetchAsset, storeAssets, storeAssetsBatch, Type, TypeMapping, UIDType,
} from './canisterHelper';
import { WriteType } from './storage';
import {
    didTimeExpired, isBlob,
} from './utils';

interface IItemMetaData {
    isDirty: boolean;
    lastRW: number;
    isProcessOfCommitedToCanister: boolean;
}

interface IItem {
    name: string;
    data: AcceptableType;
    meta: IItemMetaData;
}

type CommitCallbackArgsType = { error: unknown } | {
    uid: UIDType,
    name: string,
    data: AcceptableType,
};

export type LocalAssetCommitCallbackType = (args: CommitCallbackArgsType) => void;
export type CanisterAssetCommitCallbackType = (args: CommitCallbackArgsType) => void;

type AssetCommitCallbacksType = {
    localCallback?: LocalAssetCommitCallbackType;
    canisterCallback?: CanisterAssetCommitCallbackType;
};

const CACHED_DATA = new Map<UIDType, IItem>();
const FLUSH_TIMER = 1000 * 60 * 10; // 10 mins;
const FLUSH_ITEM_THAT_HAS_RW_TIME_LESS_OR_EQUAL_IN_MINS = 30; // 5 mins;

const typeToHumanReadableType = (data: unknown): AcceptableType => {
    if (typeof data === 'string') return 'String';
    return 'Json';
};

const typeMismatchError = (l: AcceptableType, r: AcceptableType) => {
    const temp = `type mismatch; stored type found to be "${typeToHumanReadableType(l)}", but given type found to be "${typeToHumanReadableType(r)}"`;
    return new Error(temp);
};

export namespace CacheManager {

    export const inCache = (uid: UIDType) => CACHED_DATA.has(uid);

    export const flush = (uid?: UIDType) => {
        if (isDef(uid)) CACHED_DATA.delete(uid);
        else CACHED_DATA.clear();
    };

    const normalizeData = async (oldValue: AcceptableType | undefined, data: AcceptableType, mode: WriteType): Promise<AcceptableType> => {
        if (!isDef(oldValue)) return data;
        switch (mode) {
            case 'append': {
                let temp = oldValue;
                if (typeof data === 'string' && typeof temp === 'string') {
                    temp = data;
                } else if (typeof data === 'object' && typeof temp === 'object') {
                    temp = { ...temp, ...data };
                } else if (isBlob(temp) && isBlob(data) && temp.type === data.type) {
                    const left = await temp.arrayBuffer();
                    const right = await data.arrayBuffer();
                    temp = new Blob([left, right], { type: temp.type });
                } else {
                    throw typeMismatchError(temp, data);
                }
                return temp;
            }
            case 'prepend': {
                let temp = oldValue;
                if (typeof data === 'string' && typeof temp === 'string') {
                    temp = data + temp;
                } else if (typeof data === 'object' && typeof temp === 'object') {
                    temp = { ...data, ...temp };
                } else if (isBlob(temp) && isBlob(data) && temp.type === data.type) {
                    const left = await data.arrayBuffer();
                    const right = await temp.arrayBuffer();
                    temp = new Blob([left, right], { type: temp.type });
                } else {
                    throw typeMismatchError(temp, data);
                }
                return temp;
            }
            default:
        }
        return data;
    };

    const _put = (
        uid: UIDType,
        name: string,
        data: AcceptableType,
        meta?: Partial<IItemMetaData>,
    ) => {
        const {
            isDirty = true,
            isProcessOfCommitedToCanister = false,
        } = meta || {};

        CACHED_DATA.set(uid, { name, data, meta: { isDirty, lastRW: Date.now(), isProcessOfCommitedToCanister } });
    };

    export const put = async (
        uid: UIDType,
        name: string,
        data: AcceptableType,
        options?: {
            mode?: WriteType,
            meta?: Partial<IItemMetaData>,
            assetCommitCallbacks?: AssetCommitCallbacksType
            sizeCallback?: (size: number) => void,
        },
    ) => {
        const {
            mode = 'append',
            meta = {},
            assetCommitCallbacks = {},
            sizeCallback = () => void 0,
        } = options || {};

        const {
            localCallback,
            canisterCallback,
        } = assetCommitCallbacks;
        const oldValueOr = CACHED_DATA.get(uid);
        let oldVal: AcceptableType | undefined;

        if (!isDef(oldValueOr)) {
            if (mode !== 'overwrite') {
                try {
                    oldVal = await fetchAsset(uid);
                } catch (e) {
                    canisterCallback?.({ error: e });
                    return;
                }
            }
        } else oldVal = oldValueOr.data;
        const normalizedData = normalizeData(oldVal, data, mode);

        meta.isProcessOfCommitedToCanister = true;

        _put(uid, name, normalizedData, meta);

        const metaInfo = CACHED_DATA.get(uid)?.meta;

        localCallback?.({ name, data: normalizedData, uid });
        storeAssets(uid, name, normalizedData, true, sizeCallback).then(() => {
            if (metaInfo) metaInfo.isDirty = false;
            canisterCallback?.({ name, data: normalizedData, uid });
        }).catch((e) => {
            canisterCallback?.({ error: e });
        }).finally(() => {
            if (metaInfo) metaInfo.isProcessOfCommitedToCanister = false;
        });
    };

    export const updateMetaData = <K extends keyof IItemMetaData>(uid: UIDType, meta: K, val: IItemMetaData[K]) => {
        const temp = CACHED_DATA.get(uid);
        if (!isDef(temp)) return;
        temp.meta[meta] = val;
    };

    export const filter = (predicate: (uid: UIDType, meta: IItemMetaData, data: AcceptableType) => boolean) => {
        const res: [UIDType, IItem][] = [];
        CACHED_DATA.forEach((el, uid) => {
            if (predicate(uid, el.meta, el.data)) {
                res.push([uid, el]);
            }
        });
        return res;
    };

    const constructWithType = <T extends Type, R = unknown>(type: T): TypeMapping<T, R> => {
        let temp: AcceptableType;
        switch (type) {
            case 'blob': temp = new Blob(); break;
            case 'string': temp = ''; break;
            case 'json': case 'generic': default: temp = {}; break;
        }
        return temp as TypeMapping<T, R>;
    };

    export const get = async <T extends Type, R = unknown>(
        uid: UIDType,
        name: string,
        options?: {
            createIfRequired?: boolean,
            type?: T | undefined,
            assetCommitCallbacks?: AssetCommitCallbacksType,
        },
    ): Promise<TypeMapping<T, R> | undefined> => {
        const {
            createIfRequired = false,
            type = 'generic',
            assetCommitCallbacks = {},
        } = options || {};
        const dataOr = CACHED_DATA.get(uid);
        let data: AcceptableType;

        if (!isDef(dataOr)) {
            try {
                const res = await fetchAsset(uid);
                _put(uid, name, res);
                data = res;
            } catch {
                if (!createIfRequired) return undefined;
                const temp = constructWithType(type) as TypeMapping<T, R>;
                put(uid, name, temp, { assetCommitCallbacks, mode: 'overwrite' });
                return temp;
            }
        } else {
            data = dataOr.data;
        }

        switch (type) {
            case 'blob': {
                if (data instanceof Blob) return data as TypeMapping<T, R>;
                return undefined;
            }
            case 'generic': return data as TypeMapping<T, R>;
            case 'json': {
                if (typeof data === 'object') return data as TypeMapping<T, R>;
                return undefined;
            }
            case 'string': {
                if (typeof data === 'string') return data as TypeMapping<T, R>;
                return undefined;
            }
            default: return undefined;
        }
    };

    export const commitAllIfDataIsDirty = async (errorCallback?: (e: unknown) => void) => {
        try {
            const assets = filter((uid, meta) => meta.isDirty)
                .map(([uid, item]) => ({ uid, name: item.name, payload: item.data }));
            await storeAssetsBatch(assets);
        } catch (e) {
            if (errorCallback) errorCallback(e);
            else throw e;
        }
    };
}

export const CACHE_FLUSH_TIMER_ID = setInterval(() => {
    const ids: UIDType[] = [];
    CACHED_DATA.forEach((val, uid) => {
        if (didTimeExpired(FLUSH_ITEM_THAT_HAS_RW_TIME_LESS_OR_EQUAL_IN_MINS, 'min', val.meta.lastRW)) {
            ids.push(uid);
        }
    });
    ids.forEach((id) => CACHED_DATA.delete(id));
}, FLUSH_TIMER);

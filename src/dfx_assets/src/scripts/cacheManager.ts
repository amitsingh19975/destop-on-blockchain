import localForage from 'localforage';
import sizeofImpl from 'object-sizeof';
import { ISerializedUserSetting } from '../stores';
import { GenericObjType, isDef, matchObject } from './basic';
import {
    AcceptableType, CanisterCommitCallbackType, CommitCallbackArgsType, deleteAsset, fetchAsset, storeAssets, storeAssetsBatch, Type, TypeMapping, UIDType, _registerCommitCallback,
} from './canisterHelper';
import { deserialize, IFileSystem, serialize } from './fs';
import { notifyNeg } from './notify';
import { WriteType } from './storage';
import { ItemCompletionCallbackType } from './types';
import {
    fetchFileSystem,
    fetchSetting,
    storeFileSystem, storeSerializedFileSystem, storeSetting, storeSettingBatch,
} from './user';
import { isBlob } from './utils';

interface IItemMetaData {
    isDirty: boolean;
    modifed: number;
}

interface IItemInfo {
    name: string;
    meta: IItemMetaData;
}

interface IItem<R = AcceptableType> extends IItemInfo {
    data: R,
}

export type LocalCommitCallbackType = (args: CommitCallbackArgsType) => void;

type commitCallbacksType = {
    localCallback?: LocalCommitCallbackType;
    canisterCallback?: CanisterCommitCallbackType;
};

const DB_NAME = 'DFX_HACKATHON_STORE';

localForage.setDriver([localForage.INDEXEDDB, localForage.WEBSQL, localForage.LOCALSTORAGE]);

const STORES = {
    data: localForage.createInstance({
        name: DB_NAME,
        storeName: 'Data',
        description: 'data the assets',
        version: 1,
    }),
    asset: localForage.createInstance({
        name: DB_NAME,
        storeName: 'Assets',
        description: 'stores the assets',
        version: 1,
    }),
    fs: localForage.createInstance({
        name: DB_NAME,
        storeName: 'Filesystem',
        description: 'stores the filesystem',
        version: 1,
    }),
    settings: localForage.createInstance({
        name: DB_NAME,
        storeName: 'UserSettings',
        description: 'stores the user settings',
        version: 1,
    }),
};

const typeToHumanReadableType = (data: unknown): AcceptableType => {
    if (typeof data === 'string') return 'String';
    return 'Json';
};

const typeMismatchError = (l: AcceptableType, r: AcceptableType) => {
    const temp = `type mismatch; stored type found to be "${typeToHumanReadableType(l)}", but given type found to be "${typeToHumanReadableType(r)}"`;
    return new Error(temp);
};

const _sizeof = (data: AcceptableType): number => {
    if (data instanceof Blob) return data.size;
    return sizeofImpl(data);
};

export namespace CacheManager {

    export type CacheKind = Exclude<keyof typeof STORES, 'data'>;

    type MappingDataType<K extends CacheKind> = K extends 'asset' ? AcceptableType : (K extends 'fs' ? IFileSystem : GenericObjType);

    export const inCache = async (uid: UIDType) => {
        // To avoid the bug that always returns null even if the key exists.
        await STORES.data.length();
        return isDef(await STORES.data.getItem(uid));
    };
    export const getAllData = async () => {
        const res = {} as Record<string, unknown>;
        await STORES.data.iterate((el, uid) => {
            res[uid] = el;
        });
        return res;
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

    type _StoreOpType = 'info' | 'data' | 'all';

    type _PutArgsType<K extends _StoreOpType, C extends CacheKind> = K extends 'info'
        ? { name: string, meta?: Partial<IItemMetaData> }
        : (K extends 'data' ? { data: MappingDataType<C> } : { name: string, meta?: Partial<IItemMetaData>, data: MappingDataType<C> });

    const _put = async <K extends _StoreOpType, C extends CacheKind>(
        kind: K,
        cacheKind: C,
        uid: UIDType,
        args: _PutArgsType<K, C>,
    ) => {
        if (kind !== 'info') {
            const { data } = args as { data: MappingDataType<C> };
            await STORES.data.setItem(uid, data);
        }
        if (kind !== 'data') {
            const { meta, name } = args as { name: string, meta?: Partial<IItemMetaData> };
            const {
                isDirty = true,
                modifed = Date.now(),
            } = meta || {};

            await STORES[cacheKind].setItem<IItemInfo>(uid, {
                name, meta: { isDirty, modifed },
            });
        }
    };

    type _GetReturnType<K extends _StoreOpType, C extends CacheKind> = K extends 'info'
        ? IItemInfo : (K extends 'data' ? MappingDataType<C> : IItem<MappingDataType<C>>);

    const _get = async <K extends _StoreOpType, C extends CacheKind>(
        kind: K,
        cacheKind: C,
        uid: UIDType,
    ): Promise<_GetReturnType<K, C> | undefined> => {
        if (kind === 'info') {
            const result = await STORES[cacheKind].getItem<IItemInfo>(uid) as _GetReturnType<K, C>;
            return result;
        }
        if (kind === 'all') {
            const info = await STORES[cacheKind].getItem<IItemInfo>(uid);
            if (!isDef(info)) return undefined;
            const data = await STORES.data.getItem(uid);
            if (!isDef(info)) {
                await STORES[cacheKind].removeItem(uid);
                return undefined;
            }
            return {
                ...info,
                data,
            } as _GetReturnType<K, C>;
        }
        const data = await STORES.data.getItem(uid);
        return data as _GetReturnType<K, C>;
    };

    export const putAsset = async (
        uid: UIDType,
        name: string,
        data: AcceptableType,
        options?: {
            mode?: WriteType,
            meta?: Partial<IItemMetaData>,
            commitCallbacks?: commitCallbacksType
            sizeCallback?: (size: number) => void,
            lazyCommit?: boolean,
        },
    ) => {
        const {
            mode = 'append',
            meta = {},
            commitCallbacks = {},
            sizeCallback = () => void 0,
            lazyCommit = true,
        } = options || {};

        const {
            localCallback,
            canisterCallback,
        } = commitCallbacks;
        const oldValueOr = await _get('all', 'asset', uid);
        let oldVal: AcceptableType | undefined;

        if (!isDef(oldValueOr)) {
            if (mode !== 'overwrite') {
                try {
                    const { payload } = await fetchAsset(uid);
                    oldVal = payload;
                } catch {
                    // DO NOTHING
                }
            }
        } else oldVal = oldValueOr.data;
        const normalizedData = await normalizeData(oldVal, data, mode);
        sizeCallback(_sizeof(normalizedData));
        const modifed = Date.now();

        try {
            await _put('all', 'asset', uid, {
                name, data: normalizedData, meta,
            });
        } catch (e) {
            localCallback?.({ error: e });
            return;
        }

        localCallback?.({ name, uid });
        if (canisterCallback && lazyCommit) _registerCommitCallback(uid, canisterCallback);
        if (!lazyCommit) {
            storeAssets(uid, name, normalizedData, true, sizeCallback).then(async () => {
                await _put('info', 'asset', uid, {
                    name, meta: { isDirty: false, modifed },
                });
                canisterCallback?.({ name, uid });
            }).catch((e) => {
                canisterCallback?.({ error: e });
            });
        }
    };

    export const put = async <K extends Exclude<CacheKind, 'asset'>>(
        kind: K,
        uid: (K extends 'fs' ? 'fs' : keyof ISerializedUserSetting),
        name: string,
        data: MappingDataType<K>,
        options?: {
            meta?: Partial<IItemMetaData>,
            commitCallbacks?: commitCallbacksType,
            lazyCommit?: boolean,
            dataModifed?: number,
        },
    ) => {
        const {
            meta = {},
            commitCallbacks = {},
            lazyCommit = true,
            dataModifed,
        } = options || {};

        const {
            localCallback,
            canisterCallback,
        } = commitCallbacks;

        const normalizedData = (kind === 'fs' ? serialize(data as IFileSystem) : data) as MappingDataType<K>;

        const prevData = await _get('info', kind, uid);
        const modifed = isDef(prevData) ? prevData.meta.modifed : Date.now();
        if (isDef(dataModifed) && isDef(prevData) && dataModifed <= modifed) return;
        // if (matchObject(normalizeData, await _get('data', kind, uid))) return;

        try {
            await _put('all', kind, uid, {
                name, data: normalizedData, meta,
            });
        } catch (e) {
            localCallback?.({ error: e });
            return;
        }

        if (canisterCallback && lazyCommit) _registerCommitCallback(uid, canisterCallback);
        if (kind === 'fs') {
            localCallback?.({ name: 'Filesystem', uid: 'fs' });
            if (!lazyCommit) {
                storeFileSystem(data as IFileSystem).then(async () => {
                    await _put('info', kind, uid, { name, meta: { isDirty: false, modifed } });
                    canisterCallback?.({ name: 'Filesystem', uid: 'fs' });
                }).catch((e) => {
                    canisterCallback?.({ error: e });
                });
            }
        } else if (kind === 'settings') {
            localCallback?.({ name, uid: name });
            if (!lazyCommit) {
                storeSetting(name as keyof ISerializedUserSetting, normalizedData as GenericObjType).then(async () => {
                    await _put('info', kind, uid, { name, meta: { isDirty: false, modifed } });
                    canisterCallback?.({ name, uid: name });
                }).catch((e) => {
                    canisterCallback?.({ error: e });
                });
            }
        }
    };

    export const updateMetaData = async <K extends keyof IItemMetaData>(kind: CacheKind, uid: UIDType, meta: K, val: IItemMetaData[K]) => {
        const temp = await _get('info', kind, uid);
        if (!isDef(temp)) return;
        temp.meta[meta] = val;
        await _put('info', kind, uid, { ...temp });
    };

    export const findAllDirtyIn = async (kind: CacheKind) => {
        let len = 0;
        await STORES[kind].iterate<IItemInfo, void>((el) => {
            len += el.meta.isDirty ? 1 : 0;
        });
        return len;
    };

    export const findAllDirty = async () => (await findAllDirtyIn('asset'))
        + (await findAllDirtyIn('fs'))
        + (await findAllDirtyIn('settings'));

    export const filter = async <C extends CacheKind>(
        kind: C,
        predicate: (uid: string, meta: IItemMetaData, data: MappingDataType<C>) => boolean,
    ) => {
        const res: [UIDType, IItem][] = [];
        const promises = [] as Promise<void>[];
        const fn = async (el: IItemInfo, uid: UIDType) => {
            const data = await _get('data', kind, uid);
            if (!isDef(data)) {
                await STORES.data.removeItem(uid);
                return;
            }
            if (predicate(uid, el.meta, data)) {
                res.push([uid, { ...el, data }]);
            }
        };
        await STORES[kind].iterate<IItemInfo, void>((el, uid) => promises.push(fn(el, uid)));
        await Promise.all(promises);
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

    export const getAsset = async <T extends Type, R = unknown>(
        uid: UIDType,
        name: string,
        options?: {
            createIfRequired?: boolean,
            type?: T | undefined,
            commitCallbacks?: commitCallbacksType,
        },
    ): Promise<TypeMapping<T, R> | undefined> => {
        const {
            createIfRequired = false,
            type = 'generic',
            commitCallbacks = {},
        } = options || {};
        const dataOr = await _get('all', 'asset', uid);
        let data: AcceptableType;

        if (!isDef(dataOr)) {
            try {
                const { payload } = await fetchAsset(uid);
                const res = payload;
                await _put('all', 'asset', uid, { name, data: res, meta: { isDirty: false } });
                data = res;
            } catch {
                if (!createIfRequired) return undefined;
                const temp = constructWithType(type) as TypeMapping<T, R>;
                await putAsset(uid, name, temp, { commitCallbacks, mode: 'overwrite' });
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

    export const getFs = async (): Promise<IFileSystem> => {
        const dataOr = await _get('data', 'fs', 'fs');
        if (isDef(dataOr)) return deserialize(dataOr);
        return fetchFileSystem();
    };

    type GetSettingsReturnType<U> = U extends (keyof ISerializedUserSetting)[] ? ISerializedUserSetting : GenericObjType | undefined;

    export const getSettings = async <U extends (keyof ISerializedUserSetting) | (keyof ISerializedUserSetting)[]>(
        uids: U,
        itemCompletionCallback: ItemCompletionCallbackType = () => { },
    ): Promise<GetSettingsReturnType<U>> => {
        if (Array.isArray(uids)) {
            const res = {} as ISerializedUserSetting;
            const promises = [] as Promise<void>[];
            itemCompletionCallback({ type: 'itemEstimation', items: uids.length });

            uids.forEach((uid) => {
                const fn = async () => {
                    const dataOr = await _get('data', 'settings', uid);
                    const result = isDef(dataOr) ? dataOr : await fetchSetting(uid);
                    if (isDef(result)) res[uid] = result;
                    itemCompletionCallback({ type: 'progress', item: { uid } });
                };
                promises.push(fn());
            });
            return res as GetSettingsReturnType<U>;
        }
        itemCompletionCallback({ type: 'itemEstimation', items: uids.length });
        const dataOr = await _get('data', 'settings', uids);
        const result = isDef(dataOr) ? dataOr : await fetchSetting(uids);
        itemCompletionCallback({ type: 'progress', item: { uid: uids } });
        return result as GetSettingsReturnType<U>;
    };

    export const commitIfDataIsDirty = async (kind: CacheKind, args?: {
        errorCallback?: (e: unknown) => void,
        itemCompletionCallback?: ItemCompletionCallbackType,
    }) => {
        const {
            errorCallback,
            itemCompletionCallback = () => { },
        } = args || {};
        try {
            const data = await filter(kind, (uid, meta) => meta.isDirty);
            if (kind === 'asset') {
                const assets = data.map(([uid, item]) => {
                    updateMetaData('asset', uid, 'isDirty', false);
                    return ({ uid, name: item.name, payload: item.data });
                });
                await storeAssetsBatch(assets, true, (cbArgs) => {
                    if (cbArgs.type === 'itemEstimation') {
                        itemCompletionCallback(cbArgs);
                        return;
                    }
                    itemCompletionCallback(cbArgs);
                });
            } else if (kind === 'fs') {
                const temp = data.pop();
                if (!isDef(temp)) return;
                updateMetaData('fs', 'fs', 'isDirty', false);
                await storeSerializedFileSystem(JSON.stringify(temp[1].data));
            } else {
                const temp = {} as ISerializedUserSetting;
                data.forEach(([key, item]) => {
                    updateMetaData('settings', key, 'isDirty', false);
                    temp[key as keyof ISerializedUserSetting] = item.data as GenericObjType;
                });
                await storeSettingBatch(temp, itemCompletionCallback);
            }
        } catch (e) {
            if (errorCallback) errorCallback(e);
            else throw e;
        }
    };
    export const commitAllIfDataIsDirty = async (args?: {
        errorCallback?: (e: unknown) => void,
        itemCompletionCallback?: ItemCompletionCallbackType,
    }) => {
        const {
            errorCallback,
            itemCompletionCallback = () => { },
        } = args || {};
        try {
            const len = await findAllDirty();
            itemCompletionCallback({ type: 'itemEstimation', items: len });
            await commitIfDataIsDirty('asset', {
                itemCompletionCallback: (iArgs) => {
                    if (iArgs.type === 'progress') itemCompletionCallback(iArgs);
                },
            });
            await commitIfDataIsDirty('fs', {
                itemCompletionCallback: (iArgs) => {
                    if (iArgs.type === 'progress') itemCompletionCallback(iArgs);
                },
            });
            await commitIfDataIsDirty('settings', {
                itemCompletionCallback: (iArgs) => {
                    if (iArgs.type === 'progress') itemCompletionCallback(iArgs);
                },
            });
        } catch (e) {
            if (errorCallback) errorCallback(e);
            else throw e;
        }
    };

    export const flush = async (kind: CacheKind, uid?: UIDType, itemCompletionCallback: ItemCompletionCallbackType = () => { }) => {
        if (isDef(uid)) {
            const info = await _get('info', kind, uid);
            if (!isDef(info)) return;
            if (info.meta.isDirty) {
                const data = await _get('data', kind, uid);
                if (!isDef(data)) {
                    await STORES.data.removeItem(uid);
                    return;
                }
                itemCompletionCallback({ type: 'itemEstimation', items: 1 });
                if (kind === 'asset') {
                    await storeAssets(uid, info.name, data, true);
                } else if (kind === 'fs') {
                    await storeSerializedFileSystem(JSON.stringify(data));
                } else {
                    await storeSetting(uid as keyof ISerializedUserSetting, data as GenericObjType);
                }
                updateMetaData(kind, uid, 'isDirty', false);
                itemCompletionCallback({ type: 'progress', item: { uid, name: info.name } });
            }
            await STORES[kind].removeItem(uid);
        } else {
            await commitIfDataIsDirty(kind, { itemCompletionCallback });
            await STORES[kind].clear();
        }
    };

    export const flushAll = async (itemCompletionCallback: ItemCompletionCallbackType = () => { }) => {
        const len = await findAllDirty();
        itemCompletionCallback({ type: 'itemEstimation', items: len });
        await flush('asset', undefined, (args) => {
            if (args.type === 'progress') itemCompletionCallback({ ...args });
        });
        await flush('fs', undefined, (args) => {
            if (args.type === 'progress') itemCompletionCallback({ ...args });
        });
        await flush('settings', undefined, (args) => {
            if (args.type === 'progress') itemCompletionCallback({ ...args });
        });
        await STORES.data.clear();
    };

    export const remove = async (kind: CacheKind, uid: UIDType) => {
        await STORES[kind].removeItem(uid);
        await STORES.data.removeItem(uid);
        const resOr = await deleteAsset(uid);
        notifyNeg(resOr);
    };

    export const clearAll = async () => {
        await STORES.asset.clear();
        await STORES.fs.clear();
        await STORES.settings.clear();
        await STORES.data.clear();
    };
}

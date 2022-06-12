import { UserInfo } from './dfx/dfx.did.d';
import { dfx } from './dfx';
import { IFileSystem, serialize } from './fs';
import { GenericObjType, isDef } from './basic';
import {
    AcceptableType, handelCanisterErr, storeAssetsBatch, UIDType,
} from './canisterHelper';
import { ISerializedUserSetting } from '../stores';
import { ItemCompletionCallbackType } from './types';

const {
    createUser: createUserOnCanister,
    fetchUserInfo, fetchFileSystem: fetchFileSystemFromCanister, fetchSetting: fetchSettingFromCanister,
    updateSetting, updateFileSystem,
} = dfx;

export const storeSetting = async (uid: UIDType, payload: GenericObjType) => {
    const normalizeData = JSON.stringify(payload);
    const resultOr = await updateSetting(uid, normalizeData);
    handelCanisterErr(resultOr);
};

export const storeSettingBatch = async (
    payload: ISerializedUserSetting,
    itemCompletionCallback: ItemCompletionCallbackType = () => { },
) => {
    const promises = [] as Promise<void>[];
    itemCompletionCallback({ type: 'itemEstimation', items: Object.keys(payload).length });
    Object.entries(payload)
        .forEach(([uid, obj]) => {
            const fn = async () => {
                await storeSetting(uid, obj);
                itemCompletionCallback({ type: 'progress' });
            };
            promises.push(fn());
        });
    await Promise.all(promises);
};

export const fetchSetting = async (uid: keyof ISerializedUserSetting): Promise<GenericObjType | undefined> => {
    const resultOr = await fetchSettingFromCanister(uid);
    if (handelCanisterErr(resultOr)) return JSON.parse(resultOr.ok);
    return undefined;
};

export const fetchSettingBatch = async (
    uids: (keyof ISerializedUserSetting)[],
    itemCompletionCallback: ItemCompletionCallbackType = () => { },
) => {
    const promises = [] as Promise<void>[];
    const res = {} as ISerializedUserSetting;
    const set = new Set<keyof ISerializedUserSetting>();
    itemCompletionCallback({ type: 'itemEstimation', items: uids.length });
    uids.forEach((uid) => {
        if (set.has(uid)) {
            itemCompletionCallback({ type: 'progress' });
            return;
        }
        set.add(uid);
        const fn = async () => {
            const result = await fetchSetting(uid);
            if (!isDef(result)) return;
            res[uid] = result;
            itemCompletionCallback({ type: 'progress' });
        };
        promises.push(fn());
    });
    await Promise.all(promises);
    return res;
};

export const createUser = async (
    userInfo: UserInfo,
    fs: IFileSystem,
    settings: ISerializedUserSetting,
    assets?: { uid: UIDType, name: string, payload: AcceptableType }[],
    itemCompletionCallback: ItemCompletionCallbackType = () => { },
) => {
    itemCompletionCallback({ type: 'itemEstimation', items: 2 + Object.keys(settings).length + (assets?.length || 0) });
    const serializedFS = JSON.stringify(serialize(fs));
    const resultOr = await createUserOnCanister(userInfo, [serializedFS]);

    handelCanisterErr(resultOr);
    await storeSettingBatch(settings, ({ type }) => {
        if (type === 'progress') itemCompletionCallback({ type });
    });

    if (!isDef(assets)) return;
    await storeAssetsBatch(assets, true, ({ type }) => {
        if (type === 'progress') itemCompletionCallback({ type });
    });
};

export const getUserInfo = async () => {
    const userInfo = await fetchUserInfo();
    if (!('ok' in userInfo)) return undefined;
    return userInfo.ok;
};

export const fetchFileSystem = async (): Promise<IFileSystem> => {
    const result = await fetchFileSystemFromCanister();
    handelCanisterErr(result);
    if (!('ok' in result)) throw new Error('[fetchFileSystem]: invalid response payload');
    return JSON.parse(result.ok) as IFileSystem;
};

export const storeFileSystem = async (fs: IFileSystem) => {
    const serializedFS = JSON.stringify(serialize(fs));
    const result = await updateFileSystem(serializedFS);
    handelCanisterErr(result);
};

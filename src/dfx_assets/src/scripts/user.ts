import { UserInfo } from './dfx/dfx.did.d';
import { dfx } from './dfx';
import { IFileSystem, serialize } from './fs';
import { GenericObjType, isDef } from './basic';
import {
    AcceptableType, handelCanisterErr, storeAssetsBatch, UIDType,
} from './canisterHelper';
import { ISerializedUserSetting } from '../stores';
import { ItemCompletionCallbackType } from './types';
import { IUser } from '../stores/user';
import useCanisterManager from '../stores/canisterManager';

const {
    createUser: createUserOnCanister,
    fetchUserInfo, fetchFileSystem: fetchFileSystemFromCanister, fetchSetting: fetchSettingFromCanister,
    updateSetting, updateFileSystem, updateUserInfo: updateUserInfoOnCanister,
} = dfx;

export const storeSetting = async (uid: keyof ISerializedUserSetting, payload: GenericObjType) => {
    useCanisterManager().addItem(uid, {
        kind: 'upload',
        type: 'setting',
        state: 'processing',
        uid,
        time: Date.now(),
    });
    const normalizeData = JSON.stringify(payload);
    const resultOr = await updateSetting(uid, normalizeData);
    handelCanisterErr(resultOr, uid);
    useCanisterManager().setState(uid, 'success');
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
                type Key = keyof ISerializedUserSetting;
                await storeSetting(uid as Key, obj);
                itemCompletionCallback({ type: 'progress', item: { uid } });
            };
            promises.push(fn());
        });
    await Promise.all(promises);
};

export const fetchSetting = async (uid: keyof ISerializedUserSetting): Promise<GenericObjType | undefined> => {
    useCanisterManager().addItem(uid, {
        kind: 'download',
        type: 'setting',
        state: 'processing',
        uid,
        time: Date.now(),
    });
    const resultOr = await fetchSettingFromCanister(uid);
    try {
        handelCanisterErr(resultOr);
        if (!('ok' in resultOr)) return undefined;
        const result = JSON.parse(resultOr.ok);
        useCanisterManager().setState(uid, 'success');
        return result;
    } catch (e) {
        useCanisterManager().setState(uid, 'failed');
        return undefined;
    }
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
            itemCompletionCallback({ type: 'progress', item: { uid } });
            return;
        }
        set.add(uid);
        const fn = async () => {
            const result = await fetchSetting(uid);
            if (!isDef(result)) return;
            res[uid] = result;
            itemCompletionCallback({ type: 'progress', item: { uid } });
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
    await storeSettingBatch(settings, (args) => {
        if (args.type === 'progress') itemCompletionCallback({ ...args });
    });

    if (!isDef(assets)) return;
    await storeAssetsBatch(assets, true, (args) => {
        if (args.type === 'progress') itemCompletionCallback({ ...args });
    });
};

export const getUserInfo = async (): Promise<IUser | undefined> => {
    const userInfo = await fetchUserInfo();
    if (!('ok' in userInfo)) return undefined;
    const {
        firstname, lastname, avatar, uid,
    } = userInfo.ok;
    const temp = avatar.pop();
    return {
        uid,
        firstname,
        lastname,
        profileAvatar: isDef(temp) ? JSON.parse(temp) : undefined,
    };
};

export const fetchFileSystem = async (): Promise<IFileSystem> => {
    useCanisterManager().addItem('fs', {
        kind: 'download',
        type: 'fs',
        state: 'processing',
        time: Date.now(),
    });
    const result = await fetchFileSystemFromCanister();
    handelCanisterErr(result, 'fs');
    try {
        if (!('ok' in result)) {
            throw new Error('[fetchFileSystem]: invalid response payload');
        }
        const response = JSON.parse(result.ok) as IFileSystem;
        useCanisterManager().setState('fs', 'success');
        return response;
    } catch (e) {
        useCanisterManager().setState('fs', 'failed');
        throw e;
    }
};

export const storeFileSystem = async (fs: IFileSystem) => {
    useCanisterManager().addItem('fs', {
        type: 'fs',
        kind: 'upload',
        state: 'processing',
        time: Date.now(),
    });
    try {
        const serializedFS = JSON.stringify(serialize(fs));
        const result = await updateFileSystem(serializedFS);
        handelCanisterErr(result, 'fs');
        useCanisterManager().setState('fs', 'success');
    } catch (e) {
        useCanisterManager().setState('fs', 'failed');
        throw e;
    }
};

export const updateUserInfo = async (user: IUser) => {
    const { firstname, lastname, profileAvatar } = user;
    const result = await updateUserInfoOnCanister({
        firstname,
        lastname,
        avatar: isDef(profileAvatar) ? [JSON.stringify(profileAvatar)] : [],
    });
    handelCanisterErr(result);
};

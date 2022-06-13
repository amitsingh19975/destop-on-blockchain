import { defineStore } from 'pinia';
import { AuthClient } from '@dfinity/auth-client';
import { Actor } from '@dfinity/agent';
import { Ref, ref } from 'vue';
import { IIcon } from '../scripts/types';
import { dfx } from '../scripts/dfx';
import { isDef, persistentStorage } from '../scripts/basic';
import {
    createUser, fetchFileSystem, fetchSettingBatch, getUserInfo,
} from '../scripts/user';
import ROOT, { deserialize, IDirectory } from '../scripts/fs';
import { deserializeUserSettings, setSettingsWatcher } from '.';
import { CacheManager } from '../scripts/cacheManager';
import { notifyNeg } from '../scripts/notify';

export interface IUser {
    uid: string;
    firstname: string;
    lastname: string;
    profileAvatar?: IIcon,
}

const defaultUserInfo = (): IUser => ({
    uid: '',
    firstname: '',
    lastname: '',
    // profileAvatar: { type: 'Image', data: 'https://cdn.quasar.dev/img/avatar.png' },
});

const useUser = defineStore('useUserStore', () => {
    const userInfo = ref<IUser>(defaultUserInfo());
    let _authClient = undefined as (AuthClient | undefined);
    const isLoggedIn = ref(false);
    const isNewUser = ref(false);
    const root = ref<IDirectory>(ROOT);
    const isLogOutInProcess = ref(false);
    const loadingPercentage = ref(0);

    const setUserInfoIfExist = async () => {
        const tempUserInfo = await getUserInfo();
        if (!isDef(tempUserInfo)) {
            isNewUser.value = true;
            return;
        }
        userInfo.value = tempUserInfo;
    };

    const percentageCal = (completion: number, total: number): number => ((completion / total) * 100);
    const progressObj = (loadingVar: Ref<number>, total: number) => {
        loadingVar.value = 0;
        return {
            _currItem: 0,
            next(): void {
                this._currItem += 1;
                loadingVar.value = percentageCal(this._currItem, total);
            },
            complete(): void {
                loadingVar.value = 100;
            },
        };
    };

    const initSystem = async () => {
        if (isNewUser.value) return;
        const per = progressObj(loadingPercentage, 1 + 3);
        const fs = deserialize(await fetchFileSystem());
        root.value = fs as IDirectory;
        per.next();
        const settings = await fetchSettingBatch(['extMappings', 'icons', 'theme'], () => per.next());
        deserializeUserSettings(settings);
        per.complete();
        // console.log(root.value);
    };

    const logout = async (): Promise<boolean> => {
        if (!isDef(_authClient)) return true;
        isLogOutInProcess.value = true;
        try {
            await _authClient.logout();
            await CacheManager.flush();
        } catch (e) {
            notifyNeg(e, { pre: 'Encoutered error while logout: ' });
            isLogOutInProcess.value = false;
            return false;
        }
        userInfo.value = defaultUserInfo();
        isLogOutInProcess.value = false;
        isLoggedIn.value = false;
        // eslint-disable-next-line no-restricted-globals
        location.reload();
        return true;
    };

    const handleAuthenticated = async () => {
        if (!isDef(_authClient)) return;
        const identity = _authClient.getIdentity();
        Actor.agentOf(dfx)?.replaceIdentity?.(identity);
        _authClient.idleManager?.registerCallback(async () => {
            logout();
            Actor.agentOf(dfx)?.invalidateIdentity?.();
        });
        isLoggedIn.value = true;
        await setUserInfoIfExist();
        if (!isNewUser.value) {
            await initSystem();
            await persistentStorage();
            setSettingsWatcher();
        }
    };

    const setLoggedInState = async (): Promise<void> => {
        if (!isDef(_authClient)) return;
        isLoggedIn.value = await _authClient.isAuthenticated();
    };

    const init = async (): Promise<void> => {
        if (!isDef(_authClient)) _authClient = await AuthClient.create();

        await setLoggedInState();
        if (isLoggedIn.value) handleAuthenticated();
    };

    const identityCanisterURL = () => {
        // @ts-ignore
        const network = process.env.DFX_NETWORK || process.env.NODE_ENV === 'production' ? 'ic' : 'local';
        // @ts-ignore
        const canisterIIId = process.env.II_CANISTER_ID;
        if (network === 'local') {
            // return `https://${canisterIIId}.localhost:8000?#authorize`;
            return `http://localhost:8000/?canisterId=${canisterIIId}`;
        }
        if (network === 'ic') {
            return `https://${canisterIIId}.ic0.app`;
        }
        return `https://${canisterIIId}.dfinity.network`;
    };

    const login = (): Promise<void> => {
        const days = 1n;
        const hours = 24n;
        const nanoseconds = 3_600_000_000_000n;
        return new Promise<void>((resolve, reject) => {
            if (!isDef(_authClient)) {
                reject('Method["login"] called before method["init"]!');
                return;
            }
            _authClient.login({
                identityProvider: identityCanisterURL(),
                onSuccess: async () => {
                    await handleAuthenticated();
                    resolve();
                },
                onError: (error?: string) => {
                    isLoggedIn.value = false;
                    userInfo.value = defaultUserInfo();
                    reject(error);
                },
                maxTimeToLive: days * hours * nanoseconds,
            });
        });
    };

    const createNewUser = async (...args: Parameters<typeof createUser>) => {
        if (!isNewUser.value) throw new Error('User already exists!');
        await createUser(...args);
        const temp = await getUserInfo();
        if (!isDef(temp)) throw new Error('unable to create user profile or backend is offline');
        userInfo.value = temp;
        isNewUser.value = false;
        setSettingsWatcher();
    };

    return {
        userInfo,
        isLoggedIn,
        setLoggedInState,
        logout,
        login,
        init,
        isNewUser,
        createNewUser,
        root,
        isLogOutInProcess,
        loadingPercentage,
    };
});

export default useUser;

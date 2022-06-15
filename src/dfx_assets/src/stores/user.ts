import { defineStore } from 'pinia';
import { AuthClient } from '@dfinity/auth-client';
import { Actor } from '@dfinity/agent';
import {
    Ref, ref, shallowReactive, watch,
} from 'vue';
import { Loading } from 'quasar';
import { IIcon } from '../scripts/types';
import { dfx } from '../scripts/dfx';
import { isDef } from '../scripts/basic';
import {
    createUser, getUserInfo,
} from '../scripts/user';
import ROOT, { IDirectory } from '../scripts/fs';
import {
    deserializeUserSettings, putAllSettingsInCache, setSettingsWatcher,
} from '.';
import { notifyNeg } from '../scripts/notify';
import { commitAll } from '../scripts/storage';
import { CacheManager } from '../scripts/cacheManager';

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
    const saveingProgressPercentage = ref(0);
    const autoSaveConfig = shallowReactive<{
        autoSaveIntervalId: null | ReturnType<typeof setInterval>,
        autoSaveTimerId: null | ReturnType<typeof setInterval>,
        autoSaveTimer: number | null,
        isAutoSavingInProcess: boolean,
    }>({
        autoSaveIntervalId: null,
        autoSaveTimerId: null,
        autoSaveTimer: null,
        isAutoSavingInProcess: false,
    });

    let fsModifedDate = 0;

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
                if (this._currItem === total) return;
                this._currItem += 1;
                loadingVar.value = percentageCal(this._currItem, total);
            },
            complete(): void {
                this._currItem = total;
                loadingVar.value = 100;
            },
        };
    };

    const emptyThePersistentStorage = async () => {
        autoSaveConfig.isAutoSavingInProcess = true;
        const len = await CacheManager.findAllDirty();
        const per = progressObj(saveingProgressPercentage, len);
        await commitAll({
            itemCompletionCallback: ({ type }) => {
                if (type === 'progress') per.next();
            },
        });
        await CacheManager.clearAll();
        per.complete();
        autoSaveConfig.isAutoSavingInProcess = false;
    };

    const updateFileSystem = async () => {
        await CacheManager.put('fs', 'fs', 'FileSystem', root.value, { dataModifed: fsModifedDate });
        fsModifedDate = Date.now();
    };

    const saveSytemData = async () => {
        autoSaveConfig.isAutoSavingInProcess = true;
        const len = await CacheManager.findAllDirty() + 1 + 3;
        const per = progressObj(saveingProgressPercentage, len);
        await updateFileSystem();
        per.next();
        await putAllSettingsInCache(({ type }) => {
            if (type === 'progress') per.next();
        });
        await commitAll({
            itemCompletionCallback: ({ type }) => {
                if (type === 'progress') per.next();
            },
        });
        per.complete();
        autoSaveConfig.isAutoSavingInProcess = false;
    };

    const initSystem = async () => {
        if (isNewUser.value) return;
        const per = progressObj(loadingPercentage, 1 + 3);

        const fs = await CacheManager.getFs();
        root.value = fs as IDirectory;
        fsModifedDate = Date.now();

        per.next();

        const settings = await CacheManager.getSettings(['extMappings', 'icons', 'theme'], ({ type }) => {
            if (type === 'progress') per.next();
        });
        deserializeUserSettings(settings);
        per.complete();
        emptyThePersistentStorage();
    };

    const startAutoSaveTimer = (time: number = 5, prefix: 'hr' | 'min' | 'sec' = 'min') => { // 5min
        if (!isLoggedIn.value) return;
        const normalizeTime: number = (time * 1000) * (prefix === 'sec' ? 1 : 60 * (prefix === 'hr' ? 60 : 1));
        if (isDef(autoSaveConfig.autoSaveIntervalId)) {
            clearInterval(autoSaveConfig.autoSaveIntervalId);
            autoSaveConfig.autoSaveIntervalId = null;
        }

        autoSaveConfig.autoSaveTimer = normalizeTime;
        autoSaveConfig.autoSaveTimerId = setInterval(async () => {
            if (!isDef(autoSaveConfig.autoSaveTimer)) return;
            if (autoSaveConfig.isAutoSavingInProcess || autoSaveConfig.autoSaveTimer <= 0) {
                autoSaveConfig.autoSaveTimer = normalizeTime;
                return;
            }
            autoSaveConfig.autoSaveTimer -= 1000;
        }, 1000);

        autoSaveConfig.autoSaveIntervalId = setInterval(async () => {
            if (!autoSaveConfig.isAutoSavingInProcess) await saveSytemData();
            if (isDef(autoSaveConfig.autoSaveTimerId)) clearInterval(autoSaveConfig.autoSaveTimerId);
        }, normalizeTime);
    };

    const stopAutoSaveTimer = () => {
        if (isDef(autoSaveConfig.autoSaveIntervalId)) {
            clearInterval(autoSaveConfig.autoSaveIntervalId);
        }
        if (isDef(autoSaveConfig.autoSaveTimerId)) {
            clearInterval(autoSaveConfig.autoSaveTimerId);
        }

        autoSaveConfig.autoSaveTimerId = null;
        autoSaveConfig.autoSaveIntervalId = null;
        autoSaveConfig.autoSaveTimer = null;
    };

    const logout = async (): Promise<boolean> => {
        if (!isDef(_authClient)) return true;
        isLogOutInProcess.value = true;
        Loading.show({
            message: 'Logging Out, please wait...',
        });
        try {
            // window.onbeforeunload = null;
            stopAutoSaveTimer();
            if (!autoSaveConfig.isAutoSavingInProcess) await saveSytemData();
            await CacheManager.flushAll();
            await _authClient.logout();
            Actor.agentOf(dfx)?.invalidateIdentity?.();
            isLoggedIn.value = false;
        } catch (e) {
            notifyNeg(e, { pre: 'Encoutered error while logout: ' });
        } finally {
            isLogOutInProcess.value = false;
            Loading.hide();
        }
        if (!isLoggedIn.value) window?.location.reload();
        return !isLoggedIn.value;
    };

    const initAfterProperLogin = async () => {
        if (isNewUser.value) return;
        // await persistentStorage();
        setSettingsWatcher();
        watch(root, async () => {
            fsModifedDate = Date.now();
            await updateFileSystem();
        }, { deep: true });
        startAutoSaveTimer();
    };

    const handleAuthenticated = async () => {
        if (!isDef(_authClient)) return;
        const identity = _authClient.getIdentity();
        Actor.agentOf(dfx)?.replaceIdentity?.(identity);
        _authClient.idleManager?.registerCallback(async () => {
            logout();
        });
        isLoggedIn.value = true;
        await setUserInfoIfExist();
        if (!isNewUser.value) await initSystem();
        await initAfterProperLogin();
        // if (isDef(window)) {
        //     window.onbeforeunload = (e: Event) => {
        //         e.preventDefault();
        //         if (isLoggedIn.value) {
        //             return 'Are you sure? You may lose data that has not be committed to the backend! To avoid this, please logout.';
        //         }
        //         return null;
        //     };
        // }
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
        initAfterProperLogin();
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
        saveSytemData,
        startAutoSaveTimer,
        stopAutoSaveTimer,
        autoSaveConfig,
        saveingProgressPercentage,
        updateFileSystem,
    };
});

export default useUser;

import { createPinia } from 'pinia';
import { watch } from 'vue';
import { GenericObjType, isDef } from '../scripts/basic';
import { CacheManager } from '../scripts/cacheManager';
import { notifyNeg } from '../scripts/notify';
import { ItemCompletionCallbackType } from '../scripts/types';
import { updateUserInfo } from '../scripts/user';
import useExtMapping from './extMapping';
import useIcons from './icons';
import useTheme from './theme';
import useUser from './user';

export interface ISerializedUserSetting {
    extMappings: GenericObjType;
    icons: GenericObjType;
    theme: GenericObjType;
}

const MODIFED_TIME = {} as Record<keyof ISerializedUserSetting, number>;

export const putExtMappingInCache = async (lazyCommit?: boolean) => {
    await CacheManager.put(
        'settings',
        'extMappings',
        'Extension Mapping',
        useExtMapping().serialize(),
        { lazyCommit, dataModifed: MODIFED_TIME.extMappings },
    );
};

export const putIconsInCache = async (lazyCommit?: boolean) => {
    await CacheManager.put(
        'settings',
        'icons',
        'Icons',
        useIcons().serialize(),
        { lazyCommit, dataModifed: MODIFED_TIME.icons },
    );
};

export const putThemeInCache = async (lazyCommit?: boolean) => {
    await CacheManager.put(
        'settings',
        'theme',
        'Theme',
        useTheme().serialize(),
        { lazyCommit, dataModifed: MODIFED_TIME.theme },
    );
};

export const putAllSettingsInCache = async (itemCompletionCallback: ItemCompletionCallbackType, lazyCommit?: boolean) => {
    itemCompletionCallback({ type: 'itemEstimation', items: 3 });
    await putExtMappingInCache(lazyCommit);
    itemCompletionCallback({ type: 'progress', item: { uid: 'extMappings' } });
    await putIconsInCache(lazyCommit);
    itemCompletionCallback({ type: 'progress', item: { uid: 'icons' } });
    await putThemeInCache(lazyCommit);
    itemCompletionCallback({ type: 'progress', item: { uid: 'theme' } });
};

export const setSettingsWatcher = (): void => {
    watch(() => useUser().$state, async ({ userInfo }) => {
        try {
            await updateUserInfo(userInfo);
        } catch (e) {
            notifyNeg(e, { pre: 'Encoutered error while updating profile: ' });
        }
    }, { deep: true });
    watch(() => useExtMapping().$state, () => {
        MODIFED_TIME.extMappings = Date.now();
        putExtMappingInCache();
    }, { deep: true });
    watch(() => useIcons().$state, () => {
        MODIFED_TIME.icons = Date.now();
        putIconsInCache();
    }, { deep: true });
    watch(() => useTheme().$state, () => {
        MODIFED_TIME.theme = Date.now();
        putThemeInCache();
    }, { deep: true });
};

export const serializeUserSettings = (): ISerializedUserSetting => ({
    extMappings: useExtMapping().serialize(),
    icons: useIcons().serialize(),
    theme: useTheme().serialize(),
});

export const deserializeUserSettings = (settings: Partial<ISerializedUserSetting>) => {
    const {
        extMappings,
        icons,
        theme,
    } = settings;
    if (isDef(extMappings)) useExtMapping().deserialize(extMappings);
    if (isDef(icons)) useIcons().deserialize(icons);
    if (isDef(theme)) useTheme().deserialize(theme);
};

const pinia = createPinia();

export default pinia;

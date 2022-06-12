import { createPinia } from 'pinia';
import { watch } from 'vue';
import { GenericObjType, isDef } from '../scripts/basic';
import { notifyNeg } from '../scripts/notify';
import { storeSetting, updateUserInfo } from '../scripts/user';
import useExtMapping from './extMapping';
import useIcons from './icons';
import useTheme from './theme';
import useUser from './user';

export interface ISerializedUserSetting {
    extMappings: GenericObjType;
    icons: GenericObjType;
    theme: GenericObjType;
}

export const setSettingsWatcher = (): void => {
    watch(() => useUser().$state, async ({ userInfo }) => {
        try {
            await updateUserInfo(userInfo);
        } catch (e) {
            notifyNeg(e, { pre: 'Encoutered error while updating profile: ' });
        }
    }, { deep: true });
    watch(() => useExtMapping().$state, () => {
        storeSetting('extMappings', useExtMapping().serialize());
    }, { deep: true });
    watch(() => useIcons().$state, () => {
        storeSetting('icons', useIcons().serialize());
    }, { deep: true });
    watch(() => useTheme().$state, () => {
        storeSetting('theme', useTheme().serialize());
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

import { createPinia } from 'pinia';
import { GenericObjType, isDef } from '../scripts/basic';
import useExtMapping from './extMapping';
import useIcons from './icons';
import useTheme from './theme';

export interface ISerializedUserSetting {
    extMappings: GenericObjType;
    icons: GenericObjType;
    theme: GenericObjType;
}

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

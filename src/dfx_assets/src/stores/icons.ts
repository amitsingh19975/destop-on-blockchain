import { defineStore } from 'pinia';

import { IIcon } from '../scripts/types';
import { GenericObjType, isDef, patchObject } from '../scripts/basic';
import { ComponentType } from '../windowApp';

interface IFileSystemIcons extends Record<string, IIcon> {
    folder: IIcon;
    file: IIcon;
    text: IIcon;
    audio: IIcon;
    video: IIcon;
    json: IIcon;
    image: IIcon;
}

type ComponentIconType = { [key in ComponentType]?: IIcon };
export interface IIcons extends Record<string, IIcon | IFileSystemIcons | ComponentIconType> {
    startBtn: IIcon;
    close: IIcon;
    maximize: IIcon;
    minimize: IIcon;
    windowMinimize: IIcon;
    unknown: IIcon;
    fileSystem: IFileSystemIcons;
    warning: IIcon,
    danger: IIcon,
    info: IIcon,
    copyFile: IIcon,
    copyContent: IIcon,
    paste: IIcon,
    rename: IIcon,
    open: IIcon,
    save: IIcon,
    components: ComponentIconType,
    newFile: IIcon,
    newFolder: IIcon,
}

const UNKNOWN: IIcon = {
    type: 'Fontawesome',
    data: 'fa-solid fa-file-circle-question',
};

const normalizeIcon = <K extends IIcons | IFileSystemIcons | ComponentIconType>(
    icons: K,
    key: keyof K,
): string => {
    const temp = icons[key] as unknown as IIcon;
    if (!isDef(temp) || typeof temp.data !== 'string') { return UNKNOWN.data; }
    switch (temp.type) {
        case 'Fontawesome':
        case 'Material':
        case 'Ion':
            return temp.data;
        case 'Image':
            return `img:${temp.data}`;
        default:
            return '';
    }
};

const useIcons = defineStore('useIconsStore', {
    state: () => ({
        icons: {
            startBtn: { type: 'Material', data: 'donut_small' },
            close: { type: 'Fontawesome', data: 'fa-solid fa-xmark' },
            maximize: { type: 'Fontawesome', data: 'fa-solid fa-maximize' },
            minimize: { type: 'Fontawesome', data: 'fa-solid fa-minimize' },
            windowMinimize: {
                type: 'Fontawesome',
                data: 'fa-solid fa-window-minimize',
            },
            unknown: UNKNOWN,
            fileSystem: {
                folder: { type: 'Fontawesome', data: 'fa-solid fa-folder' },
                text: { type: 'Fontawesome', data: 'fa-solid fa-file-lines' },
                json: { type: 'Fontawesome', data: 'fa-solid fa-file-code' },
                file: { type: 'Fontawesome', data: 'fa-solid fa-file' },
                audio: { type: 'Fontawesome', data: 'fa-solid fa-file-audio' },
                video: { type: 'Fontawesome', data: 'fa-solid fa-film' },
                image: { type: 'Fontawesome', data: 'fa-solid fa-image' },
            },
            components: {},
            warning: { type: 'Fontawesome', data: 'fa-solid fa-triangle-exclamation' },
            danger: { type: 'Fontawesome', data: 'fa-solid fa-circle-exclamation' },
            info: { type: 'Fontawesome', data: 'fa-solid fa-circle-info' },
            copyFile: { type: 'Material', data: 'file_copy' },
            copyContent: { type: 'Material', data: 'content_copy' },
            paste: { type: 'Material', data: 'content_paste' },
            rename: { type: 'Material', data: 'drive_file_rename_outline' },
            open: { type: 'Fontawesome', data: 'fa-solid fa-folder-open' },
            save: { type: 'Material', data: 'save' },
            newFile: { type: 'Material', data: 'note_add' },
            newFolder: { type: 'Material', data: 'create_new_folder' },
        } as IIcons,
    }),
    getters: {
        qIcon: (state) => (key: keyof Omit<IIcons, 'fileSystem' | 'components'>) => normalizeIcon(state.icons, key),
        fsIcon: (state) => (
            key: keyof IFileSystemIcons,
        ) => normalizeIcon(state.icons.fileSystem, key),
        compIcon: (state) => (
            key: ComponentType,
        ) => {
            const temp = state.icons.components[key];
            return isDef(temp) ? temp : UNKNOWN;
        },
        has: ({ icons }) => (
            key: keyof Omit<IIcons, 'fileSystem'> | ['fileSystem', keyof IFileSystemIcons] | ['components', ComponentType],
        ): boolean => {
            if (Array.isArray(key)) return key[1] in icons[key[0]];
            return key in icons;
        },
    },
    actions: {
        addIcon(
            key: keyof Omit<IIcons, 'fileSystem'> | ['fileSystem', keyof IFileSystemIcons],
            { type, data }: IIcon,
        ): void {
            if (!Array.isArray(key)) {
                this.icons[key] = { type, data };
            } else {
                this.icons[key[0]][key[1]] = { type, data };
            }
        },
        registerComponentIcon(component: ComponentType, icon: IIcon): void {
            this.icons.components[component] = icon;
        },
        serialize(): GenericObjType {
            return this.icons;
        },
        deserialize(data: GenericObjType): void {
            patchObject(this.icons, data);
        },
    },
});

export default useIcons;

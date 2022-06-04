import { defineStore } from 'pinia';

import { IIcon } from '../scripts/types';
import { isDef } from '../scripts/utils';

interface IFileSystemIcons extends Record<string, IIcon> {
    folder: IIcon;
    file: IIcon;
    text: IIcon;
    audio: IIcon;
    video: IIcon;
    json: IIcon;
    image: IIcon;
}

export interface IIcons extends Record<string, IIcon | IFileSystemIcons> {
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
}

const UNKNOWN: IIcon = {
    type: 'Fontawesome',
    data: 'fa-solid fa-file-circle-question',
};

const normalizeIcon = (
    icons: IIcons | IFileSystemIcons,
    key: keyof IIcons | keyof IFileSystemIcons,
): string => {
    const temp = icons[key];
    if (!isDef(temp) || typeof temp.data !== 'string') { return UNKNOWN.data; }
    switch (temp.type) {
        case 'Fontawesome':
        case 'Material':
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
            close: { type: 'Fontawesome', data: 'fa-regular fa-xmark' },
            maximize: { type: 'Fontawesome', data: 'fa-regular fa-maximize' },
            minimize: { type: 'Fontawesome', data: 'fa-regular fa-minimize' },
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
            warning: { type: 'Fontawesome', data: 'fa-solid fa-triangle-exclamation' },
            danger: { type: 'Fontawesome', data: 'fa-solid fa-circle-exclamation' },
            info: { type: 'Fontawesome', data: 'fa-solid fa-circle-info' },
            copyFile: { type: 'Material', data: 'file_copy' },
            copyContent: { type: 'Material', data: 'content_copy' },
            paste: { type: 'Material', data: 'content_paste' },
            rename: { type: 'Material', data: 'drive_file_rename_outline' },
            open: { type: 'Fontawesome', data: 'fa-solid fa-folder-open' },
            save: { type: 'Material', data: 'save' },
        } as IIcons,
    }),
    getters: {
        qIcon: (state) => (key: keyof Omit<IIcons, 'fileSystem'>) => normalizeIcon(state.icons, key),
        fsIcon: (state) => (
            key: keyof IFileSystemIcons,
        ) => normalizeIcon(state.icons.fileSystem, key),
        has: ({ icons }) => (key: keyof Omit<IIcons, 'fileSystem'> | ['fileSystem', keyof IFileSystemIcons]): boolean => {
            if (Array.isArray(key)) return key[1] in icons.fileSystem;
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
    },
});

export default useIcons;

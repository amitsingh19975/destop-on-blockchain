import { defineStore } from 'pinia';
import { IFile, IFileSystem, isFile } from '../scripts/fs';
import { readFile } from '../scripts/storage';
import { IIcon, WinApp } from '../scripts/types';
import { ComponentType } from '../windowApp';
import useIcons from './icons';

type ExtMappingKeyType = string;

interface IExtMapping {
    [key: ExtMappingKeyType]: { icon: string, component?: ComponentType }
}

const iconMapping = (map: IExtMapping, argExt: ExtMappingKeyType) => {
    const ic = useIcons();
    const temp = map[argExt].icon;
    const { fileSystem } = ic.icons;
    if (temp && temp in fileSystem) return fileSystem[temp] as IIcon;
    return ic.icons.unknown;
};

const getIconHelper = (map: IExtMapping, ext: ExtMappingKeyType): IIcon => {
    const ic = useIcons();
    if (ext in map) return iconMapping(map, ext);
    return ic.icons.unknown;
};

const useExtMapping = defineStore('useExtMappingStore', {
    state: () => ({
        map: {
            '@Dir': {
                icon: 'folder',
            },
            txt: { icon: 'text' },
            json: { icon: 'json' },
        } as IExtMapping,
    }),
    getters: {
        icon:
            ({ map }) => (ext: ExtMappingKeyType): IIcon => getIconHelper(map, ext),
    },
    actions: {
        addMapping(ext: ExtMappingKeyType, icon: string, component?: ComponentType): void {
            this.map[ext] = {
                icon,
                component,
            };
        },
        addMappingUsingArray<T extends ExtMappingKeyType>(exts: readonly T[], icon: string, component?: ComponentType): void {
            exts.forEach((ext) => {
                this.map[ext] = {
                    icon,
                    component,
                };
            });
        },
        addIcon(ext: ExtMappingKeyType, iconName: string, icon: IIcon, component?: ComponentType): void {
            useIcons().addIcon(['fileSystem', iconName], icon);
            this.addMapping(ext, iconName, component);
        },
        addIconUsingArray<T extends ExtMappingKeyType>(
            exts: readonly T[],
            { component, iconName, icon }: {
                component?: ComponentType,
                iconName: string,
                icon?: IIcon,
            },
        ): void {
            const store = useIcons();
            if (!store.has(['fileSystem', iconName])) {
                store.addIcon(['fileSystem', iconName], icon || store.icons.unknown);
            }
            exts.forEach((ext) => this.addMapping(ext, iconName, component));
        },
        async _getFileIcon(node: IFile): Promise<IIcon> {
            const { map } = this;
            let { ext } = node;
            const { _uid } = node;

            if (ext === 'app') {
                if (_uid in map) return iconMapping(map, _uid);
                const { icon, meta } = await readFile<'generic', WinApp>({ node }) || {};
                if (typeof icon !== 'undefined') {
                    const comp = meta?.builtin?.component;
                    if (typeof icon === 'string') {
                        ext = icon;
                        this.addMapping(_uid, ext, comp);
                    } else {
                        this.addIcon(_uid, _uid, icon, comp);
                        return icon;
                    }
                }
            }
            return getIconHelper(map, ext);
        },

        async getFileComponent(node: IFile): Promise<ComponentType | undefined> {
            const { map } = this;
            const { _uid, ext } = node;

            if (ext === 'app') {
                if (_uid in map) return map[_uid].component;
                const { meta = {} } = await readFile<'generic', WinApp>({ node }) || {};
                if (typeof meta.builtin !== 'undefined') {
                    return meta.builtin.component;
                }
                // TODO: handle external source;
                return undefined;
            }
            return map[ext]?.component;
        },

        async getIcon(node: IFileSystem): Promise<IIcon> {
            if (isFile(node)) return this._getFileIcon(node);
            return getIconHelper(this.map, '@Dir');
        },

    },
});

export default useExtMapping;

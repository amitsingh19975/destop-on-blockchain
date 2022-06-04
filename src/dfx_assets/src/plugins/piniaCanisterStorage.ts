import { PiniaPluginContext, StateTree } from 'pinia';
import { reactive } from 'vue';
import { IDirectory, PathOptionsType } from '../scripts/fs';

interface IPiniaPersistantStorage {
    beforeRestore?: () => void;
    afterRestore?: () => void;
    onError?: (err: unknown) => void;
    write?: (path: string, data: StateTree, options: PathOptionsType) => void,
    read?: (path: string, options: PathOptionsType) => StateTree,
    path?: string | string[],
    root?: IDirectory,
}

type IPiniaPersistantStorageArgs = Pick<IPiniaPersistantStorage, 'afterRestore' | 'beforeRestore' | 'onError' | 'write' | 'read'>;

declare module 'pinia' {
    export interface DefineStoreOptionsBase<S extends StateTree, Store> {
        persist?: IPiniaPersistantStorage | IPiniaPersistantStorage['path'];
    }
}

export default (options: IPiniaPersistantStorageArgs) => (
    { store, options: { persist } }: PiniaPluginContext,
) => {
    // if (typeof persist === 'undefined' || persist === null) return;
};

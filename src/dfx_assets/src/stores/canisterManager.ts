import { defineStore } from 'pinia';
import { isDef } from '../scripts/basic';
import { UIDType } from '../scripts/canisterHelper';
import { ContentInfo } from '../scripts/dfx/dfx.did.d';

type ContentInfoType = { [k in keyof ContentInfo]: ContentInfo[k] extends BigInt ? number : ContentInfo[k] };

export type ItemType = { kind: 'download' | 'upload', time: number } & (
    { state: 'success' | 'failed' | 'processing' } & ({
        type: 'asset',
        info: ContentInfoType,
        processedChunks: number,
    } | {
        type: 'setting',
        uid: UIDType,
    } | {
        type: 'fs',
    }) | { state: 'init', type: 'asset', uid: UIDType, processedChunks: number }
);

export const canisterContentInfoToStoreContentInfo = (info: ContentInfo): ContentInfoType => ({
    name: info.name,
    dtype: info.name,
    size: Number(info.size),
    totalChunks: Number(info.totalChunks),
    uid: info.uid,
});

const useCanisterManager = defineStore('useCanisterManagerStore', {
    state: () => ({
        activities: {} as Record<UIDType, ItemType>,
    }),
    getters: {
        downalods: ({ activities }) => {
            const res: Record<UIDType, Omit<ItemType, 'kind'>> = {};
            Object.entries(activities).forEach(([k, v]) => {
                if (v.kind === 'download') res[k] = v;
            });
            return res;
        },
        upload: ({ activities }) => {
            const res: Record<UIDType, Omit<ItemType, 'kind'>> = {};
            Object.entries(activities).forEach(([k, v]) => {
                if (v.kind === 'upload') res[k] = v;
            });
            return res;
        },
        isEmpty: ({ activities }) => Object.keys(activities).length === 0,
        has: ({ activities }) => (uid: UIDType) => uid in activities,
    },
    actions: {
        addItem(uid: UIDType, item: ItemType, destructTimeout: null | number = 5 * 60 * 1000 /* 5 min */): void {
            this.activities[uid] = item;
            if (!isDef(destructTimeout)) return;
            setTimeout(() => this.deleteItem(uid), destructTimeout);
        },
        deleteItem(uid: UIDType): void {
            if (uid in this.activities) delete this.activities[uid];
        },
        getItem(uid: UIDType): ItemType | undefined {
            return this.activities[uid];
        },
        setState(uid: UIDType, state: ItemType['state']): void {
            const item = this.getItem(uid);
            if (!isDef(item)) return;
            item.state = state;
        },
        deleteItemWithState(states: ItemType['state'][]): void {
            const ids = [] as string[];
            Object.entries(this.activities).forEach(([id, { state }]) => {
                if (states.includes(state)) ids.push(id);
            });
            ids.forEach((id) => this.deleteItem(id));
        },
        setProcessedChunk(uid: UIDType, chunks: number): void {
            const item = this.getItem(uid);
            if (!isDef(item) || item.type !== 'asset') return;
            item.processedChunks = chunks;
        },
        incProcessedCChunk(uid: UIDType): void {
            const item = this.getItem(uid);
            if (!isDef(item) || item.type !== 'asset') return;
            item.processedChunks += 1;
        },
    },
});

export default useCanisterManager;

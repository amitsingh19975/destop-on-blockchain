import { computed } from '@vue/reactivity';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { GenericObjType, isDef } from '../scripts/basic';

type ClipboardKindType = 'text' | 'json' | 'blob';
type ClipboardType = string | Blob | GenericObjType;
type ReadReturnType<K> = K extends 'text' ? string : (K extends 'json' ? GenericObjType : Blob);

const useLocalClipboard = defineStore('useLocalClipboardStore', () => {
    const _data = ref<{
        [key in PropertyKey]: {
            type: ClipboardKindType,
            data: unknown,
        }
    }>({});

    const write = <T extends ClipboardType>(id: PropertyKey, type: ClipboardKindType, data: T): Promise<void> => new Promise((resolve) => {
        _data.value[id] = {
            type,
            data,
        };
        resolve();
    });

    const read = <K extends ClipboardKindType>(id: PropertyKey, type: K): Promise<ReadReturnType<K>> => new Promise((resolve, reject) => {
        const temp = _data.value[id];
        if (!isDef(temp)) {
            reject('[LocalClipboard]: clipboard is empty');
            return;
        }
        if (type !== temp.type) {
            reject('[LocalClipboard]: stored type in clipboard does not match with the provided type');
            return;
        }
        delete _data.value[id];
        resolve(temp.data as ReadReturnType<K>);
    });

    const has = (id: PropertyKey) => id in _data.value;

    return {
        write,
        read,
        has,
    };
});

export default useLocalClipboard;

<template>
    <span class="fit" ref="rootRef">
        <span style="color: white" v-for="(fs, name, i) in items" :key="childrenKeys[i]">
            <v-item-icon :node="fs" :focused="focusedIconId === i" @click="focusIcon(i, fs)"
                :edit-mode="editModeIconId === i" :dimmed-focus="isDimmedFocus(i)" @unfocus="unfocus()"
                @dblclick="emitDblClick(fs)" @update:position="updatePosition(name, $event)" :ref="setIconsRefs"
                :style="getIconStyle(name)" v-context-menu="contextMenu" @update:label="renameNode(name, $event)">
            </v-item-icon>
        </span>
    </span>
</template>

<script setup lang="ts">
import { computed, toRef } from '@vue/reactivity';
import { storeToRefs } from 'pinia';
import {
    CSSProperties, onMounted, reactive, ref,
    nextTick,
    watch,
    inject,
    unref,
} from 'vue';
import { IContextMenuBindingArgs } from '../../plugins/v-context-menu';
import { isDef } from '../../scripts/basic';
import {
    IDirectory, IFileSystem,
} from '../../scripts/fs';
import { renameFsNode } from '../../scripts/fs/commands';
import { ascendingOrderAndSavePostiion } from '../../scripts/iconUtils';
import { rootInjectKey } from '../../scripts/injectKeys';
import { notifyNeg } from '../../scripts/notify';
import { removeFSNode } from '../../scripts/storage';
import { IPosition, PIDType, ShapeType } from '../../scripts/types';
import { CLIPBOARD_IDS, elementShape } from '../../scripts/utils';
import useCanisterManager from '../../stores/canisterManager';
import useIcons from '../../stores/icons';
import useLocalClipboard from '../../stores/localClipboard';
import useWindowManager from '../../stores/windowManager';
import VItemIcon from './VItemIcon.vue';

interface IProps {
    items: IDirectory['_children'];
    direction?: 'row' | 'col';
    pid?: PIDType;
    childrenKeys: string[],
}
interface IEmits {
    (e: 'dblclick', name?: string): void;
    (e: 'click', name?: string): void;
}

const props = defineProps<IProps>();
const emits = defineEmits<IEmits>();

const focusedIconId = ref(-1);
const editModeIconId = ref(-1);
const iconShape = reactive<ShapeType>({ width: 0, height: 0 });
const positions = reactive<Record<string, IPosition>>({});
const root = unref(inject(rootInjectKey));
const rootRef = ref<HTMLElement | null>(null);
let curFocusedNode: IFileSystem | undefined;
const { isFocused } = storeToRefs(useWindowManager());
const { focusOn } = useWindowManager();

const focusHelper = (fs: IFileSystem) => {
    curFocusedNode = fs;
    if (isDef(props.pid)) focusOn('window', props.pid);
    else focusOn('desktop');
};

const getIconStyle = (name: string): CSSProperties => {
    const temp = {
        top: `${positions[name]?.y || 0}px`,
        left: `${positions[name]?.x || 0}px`,
    };
    return temp;
};
const focusIcon = (id: number, fs: IFileSystem) => {
    focusedIconId.value = id;
    focusHelper(fs);
    emits('click', fs.name);
};

const unfocus = () => {
    focusedIconId.value = -1;
    editModeIconId.value = -1;
    curFocusedNode = undefined;
};

const emitDblClick = (fs: IFileSystem) => {
    focusHelper(fs);
    emits('dblclick', fs.name);
};
const updatePosition = (name: string, pos: IPosition) => {
    positions[name] = pos;
};

type VItemIconType = InstanceType<typeof VItemIcon>;

let iconRef: VItemIconType;

const setIconsRefs = (el: unknown) => {
    if (!el || typeof iconRef !== 'undefined') return;
    if (!(el instanceof HTMLElement)) iconRef = el as VItemIconType;
};

const parentShape = () => {
    const temp = useWindowManager().parentShape();
    if (!isDef(props.pid)) return temp;
    const par = elementShape(rootRef.value?.parentElement || rootRef.value);
    if (!isDef(par)) return temp;
    return Array.isArray(par) ? par[0] : par;
};

const iconRearrange = async () => {
    await nextTick(async () => {
        if (typeof iconRef === 'undefined') return;
        const { itemSize = { width: 0, height: 0 } } = iconRef;
        Object.assign(iconShape, itemSize);
        await ascendingOrderAndSavePostiion(props.direction || 'row', positions, props.items, iconShape, parentShape());
    });
};

watch(() => props.childrenKeys, async () => {
    await iconRearrange();
    unfocus();
});

// watch(() => props.pid, () => iconRearrange());

onMounted(async () => {
    iconRearrange();
});

const isDimmedFocus = (id: number): boolean => {
    const pid = toRef(props, 'pid');
    if (focusedIconId.value !== id) return false;
    if (isDef(pid.value)) return !isFocused.value('window', pid.value);
    return !isFocused.value('desktop');
};

const renameNode = (name: string, text: string): void => {
    const node = props.items[name];
    if (!isDef(node)) return;
    const res = renameFsNode(node, text);
    if (res instanceof Error) notifyNeg(res);
    editModeIconId.value = -1;
};

const contextMenu: IContextMenuBindingArgs = {
    closeConditional: () => {
        const pid = toRef(props, 'pid');
        if (focusedIconId.value < 0) return false;
        if (isDef(pid.value)) return isFocused.value('window', pid.value);
        return isFocused.value('desktop');
    },
    actions: () => ({
        copy: {
            icon: useIcons().qIcon('copyFile'),
            action: () => {
                if (!isDef(curFocusedNode)) return;
                useLocalClipboard()
                    .write(CLIPBOARD_IDS.filesystem, 'json', { ...curFocusedNode })
                    .catch(notifyNeg);
            },
        },
        rename: {
            icon: useIcons().qIcon('rename'),
            action: () => {
                editModeIconId.value = focusedIconId.value;
            },
        },
        Remove: {
            showCondition: () => {
                if (!isDef(curFocusedNode)) return false;
                const { _uid, _isCommitted } = curFocusedNode;
                const item = useCanisterManager().getItem(_uid);
                if (!isDef(item)) return _isCommitted;
                return _isCommitted && (item.state === 'success' || item.state === 'failed');
            },
            action: async () => {
                await removeFSNode(curFocusedNode!);
            },
            icon: {
                type: 'Material',
                data: 'delete',
            },
        },
    }),
};

defineExpose({
    iconRearrange,
});

</script>

<script lang="ts">

export default {
    name: 'VFileManagerIconsView',
};
</script>

<style lang="scss" scoped>
</style>

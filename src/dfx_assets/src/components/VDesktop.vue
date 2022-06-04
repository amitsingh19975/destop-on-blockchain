<template>
    <div class="no-user-select" v-context-menu="contextMenu">
        <icons-view ref="iconViewRef" :items="children" :children-keys="Object.keys(children)"
            :direction="direction || 'row'" @dbclick="open"></icons-view>
    </div>
</template>

<script setup lang="ts">
import {
    computed, ref, shallowRef,
} from 'vue';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';
import { FileManager } from '../scripts/fileManager';
import { addChild, IDirectory } from '../scripts/fs';
import { renameFsNode } from '../scripts/fs/commands';
import { notifyNeg } from '../scripts/notify';
import { PIDType } from '../scripts/types';
import { clipboardPasteFsNode, isDef } from '../scripts/utils';
import IconsView from './filemanager/IconsView.vue';

interface IProps {
    root: IDirectory;
    pid?: PIDType;
    direction?: 'row' | 'col';
}

const props = defineProps<IProps>();
const curDir = shallowRef(props.root);
const children = computed(() => curDir.value._children);
const iconViewRef = ref<InstanceType<typeof IconsView> | null>(null);

const open = async (name?: string) => {
    await FileManager.open({
        curDir: curDir.value, history: [], level: 0, name, noNewWindow: false,
    });
};

const contextMenu = {
    actions: () => ({
        paste: clipboardPasteFsNode(curDir, {
            renameIfCollide: true,
            after: (err?: Error) => {
                if (err instanceof Error) {
                    notifyNeg(err);
                    return;
                }
                const iconView = iconViewRef.value;
                if (!isDef(iconView)) return;
                iconView.iconRearrange();
            },
        }),
    }),
} as IContextMenuBindingArgs;

</script>

<script lang="ts">

export default {
    name: 'VDesktop',
};
</script>

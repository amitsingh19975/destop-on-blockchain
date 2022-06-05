<template>
    <div class="no-user-select" v-context-menu="contextMenu">
        <icons-view ref="iconViewRef" :items="children" :children-keys="Object.keys(children)"
            :direction="direction || 'row'" @dbclick="open"></icons-view>
        <v-new-file :root="curDir" :type="newFileType" v-model="newFilePrompt"></v-new-file>
    </div>
</template>

<script setup lang="ts">
import {
    computed, ref, shallowRef,
} from 'vue';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';
import { FileManager } from '../scripts/fileManager';
import { IDirectory, NodeKind } from '../scripts/fs';
import { notifyNeg } from '../scripts/notify';
import { IIcon, PIDType } from '../scripts/types';
import { clipboardPasteFsNode, isDef } from '../scripts/utils';
import useIcons from '../stores/icons';
import useWindowManager from '../stores/windowManager';
import IconsView from './filemanager/IconsView.vue';
import VNewFile from './VNewFile.vue';

interface IProps {
    root: IDirectory;
    pid?: PIDType;
    direction?: 'row' | 'col';
}

const props = defineProps<IProps>();
const curDir = shallowRef(props.root);
const children = computed(() => curDir.value._children);
const iconViewRef = ref<InstanceType<typeof IconsView> | null>(null);
const newFileType = ref<NodeKind | 'None'>('None');
const newFilePrompt = ref(false);

const open = async (name?: string) => {
    await FileManager.open({
        curDir: curDir.value, history: [], level: 0, name, noNewWindow: false,
    });
};
const wallpaperIcon = { type: 'Material', data: 'wallpaper' } as IIcon;

const contextMenu = {
    actions: () => ({
        'Change Wallpaper': {
            icon: wallpaperIcon,
            action: () => {
                useWindowManager().makeWindow({
                    name: 'Wallpaper',
                    componentName: 'AppDesktopWallpaper',
                    icon: wallpaperIcon,
                });
            },
        },
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
        'Clean Up': {
            showCondition: () => isDef(iconViewRef.value),
            action: () => {
                iconViewRef.value!.iconRearrange();
            },
            icon: {
                type: 'Fontawesome',
                data: 'fa-solid fa-arrow-down-a-z',
            },
        },
        'New File': {
            action: () => {
                newFileType.value = 'File';
                newFilePrompt.value = true;
            },
            icon: useIcons().icons.newFile,
        },
        'New Folder': {
            action: () => {
                newFileType.value = 'Dir';
                newFilePrompt.value = true;
            },
            icon: useIcons().icons.newFolder,
        },
    }),
} as IContextMenuBindingArgs;

</script>

<script lang="ts">

export default {
    name: 'VDesktop',
};
</script>

<template>
    <div class="container fit bg-blue-grey-8">
        <header class="header shadow-4 row items-center" style="z-index: 2;">
            <v-btn icon="arrow_back_ios" flat color="white" border style="width: 6rem;" :disable="!canGoBack"
                @click="goBack"></v-btn>
            <v-btn icon="arrow_forward_ios" flat color="white" border style="width: 6rem;" :disable="!canGoForward"
                @click="goForward">
            </v-btn>
            <v-address-bar :model-value="path" @update:model-value="updatePathInput" class="bg-blue-grey-5"
                style="width: calc(100% - 13rem)" round text-class="text-white" delimiter-class="text-white"
                :validator="validateAddress">
            </v-address-bar>
        </header>
        <main class="fit">
            <q-splitter v-model="splitterModel" before-class="bg-blue-grey-6 full-height scroll"
                after-class="relative-position no-user-select" separator-style="width: 5px"
                separator-class="bg-blue-grey-4 shadow-4" class="fit">

                <template v-slot:before>
                    <v-tree class="text-white" :root="rootDir && { '/': rootDir }">
                    </v-tree>
                </template>

                <template v-slot:after>
                    <div class="fit" v-context-menu="contextMenu">
                        <icons-view ref="iconViewRef" :items="children" :children-keys="Object.keys(children)"
                            direction="col" :pid="pid" :key="splitterModel" @dbclick="open">
                        </icons-view>
                        <v-droppable :drop-callback="addFilesFromSystem"></v-droppable>
                    </div>
                </template>

            </q-splitter>
        </main>

        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-new-file :root="curDir" :type="newFileType" v-model="newFilePrompt"></v-new-file>
    </div>
</template>

<script lang="ts">
import {
    defineComponent, ref, shallowRef,
} from 'vue';
import { ionFileTrayFull } from '@quasar/extras/ionicons-v6';
import BaseWindowComp from '../scripts/baseWindowComp';
import IconsView from '../components/filemanager/IconsView.vue';
import VTree from '../components/VTree.vue';
import ROOT, {
    asDir, cd, IDirectory, IFileSystem, isDir, NodeKind, Path,
} from '../scripts/fs';
import { FileManager } from '../scripts/fileManager';
import {
    clipboardPasteFsNode, elementShape,
} from '../scripts/utils';
import { ShapeType } from '../scripts/types';
import VBtn from '../components/VBtn.vue';
import { notifyNeg } from '../scripts/notify';
import VAddressBar from '../components/VAddressBar.vue';
import VDroppable from '../components/VDroppable.vue';
import useIcons from '../stores/icons';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';
import VNewFile from '../components/VNewFile.vue';
import { saveFileToAccount } from '../scripts/mediaUtils';
import { isDef } from '../scripts/basic';

export default defineComponent({
    name: 'AppFileManager',
    components: {
        VTree,
        IconsView,
        VBtn,
        VAddressBar,
        VDroppable,
        VNewFile,
    },
    extends: BaseWindowComp,
    setup() {
        return {
            splitterModel: ref(30),
            curDir: shallowRef<IDirectory>(ROOT),
            history: [] as Readonly<IDirectory>[],
            level: ref(0),
            mainRef: ref<HTMLElement | null | { $el: HTMLElement }>(null),
            iconViewShape: ref<ShapeType>({ width: 0, height: 0 }),
            newPath: ref<string[]>([]),
            iconViewRef: ref<InstanceType<typeof IconsView> | null>(null),
            newFileType: ref<NodeKind | 'None'>('None'),
            newFilePrompt: ref(false),
        };
    },
    methods: {
        async wBeforeLoaded(): Promise<void> {
            this.closeDialogBox();
            let node = this.node || this.rootDir;
            if (this.isSelf) node = this.rootDir;

            if (isDef(node) && isDir(node)) {
                this.curDir = node;
                this.history.push(this.curDir);
                await this.show();
                return;
            }
            this.openDialogBox('danger', '"FileManager" can open only directories, not file.');
        },
        async open(name?: string): Promise<void> {
            const { level, curDir } = await FileManager.open({
                curDir: this.curDir,
                name,
                level: this.level,
                history: this.history,
            });
            this.level = level;
            this.curDir = curDir;
        },
        validateAddress(path: string[]): boolean {
            return Path.exists(path, { root: this.rootDir });
        },
        setShape(): void {
            if (isDef(this.mainRef)) {
                const temp = elementShape(this.mainRef) as ShapeType;
                if (isDef(temp)) {
                    this.iconViewShape = temp;
                }
            }
        },
        goForward(): void {
            this.level += 1;
            this.curDir = this.history[this.level];
        },
        goBack(): void {
            const { level, curDir } = FileManager.goBack({
                level: this.level,
                history: this.history,
                root: this.rootDir || ROOT,
            });
            this.level = level;
            this.curDir = curDir || this.curDir;
        },
        updatePathInput(val: string[]): void {
            this.newPath = val;
            this.changePath();
        },
        changePath(): void {
            const { result } = cd(this.newPath, { root: this.rootDir });
            if (isDef(result)) {
                this.level += 1;
                this.history.push(this.curDir);
                this.curDir = result as IDirectory;
                return;
            }
            notifyNeg(`"FileManager" invalid path entered! path="${this.newPath}"`);
            this.newPath = [];
        },
        addFilesFromSystem(files: FileList): void {
            const len = files.length;
            for (let i = 0; i < len; i += 1) {
                const file = files[i];
                saveFileToAccount(file, this.curDir);
            }
        },
    },
    computed: {
        children(): Record<string, IFileSystem> {
            return asDir(this.curDir)?._children || {};
        },
        canGoBack(): boolean {
            return this.level > 0;
        },
        canGoForward(): boolean {
            return this.level < this.history.length - 1;
        },
        path(): string[] {
            return Path.pathArrayFromFS(this.curDir);
        },
        contextMenu(): IContextMenuBindingArgs {
            return {
                actions: () => ({
                    paste: clipboardPasteFsNode(this.curDir, {
                        renameIfCollide: true,
                        after: (err?: Error) => {
                            if (err instanceof Error) {
                                notifyNeg(err);
                            }
                        },
                    }),
                    'Clean Up': {
                        showCondition: () => isDef(this.iconViewRef),
                        action: () => {
                            this.iconViewRef!.iconRearrange();
                        },
                        icon: {
                            type: 'Fontawesome',
                            data: 'fa-solid fa-arrow-down-a-z',
                        },
                    },
                    'New File': {
                        action: () => {
                            this.newFileType = 'File';
                            this.newFilePrompt = true;
                        },
                        icon: useIcons().icons.newFile,
                    },
                    'New Folder': {
                        action: () => {
                            this.newFileType = 'Dir';
                            this.newFilePrompt = true;
                        },
                        icon: useIcons().icons.newFolder,
                    },
                }),
            };
        },
    },
    watch: {
        splitterModel(): void {
            this.setShape();
        },
    },
    async mounted() {
        // this.setIcon();
        // this.addAction('Test', 'log', {
        //     icon: {
        //         type: 'Material',
        //         data: 'file',
        //     },
        //     action: () => console.log('TEst'),
        // });
        this.$nextTick(() => {
            this.setShape();
        });
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppFileManager', {
            type: 'Ion',
            data: ionFileTrayFull,
        });
    },
});
</script>

<style lang="scss" scoped>
.container {
    display: grid;
    grid-template-rows: 3rem calc(100% - 3rem);

    & header {
        padding-left: 1rem;
        padding-right: 1rem;
        gap: 0.5rem;

        // &-input {
        //     border-radius: 10rem;
        // }
    }
}

.tree {
    background-color: white;
}
</style>

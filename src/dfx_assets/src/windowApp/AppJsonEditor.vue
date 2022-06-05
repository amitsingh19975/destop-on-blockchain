<template>
    <div class="fit">
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-file-picker v-model="showFilePicker" v-if="rootDir" :root="rootDir" @selected="openFile"
            default-extension="json" :extension-list="{ json: /.json/ }">
        </v-file-picker>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { JSONEditor, JSONContent } from 'svelte-jsoneditor/dist/jsoneditor.js';
import BaseWindowComp from '../scripts/baseWindowComp';
import { readFile, writeFile } from '../scripts/storage';
import useIcons from '../stores/icons';
import { IFile, IFileSystem, isFile } from '../scripts/fs';
import { isDef } from '../scripts/utils';
import useExtMapping from '../stores/extMapping';

type JSONType = JSONContent['json'];

export default defineComponent({
    name: 'AppJsonEditor',
    components: {
    },
    extends: BaseWindowComp,
    props: {
        json: {
            type: Object,
            required: false,
        },
    },
    setup() {
        return {
            openedFile: ref<IFile>(),
            showFilePicker: ref(false),
            handler: undefined as JSONEditor | undefined,
        };
    },
    methods: {
        constructJsonEditor(json: JSONContent['json']): Error | undefined {
            try {
                this.handler = new JSONEditor({
                    target: this.$el,
                    props: {
                        content: {
                            json,
                        },
                    },
                });
                return undefined;
            } catch (e) {
                return e as Error;
            }
        },
        async wBeforeLoaded(): Promise<void> {
            let errOr: Error | undefined;
            this.openedFile = this.file;

            if (isDef(this.openedFile)) {
                const data = this.json || await readFile({ node: this.openedFile }) || {};
                errOr = this.constructJsonEditor(data);
            }

            this.closeDialogBox();
            if (errOr instanceof Error) {
                this.openDialogBox('danger', errOr.message);
                return;
            }

            await this.show();
        },
        async openFile(node: IFileSystem | null): Promise<void> {
            if (!isDef(node)) return;
            if (!isFile(node)) {
                this.openDialogBox('danger', `Open File must be a "File" kind, but found "${node._nodeKind}"`);
                return;
            }
            this.openedFile = node;
            this.closeFilePicker();
            this.openDialogBox('loading');
            const data = await readFile({ node }) || {};
            this.handler?.destroy();
            this.constructJsonEditor(data as JSONType);
            this.closeDialogBox();
        },
        openFilePicker(): void {
            this.showFilePicker = true;
        },
        closeFilePicker(): void {
            this.showFilePicker = false;
        },
        async saveToFS(): Promise<void> {
            const { openedFile, handler } = this;
            if (!isDef(openedFile) || !isDef(handler)) return;
            const temp = handler.get();
            const data = ('json' in temp && temp.json) || {};
            await writeFile({
                node: openedFile,
                data,
                mode: 'overwrite',
            });
        },
    },
    registerExtenstion(): void {
        useExtMapping().addMapping('json', 'json', 'AppJsonEditor');
    },
    async mounted() {
        this.setIcon({ type: 'Fontawesome', data: 'fa-solid fa-file-code' });
        this.addAction('File', 'open', {
            icon: useIcons().icons.open,
            action: () => {
                this.openFilePicker();
            },
        });
        this.addAction('File', 'save', {
            icon: useIcons().icons.save,
            action: async () => {
                this.openDialogBox('loading');
                await this.saveToFS();
                this.closeDialogBox();
            },
        });
    },
    unmounted() {
        this.handler?.destroy();
    },
});
</script>

<style lang="scss" scoped>
</style>
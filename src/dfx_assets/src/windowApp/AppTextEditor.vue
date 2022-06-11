<template>
    <div class="fit">
        <q-editor style="white-space: pre-line" v-model="editor" class="fit" />
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-file-picker v-model="showFilePicker" v-if="rootDir" :root="rootDir" @selected="openFile"
            default-extension="text">
        </v-file-picker>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import BaseWindowComp from '../scripts/baseWindowComp';
import { readFile, writeFile } from '../scripts/storage';
import useIcons from '../stores/icons';
import { IDirectory, IFile, IFileSystem } from '../scripts/fs';
import { isDef } from '../scripts/basic';
import useExtMapping from '../stores/extMapping';

export default defineComponent({
    name: 'AppTextEditor',
    components: {
    },
    extends: BaseWindowComp,
    props: {
        data: {
            type: String,
            required: false,
        },
    },
    setup() {
        return {
            showFilePicker: ref(false),
            editor: ref(''),
            openedFile: ref<IFile>(),
        };
    },
    methods: {
        async fetchData(node?: IFile): Promise<string> {
            if (!isDef(node)) return '';
            const data = await readFile({ node }) || '';
            this.openedFile = node;
            this.setTitle(`Text Editor ["${node.name}"]`);
            if (typeof data === 'string') return data;
            return JSON.stringify(data);
        },

        async wBeforeLoaded(): Promise<void> {
            this.editor = await this.fetchData(this.file);
            this.closeDialogBox();
            await this.show();
        },
        async openFile(currDir: IDirectory, currSelection: IFileSystem | null, filename: string | null): Promise<void> {
            const node = this.openFileHelper(currDir, currSelection, filename);
            if (!isDef(node)) {
                return;
            }
            this.closeFilePicker();
            this.openDialogBox('loading');
            this.editor = await this.fetchData(node);
            this.openedFile = node;
            this.closeDialogBox();
        },
        async save(): Promise<void> {
            await writeFile<string>({ node: this.openedFile, data: this.editor });
        },
    },
    async mounted() {
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
                await this.save();
                this.openDialogBox('confirm', 'saved successfully', {
                    green: {
                        label: 'OK',
                        callback: this.closeDialogBox,
                    },
                });
            },
        });
    },
    registerExtenstion(): void {
        useExtMapping().addMapping('txt', 'text', 'AppTextEditor');
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppTextEditor', {
            type: 'Material',
            data: 'edit_note',
        });
    },
    unmounted() {
        // this.handler?.;
    },
});
</script>

<style lang="scss" scoped>
</style>

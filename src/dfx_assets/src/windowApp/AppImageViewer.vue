<template>
    <div class="fit relative-position container" v-context-menu="contextMenu">
        <img class="absolute-center" ref="imgRef" v-show="image" :src="image" :key="image">
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-file-picker v-bind="filePickerProps" @selected="openFile" default-extension="image">
        </v-file-picker>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import BaseWindowComp from '../scripts/baseWindowComp';
import useIcons from '../stores/icons';
import { IDirectory, IFile, IFileSystem } from '../scripts/fs';
import { isDef } from '../scripts/basic';
import useExtMapping from '../stores/extMapping';
import { DefaultImageExt, ShapeType } from '../scripts/types';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';
import { loadMedia } from '../scripts/mediaUtils';

export default defineComponent({
    name: 'AppImageViewer',
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
        const imgRef = ref<HTMLImageElement | null>(null);
        return {
            showFilePicker: ref(false),
            openedFile: ref<IFile>(),
            image: ref<string>(),
            imgRef,
        };
    },
    computed: {
        contextMenu(): IContextMenuBindingArgs {
            const self = this;
            return {
                closeConditional: () => isDef(self.image) && isDef(self.imgRef),
                actions: () => ({
                    'Fit to Image': {
                        icon: 'fit_screen',
                        action: () => {
                            if (!isDef(self.imgRef)) return;
                            const shape = {
                                width: self.imgRef.width,
                                height: self.imgRef.height + 70,
                            } as ShapeType;
                            self.resize(shape);
                        },
                    },
                }),
            };
        },
    },
    methods: {
        async fetchData(node?: IFile): Promise<string | Error> {
            if (!isDef(node)) return new Error('File does not exist!');
            const errOr = await loadMedia(node, {
                matchType: 'image',
            });
            if (errOr instanceof Error) throw errOr;
            return errOr.data;
        },

        async wBeforeLoaded(): Promise<void> {
            if (this.isSelf) {
                await this.openBlockingFilePicker({
                    closeOnFailure: true,
                });
            } else {
                const errOr = await this.fetchData(this.file);
                if (errOr instanceof Error) {
                    this.openDialogBox('danger', errOr.message);
                    return;
                }
                this.image = errOr;
            }
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
            const errOr = await this.fetchData(node);
            if (errOr instanceof Error) {
                this.openDialogBox('danger', errOr.message);
                return;
            }
            this.openedFile = node;
            this.image = errOr;
            this.closeDialogBox();
        },
    },
    async mounted() {
        this.addAction('File', 'open', {
            icon: useIcons().icons.open,
            action: () => {
                this.openFilePicker();
            },
        });
    },
    registerExtenstion(): void {
        useExtMapping().addMappingUsingArray(DefaultImageExt, 'image', 'AppImageViewer');
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppImageViewer', {
            type: 'Material',
            data: 'image',
        });
    },
    unmounted() {
        // this.handler?.;
    },
});
</script>

<style lang="scss" scoped>
.container {
    background-image:
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(135deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(135deg, transparent 75%, #ccc 75%);
    background-size: 25px 25px;
    /* Must be a square */
    background-position: 0 0, 12.5px 0, 12.5px -12.5px, 0px 12.5px;

    &>img {
        max-width: 100%;
        max-height: 100%;
    }
}
</style>

<template>
    <!-- v-context-menu="contextMenu" -->
    <div class="fit relative-position container">
        <video class="fit video-js" ref="videoPlayerRef" data-setup="{}" controls preload="auto"></video>
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-file-picker v-bind="filePickerProps" @selected="openFile" default-extension="video">
        </v-file-picker>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import videojs from 'video.js';
import BaseWindowComp from '../scripts/baseWindowComp';
import useIcons from '../stores/icons';
import { IDirectory, IFile, IFileSystem } from '../scripts/fs';
import {
    elementShape,
    isDef, loadMedia,
} from '../scripts/utils';
import useExtMapping from '../stores/extMapping';
import { DefaultVideoExt, ShapeType } from '../scripts/types';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';

export default defineComponent({
    name: 'AppVideoViewer',
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
            openedFile: ref<IFile>(),
            videoPlayerRef: ref<HTMLVideoElement | null>(null),
            handler: undefined as (videojs.Player | undefined),
        };
    },
    computed: {
        contextMenu(): IContextMenuBindingArgs {
            const self = this;
            return {
                closeConditional: () => false,
                actions: () => ({}),
            };
        },
    },
    methods: {
        async fetchData(node?: IFile): Promise<{ data: string, type: string } | Error> {
            if (!isDef(node)) return new Error('File does not exist!');
            const errOr = await loadMedia(node, {
                matchType: 'video',
            });
            if (errOr instanceof Error) throw errOr;
            return errOr;
        },

        constructPlayer(): Error | undefined {
            try {
                if (!isDef(this.videoPlayerRef)) {
                    return new Error('[AppVideoViewer]: HTMLElement["video"] not found!');
                }
                this.handler = videojs(this.videoPlayerRef);
                return undefined;
            } catch (e) {
                return e as Error;
            }
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
                this.handler!.src({ src: errOr.data, type: errOr.type });
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
            this.handler!.src({ src: errOr.data, type: errOr.type });
            this.closeDialogBox();
        },

        resizeTheWindow(): void {
            const shape = elementShape(this.videoPlayerRef) as ShapeType;
            if (!isDef(shape)) return;
            this.resize(shape);
        },
    },
    async mounted() {
        const res = this.constructPlayer();
        if (res instanceof Error) {
            this.openDialogBox('danger', res.message, {
                red: {
                    label: 'exit',
                    callback: this.close,
                },
            });
        }
        this.addAction('File', 'open', {
            icon: useIcons().icons.open,
            action: () => {
                this.openFilePicker();
            },
        });
    },
    registerExtenstion(): void {
        useExtMapping().addMappingUsingArray(DefaultVideoExt, 'video', 'AppVideoViewer');
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppVideoViewer', {
            type: 'Material',
            data: 'video_library',
        });
    },
    unmounted() {
        this.handler?.dispose();
    },
});
</script>

<style lang="scss" scoped>
.container {
    background-color: black;

    // .video-player video {
    //     width: 100%;
    //     height: 100%;
    // }

}
</style>

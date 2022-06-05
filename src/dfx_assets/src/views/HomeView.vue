<template>
    <q-page class="fit column justify-center relative-position desktop" :style="getHomeStyle">
        <span class="fit absolute" style="top: 0; left: 0" @click="focusOn('desktop')" ref="desktopRef"
            v-context-menu="desktopContextMenu">
            <v-desktop :root="curDir"></v-desktop>
            <v-droppable :drop-callback="addFilesFromSystem"></v-droppable>
        </span>
        <the-windows ref="theWindowRef"></the-windows>
        <v-context-menu :list-style="{ minWidth: 'fit-content' }"></v-context-menu>
    </q-page>
</template>

<script lang="ts">
import { mapActions, mapState } from 'pinia';
import {
    CSSProperties, defineComponent, provide, ref,
} from 'vue';
import useLoader from '../stores/loader';
import TheWindows from '../components/TheWindows.vue';
import useWindowManager from '../stores/windowManager';
import VDesktop from '../components/VDesktop.vue';
import ROOT, {
    IDirectory, makeFile,
} from '../scripts/fs';
import useTheme from '../stores/theme';
import { rootInjectKey } from '../scripts/injectKeys';
import { writeFile } from '../scripts/storage';
import VContextMenu from '../components/VContextMenu.vue';
import { IIcon, MediaType, WinApp } from '../scripts/types';
import VDroppable from '../components/VDroppable.vue';
import { saveFileToAccount } from '../scripts/utils';
import { IContextMenuBindingArgs } from '../plugins/v-context-menu';

export default defineComponent({
    name: 'HomeView',
    components: {
        TheWindows,
        VDesktop,
        VContextMenu,
        VDroppable,
    },
    setup() {
        const root = ref<IDirectory>(ROOT);
        provide(rootInjectKey, root.value);
        const desktopRef = ref<HTMLElement | null>(null);
        const theWindowRef = ref<InstanceType<typeof TheWindows> | null>(null);
        return {
            root,
            contextMenuToggle: ref(true),
            desktopRef,
            theWindowRef,
            curDir: root,
        };
    },
    computed: {
        ...mapState(useTheme, ['images', 'compColor']),
        getHomeStyle(): CSSProperties {
            const bI = this.images.desktop.backgroundImage;
            return typeof bI !== 'undefined'
                ? { backgroundImage: `url("${bI}")` }
                : {
                    backgroundColor: this.compColor(
                        'desktop',
                        'backgroundColor',
                    ),
                };
        },
        desktopContextMenu(): IContextMenuBindingArgs {
            const wallpaperIcon = { type: 'Material', data: 'wallpaper' } as IIcon;
            return {
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
                }),
            };
        },
    },
    methods: {
        ...mapActions(useLoader, ['loaded']),
        ...mapActions(useWindowManager, ['initWindowManager', 'focusOn']),
        addFilesFromSystem(files: FileList): void {
            const len = files.length;
            for (let i = 0; i < len; i += 1) {
                const file = files[i];
                saveFileToAccount(file, this.curDir);
            }
        },
    },
    async mounted() {
        // if (isDef(this.desktopRef)) {
        //     this.desktopRef.addEventListener('contextmenu', (e) => {
        //         console.log('Desktop: ', e.target);
        //     }, true);
        // }

        this.initWindowManager(this.$el);
        // makeDir({ name: 'user' }, this.root);
        // makeDir({ name: 'user1' }, this.root);
        // makeDir({ name: 'user2' }, this.root);
        // makeDir({ name: 'user3' }, this.root);
        // makeDir({ name: 'user4' }, this.root);
        // makeDir({ name: 'desktop' }, this.root);
        // makeDir({ name: 'game' }, this.root);
        // const temp = makeDir({ name: 'test' }, '/desktop', { root: this.root });
        makeFile({
            name: 'test.txt',
            useNameToGetExt: true,
        }, this.root);
        const musicApp = makeFile({
            name: 'Audio Player',
            ext: 'app',
        }, this.root);
        const jsonEditor = makeFile({
            name: 'Json Editor.app',
            useNameToGetExt: true,
        }, this.root);
        writeFile({
            node: jsonEditor,
            data: {
                name: jsonEditor.stem,
                author: 'Amit Singh',
                organization: 'XYZ',
                icon: { type: 'Image', data: 'https://artprojectsforkids.org/wp-content/uploads/2021/04/Draw-an-Astronaut.jpg' },
                meta: {
                    builtin: {
                        component: 'AppJsonEditor',
                    },
                },
            } as WinApp,
        });
        writeFile({
            node: musicApp,
            data: {
                name: musicApp.stem,
                author: 'Amit Singh',
                organization: 'XYZ',
                icon: { type: 'Image', data: 'https://mpng.subpng.com/20191123/txp/transparent-essential-compilation-icon-music-icon-music-player-5dd9038fda30b9.6767775815745033118937.jpg' },
                meta: {
                    builtin: {
                        component: 'AppMusicPlayer',
                    },
                },
            } as WinApp,
        });

        const lofi = makeFile({
            name: 'Lofi Study',
            ext: 'mp3',
        }, this.root);
        await writeFile<MediaType>({
            node: lofi,
            data: {
                data: './music/lofi-study.mp3',
                type: 'audio/mp3',
            },
        });
        useWindowManager().makeWindow({
            name: 'Profile Setting',
            componentName: 'AppProfile',
            icon: { type: 'Material', data: 'manage_accounts' },
        });
        // this.setDesktopImage('https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg');
        this.loaded();
    },
});
</script>

<style lang="scss" scoped>
.desktop {
    background-repeat: no-repeat;
    background-size: cover;
}
</style>

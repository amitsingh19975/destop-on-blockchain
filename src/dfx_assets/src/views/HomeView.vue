<template>
    <q-page class="fit column justify-center relative-position desktop" :style="getHomeStyle">
        <span class="fit absolute" style="top: 0; left: 0" @click="focusOn('desktop')" ref="desktopRef">
            <v-desktop :root="curDir"></v-desktop>
            <v-droppable :drop-callback="addFilesFromSystem"></v-droppable>
        </span>
        <the-windows ref="theWindowRef"></the-windows>
        <v-context-menu :list-style="{ minWidth: 'fit-content' }"></v-context-menu>
    </q-page>
</template>

<script lang="ts">
import { mapActions, mapState, storeToRefs } from 'pinia';
import {
    CSSProperties, defineComponent, provide, ref,
} from 'vue';
import useLoader from '../stores/loader';
import TheWindows from '../components/TheWindows.vue';
import useWindowManager from '../stores/windowManager';
import VDesktop from '../components/VDesktop.vue';
import useTheme from '../stores/theme';
import VContextMenu from '../components/VContextMenu.vue';
import VDroppable from '../components/VDroppable.vue';
import { isDef } from '../scripts/basic';
import { saveFileToAccount } from '../scripts/mediaUtils';
import { rootInjectKey } from '../scripts/injectKeys';
import useUser from '../stores/user';

export default defineComponent({
    name: 'HomeView',
    components: {
        TheWindows,
        VDesktop,
        VContextMenu,
        VDroppable,
    },
    setup() {
        const desktopRef = ref<InstanceType<typeof VDesktop> | null>(null);
        const theWindowRef = ref<InstanceType<typeof TheWindows> | null>(null);
        const { root } = storeToRefs(useUser());
        provide(rootInjectKey, root.value);
        return {
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
            const backgroundColor = this.compColor(
                'desktop',
                'backgroundColor',
            );
            return isDef(bI)
                ? {
                    backgroundImage: `url("${bI}")`,
                    backgroundColor,
                }
                : {
                    backgroundColor,
                };
        },
    },
    methods: {
        ...mapActions(useLoader, ['loaded']),
        ...mapActions(useWindowManager, ['initWindowManager', 'focusOn', 'makeWindow']),
        addFilesFromSystem(files: FileList): void {
            const len = files.length;
            for (let i = 0; i < len; i += 1) {
                const file = files[i];
                saveFileToAccount(file, this.curDir);
            }
        },
    },
    async mounted() {
        this.initWindowManager(this.$el);
        this.makeWindow({
            name: 'Download Manager',
            componentName: 'AppDownloadManager',
            width: 900,
        });
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

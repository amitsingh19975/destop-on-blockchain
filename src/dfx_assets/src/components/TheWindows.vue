<template>
    <div class="windows">
        <span v-for="(pid, k) in renderOrder" :key="process(pid)?.uid || k">
            <transition name="window-mini-maxi">
                <keep-alive>
                    <v-window v-show="process(pid)?.state" :size="[_window(pid).width, _window(pid).height]"
                        :name="process(pid).name" :icon="process(pid).icon" :position="_window(pid).position"
                        :positionUnit="_window(pid).positionUnit" :pid="_window(pid).pid"
                        @click="focusOn('window', pid)"
                        :style="{ zIndex: 10 + k, display: process(pid)?.state ? 'block' : 'none' }"
                        @close="closeWindow(pid)" @minimize="process(pid).state = false"
                        @resize="handleResize(pid, $event)" @drag="handleDrag(pid, $event)"
                        @fullscreen="setToFullScreen(pid)" @restore-size="restoreWindowShape(pid)">
                    </v-window>
                </keep-alive>
            </transition>
        </span>
    </div>
</template>

<script lang="ts">
import { mapActions, mapState } from 'pinia';
import { defineComponent, ref } from 'vue';
import useWindowManager from '../stores/windowManager';
import VWindow from './VWindow.vue';
import { PIDType } from '../scripts/types';

type RDEventType = 'start' | 'end' | 'move';

interface WindowResizeEventType {
    type: RDEventType;
    width: number;
    height: number;
}

interface WindowDragEventType {
    type: RDEventType;
    top: number;
    left: number;
}

export default defineComponent({
    name: 'TheWindows',
    components: {
        VWindow,
    },
    setup() {
        return {
            color: ['green', 'pink'],
            toBeClosed: [] as PIDType[],
        };
    },
    computed: {
        ...mapState(useWindowManager, ['renderOrder', 'process', '_window']),
    },
    methods: {
        ...mapActions(useWindowManager, [
            'initWindowManager',
            'makeWindow',
            'focusOn',
            'closeWindow',
            'setToFullScreen',
            'restoreWindowShape',
        ]),
        handleResize(
            pid: PIDType,
            { width, height, type }: WindowResizeEventType,
        ): void {
            if (type === 'start') this.focusOn('window', pid);
            const window = this._window(pid);
            window.width = width;
            window.height = height;
        },
        handleDrag(
            pid: PIDType,
            { top, left, type }: WindowDragEventType,
        ): void {
            if (type === 'start') this.focusOn('window', pid);
            const { position } = this._window(pid);
            position.x = left;
            position.y = top;
        },
    },
    mounted() {
        this.$nextTick(() => {
            // this.makeWindow({
            //     name: 'p1',
            //     width: 800,
            //     height: 800,
            //     menubar: {
            //         File:
            //         {
            //             new: {
            //                 action: (pid) => console.log(pid, 'New'),
            //                 icon: 'note_add',
            //             },
            //         },
            //         Help:
            //         {
            //             about: {
            //                 action: (pid) => console.log(pid, 'About'),
            //                 icon: 'info',
            //             },
            //         },
            //     },
            // });
            // this.makeWindow({
            //     name: 'p2 ',
            //     icon: {
            //         type: 'Image',
            //         data: imageSrc,
            //     },
            //     position: 'bottom-left',
            // });
        });
    },
});
</script>

<style lang="scss" scoped>
.windows {
    overflow: hidden;
    height: 0;
    width: 0;

    &>span {
        height: inherit;
        width: inherit;

        &>* {
            position: absolute;
        }
    }

    // pointer-events: none;
}

.window-mini-maxi-enter-active,
.window-mini-maxi-leave-active {
    transition-property: opacity, transform;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
}

.window-mini-maxi-enter-from,
.window-mini-maxi-leave-to {
    opacity: 0;
    transform: translateY(100%) scale(0);
}
</style>

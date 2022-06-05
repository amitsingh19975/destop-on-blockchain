<template>
    <vue-resizable :class="['fixed shadow-10', isFullScreen ? 'shape-transition' : '']"
        :dragSelector="isFullScreen ? undefined : '.window-header-title'" :min-width="200" :min-height="200"
        :width="getWindowStyle.width" :height="getWindowStyle.height" :top="getWindowStyle.top"
        :left="getWindowStyle.left" @resize:start="eHandler('resize', 'start', $event)"
        @resize:move="eHandler('resize', 'move', $event)" @resize:end="eHandler('resize', 'end', $event)"
        @drag:start="eHandler('drag', 'start', $event)" @drag:move="eHandler('drag', 'move', $event)"
        @drag:end="eHandler('drag', 'end', $event)">
        <span class="window fit" :style="windowStyle">
            <window-header :icon="icon" :pid="pid" :name="name" @close="$emit('close')"
                @fullscreen="$emit('fullscreen')" @minimize="$emit('minimize')" @restore-size="$emit('restoreSize')">
            </window-header>
            <q-card class="fit window-main" flat bordered :style="getWindowMainStyle">
                <q-card-section class="fit" style="padding: 0">
                    <q-card class="fit window-main-content" style="padding: 0;" flat>
                        <q-card-section class="fit relative-position" style="padding: 0; margin: 0; overflow: auto"
                            ref="windowRef">
                            <keep-alive>
                                <component :is="_window(pid).componentName" v-bind="_window(pid).props"></component>
                            </keep-alive>
                        </q-card-section>
                    </q-card>
                </q-card-section>
            </q-card>
        </span>
        <transition name="out-of-focus">
            <div class="out-of-focus full-width" v-show="!isThisWindowFocused()"></div>
        </transition>
    </vue-resizable>
</template>

<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { storeToRefs } from 'pinia';
import { QCardSection } from 'quasar';
import {
    CSSProperties, onMounted, PropType, ref,
} from 'vue';
// @ts-ignore
import VueResizable from 'vue-resizable';
import {
    PositionType,
    PositionKindType,
    CSSUnitType,
    ShapeType,
    IWindow,
    IIcon,
} from '../scripts/types';
import useProcess from '../stores/process';
import useTheme from '../stores/theme';
import useWindowManager from '../stores/windowManager';
import WindowHeader from './window/WindowHeader.vue';

interface IVueResizableEvent {
    width: number;
    height: number;
    left: number;
    top: number;
    eventName: string;
}

type SizeType = number | ShapeType | [number, number];

type EventSuffixType = 'start' | 'end' | 'move';

interface IEmits {
    (e: 'drag', data: { type: EventSuffixType, left: number, top: number }): void;
    (e: 'resize', data: { type: EventSuffixType, width: number, height: number }): void;
    (e: 'minimize'): void;
    (e: 'restoreSize'): void;
    (e: 'close'): void;
    (e: 'fullscreen'): void;
}

const emits = defineEmits<IEmits>();

const { _window, isFocused, default: winDef } = storeToRefs(useWindowManager());

const props = defineProps({
    size: {
        type: [Number, Array, Object] as PropType<SizeType>,
        required: false,
        default: 800,
    },
    position: {
        type: [Array, Object] as PropType<Exclude<PositionType, PositionKindType>>,
        required: false,
        default: () => ({ x: 0, y: 0 }),
    },
    positionUnit: {
        type: Object as PropType<{ x: CSSUnitType; y: CSSUnitType }>,
        required: false,
        default: () => ({ x: 'px', y: 'px' }),
    },
    name: {
        type: String,
        required: false,
        default: 'Untitled Window',
    },
    pid: {
        type: Number,
        required: true,
    },
    icon: {
        type: Object as PropType<string | IIcon>,
        required: false,
    },
});

const isFullScreen = ref(false);
const windowRef = ref<QCardSection | null>(null);

const { compColor } = storeToRefs(useTheme());

const { parentShape } = useWindowManager();

const isThisWindowFocused = (): boolean => isFocused.value('window', props.pid);

const actions = computed((): IWindow['menubar'] => {
    const win = _window.value(props.pid);
    return win.hideMenubar ? {} : win.menubar;
});

const isActionsVisible = computed((): boolean => Object.keys(actions.value).length === 0);

const getSize = computed((): ShapeType => {
    let width = 0;
    let height = 0;
    if (typeof props.size === 'number') {
        width = props.size;
        height = props.size;
    } else if (Array.isArray(props.size)) {
        const [w, h] = props.size;
        width = w;
        height = h;
    }
    return {
        height,
        width,
    };
});

const getPosition = computed((): { top: number; left: number } => {
    let top = 0;
    let left = 0;
    if (Array.isArray(props.position)) {
        const [l, t] = props.position;
        top = t;
        left = l;
    } else {
        top = props.position.y;
        left = props.position.x;
    }
    return {
        top,
        left,
    };
});

const getWindowStyle = computed(() => {
    const { width, height } = getSize.value;
    const { top, left } = getPosition.value;
    const temp = {
        top,
        left,
        width,
        height,
    };
    return temp;
});

const titleBodyStyle = computed((): CSSProperties => ({
    backgroundColor: compColor.value(
        'windowTitle',
        'backgroundColor',
    ),
    color: compColor.value('windowTitle', 'textColor'),
    borderBottom: 'none',
}));

const windowStyle = computed((): CSSProperties => {
    const height = isActionsVisible.value ? '2.5rem' : '5rem';
    return {
        gridTemplateRows: `${height} calc(100% - ${height})`,
    };
});

const getWindowMainStyle = computed((): CSSProperties => ({
    backgroundColor: titleBodyStyle.value.backgroundColor,
    borderTop: 'none',
}));

const eHandler = (kind: 'drag' | 'resize', suffix: EventSuffixType, e: IVueResizableEvent): void => {
    if (kind === 'resize') {
        const { width, height } = getWindowStyle.value;
        emits('resize', {
            type: suffix,
            width: e.width || width,
            height: e.height || height,
        });
        return;
    }

    const { width, height } = parentShape();
    const temp = {
        type: suffix,
        top: e.top || getWindowStyle.value.top,
        left: e.left || getWindowStyle.value.left,
    };
    const hD = height - (temp.top + getWindowStyle.value.height);
    const wD = width - (temp.left + getWindowStyle.value.width);
    if (hD <= 0) temp.top = getWindowStyle.value.top;
    if (wD <= 0) temp.left = getWindowStyle.value.left;

    emits('drag', temp);
};

onMounted(() => {
    useProcess().registerHTMLElement(props.pid, windowRef.value?.$el);
});

</script>

<script lang="ts">
export default {
    name: 'VWindow',
};
</script>

<style lang="scss" scoped>
@mixin transition {
    transition-property: border, background-color;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
}

.out-of-focus {
    z-index: 9;
    background-color: black;
    opacity: 0.1;
    top: 2.5rem;
    left: 0;
    position: absolute;
    height: calc(100% - 2.5rem);
}

.shape-transition {
    transition-property: height, width;
    transition-duration: 0.2s;
    transition-timing-function: ease-in-out;
}

.window {
    display: grid;

    &-main {
        border: 1px solid $separator-color;
        padding: 0 4px 4px 4px;
        border-top-left-radius: 0;
        border-top-right-radius: 0;

        &-content {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }
    }
}

.out-of-focus-enter-active,
.out-of-focus-leave-active {
    transition-property: opacity;
    transition-duration: 0.2s;
    transition-timing-function: ease-in;
}

.out-of-focus-enter-from,
.out-of-focus-leave-to {
    opacity: 0;
}
</style>

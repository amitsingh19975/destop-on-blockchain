<template>
    <div class="window-header fit" :style="headerStyle">
        <div class="window-header-title" :style="titleBodyStyle">
            <div class="fit row no-wrap justify-start items-center content-center no-scroll">
                <v-icon :icon="icon"></v-icon>
                <span class="text-subtitle1 ellipsis q-pr-sm" @dblclick="emitMaximizeEvent">
                    {{ name }}
                </span>
            </div>
            <span class="window-header-title-btns">
                <v-title-btn color="green" :icon="isFullScreen ? qIcon('minimize') : qIcon('maximize')"
                    @click="emitMaximizeEvent"></v-title-btn>
                <v-title-btn color="yellow" :icon="qIcon('windowMinimize')" @click="$emit('minimize')"></v-title-btn>
                <v-title-btn color="red" :icon="qIcon('close')" @click="$emit('close')"></v-title-btn>
            </span>
        </div>
        <div class="window-header-menubar">
            <span class="fit" v-for="(v, k) in actions" :key="k">
                <window-header-menubar :pid="pid" :name="k" :actions="v"></window-header-menubar>
            </span>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import {
    computed, CSSProperties, defineComponent, PropType, ref,
} from 'vue';
import useIcons from '../../stores/icons';
import { IIcon, IWindow } from '../../scripts/types';
import useTheme from '../../stores/theme';
import useWindowManager from '../../stores/windowManager';
import VIcon from '../VIcon.vue';
import WindowHeaderMenubar from './WindowHeaderMenubar.vue';
import VTitleBtn from './VTitleBtn.vue';

export default defineComponent({
    name: 'VWindowWindowHeader',
    components: {
        VIcon,
        WindowHeaderMenubar,
        VTitleBtn,
    },
    props: {
        pid: {
            type: Number,
            required: true,
        },
        name: {
            type: String,
            required: false,
            default: 'Untitled Window',
        },
        icon: {
            type: [String, Object] as PropType<string | IIcon>,
            required: false,
        },
    },
    emits: ['minimize', 'restoreSize', 'close', 'fullscreen'],
    setup(props) {
        const actions = computed((): IWindow['menubar'] => {
            const { _window } = useWindowManager();
            return _window(props.pid).menubar;
        });
        return {
            actions,
            titleBtn: {
                size: '0.4rem',
            },
            // isMenuOpened: ref(new Array(Object.keys(actions.value).length).fill(false)),
            // hover: ref(false),
        };
    },
    computed: {
        ...mapState(useIcons, ['qIcon']),
        ...mapState(useTheme, ['compColor']),
        ...mapState(useWindowManager, ['_window']),

        headerStyle(): CSSProperties {
            return {
                backgroundColor: this.compColor(
                    'windowTitle',
                    'backgroundColor',
                ),
                color: this.compColor('windowTitle', 'textColor'),
                width: `${this._window(this.pid).width}`,
            };
        },

        titleBodyStyle(): CSSProperties {
            return {
                borderBottom: `2px solid ${this.compColor(
                    'windowTitle',
                    'backgroundColor',
                    10,
                )}`,
            };
        },
        isActionsEmpty(): boolean {
            return Object.keys(this.actions).length === 0;
        },
        isFullScreen(): boolean {
            return this._window(this.pid).isFullScreen;
        },
    },
    methods: {
        emitMaximizeEvent(): void {
            if (this.isFullScreen) {
                this.$emit('restoreSize');
            } else {
                this.$emit('fullscreen');
            }
        },
    },
    mounted() { },
});
</script>

<style lang="scss" scoped>
@mixin transition {
    transition-property: border, background-color;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
}

.window-header {
    height: 2.5rem;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;

    &-title {
        width: 100%;
        display: grid;
        grid-template-columns: calc(100% - 4rem) 4rem;
        border: 1px solid $separator-color;
        border-bottom: none;
        padding: 0 4px 0 4px;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        transform: translateZ(0);

        &-btns {
            width: 10%;
            display: flex;
            gap: 3px;
            align-items: center;

            &--red {
                background-color: $red-4;
                border: 1px solid $red-8;
                color: darken($color: $red-8, $amount: 15);
                @include transition;

                &:hover {
                    background-color: $red-3;
                    border: 1px solid $red-4;
                }
            }

            &--yellow {
                background-color: $yellow-6;
                border: 1px solid $yellow-8;
                color: darken($color: $yellow-8, $amount: 15);
                @include transition;

                &:hover {
                    background-color: $yellow-3;
                    border: 1px solid $yellow-4;
                }
            }

            &--green {
                background-color: $green-4;
                border: 1px solid $green-8;
                color: darken($color: $green-8, $amount: 15);
                @include transition;

                &:hover {
                    background-color: $green-3;
                    border: 1px solid $green-4;
                }
            }
        }
    }

    &-menubar {
        overflow-y: hidden;
        height: calc(100% - 2.5rem);
        padding: 2px 10px 0 10px;
        overflow-x: scroll;

        &-actions {
            border: 1px solid white;
        }
    }
}
</style>

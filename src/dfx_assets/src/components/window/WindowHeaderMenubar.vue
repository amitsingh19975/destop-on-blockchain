<template>
    <q-btn class="window-header-menubar-actions" :label="getLabel" :style="actionStyle" flat>
        <q-menu transition-show="jump-down" transition-hide="jump-up">
            <q-list style="min-width: 100px" v-for="(a, k) in actions || []" :key="k">
                <q-item clickable v-close-popup @click="a.action(pid)">
                    <v-menu-item :icon="a.icon" :label="k"></v-menu-item>
                </q-item>
            </q-list>
        </q-menu>
    </q-btn>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import {
    CSSProperties, defineComponent, Prop, PropType, ref,
} from 'vue';
import { ActionType, IActionValue } from '../../scripts/types';
import useTheme from '../../stores/theme';
import useWindowManager from '../../stores/windowManager';
import VMenuItem from '../VMenuItem.vue';

export default defineComponent({
    name: 'VWindowWindowHeaderMenubar',
    components: {
        VMenuItem,
    },
    props: {
        pid: {
            type: Number,
            required: true,
        },
        name: {
            type: [String, Number, Symbol],
            required: true,
        },
        actions: {
            type: Object as PropType<ActionType>,
            required: false,
        },
        hover: {
            type: Boolean,
            required: false,
            default: true,
        },
    },
    emits: ['isMenuOpen', 'update:modelValue'],
    setup() {
        return {};
    },
    computed: {
        ...mapState(useTheme, ['compColor']),
        ...mapState(useWindowManager, ['_window']),
        actionStyle(): CSSProperties {
            return {
                backgroundColor: this.bgColor(),
                color: this.compColor('windowTitleMenubar', 'textColor'),
                height: '100%',
                border: 'none',
            };
        },
        getLabel(): string {
            return typeof this.name === 'string'
                ? this.name
                : this.name.toString();
        },
    },
    methods: {
        bgColor(per?: number): string {
            return this.compColor('windowTitleMenubar', 'backgroundColor', per);
        },
    },
    watch: {},
    mounted() { },
});
</script>

<style lang="scss" scoped>
</style>

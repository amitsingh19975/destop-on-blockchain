<template>
    <q-btn :style="{
        backgroundColor: taskBgColor,
        border: `1px solid ${lighten(20)}`,
        color: taskbarColor('textColor'),
    }" flat no-caps>
        <div class="task-btn relative-position">
            <v-icon :icon="icon" square></v-icon>
            <q-separator vertical inset :style="{ backgroundColor: separator, 'margin-left': '3px' }" />
            <span class="row item-center content-center q-ml-sm">
                <div class="text-caption ellipsis">
                    {{ name }}
                </div>
            </span>
            <q-tooltip :style="qToolTipStyle" :delay="1000" :model-value="false">
                <div style="width: 100%; height: 85%">
                    <slot name="snapshot" v-if="!disableSnapshot"></slot>
                </div>
                <div class="text-subtitle1 text-center">
                    {{ name }}
                </div>
            </q-tooltip>
        </div>
    </q-btn>
</template>

<script lang="ts">
import {
    CSSProperties, defineComponent, PropType, ref,
} from 'vue';
import { IIcon } from '../../scripts/types';
import useTheme, { ComponentsType } from '../../stores/theme';
import VIcon from '../VIcon.vue';

export default defineComponent({
    name: 'TheTaskBarProcessBtn',
    components: { VIcon },
    props: {
        active: {
            type: Boolean,
            required: false,
        },
        name: {
            type: String,
            required: true,
        },
        icon: {
            type: [String, Object] as PropType<string | IIcon>,
            required: false,
        },
        disableSnapshot: {
            type: Boolean,
            required: false,
        },
    },
    setup() {
        return {};
    },
    computed: {
        separator(): string {
            return this.lighten(30);
        },
        taskBgColor(): string {
            return this.active ? this.lighten(-8) : this.lighten(8);
        },
        shouldShowSnapshot(): boolean {
            return (
                !this.disableSnapshot
                && this.$slots
                && 'snapshot' in this.$slots
            );
        },
        qToolTipStyle(): CSSProperties {
            const temp = {
                backgroundColor: this.taskBgColor,
            };
            if (this.shouldShowSnapshot) {
                return {
                    ...temp,
                    width: '20rem',
                    height: '15rem',
                };
            }
            return temp;
        },
    },
    methods: {
        taskbarColor(
            key: keyof ComponentsType['taskbar'],
            per?: number,
        ): string {
            return useTheme().compColor('taskbar', key, per);
        },
        lighten(per: number): string {
            return this.taskbarColor('backgroundColor', per);
        },
    },
    mounted() { },
});
</script>

<style lang="scss" scoped>
.task-btn {
    width: 15rem;
    display: grid;
    grid-template-columns: 0.1fr 3px 1fr;

    &>*:last-child {
        overflow: hidden;
    }
}

:slotted(img) {
    max-width: 100% !important;
    max-height: 100% !important;
}
</style>

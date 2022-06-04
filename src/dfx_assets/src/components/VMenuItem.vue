<template>
    <q-item-section class="item">
        <slot name="before"></slot>
        <v-icon :icon="icon" square :style="styleIcon" :class="classIcon"></v-icon>
        <span :style="styleLabel" :class="classLabel">{{ label }}</span>
        <slot name="after"></slot>
    </q-item-section>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IIcon } from '../scripts/types';
import VIcon from './VIcon.vue';

export default defineComponent({
    name: 'VMenuItem',
    components: {
        VIcon,
    },
    props: {
        icon: {
            type: [String, Object] as PropType<string | IIcon>,
            required: false,
        },
        label: {
            type: [String, Number, Symbol],
            required: true,
        },
        styleIcon: {
            type: String,
            required: false,
        },
        styleLabel: {
            type: String,
            required: false,
        },
        classIcon: {
            type: String,
            required: false,
        },
        classLabel: {
            type: String,
            required: false,
        },
    },
});
</script>

<style lang="scss" scoped>
.item {
    display: grid;
    grid-template-columns: 0.1fr 1fr;

    &>*:last-child {
        display: flex;
        align-items: center;
    }
}
</style>

<template>
    <q-btn :flat="flat" :color="color" :label="label" class="btn no-shadow" :no-caps="noCaps" :icon="icon"
        :disable="disable" :loading="loading" :percentage="percentage">
        <slot></slot>
    </q-btn>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
    computed,
} from 'vue';
import useTheme from '../stores/theme';

interface IProps {
    color?: string;
    label?: string;
    flat?: boolean;
    border?: boolean;
    noCaps?: boolean;
    icon?: string;
    disable?: boolean;
    loading?: boolean;
    percentage?: number;
}
const props = defineProps<IProps>();
const { getColor } = storeToRefs(useTheme());

const getBorder = computed(() => (props.border ? `1px solid ${props.color || getColor.value('separator')}` : ''));

</script>

<script lang="ts">
export default {
    name: 'VBtn',
};
</script>

<style scoped lang="scss">
.btn {
    border: v-bind(getBorder);
}
</style>

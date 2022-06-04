<template>
    <q-btn
        class="start-btn row justify-center item-center content-center"
        :style="{
            backgroundColor: backgroundColor,
            color: taskbarBtnColor('textColor'),
        }"
    >
        <q-icon :name="qIcon('startBtn')" size="2rem"></q-icon>
        <span class="text-h6">Start</span>
        <start-menu></start-menu>
    </q-btn>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { defineComponent } from 'vue';
import useIcons from '../../stores/icons';
import useTheme, { ComponentsType } from '../../stores/theme';
import StartMenu from './StartMenu.vue';

export default defineComponent({
    name: 'TheTaskBarStartBtn',
    computed: {
        ...mapState(useIcons, ['qIcon']),
        backgroundColor(): string {
            return this.taskbarBtnColor('backgroundColor');
        },
    },
    methods: {
        taskbarBtnColor(key: keyof ComponentsType['taskbarStartBtn']): string {
            return useTheme().compColor('taskbarStartBtn', key);
        },
    },
    components: { StartMenu },
});
</script>

<style lang="scss" scoped></style>

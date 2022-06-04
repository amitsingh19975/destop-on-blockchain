<template>
    <q-footer class="text-white" :style="{
        backgroundColor: taskbarColor('backgroundColor'),
        color: taskbarColor('textColor'),
    }">
        <div class="full-width task-bar">
            <q-toolbar style="gap: 12px" class="no-scroll">
                <start-btn></start-btn>
                <q-separator vertical inset :style="{ backgroundColor: separator }" />
            </q-toolbar>
            <q-toolbar class="scroll">
                <process-btns></process-btns>
            </q-toolbar>
            <q-toolbar class="no-scroll" style="gap: 12px">
                <q-separator vertical inset :style="{ backgroundColor: separator }" />
                {{ time }}
            </q-toolbar>
        </div>
    </q-footer>
</template>

<script lang="ts">
import { colors } from 'quasar';
import { defineComponent, ref } from 'vue';
import useTheme, { ComponentsType } from '../stores/theme';
import StartBtn from './taskbar/StartBtn.vue';
import ProcessBtns from './taskbar/ProcessBtns.vue';

const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

export default defineComponent({
    name: 'TheTaskBar',
    components: {
        StartBtn,
        ProcessBtns,
    },
    setup() {
        return {
            time: ref(''),
        };
    },
    computed: {
        separator(): string {
            return this.lighten(30);
        },
        taskBgColor(): string {
            return this.lighten(-8);
        },
    },
    methods: {
        taskbarColor(key: keyof ComponentsType['taskbar']): string {
            return useTheme().compColor('taskbar', key);
        },
        lighten(per: number): string {
            return colors.lighten(this.taskbarColor('backgroundColor'), per);
        },
    },
    mounted() {
        setInterval(() => {
            const now = new Date();
            this.time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
                now.getSeconds(),
            )}`;
        }, 1000);
    },
});
</script>

<style lang="scss" scoped>
.task-bar {
    display: grid;
    grid-template-columns: 154px calc(100% - 154px - 90px) 90px;

    &>*:first-child {
        padding-right: 0;
    }
}
</style>

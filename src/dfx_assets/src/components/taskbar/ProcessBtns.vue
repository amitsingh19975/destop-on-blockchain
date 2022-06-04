<template>
    <v-container orientation="horizontal" style="gap: 5px" @drop="onDrop" lock-axis="x">
        <v-draggable v-for="(pid, k) in indices" :key="k + pid">
            <process-btn :active="process(pid).state" :name="process(pid).name" :icon="process(pid).icon"
                style="margin-right: 5px" @click="handleClick(pid)" @mouseenter="fetchSnapshot(pid)">
                <template v-slot:snapshot>
                    <!-- https://cdn.quasar.dev/img/mountains.jpg -->
                    <img :src="snapshots[pid]?.[0]" style="width: 100%; height: 100%" />
                </template>
            </process-btn>
        </v-draggable>
    </v-container>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
// @ts-ignore
import { Container as VContainer, Draggable as VDraggable } from 'vue-dndrop';
import { reactive } from 'vue';
import ProcessBtn from './ProcessBtn.vue';
import useWindowManager from '../../stores/windowManager';
import { PIDType } from '../../scripts/types';
import { isDef, processSnapshot } from '../../scripts/utils';

const { process, indices } = storeToRefs(useWindowManager());
const { changePositionForIndices, focusOn } = useWindowManager();

const snapshots = reactive<Record<number, [string, number]>>({});

const onDrop = <T extends { addedIndex: number; removedIndex: number }>(
    dropResult: T,
) => changePositionForIndices(dropResult);

const handleClick = (pid: PIDType) => {
    process.value(pid).state = true;
    focusOn('window', pid);
};

const checkIfXAmountOfTimePassed = (x: number, unit: 'min' | 'sec' | 'hour', a: number) => {
    const factor = (unit === 'min' ? 60 : (unit === 'hour' ? 60 * 60 : 1)) * 1000;
    return (Date.now() - a) > x * factor;
};

const fetchSnapshot = async (pid: PIDType) => {
    if (pid in snapshots) {
        const [_, time] = snapshots[pid];
        if (!checkIfXAmountOfTimePassed(3, 'sec', time)) return;
    }
    const res = await processSnapshot(pid);

    if (isDef(res)) {
        snapshots[pid] = [res, Date.now()];
    }
};

</script>

<script lang="ts">
export default {
    name: 'TheTaskBarProcessBtns',
};
</script>

<style lang="scss" scoped>
</style>

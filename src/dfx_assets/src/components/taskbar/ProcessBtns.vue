<template>
    <v-container orientation="horizontal" style="gap: 5px" @drop="onDrop" lock-axis="x">
        <v-draggable v-for="(pid, k) in indices" :key="k + pid">
            <process-btn :active="process(pid).state" :name="process(pid).name" :icon="getWindowIcon(pid)"
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
import { IIcon, PIDType } from '../../scripts/types';
import { didTimeExpired, processSnapshot } from '../../scripts/utils';
import { isDef } from '../../scripts/basic';
import useIcons from '../../stores/icons';
import { ComponentType } from '../../windowApp';

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

const fetchSnapshot = async (pid: PIDType) => {
    if (pid in snapshots) {
        const [_, time] = snapshots[pid];
        if (!didTimeExpired(3, 'sec', time)) return;
    }
    const res = await processSnapshot(pid);

    if (isDef(res)) {
        snapshots[pid] = [res, Date.now()];
    }
};

const getWindowIcon = (pid: number): IIcon => {
    const { _window } = useWindowManager();
    const compType = _window(pid).componentName;
    return useIcons().compIcon(compType as ComponentType);
};

</script>

<script lang="ts">
export default {
    name: 'TheTaskBarProcessBtns',
};
</script>

<style lang="scss" scoped>
</style>

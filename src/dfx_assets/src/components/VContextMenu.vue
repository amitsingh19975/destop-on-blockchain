<template>
    <q-menu ref="menuRef" context-menu touch-position no-focus @hide="resetContextMenu">
        <q-list ref="_contextMenuRef" dense :style="normalizeStyle(listStyle)" :class="normalizeClass(listClass)"
            v-show="!isEmpty">
            <q-item clickable v-close-popup v-for="(v, k, i) in normalizedContextMenu" :key="k + i"
                :style="normalizeStyle(itemStyle)" :class="normalizeClass(itemClass)">
                <v-menu-item :label="capitalize(k)" @click="v!.action(); hideContextMenu($refs.menuRef)"
                    :icon="v!.icon">
                </v-menu-item>
            </q-item>
        </q-list>
    </q-menu>
</template>

<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { storeToRefs } from 'pinia';
import { QList, QMenu } from 'quasar';
import {
    StyleValue, normalizeClass, normalizeStyle,
} from 'vue';
import { isDef } from '../scripts/basic';
import {
    ClassType,
} from '../scripts/types';
import { capitalize } from '../scripts/utils';
import useContextMenu from '../stores/contextMenu';
import VMenuItem from './VMenuItem.vue';

interface IProps {
    listStyle?: StyleValue;
    listClass?: ClassType;
    itemStyle?: StyleValue;
    itemClass?: ClassType;
}

defineProps<IProps>();

const { normalizedContextMenu, _contextMenuRef } = storeToRefs(useContextMenu());

const isEmpty = computed(() => Object.keys(normalizedContextMenu.value).length === 0);

const { resetContextMenu } = useContextMenu();

const hideContextMenu = (arg: unknown) => {
    const el = arg as QMenu;
    if (!isDef(el)) return;
    el.hide();
};

</script>

<script lang="ts">
export default {
    name: 'VContextMenu',
};
</script>

<style lang="scss" scoped>
</style>

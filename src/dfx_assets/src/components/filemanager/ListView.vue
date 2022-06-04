<script lang="ts">
export default {
    name: 'FileMangerListView',
};
</script>

<template>
    <q-table :rows="children" :columns="columns" separator="cell" hide-bottom :rows-per-page-options="[0]"
        class="sticky-header-table fit" flat :row-key="rowKey">
        <template v-slot:header="props">
            <q-tr :props="props" :style="normalizeStyle(headerStyle)" :class="normalizeClass(headerClass)">
                <q-th auto-width />
                <q-th v-for="col in props.cols" :key="col.name" :props="props">
                    {{ col.label }}
                </q-th>
            </q-tr>
        </template>
        <template v-slot:body="props">
            <q-tr :props="props" :style="[normalizeStyle(bodyStyle), customBodyStyle(props.rowIndex)]" :class="[normalizeClass(bodyClass), 'cursor-pointer',
            isDisable(props.row) ? 'disable' : '']"
                @click="!isDisable(props.row) ? emitClick(props.row, props.rowIndex) : void 0"
                @dblclick="!isDisable(props.row) ? emitDblClick(props.row, props.rowIndex) : void 0">
                <q-td auto-width>
                    <v-icon :icon="getIcon(props.row)" :style="normalizeStyle(iconStyle)"
                        :class="normalizeClass(iconClass)" square fontSize="90%"></v-icon>
                </q-td>
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                    {{ col.value }}
                </q-td>
            </q-tr>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import type { QTableProps } from 'quasar';
import {
    computed, normalizeClass, normalizeStyle, PropType, reactive, ref, StyleValue, watch,
} from 'vue';
import { format } from 'quasar';
import { IFileSystem } from '../../scripts/fs';
import { ClassType } from '../../scripts/types';
import useExtMapping from '../../stores/extMapping';
import VIcon from '../VIcon.vue';

const { humanStorageSize } = format;

type ColumnType = QTableProps['columns'];

interface IEmits {
    (e: 'click', node: IFileSystem): void;
    (e: 'dblclick', node: IFileSystem): void;
}

const emits = defineEmits<IEmits>();
const props = defineProps({
    children: {
        type: Object as PropType<IFileSystem[]>,
        required: true,
    },
    disable: {
        type: Object as PropType<Set<string>>,
        required: false,
        default: () => new Set<string>(),
    },
    iconStyle: {
        type: [Object, String, Array] as PropType<StyleValue>,
        required: false,
    },
    headerStyle: {
        type: [Object, String, Array] as PropType<StyleValue>,
        required: false,
    },
    bodyStyle: {
        type: [Object, String, Array] as PropType<StyleValue>,
        required: false,
    },
    iconClass: {
        type: [Object, String, Array] as PropType<ClassType>,
        required: false,
    },
    headerClass: {
        type: [Object, String, Array] as PropType<ClassType>,
        required: false,
    },
    bodyClass: {
        type: [Object, String, Array] as PropType<ClassType>,
        required: false,
    },
});
const { getIcon } = useExtMapping();

const columns = computed<ColumnType>(() => [
    {
        name: 'name',
        required: true,
        label: 'Name',
        align: 'left',
        field: (node: IFileSystem) => node.name,
        sortable: true,
    },
    {
        name: 'type',
        required: true,
        label: 'Type',
        align: 'center',
        field: (node: IFileSystem) => node._nodeKind,
        sortable: true,
    },
    {
        name: 'size',
        required: true,
        label: 'Size',
        align: 'center',
        field: (node: IFileSystem) => node.size,
        format: (val) => humanStorageSize(val),
        sortable: true,
    },
]);

const curSelection = ref(-1);

const rowKey = (node: IFileSystem) => node._uid;

const isDisable = ({ _uid }: IFileSystem) => props.disable.has(_uid);

watch(() => props.children, () => {
    curSelection.value = -1;
});

const emitDblClick = (node: IFileSystem, idx: number) => {
    curSelection.value = idx;
    emits('dblclick', node);
};

const emitClick = (node: IFileSystem, idx: number) => {
    curSelection.value = idx;
    emits('click', node);
};

const customBodyStyle = (rowIndex: number): StyleValue => ({
    background: rowIndex === curSelection.value ? 'linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))' : undefined,
});

defineExpose({
    deselect: () => { curSelection.value = -1; },
});

</script>

<style scoped lang="scss">
.disable {
    cursor: default !important;
    opacity: 0.2;
}

.sticky-header-table {
    overflow: scroll;

    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th {
        background-color: inherit;
    }

    thead tr th {
        position: sticky;
        z-index: 1;
    }

    thead tr:first-child th {
        top: 0;
    }

    &.q-table--loading thead tr:last-child th {
        top: 48px;
    }
}
</style>

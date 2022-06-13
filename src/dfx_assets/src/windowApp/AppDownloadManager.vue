<template>
    <div class="fit bg-blue-grey-8 q-pa-sm">
        <q-scroll-area class="fit">
            <q-table :rows="rows" :columns="columns" :row-key="rowKey" separator="cell" :rows-per-page-options="[0]"
                class="sticky-header-table fit" flat dense no-data-label="No download/upload activity found!">
                <template v-slot:header="props">
                    <q-tr :props="props" class="bg-blue-grey-6 text-blue-grey-1">
                        <q-th auto-width>
                            <v-btn icon="clear_all" size="0.5rem" border color="red" @click="clearAll">
                            </v-btn>
                        </q-th>
                        <q-th v-for="col in props.cols" :key="col.name" :props="props">
                            <span class="text-bold text-capitalize">
                                {{ col.label }}
                            </span>
                        </q-th>
                    </q-tr>
                </template>
                <template v-slot:body="props">
                    <q-tr :props="props">
                        <q-td auto-width>
                            <v-btn :disable="!canBeCleared(props.row)" icon="clear" size="0.5rem" flat border
                                color="red" @click="removeRow(props.row)">
                            </v-btn>
                        </q-td>
                        <q-td v-for="col in props.cols" :key="col.name" :props="props"
                            class="text-blue-grey-10 ellipsis" style="max-width: 200px;">
                            <div v-if="col.name === 'name' && Array.isArray(col.value)">
                                <span v-if="col.value[0] === 'uid'">
                                    <span class="text-bold q-pr-sm">UID [</span>
                                    <span class="text-italic">{{ col.value[1] }}</span>
                                    <span class="text-bold q-pl-sm">]</span>
                                </span>
                                <span v-else class="text-subtitle1">
                                    {{ col.value[1] }}
                                </span>
                                <q-tooltip>{{ col.value[1] }}</q-tooltip>
                            </div>
                            <div v-else-if="col.name === 'taskCompletion'">
                                <q-linear-progress dark stripe rounded :value="col.value[0] / col.value[1]"
                                    color="blue-grey-4" class="q-mt-sm" size="25px" style="border: 1px solid grey;">
                                    <div class="absolute-full flex flex-center">
                                        <q-badge color="white" text-color="blue-grey-10"
                                            :label="`${getPercentage(col.value)}%`" />
                                    </div>
                                </q-linear-progress>
                            </div>
                            <div v-else-if="col.name === 'state'">
                                <q-badge :color="getStateColor(props.row)" text-color="white" :label="col.value"
                                    class="q-pa-sm" />
                            </div>
                            <div v-else class="row items-center" style="gap: 0.5rem">
                                <v-icon v-if="col.name === 'kind'"
                                    :icon="props.row.kind === 'download' ? 'file_download' : 'file_upload'"></v-icon>
                                <span class="text-caption"> {{ col.value }} </span>
                            </div>
                        </q-td>
                    </q-tr>
                </template>
                <template v-slot:no-data="{ icon, message }">
                    <div class="full-width row flex-center text-blue-grey-10 q-gutter-sm">
                        <q-icon size="2em" name="sentiment_dissatisfied" />
                        <span> {{ message }} </span>
                        <q-icon size="2em" :name="icon" />
                    </div>
                </template>
            </q-table>
        </q-scroll-area>
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
    </div>
</template>

<script lang="ts">
import { capitalize, defineComponent, ref } from 'vue';
import { mapActions, mapState } from 'pinia';
import { QTableProps, QTable, date } from 'quasar';
import baseWindowComp from '../scripts/baseWindowComp';
import VBtn from '../components/VBtn.vue';
import VIcon from '../components/VIcon.vue';
import useCanisterManager from '../stores/canisterManager';
import type { ItemType } from '../stores/canisterManager';
import { UIDType } from '../scripts/canisterHelper';
import useIcons from '../stores/icons';

const { formatDate } = date;

type ColumnType = QTableProps['columns'];

export default defineComponent({
    name: 'AppDownloadManager',
    extends: baseWindowComp,
    components: {
        VBtn,
        VIcon,
    },
    setup() {
        return {
            tableRef: ref<QTable>(),
        };
    },
    computed: {
        ...mapState(useCanisterManager, ['activities']),
        columns(): ColumnType {
            return [
                {
                    name: 'name',
                    required: true,
                    label: 'Name/Uid',
                    align: 'left',
                    field: (item: ItemType) => {
                        if ('info' in item) return ['name', item.info.name];
                        if (item.type === 'fs') return ['name', 'Filesystem'];
                        return ['uid', item.uid];
                    },
                    sortable: true,
                },
                {
                    name: 'time',
                    required: true,
                    label: 'Time',
                    align: 'center',
                    field: ({ time }: ItemType) => time,
                    format: (time: number) => formatDate(time, 'YYYY-MM-DDTHH:mm:ss'),
                    sortable: true,
                },
                {
                    name: 'type',
                    required: true,
                    label: 'Type',
                    align: 'center',
                    field: ({ type }: ItemType) => capitalize(type),
                    sortable: true,
                },
                {
                    name: 'kind',
                    required: true,
                    label: 'Upload/Download',
                    align: 'center',
                    field: ({ kind }: ItemType) => capitalize(kind),
                    sortable: true,
                },
                {
                    name: 'state',
                    required: true,
                    label: 'state',
                    align: 'center',
                    field: ({ state }: ItemType) => capitalize(state),
                    sortable: true,
                },
                {
                    name: 'taskCompletion',
                    required: true,
                    label: 'Task Completion',
                    align: 'center',
                    field: (item: ItemType) => {
                        if ('info' in item) return [item.processedChunks, item.info.totalChunks];
                        if (item.state === 'success') return [1, 1];
                        return [0, 1];
                    },
                    sortable: true,
                },
            ];
        },
        rows(): ItemType[] {
            return Object.values(this.activities);
        },
    },
    methods: {
        ...mapActions(useCanisterManager, ['deleteItem', 'deleteItemWithState']),
        canBeCleared(row: ItemType): boolean {
            return row.state === 'failed' || row.state === 'success';
        },
        async wBeforeLoaded(): Promise<void> {
            this.closeDialogBox();
            await this.show();
            this.resize({ height: this.windowShape.height, width: 900 });
        },
        rowKey(item: ItemType): UIDType {
            if ('uid' in item) return item.uid;
            if (item.type === 'asset') return item.info.uid;
            return 'fs';
        },
        getPercentage([frac, total]: [number, number]) {
            return ((frac / total) * 100).toFixed(2);
        },
        getStateColor({ state }: ItemType): string {
            if (state === 'failed') return 'red';
            if (state === 'processing') return 'blue';
            if (state === 'success') return 'green';
            return 'blue-grey-8';
        },
        removeRow(row: ItemType): void {
            if ('uid' in row) this.deleteItem(row.uid);
            else if (row.type === 'asset') this.deleteItem(row.info.uid);
            else this.deleteItem('fs');
        },
        clearAll(): void {
            this.deleteItemWithState(['failed', 'success']);
        },
    },
    mounted() {

    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppDownloadManager', {
            type: 'Fontawesome',
            data: 'fa-solid fa-bars-progress',
        });
    },
});
</script>

<style lang="scss" scoped>
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

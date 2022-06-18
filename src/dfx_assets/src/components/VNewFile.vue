<script lang="ts">
export default {
    name: 'VNewFile',
};

</script>
<template>
    <q-dialog :model-value="modelValue" @update:model-value="emits('update:modelValue', $event)" persistent>
        <q-card style="min-width: 400px">
            <q-card-section>
                <div class="text-h6">Name of the {{ type === 'Dir' ? 'Directory' : type }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none row no-wrap items-center content-center " style="gap: 1rem">
                <v-icon :icon="getNewFileOrFolderIcon" class="text-blue-grey-8" square fontSize="90%"></v-icon>
                <q-input dense v-model.trim="value" class="col-grow" bg-color="blue-grey-2" color="blue-grey-8"
                    label-color="blue-grey-8" :label="getInputLabel" outlined autofocus
                    @keyup.enter="createNewFileOrFolder" />
            </q-card-section>

            <q-card-actions align="right" class="text-primary">
                <v-btn class="bg-green text-white" flat border label="Create" @click="createNewFileOrFolder">
                </v-btn>
                <v-btn class="bg-red text-white" flat border label="Cancel" @click="closeNewDialog"></v-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import {
    computed, PropType, ref,
} from 'vue';
import { NodeKind, makeDir, makeFile } from '../scripts/fs';
import type { IDirectory } from '../scripts/fs';
import useIcons from '../stores/icons';
import VIcon from './VIcon.vue';
import VBtn from './VBtn.vue';
import { notifyNeg } from '../scripts/notify';

interface IEmits {
    (e: 'update:modelValue', val: boolean): void;
}

const props = defineProps({
    root: {
        type: Object as PropType<IDirectory>,
        required: true,
    },
    modelValue: {
        type: Boolean,
        required: true,
    },
    type: {
        type: String as PropType<NodeKind | 'None'>,
        required: true,
    },
});
const emits = defineEmits<IEmits>();

const value = ref('');

const getNewFileOrFolderIcon = computed(() => {
    const store = useIcons();
    if (props.type === 'None') return store.icons.unknown;
    return props.type === 'Dir' ? store.fsIcon('folder') : store.fsIcon('file');
});

const createNewFileOrFolder = async () => {
    if (value.value.length === 0) {
        notifyNeg('name cannot be empty, please check!');
        return;
    }
    if (props.type === 'None') {
        notifyNeg('invalid kind found; kind can be either "Dir" or "File"');
        return;
    }
    if (props.type === 'Dir') {
        makeDir({
            name: value.value,
        }, props.root);
    } else {
        makeFile({
            name: value.value,
            useNameToGetExt: true,
        }, props.root);
    }
    emits('update:modelValue', false);
    value.value = '';
};

const closeNewDialog = () => {
    emits('update:modelValue', false);
    value.value = '';
};

const getInputLabel = computed(() => {
    if (props.type === 'Dir') return 'Folder Name';
    if (props.type === 'File') return 'Filename';
    return '';
});

</script>

<style lang="scss" scoped>
</style>

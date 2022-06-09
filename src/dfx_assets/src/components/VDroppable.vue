<script lang="ts">
export default {
    name: 'VDroppable',
};
</script>
<template>
    <div ref="rootRef" :class="takeOverTheParent ? 'cover' : 'no-cover'">
        <div class="absolute-center text-h5 text-white"> Drop here to add file </div>
    </div>
</template>

<script setup lang="ts">
import {
    computed, onMounted, onUnmounted, ref,
} from 'vue';
import { getParentElement } from '../scripts/utils';

interface IProps {
    parent?: HTMLElement;
    dropCallback: (files: FileList) => void;
}

const props = defineProps<IProps>();
const rootRef = ref<HTMLElement | null>(null);
const parentElem = computed<HTMLElement | null>(() => (props.parent || getParentElement(rootRef.value)));
const takeOverTheParent = ref(false);

const drapOverCallback = (e: DragEvent) => {
    e.preventDefault();
    takeOverTheParent.value = true;
};
const drapLeaveCallback = (e: DragEvent): boolean => {
    if (e.pageX !== 0 || e.pageY !== 0) return false;
    e.preventDefault();
    takeOverTheParent.value = false;
    return true;
};

const dropCallback = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) props.dropCallback(e.dataTransfer.files);
    takeOverTheParent.value = false;
};

onMounted(() => {
    parentElem.value?.addEventListener('dragover', drapOverCallback, true);
    parentElem.value?.addEventListener('dragleave', drapLeaveCallback, true);
    parentElem.value?.addEventListener('drop', dropCallback, true);
});
onUnmounted(() => {
    parentElem.value?.removeEventListener('dragover', drapOverCallback, true);
    parentElem.value?.removeEventListener('dragleave', drapLeaveCallback, true);
    parentElem.value?.removeEventListener('drop', dropCallback, true);
});

</script>

<style lang="scss" scoped>
.cover {
    display: block;
    background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5));
    border: 8px dashed white;
    position: absolute;
    width: 100% !important;
    height: 100% !important;
    top: 0;
    left: 0;
}

.no-cover {
    display: none;
}
</style>

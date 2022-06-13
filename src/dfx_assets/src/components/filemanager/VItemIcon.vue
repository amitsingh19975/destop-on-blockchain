<template>
    <v-draggable class="item column no-wrap justify-center items-center content-center" :style="getItemStyle"
        @update:position="$emit('update:position', $event)">
        <div class="item-icon row justify-center items-center relative-position" :style="getIconStyle">
            <span :class="{
                'absolute fit': true,
                'item-icon--focused': focused,
            }" style="border-radius: 5px; border: 1px solid transparent" v-show="focused"></span>
            <v-icon class="cursor-pointer" @click="handleClick" @dblclick="handleDblClick" :icon="icon" square
                :size="`${fontSize * sizeFactor}rem`" font-size="90%" v-click-outside="clickOutsideHandler"
                style="text-shadow: 0px 0px 2px black" :loading="isLoading"></v-icon>
        </div>
        <div :class="['item-text no-scroll text-weight-medium', showProgressBar ? 'full-width' : '']"
            :style="getTextStyle" ref="itemText">
            <div :class="{
                ellipsis: !editMode,
                'no-user-select': !editMode,
                'user-select': editMode,
            }" :contenteditable="editMode" @input="updateLabel($event)" @click="handleClick" @dblclick="handleDblClick"
                @keydown.enter.prevent="submit" v-if="!showProgressBar">
                {{ node.name }}
            </div>
            <div v-else class="full-width" style="padding: 0 1rem 0 1rem">
                <q-linear-progress dark size="10px" :value="progress" color="blue-8" />
            </div>
            <q-tooltip>{{ node.name }}</q-tooltip>
        </div>
    </v-draggable>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
    computed,
    CSSProperties, nextTick, onMounted, ref, toRef, watch,
} from 'vue';
import { IClickOutsideBindingArgs } from '../../plugins/v-click-outside';
import {
    IFileSystem, isFile,
} from '../../scripts/fs';
import {
    IIcon, IPosition, MediaType, ShapeType,
} from '../../scripts/types';
import useExtMapping from '../../stores/extMapping';
import useTheme from '../../stores/theme';
import VIcon from '../VIcon.vue';
import VDraggable from '../VDraggable.vue';
import { FileManager } from '../../scripts/fileManager';
import { readFile } from '../../scripts/storage';
import { isDef } from '../../scripts/basic';
import { isMIMEType, readAsDataURL, validateImage } from '../../scripts/mediaUtils';
import useCanisterManager from '../../stores/canisterManager';

const BOX_SHAPE = {
    width: 130,
    height: 100,
};

interface IProps {
    node: IFileSystem,
    sizeFactor?: number;
    iconGutter?: number;
    labelHeight?: number;
    focused?: boolean;
    dimmedFocus?: boolean;
    editMode?: boolean;
}

interface IEmits {
    (e: 'unfocus'): void;
    (e: 'click'): void;
    (e: 'dblclick'): void;
    (e: 'update:label', label: string): void;
    (e: 'update:position', position: IPosition): void;
}

const props = withDefaults(defineProps<IProps>(), {
    sizeFactor: 1,
    iconGutter: 50,
    labelHeight: 50,
    focused: false,
    dimmedFocus: false,
    editMode: false,
});

const emits = defineEmits<IEmits>();

const ic = useExtMapping();
const { compColor, getColor } = storeToRefs(useTheme());
let windowFontSize = 12;
const itemText = ref<HTMLElement | null>(null);
const node = toRef(props, 'node');
const labelText = ref(props.node.name);

const icon = ref<IIcon>();
const isLoading = ref(true);

const downloadOrUploadItem = computed(() => useCanisterManager().getItem(node.value._uid));
const showProgressBar = computed(() => isDef(downloadOrUploadItem.value) && downloadOrUploadItem.value.state !== 'success');
const progress = computed(() => {
    if (!isDef(downloadOrUploadItem.value)) return 0;
    const item = downloadOrUploadItem.value;
    if ('info' in item) return ((item.processedChunks / item.info.totalChunks) * 100);
    if (item.state === 'success') return 100;
    return 0;
});

const handleClick = () => {
    if (showProgressBar.value) return;
    emits('click');
};

const handleDblClick = () => {
    if (showProgressBar.value) return;
    emits('dblclick');
};

onMounted(async () => {
    const loaded = () => {
        isLoading.value = false;
    };

    icon.value = await ic.getIcon(node.value);

    if (!isFile(node.value)) {
        loaded();
        return;
    }
    const { name } = node.value;
    const match = name.match(FileManager.defaultExtList.image);

    if (!match || match.length === 0) {
        loaded();
        return;
    }

    const data = await readFile<'generic', MediaType>({ node: node.value });

    if (!isDef(data)) {
        loaded();
        return;
    }
    let url: string;
    if (data instanceof Blob) {
        if (!isMIMEType(data.type, 'image')) {
            loaded();
            return;
        }
        url = await readAsDataURL(data);
    } else {
        if (!await validateImage(data.data)) {
            loaded();
            return;
        }
        url = data.data;
    }

    icon.value = {
        type: 'Image',
        data: url,
    };
    loaded();
});

const windowFontSizeOr = window
    .getComputedStyle(document.body)
    .getPropertyValue('font-size')
    .match(/(\d+)/);
if (windowFontSizeOr) windowFontSize = Number(windowFontSizeOr[0] || '12');

const itemSize = computed<ShapeType>(() => ({
    width: BOX_SHAPE.width,
    height: BOX_SHAPE.height + props.labelHeight,
}));

const iconSize = computed<ShapeType>(() => ({
    width: itemSize.value.width - props.iconGutter,
    height: itemSize.value.width - props.iconGutter,
}));

const fontSizeCal = (w: number, f: number) => Math.floor(w / f);
const fontSize = computed(() => fontSizeCal(
    iconSize.value.height - windowFontSize,
    windowFontSize,
));

const labelSize = computed<ShapeType>(() => ({
    width: itemSize.value.width,
    height: props.labelHeight,
}));

const getItemStyle = computed<CSSProperties>(() => {
    const { width, height } = itemSize.value;
    return {
        width: `${width * props.sizeFactor}px`,
        height: `${height * props.sizeFactor}px`,
        gap: '4px',
    };
});
const getIconStyle = computed<CSSProperties>(() => {
    const { width, height } = iconSize.value;
    return {
        width: `${width * props.sizeFactor}px`,
        height: `${height * props.sizeFactor}px`,
        opacity: showProgressBar.value ? '0.5' : '1',
    };
});
const getTextBorder = computed<string | undefined>(() => {
    const bfn = (l?: number) => compColor.value('selection', 'borderColor', l);
    if (props.editMode) return `1px solid ${bfn(-10)}`;
    return undefined;
});

const getTextBg = computed<string | undefined>(() => {
    if (props.editMode) return getColor.value('black', 40);
    if (props.dimmedFocus) return getColor.value('black', 80);
    if (props.focused) return compColor.value('selection', 'backgroundColor');
    return undefined;
});

const getTextColor = computed<string | undefined>(() => {
    if (props.dimmedFocus) return getColor.value('black');
    if (props.focused) return compColor.value('selection', 'textColor');
    return undefined;
});

const getTextStyle = computed<CSSProperties>(() => {
    const { width, height } = labelSize.value;
    return {
        maxWidth: `${width * props.sizeFactor}px`,
        maxHeight: `${height * props.sizeFactor}px`,
        padding: '0 5px 0 5px',
        cursor: 'pointer',
        color: getTextColor.value,
        backgroundColor: getTextBg.value,
        border: getTextBorder.value,
    };
});

const clickOutsideHandler = computed<IClickOutsideBindingArgs>(() => ({
    handler: () => emits('unfocus'),
    include: () => [itemText.value],
}));

const submit = () => {
    if (labelText.value.length === 0) return;
    emits('update:label', labelText.value);
};

const updateLabel = (event: Event | null) => {
    if (!event) return;
    const data = event.currentTarget;
    if (data instanceof HTMLElement && data.textContent) {
        labelText.value = data.textContent.trim();
    }
};

watch(() => props.editMode, (val) => {
    nextTick(() => {
        if (val) {
            itemText.value?.childNodes.forEach((el) => (el instanceof HTMLElement) && el.focus());
        }
    });
});

defineExpose({
    itemSize,
});

</script>

<script lang="ts">
export default {
    name: 'VFileManagerVItemIcon',
};
</script>

<style lang="scss" scoped>
.item {

    // border: 1px solid white;
    &-icon {
        &--focused {
            background-color: rgba($color: #000000, $alpha: 0.4);
        }
    }

    &-text {
        overflow-y: scroll;
        border-radius: 5px;
        border: 1px solid transparent;

        &--editable {
            border: 1px solid rgba($color: #000000, $alpha: 0.8);
        }
    }
}
</style>

<script lang="ts">
export default {
    name: 'VFilePicker',
};
</script>

<template>
    <q-dialog :model-value="modelValue" @update:model-value="emits('update:modelValue', $event)" persistent>
        <q-card class="container" :style="[`height: ${shape.height}px; width: ${shape.width}px`]">
            <q-bar class="header" :style="headerStyle">
                <div class="text-weight-medium ellipsis ">
                    File Picker
                </div>

                <q-space />

                <v-title-btn color="red" icon="close" @click="notifyClose"></v-title-btn>
            </q-bar>

            <q-card-section class="content q-pa-none">
                <div class="content-header shadow-4 row justify-center"
                    style="padding: 0.1rem 0.5rem 0.1rem 0.5rem; gap: 1rem">
                    <span>
                        <v-btn icon="arrow_back_ios" flat class="bg-blue-grey-8" color="white" border
                            style="width: 4rem; margin-right: 0.5rem;" :disable="!canGoBack" @click="goBack()">
                        </v-btn>
                        <v-btn icon="arrow_forward_ios" flat class="bg-blue-grey-8" color="white" border
                            style="width: 4rem;" :disable="!canGoForward" @click="goForward()">
                        </v-btn>
                    </span>
                    <v-address-bar disable class="bg-blue-grey-3 col-grow content-header-address-bar"
                        text-class="text-blue-grey-8" delimiter-class="text-blue-grey-8" :model-value="path">
                    </v-address-bar>
                    <v-btn icon="add" flat class="bg-blue-grey-8" color="white" border label="New"
                        :disable="disableNewBtn">
                        <q-menu class="bg-blue-grey-2 text-blue-grey-10">
                            <q-list style="min-width: 100px">
                                <q-item clickable v-close-popup @click="openNewDialog('File')">
                                    <v-menu-item label="New File" icon="note_add"></v-menu-item>
                                </q-item>
                                <q-item clickable v-close-popup @click="openNewDialog('Dir')">
                                    <v-menu-item label="New Folder" icon="create_new_folder">
                                    </v-menu-item>
                                </q-item>
                            </q-list>
                        </q-menu>
                    </v-btn>

                </div>
                <div class="content-main q-pa-sm">
                    <list-view class="bg-blue-grey-2 text-blue-grey-10" icon-class="text-blue-grey-8"
                        header-class="bg-blue-grey-10 text-white" :children="children" @click="nodeClicked"
                        :disable="disableList" @dblclick="open($event.name)" ref="listViewRef">
                    </list-view>
                </div>
                <div class="content-footer shadow-up-4">
                    <span class="row no-wrap " style="gap: 1rem;">
                        <q-input v-model.trim="filename" class="bg-blue-grey-3 text-blue-grey-8 col-grow"
                            label="Filename" outlined dense>
                        </q-input>
                        <span class="row no-wrap col-4" style="gap: 0.2rem">
                            <q-input v-model.trim="fileExt.label" class="bg-blue-grey-3 text-blue-grey-8"
                                label="Extension" outlined dense readonly>
                                <q-tooltip>{{ fileExt.label }}</q-tooltip>
                            </q-input>
                            <q-btn-dropdown flat class="bg-blue-grey-8" color="white">
                                <q-list v-for="(v, k) in extList" :key="k"
                                    class="bg-blue-grey-2 text-blue-grey-10 ellipsis"
                                    style="min-width: 100px; max-width: 200px">
                                    <q-item clickable v-close-popup @click="changePattern(k, v)">
                                        <q-item-section>
                                            <q-item-label class="text-weight-medium">
                                                <span class="text-bold text-capitalize">{{ k }}</span>
                                                <span class="text-bold">[</span>
                                                <span class="text-blue-grey-8">{{
                                                        normalizeValueText(v, 20)
                                                }}</span>
                                                <span class="text-bold">]</span>
                                            </q-item-label>
                                        </q-item-section>
                                    </q-item>
                                </q-list>
                            </q-btn-dropdown>
                        </span>
                    </span>
                    <q-card-actions align="right">
                        <v-btn class="bg-green text-white" flat border label="Select" @click="notifySelection"
                            :disable="isSelectionBtnDisabled"></v-btn>
                        <v-btn class="bg-red text-white" flat border label="Cancel" @click="notifyClose"></v-btn>
                    </q-card-actions>
                </div>
            </q-card-section>
        </q-card>
        <v-new-file :root="curDir" v-model="newPrompt" :type="newPromptType"></v-new-file>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { storeToRefs } from 'pinia';
import {
    capitalize, CSSProperties, onMounted, reactive, ref, watch,
} from 'vue';
import ROOT, {
    IDirectory, IFileSystem, isDir, isFile, NodeKind, Path,
} from '../scripts/fs';
import { ShapeType } from '../scripts/types';
import useTheme from '../stores/theme';
import VAddressBar from './VAddressBar.vue';
import VBtn from './VBtn.vue';
import VTitleBtn from './window/VTitleBtn.vue';
import VMenuItem from './VMenuItem.vue';
import ListView from './filemanager/ListView.vue';
import { FileManager } from '../scripts/fileManager';
import { isDef } from '../scripts/basic';
import VNewFile from './VNewFile.vue';

type PatternType = RegExp | string;
type MatchingListType = Record<string, PatternType>;

interface IProps {
    shape?: ShapeType,
    root: IDirectory,
    disableNewBtn?: boolean,
    extensionList?: MatchingListType,
    defaultExtension?: string,
    noShow?: boolean,
    modelValue: boolean,
}

interface IEmits {
    (e: 'selected', currDir: IDirectory, currSelection: IFileSystem | null, filename: string | null): void;
    (e: 'close'): void;
    (e: 'update:modelValue', val: boolean): void;
}

const emits = defineEmits<IEmits>();
const props = withDefaults(defineProps<IProps>(), {
    shape: () => ({
        width: 600,
        height: 500,
    }),
    extensionList: () => ({}),
    noShow: false,
});
const { compColor } = storeToRefs(useTheme());
const headerHeight = '2rem';
const headerStyle = computed<CSSProperties>(() => ({
    backgroundColor: compColor.value('windowTitle', 'backgroundColor'),
    color: compColor.value('windowTitle', 'textColor'),
    height: headerHeight,
}));
const filename = ref('');
const curSelection = ref<IFileSystem | null>(props.root);
const curDir = ref<IDirectory>(props.root);
const level = ref(0);
const history = ref<IDirectory[]>([]);
const listViewRef = ref<InstanceType<typeof ListView> | null>(null);
const newPrompt = ref(false);
const newPromptType = ref<NodeKind | 'None'>('None');

const normalizeValueText = (val: string | RegExp, len = 30) => {
    const temp = typeof val === 'string' ? val : val.toString().replaceAll('/', '');
    const text = ` ${temp} `;
    const tlen = text.length;
    if (tlen >= len) return `${text.substring(0, len - 3)}...`;
    return text;
};

const normalizeExtKeys = (key: string) => key.trim().toLowerCase();

const normalizeUserExts = (exts: MatchingListType): MatchingListType => {
    const res = {} as MatchingListType;
    Object.entries(exts).forEach(([k, v]) => {
        res[normalizeExtKeys(k)] = v;
    });
    return res;
};

const extList = ref<MatchingListType>({
    ...FileManager.defaultExtList,
    ...normalizeUserExts(props.extensionList),
});

const formatExtField = (key: string, val: PatternType) => `${capitalize(key)} [${normalizeValueText(val)}]`;

const normalizeFileExtField = (name: string | undefined | null): { label: string, pattern: PatternType } => {
    const key = normalizeExtKeys(name || 'all');
    const val = extList.value[key] || /.*/;
    return { label: formatExtField(key, val), pattern: val };
};

const fileExt = reactive(normalizeFileExtField(props.defaultExtension));
const disableList = ref<Set<string>>(new Set());

const changePattern = (key: string, val: PatternType) => {
    Object.assign(fileExt, {
        label: formatExtField(key, val),
        pattern: val,
    });
};

const nodeClicked = (node: IFileSystem) => {
    filename.value = node.name;
    curSelection.value = node;
};

const open = async (name?: string) => {
    const { level: nLevel, curDir: nCurDir } = await FileManager.open({
        curDir: curDir.value,
        name,
        level: level.value,
        history: history.value,
        mode: 'traverse',
    });
    level.value = nLevel;
    curDir.value = nCurDir;
};

const goForward = (): void => {
    level.value += 1;
    curDir.value = history.value[level.value];
    curSelection.value = curDir.value;
};

const goBack = (): void => {
    const { level: nLevel, curDir: nCurDir } = FileManager.goBack({
        level: level.value,
        history: history.value,
        root: props.root || ROOT,
    });
    level.value = nLevel;
    if (isDef(nCurDir)) {
        curDir.value = nCurDir;
        curSelection.value = curDir.value;
    }
};

const canGoBack = computed((): boolean => level.value > 0);
const canGoForward = computed((): boolean => level.value < history.value.length - 1);

const matchFilter = (el: IFileSystem | null, pattern: PatternType, shouldIncludeDir = false): boolean => {
    if (!isDef(el)) return false;
    if (shouldIncludeDir && isDir(el)) return true;
    if (typeof pattern === 'string') {
        if (pattern === '%Dir') isDir(el);
        if (pattern === '%File') return isFile(el);
    }
    return (el.name.match(pattern)?.length || 0) !== 0;
};

const children = computed<IFileSystem[]>(() => {
    const temp = Object.values(curDir.value._children);
    const { pattern } = fileExt;
    const match = (el: IFileSystem) => matchFilter(el, pattern, true);
    if (props.noShow) return temp.filter(match);

    disableList.value.clear();
    temp.forEach((el) => !match(el) && disableList.value.add(el._uid));
    return temp;
});

const isSelectionBtnDisabled = computed(() => !matchFilter(curSelection.value, fileExt.pattern));

const notifySelection = () => {
    emits('selected', curDir.value, curSelection.value, filename.value);
};

const notifyClose = () => {
    emits('close');
    emits('update:modelValue', false);
};

const path = computed((): string[] => Path.pathArrayFromFS(curDir.value));

watch(() => filename.value, (val: string) => {
    if (!isDef(curSelection.value)) return;
    if (val !== curSelection.value.name && isDef(listViewRef.value)) {
        listViewRef.value.deselect();
        curSelection.value = null;
    }
});

const openNewDialog = (type: NodeKind | 'None') => {
    newPromptType.value = type;
    newPrompt.value = true;
};

onMounted(() => {
    history.value.push(curDir.value);
});

</script>

<style lang="scss" scoped>
@mixin contentGrid($header, $footer) {
    display: grid;
    grid-template-rows: #{$header} calc(100% - calc(#{$header} + #{$footer})) #{$footer};
    grid-column-gap: 0px;
    grid-row-gap: 0px;
}

.container {
    overflow: hidden;
    display: grid;
    grid-template-rows: 2rem calc(100% - 2rem);

    .content {
        @include contentGrid(2.5rem, 7rem);

        &>* {
            width: 100%;
        }

        &-header {
            background-color: $blue-grey-2;
            z-index: 1;

            &-address-bar {
                border: 1px solid $blue-grey-8;
                border-radius: 3px;
            }
        }

        &-main {
            background-color: $blue-grey-6;
        }

        &-footer {
            background-color: $blue-grey-2;
            z-index: 1;
            padding: 1rem;
        }
    }
}
</style>

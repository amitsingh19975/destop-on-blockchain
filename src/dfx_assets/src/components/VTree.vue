<template>
    <ul style="padding-left: 5px;">
        <li v-for="(v) in root" :key="v._uid" class="list-container">
            <span class="row no-wrap items-baseline content-center relative-position" style="gap: 3px;"
                @click="expandClicked(v);" @dblclick="selectNode(v)">
                <v-icon :icon="hasChildren(v) ? 'expand_more' : ''"
                    :class="`self-center expand ${expand[v._uid] ? 'expand-down' : ''}`" size="1rem" square
                    font-size="90%"></v-icon>
                <v-icon :icon="getIcon(v)" size="1rem" square font-size="90%"></v-icon>
                <div class="text-subtitle1">{{ realname(v) }}</div>
            </span>
            <v-tree v-if="v && isDir(v)" v-show="expand[v._uid]" :level="level + 1" @click:node="expandClicked"
                :root="v._children" @dblclick:node="selectNode"></v-tree>
        </li>
    </ul>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { IFileSystem, Path, isDir } from '../scripts/fs';
import VIcon from './VIcon.vue';
import useExtMapping from '../stores/extMapping';

interface IProps {
    root?: Record<string, IFileSystem>;
    level?: number;
}

interface IEmits {
    (e: 'click:node', node: IFileSystem): void;
    (e: 'dblclick:node', node: IFileSystem): void;
}

const emits = defineEmits<IEmits>();
const props = withDefaults(defineProps<IProps>(), {
    level: 0,
});

const { getIcon } = useExtMapping();
const { realname } = Path;

const expand = reactive<Record<string, boolean>>({});
const hasChildren = (node: IFileSystem) => isDir(node) && Object.keys(node._children).length !== 0;

const expandClicked = (node: IFileSystem) => {
    const temp = expand[node._uid];
    expand[node._uid] = temp ? !temp : true;
    emits('click:node', node);
};

const selectNode = (node: IFileSystem) => {
    emits('dblclick:node', node);
};

</script>

<script lang="ts">
export default {
    name: 'VTree',
};
</script>

<style lang="scss" scoped>
ul,
li {
    list-style: none;
    padding: 0;
    position: relative;
}

li>span {
    cursor: pointer;
    border: 1px solid transparent;
    transition-property: color, background-color;
    transition-duration: 0.1s;
    transition-timing-function: ease-in-out;
    background-color: inherit;
    margin-left: 10px;

    &:hover {
        margin-left: 0;
        padding-left: 10px;
        background-color: $blue-grey-8;
        color: white;
    }
}

.expand {
    -webkit-transform: rotate(-90deg);
    -moz-transform: rotate(-90deg);
    -ms-transform: rotate(-90deg);
    -o-transform: rotate(-90deg);
    transform: rotate(-90deg);
    transition: transform 0.1s ease-in-out;

    &-down {
        -webkit-transform: rotate(0);
        -moz-transform: rotate(0);
        -ms-transform: rotate(0);
        -o-transform: rotate(0);
        transform: rotate(0);
    }
}

.selected {
    background-color: $blue-grey-10;
    color: white;
}
</style>

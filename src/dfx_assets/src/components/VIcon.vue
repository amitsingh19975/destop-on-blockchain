<template>
    <span class="row justify-center items-center content-center">
        <q-avatar :square="square" :size="size" v-if="loading || resourceDownloading">
            <q-spinner color="primary" size="100%" />
        </q-avatar>
        <q-avatar :square="square" :size="size" v-if="shouldShowImage" v-show="!resourceDownloading">
            <img :src="normalizedIcon?.data" ref="img" @load="resourceDownloading = false"
                :class="normalizeClass(innerClass)" :style="normalizeStyle(innerStyle)" />
        </q-avatar>
        <q-avatar v-if="shouldShowIcon" v-show="!resourceDownloading" :square="square" :icon="normalizedIcon?.data"
            :size="size" :font-size="fontSize" :class="normalizeClass(innerClass)" :style="normalizeStyle(innerStyle)">
        </q-avatar>
    </span>
</template>

<script lang="ts">
import {
    defineComponent, PropType, ref, normalizeClass, normalizeStyle, StyleValue,
} from 'vue';
import { ClassType, IIcon } from '../scripts/types';
import { isDef, isURI } from '../scripts/utils';

type NormalizedIconType = { type: 'icon' | 'img' | 'none'; data: string };

export default defineComponent({
    name: 'VIcon',
    props: {
        icon: {
            type: [String, Object] as PropType<string | IIcon | Promise<string | IIcon>>,
            required: false,
        },
        square: {
            type: Boolean,
            required: false,
        },
        size: {
            type: String,
            required: false,
            default: '2rem',
        },
        fontSize: {
            type: String,
            required: false,
        },
        loading: {
            type: Boolean,
            required: false,
        },
        innerClass: {
            type: [String, Array, Object] as PropType<ClassType>,
            required: false,
        },
        innerStyle: {
            type: [String, Array, Object] as PropType<StyleValue>,
            required: false,
        },
    },
    setup() {
        return {
            resourceDownloading: ref(true),
            normalizedIcon: ref<NormalizedIconType>(),
            img: ref<HTMLImageElement | null>(null),
            normalizeClass,
            normalizeStyle,
        };
    },

    methods: {
        async normIcon(): Promise<NormalizedIconType> {
            const temp = await this.icon;
            if (!isDef(temp)) { return { type: 'none', data: '' }; }
            return typeof temp === 'string'
                ? { type: isURI(temp) ? 'img' : 'icon', data: temp }
                : {
                    type: temp.type === 'Image' ? 'img' : 'icon',
                    data: temp.data,
                };
        },
        async handleLoading(): Promise<void> {
            this.normalizedIcon = await this.normIcon();
            if (this.normalizedIcon.type === 'img') {
                if (!this.imgCompleted()) this.resourceDownloading = this.normalizedIcon?.type === 'img';
                if (this.imgLoaded()) this.resourceDownloading = false;
            } else {
                this.resourceDownloading = false;
            }
        },
        imgCompleted(): boolean {
            const { img } = this;
            if (isDef(img)) return img.complete;
            return false;
        },
        imgLoaded(): boolean {
            const { img } = this;
            if (isDef(img)) return img.complete && img.naturalHeight !== 0;
            return false;
        },
        isImageBroken(): boolean {
            const { img } = this;
            if (isDef(img)) return img.complete && img.naturalHeight === 0;
            return false;
        },
    },
    computed: {
        shouldShowImage(): boolean {
            return !this.loading && this.normalizedIcon?.type === 'img';
        },
        shouldShowIcon(): boolean {
            return !this.loading && this.normalizedIcon?.type === 'icon';
        },
    },
    async mounted() {
        await this.handleLoading();
    },
    watch: {
        async icon(): Promise<void> {
            await this.handleLoading();
        },
    },
});
</script>

<template>
    <span class="row justify-center items-center content-center">
        <q-avatar :square="square" :size="size" v-show="loading || resourceDownloading">
            <q-spinner color="primary" size="100%" />
        </q-avatar>
        <q-avatar :square="square" :size="size" v-show="shouldShowImage && !resourceDownloading">
            <img ref="img" :class="normalizeClass(innerClass)" :style="normalizeStyle(innerStyle)" />
        </q-avatar>
        <q-avatar v-show="shouldShowIcon && !resourceDownloading" :square="square" :icon="normalizedIcon?.data"
            :size="size" :font-size="fontSize" :class="normalizeClass(innerClass)" :style="normalizeStyle(innerStyle)">
        </q-avatar>
    </span>
</template>

<script lang="ts">
import {
    defineComponent, PropType, ref, normalizeClass, normalizeStyle, StyleValue,
} from 'vue';
import { ClassType, IIcon } from '../scripts/types';
import { isURI } from '../scripts/utils';
import { isDef } from '../scripts/basic';

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
        fallbackIcon: {
            type: [String, Object] as PropType<string | IIcon | Promise<string | IIcon>>,
            required: false,
            default: () => ({ type: 'Fontawesome', data: 'fa-solid fa-circle-question' } as IIcon),
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
        async normIconHelper(icon?: string | IIcon | Promise<string | IIcon> | undefined): Promise<NormalizedIconType> {
            const temp = await icon;
            if (!isDef(temp)) { return { type: 'none', data: '' }; }
            return typeof temp === 'string'
                ? { type: isURI(temp) ? 'img' : 'icon', data: temp }
                : {
                    type: temp.type === 'Image' ? 'img' : 'icon',
                    data: temp.data,
                };
        },
        async normIcon(): Promise<NormalizedIconType> {
            return this.normIconHelper(this.icon);
        },
        async handleLoading(): Promise<void> {
            this.normalizedIcon = await this.normIcon();
            const { img } = this;
            if (this.normalizedIcon.type === 'img' && isDef(img)) {
                img.onload = () => { this.resourceDownloading = false; };
                img.onerror = async () => {
                    this.normalizedIcon = await this.normIconHelper(this.fallbackIcon);
                };
                img.src = this.normalizedIcon.data;
                // if (!this.imgCompleted()) this.resourceDownloading = this.normalizedIcon?.type === 'img';
                // if (this.imgLoaded()) this.resourceDownloading = false;
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
        icon: {
            async handler(): Promise<void> {
                await this.handleLoading();
            },
            deep: true,
        },
    },
});
</script>

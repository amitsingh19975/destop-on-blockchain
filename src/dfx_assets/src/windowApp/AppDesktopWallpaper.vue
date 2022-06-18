<template>
    <div class="fit bg-blue-grey-8 container">
        <div class="preview">
            <q-card class="fit q-pa-sm bg-blue-grey-2">
                <q-card-section class="fit canvas"></q-card-section>
            </q-card>
        </div>
        <div class="body q-pa-md">
            <q-card class="fit bg-blue-grey-6 text-white relative-position">
                <q-card-section>
                    <div>
                        <q-radio v-model="selector" color="white" dark checked-icon="task_alt"
                            unchecked-icon="panorama_fish_eye" val="color" label="Color" />
                        <q-radio v-model="selector" color="white" dark checked-icon="task_alt"
                            unchecked-icon="panorama_fish_eye" val="url" label="Image URL" />
                    </div>
                    <div v-show="selector === 'color'">
                        <q-input filled color="white" v-model="color" dark :rules="['anyColor']" dense>
                            <template v-slot:append>
                                <q-icon name="colorize" class="cursor-pointer">
                                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                                        <q-color v-model="color" style="width: 10rem;" />
                                    </q-popup-proxy>
                                </q-icon>
                            </template>
                        </q-input>
                    </div>
                    <div v-show="selector === 'url'">
                        <q-input filled color="white" v-model="image" outlined dark dense>
                        </q-input>
                    </div>
                </q-card-section>
                <v-btn flat border label="Apply" class="bg-green text-white absolute" style="bottom: 4%; right: 2%"
                    @click="apply">
                </v-btn>
            </q-card>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRef } from 'vue';
import { storeToRefs } from 'pinia';
import baseWindowComp from '../scripts/baseWindowComp';
import VBtn from '../components/VBtn.vue';
import useTheme from '../stores/theme';
import useIcons from '../stores/icons';

type SelectorType = 'color' | 'url';

export default defineComponent({
    name: 'AppDesktopWallpaper',
    extends: baseWindowComp,
    components: {
        VBtn,
    },
    setup() {
        const store = useTheme();
        const color = ref(store.compColor('desktop', 'backgroundColor'));
        const image = ref(store.images.desktop.backgroundImage || '');
        return {
            color,
            image,
            selector: ref<SelectorType>('color'),
        };
    },
    computed: {
        getPreview(): string {
            const { selector } = this;
            switch (selector) {
                case 'color': return this.color;
                case 'url': return `url("${this.image}")`;
                default: break;
            }
            throw new Error(`[getPreview]: unknown selector="${selector}"`);
        },
    },
    methods: {
        apply(): void {
            const { setDesktopWallpapr } = useTheme();
            if (this.selector === 'url') {
                setDesktopWallpapr('image', this.image);
            } else {
                setDesktopWallpapr('color', this.color);
            }
        },
        async wBeforeLoaded(): Promise<void> {
            this.closeDialogBox();
            await this.show();
        },
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppDesktopWallpaper', {
            type: 'Material',
            data: 'wallpaper',
        });
    },
});
</script>

<style lang="scss" scoped>
.container {
    display: grid;
    grid-template-rows: 15rem calc(100% - 15rem);

    & .preview {
        padding: 1rem;

        & div .canvas {
            background: v-bind(getPreview);
            background-size: cover;
            background-repeat: no-repeat;
        }

        // border: 5px solid $blue-grey-4;
    }

}
</style>

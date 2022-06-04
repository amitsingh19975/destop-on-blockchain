<template>
    <div class="fit relative-position container column items-center justify-center content-center ">
        <div class="backdrop absolute"></div>

        <div class="column items-center justify-center content-center">
            <div class="text-subtitle1">Now PLAYING</div>
            <div class="text-h3 text-center no-scroll">{{ normalizedName() }}</div>
        </div>

        <div class="play-btn">
            <transition>
                <v-icon font-size="100%" v-show="isPaused" @click="startPlaying" icon="fa-solid fa-play-circle"
                    size="5rem">
                </v-icon>
            </transition>
            <transition>
                <v-icon font-size="100%" v-show="!isPaused" @click="pausePlaying" icon="fa-solid fa-pause-circle"
                    size="5rem">
                </v-icon>
            </transition>
        </div>

        <div class="seeker-container" style="width: 90%;">
            <div class="text-center">{{ getAudioTime }}</div>
            <q-slider v-model="seeker" :min="0" :max="100" label :label-value="getAudioTime" @pan="onPanning"
                @click="skip" />
            <div class="text-center">{{ getMaxSeekTime }}</div>
        </div>

        <div class="row no-wrap items-center justify-center q-mt-md" style="width: 40%;">
            <v-icon icon="fa-solid fa-volume-down"></v-icon>
            <q-slider v-model="volume" :min="0" :max="100" label :label-value="volume + '%'" />
            <v-icon icon="fa-solid fa-volume-up"></v-icon>
        </div>

        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
        <v-file-picker v-bind="filePickerProps" @selected="openFile" default-extension="audio">
        </v-file-picker>
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import BaseWindowComp from '../scripts/baseWindowComp';
import useIcons from '../stores/icons';
import { IDirectory, IFile, IFileSystem } from '../scripts/fs';
import {
    div,
    formatTime,
    isDef, loadMedia,
} from '../scripts/utils';
import useExtMapping from '../stores/extMapping';
import { DefaultAudioExt } from '../scripts/types';
import VIcon from '../components/VIcon.vue';
import { notifyNeg } from '../scripts/notify';

type AudioStateType = 'play' | 'pause' | 'hold';

export default defineComponent({
    name: 'AppMusicPlayer',
    components: {
        VIcon,
    },
    extends: BaseWindowComp,
    props: {
        data: {
            type: String,
            required: false,
        },
    },
    setup() {
        return {
            openedFile: ref<IFile>(),
            volume: ref(50),
            seeker: ref(0),
            maxAudioLen: ref(0),
            state: reactive({
                curr: 'pause' as AudioStateType,
                _old: 'pause' as AudioStateType,
            }),
            intervalId: ref<ReturnType<typeof setInterval> | null>(null),
            handler: undefined as (HTMLAudioElement | undefined),
            beforeOnSelected: ref<() => void>(),
        };
    },
    computed: {
        getAudioTime(): string {
            return formatTime(this.seeker, this.getTimeFormatOptions);
        },

        getMaxSeekTime(): string {
            return formatTime(this.maxAudioLen, { auto: true });
        },

        getTimeFormatOptions() {
            if (Number.isNaN(this.maxAudioLen)) return {};
            const { q: min } = div(this.maxAudioLen, 60);
            const { q: hrs } = div(min, 60);
            return {
                hours: hrs !== 0,
                minutes: min !== 0,
            };
        },
        getName(): string {
            const temp = (this.openedFile?.stem || this.file?.stem || 'Unknown')
                .split(' ')
                .map((el) => el.trim())
                .filter((el) => el)
                .join(' ');
            return temp;
        },
        isPaused(): boolean {
            return this.state.curr !== 'play';
        },
    },
    methods: {
        normalizedName(maxLen = 43): string {
            const temp = this.getName;
            return temp.length >= maxLen ? `${temp.substring(0, maxLen - 3)}...` : temp;
        },

        skip(): void {
            const { handler, seeker } = this;
            if (!isDef(handler)) return;
            handler.currentTime = seeker;
        },

        async onPanning(phase: 'start' | 'end'): Promise<void> {
            const { state, handler, seeker } = this;
            if (!isDef(handler)) return;

            if (phase === 'start') {
                state._old = state.curr;
                state.curr = 'hold';
                handler.pause();
            } else if (phase === 'end') {
                handler.currentTime = seeker;
                state.curr = state._old;
                await handler.play();
            }
        },
        pausePlaying(): void {
            const { handler, state } = this;
            if (!isDef(handler)) return;
            handler.pause();
            state.curr = 'pause';
        },

        async startPlaying(): Promise<void> {
            const { handler, state } = this;
            if (!isDef(handler)) return;
            try {
                state.curr = 'play';
                await handler.play();
            } catch (e) {
                notifyNeg(e);
            }
        },

        async fetchData(node?: IFile): Promise<string | Error> {
            if (!isDef(node)) return new Error('File does not exist!');
            const errOr = await loadMedia(node, {
                matchType: 'audio',
            });
            if (errOr instanceof Error) throw errOr;
            return errOr.data;
        },

        async constructAudio(url: string): Promise<undefined | Error> {
            try {
                this.handler = new Audio(url);
                const handler = this.handler!;

                await new Promise<void>((resolve) => {
                    handler.addEventListener('canplaythrough', () => resolve());
                });

                this.intervalId = setInterval(() => {
                    const { state } = this;
                    if (state.curr !== 'play') return;
                    this.seeker += 1;
                }, 1000);

                this.maxAudioLen = handler.duration;
                this.changeVolume(this.volume);
                return undefined;
            } catch (e) {
                return e as Error;
            }
        },

        dispose(): void {
            if (isDef(this.intervalId)) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.state.curr = 'pause';
            this.state._old = 'pause';
            this.maxAudioLen = 0;
            this.seeker = 0;

            this.pausePlaying();
            this.handler = undefined;
        },

        async wBeforeLoaded(): Promise<void> {
            if (this.isSelf) {
                await this.openBlockingFilePicker({
                    closeOnFailure: true,
                });
            } else {
                const errOr = await this.fetchData(this.file);
                if (errOr instanceof Error) {
                    this.openDialogBox('danger', errOr.message);
                    return;
                }
                await this.constructAudio(errOr);
            }
            this.closeDialogBox();
            await this.show();
        },
        async openFile(currDir: IDirectory, currSelection: IFileSystem | null, filename: string | null): Promise<void> {
            const node = this.openFileHelper(currDir, currSelection, filename);
            if (!isDef(node)) {
                return;
            }
            this.closeFilePicker();
            this.openDialogBox('loading');
            this.dispose();
            const errOr = await this.fetchData(node);
            if (errOr instanceof Error) {
                this.openDialogBox('danger', errOr.message);
                return;
            }
            await this.constructAudio(errOr);
            this.openedFile = node;
            this.closeDialogBox();
        },

        pauseOrPlay(): void {
            const { state } = this;
            state.curr = state.curr === 'play' ? 'pause' : 'play';
        },
        changeVolume(val: number): void {
            const nval = val / 100;
            if (isDef(this.handler)) {
                this.handler.volume = nval;
            }
        },
        wBeforeDestroy(): void {
            this.dispose();
        },
    },
    watch: {
        volume(val: number): void {
            this.changeVolume(val);
        },
    },
    async mounted() {
        this.resize({ width: 500, height: 500 });
        this.addAction('File', 'open', {
            icon: useIcons().icons.open,
            action: () => {
                this.openFilePicker();
            },
        });
    },
    registerExtenstion(): void {
        useExtMapping().addMappingUsingArray(DefaultAudioExt, 'audio', 'AppMusicPlayer');
    },
    unmounted() {
        // this.handler?.;
    },
});
</script>

<style lang="scss" scoped>
@mixin seeker($start, $end) {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: #{$start} calc(90% - calc(#{$start} + #{$end})) #{$end};
    align-items: center;
}

.container {
    background-color: $blue-grey-8;

    color: $blue-grey-2;
    z-index: 0;

    & .backdrop {
        background-color: $blue-8;
        height: 100% !important;
        width: 100% !important;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-shadow: inset 0 0 2000px $blue-grey-6;
        filter: blur(10px);
        background: inherit;
        z-index: 1;
    }

    &>*:not(.backdrop) {
        z-index: 2;
    }

    & .play-btn {
        margin: 25px;
        position: relative;
        width: 5rem;
        height: 5rem;

        &>* {
            top: 0;
            left: 0;
            opacity: 0.8;
            position: absolute;
            border-radius: 100%;
            cursor: pointer;

            transition: opacity .2s;

            &:hover {
                opacity: 1.0;
            }
        }

    }

    & .seeker-container {
        @include seeker(4rem, 4rem)
    }

    .v-enter-active,
    .v-leave-active {
        transition: opacity 0.1s ease-in-out;
    }

    .v-enter-from,
    .v-leave-to {
        opacity: 0;
    }
}
</style>

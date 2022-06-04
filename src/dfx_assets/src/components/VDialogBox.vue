<template>
    <q-dialog :model-value="modelValue" @update:model-value="emits('update:modelValue', $event)" persistent
        :seamless="seemless">
        <q-card style="min-width: 400px;">
            <q-bar :class="`${type}-bar q-mb-sm`">
                <div class="text-weight-medium ellipsis ">
                    {{ normalizeTitle }}
                </div>
                <q-space />
                <v-title-btn v-if="closable" color="red" icon="close" @click="onClose"></v-title-btn>
            </q-bar>

            <q-card-section :class="`q-pt-none ${getLayoutClass}`">
                <q-avatar v-if="showIcon" :icon="qIcon(type)" :class="type" size="5rem" />
                <q-spinner-orbit v-if="type === 'loading'" size="4em" class="col-grow" color="primary" />
                <div style="white-space: initial; word-wrap: break-word;">
                    <slot name="prepend"></slot>
                    {{ getNormalizedMessage }}
                    <slot name="append"></slot>
                </div>
            </q-card-section>
            <q-card-actions align="right" v-show="shouldShowBtn('all')">
                <v-btn color="green" v-if="shouldShowBtn('green')" :label="btns!.green!.label"
                    @click="onClick('green', $event)"></v-btn>
                <v-btn color="red" v-if="shouldShowBtn('red')" :label="btns!.red!.label"
                    @click="onClick('red', $event)"></v-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { getCurrentInstance } from 'vue';
import { computed } from '@vue/reactivity';
import useIcons from '../stores/icons';
import VTitleBtn from './window/VTitleBtn.vue';
import VBtn from './VBtn.vue';
import { capitalize } from '../scripts/utils';

type BoxType = 'danger' | 'confirm' | 'warning' | 'info' | 'loading';
type BtnType = 'green' | 'red';

interface IProps {
    modelValue: boolean,
    type: BoxType;
    title?: string;
    noTitle?: boolean;
    message: string;
    closable?: boolean;
    btns?: {
        green?: {
            label: string,
        },
        red?: {
            label: string,
        },
    };
    noIcon?: boolean;
    seemless?: boolean;
}

interface IEmits {
    (e: 'close'): void;
    (e: 'click', data: { btnType: BtnType, e: Event }): void;
    (e: 'update:modelValue', val: boolean): void;
}

const props = defineProps<IProps>();

const emits = defineEmits<IEmits>();

const { qIcon } = storeToRefs(useIcons());
const getNormalizedMessage = computed(() => props.message.trim());

const shouldShowBtn = computed(() => (type: BtnType | 'all') => {
    const { btns } = props;
    const baseC = typeof btns !== 'undefined';
    if (!baseC) return false;
    if (type === 'all') return true;
    if (type === 'green') return typeof btns.green !== 'undefined';
    if (type === 'red') return typeof btns.red !== 'undefined';
    return false;
});

const onClose = () => {
    emits('close');
};

const onClick = (type: BtnType, e: Event) => {
    emits('click', { btnType: type, e });
};

const showIcon = computed(() => (!props.noIcon && ['confirm', 'loading'].every((el) => el !== props.type)));
const normalizeTitle = computed(() => {
    if (props.noTitle) return '';
    if (props.title) return props.title;
    return capitalize(props.type);
});

const getLayoutClass = computed(() => {
    const { slots = {} } = getCurrentInstance() || {};
    const keys = Object.keys(slots).length;
    const hasText = keys !== 0 || getNormalizedMessage.value.length !== 0;
    if ((showIcon.value || props.type === 'loading') && hasText) {
        return 'layout-two';
    }
    return 'layout-one';
});

</script>

<script lang="ts">

export default {
    name: 'VDialogBox',
};
</script>

<style scoped lang="scss">
.layout {
    width: inherit;

    &-one {
        width: 100%;
    }

    &-two {
        display: grid;
        grid-template-columns: 5rem calc(100% - 5rem);
        overflow: hidden;
    }
}

.danger {
    color: $negative;

    &-bar {
        color: white;
        background-color: $negative;
        border-bottom: 1px solid darken($negative, 10);
    }
}

.warning {
    color: $warning;

    &-bar {
        color: white;
        background-color: $warning;
        border-bottom: 1px solid darken($warning, 10);
    }
}

.confirm {
    &-bar {
        color: white;
        background-color: $positive;
        border-bottom: 1px solid darken($positive, 10);
    }
}

.info {
    color: $info;

    &-bar {
        color: black;
        background-color: $info;
        border-bottom: 1px solid darken($info, 10);
    }
}

.loading {
    color: $primary;

    &-bar {
        color: white;
        background-color: $primary;
        border-bottom: 1px solid darken($primary, 10);
    }
}
</style>

<template>
    <div ref="rootEl" class="address-bar row no-wrap items-center scroll"
        :style="{ borderRadius: round ? '5px' : undefined }" v-click-outside="getHandler()" @click="focusLastElem"
        vinput="addressBar">
        <div :class="['address-bar-text text-bold', normalizeClass(textClass)]"
            :style="[normalizeStyle(textStyle) || '']">
            <q-icon name="fa-solid fa-database"></q-icon>
        </div>
        <span class="row no-wrap items-center" v-for="(c, i) in blocks" :key="c + i" @click.stop>
            <div :class="['address-bar-delimiter text-bold text-h6', normalizeClass(delimiterClass)]"
                :style="[normalizeStyle(delimiterStyle) || '']">
                <q-icon name="navigate_next"></q-icon>
            </div>
            <div :ref="(el) => addTextRefs(el, i)" :class="['address-bar-text text-bold', normalizeClass(textClass)]"
                :style="[normalizeStyle(textStyle) || '']" :contenteditable="!disable"
                @keydown="handleKeydown(i, $event)" @input="textChanged(i)">
                {{ c }}
            </div>
        </span>
    </div>
</template>

<script setup lang="ts">
import {
    computed, StyleValue, normalizeClass, normalizeStyle, ref, watch, nextTick, shallowReactive, onMounted, onUnmounted, onBeforeUpdate, getCurrentInstance,
} from 'vue';
import { IClickOutsideBindingArgs } from '../plugins/v-click-outside';
import { isDef } from '../scripts/basic';
import { ClassType } from '../scripts/types';
import { getCaretCharacterOffsetWithin, HTMLElementFromVueRef } from '../scripts/utils';
import useContextMenu from '../stores/contextMenu';
import useTheme from '../stores/theme';

interface IProps {
    modelValue?: string | string[];
    delimiter?: string;
    round?: boolean;
    textClass?: ClassType;
    textStyle?: StyleValue;
    delimiterClass?: ClassType;
    delimiterStyle?: StyleValue;
    placeholderColor?: string;
    validator?: (path: string[]) => boolean;
    disable?: boolean;
}
interface IEmits {
    (e: 'update:modelValue', val: string[]): void;
}

const props = withDefaults(defineProps<IProps>(), {
    delimiter: '/',
    modelValue: () => [''],
    disable: false,
});

const rootEl = ref<HTMLElement | null>(null);
const emits = defineEmits<IEmits>();
const textRefs = shallowReactive<Record<number, HTMLElement>>({});
const textRefsLen = computed(() => Object.keys(textRefs).length);
const resetTextRefs = () => Object.keys(textRefs).forEach((k) => delete textRefs[k as unknown as number]);

const addTextRefs = (obj: unknown, idx: number) => {
    const el = HTMLElementFromVueRef(obj);
    if (!isDef(el) || Array.isArray(el)) return;
    textRefs[idx] = el;
};

const pieces = () => {
    const temp = (typeof props.modelValue === 'string'
        ? props.modelValue.trim()
            .split(props.delimiter) : props.modelValue)
        .map((el) => el.trim())
        .filter((el) => el.length !== 0);
    temp.push('');
    return temp;
};

const blocks = ref<string[]>(pieces());

watch(() => props.modelValue, () => { blocks.value = pieces(); });

const focusOn = (idx: number, moveToEnd = true) => {
    const el = textRefs[idx] as HTMLElement;
    if (!isDef(el)) return;
    if (document.activeElement === el) return;
    if (moveToEnd) {
        const rng = document.createRange();
        rng.selectNodeContents(el);
        rng.collapse(false);
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(rng);
    }
    el.focus();
};

const focusLastElem = () => focusOn(textRefsLen.value - 1);

const blur = (idx: number) => {
    const el = textRefs[idx];
    if (!isDef(el)) return;
    el.blur();
    window.getSelection()?.removeAllRanges();
};

const blurAll = (reset = false) => {
    Object.values(textRefs).forEach((el) => el.blur());
    window.getSelection()?.removeAllRanges();
    if (reset) blocks.value = pieces();
};

const changeFocuse = (prev: number, next: number, moveToEnd = true) => {
    if (prev === next) return;
    blur(prev);
    focusOn(next, moveToEnd);
};

const getHandler = (): IClickOutsideBindingArgs => ({
    closeConditional: () => {
        const temp = Object.values(textRefs).every((el) => document.activeElement !== el);
        return !(temp || props.disable);
    },
    handler: () => {
        blurAll();
    },
});

const enterPressed = () => {
    Object.entries(textRefs).forEach(([k, v]) => {
        blocks.value[parseInt(k, 10)] = v.textContent || '';
        v.blur();
    });
    window.getSelection()?.removeAllRanges();
    nextTick(() => {
        if (props.validator) {
            if (!props.validator(blocks.value)) {
                blocks.value = pieces();
            }
        }
        emits('update:modelValue', blocks.value);
    });
};

const textChanged = (idx: number) => {
    const el = textRefs[idx];
    if (!isDef(el) || idx >= blocks.value.length) return;
    const text = (el.textContent || '')
        .split(props.delimiter)
        .map((el) => el.trim());
    const normText = text
        .filter((el) => el.length !== 0);

    const len = normText.length;

    if (text.length === 1) return;

    el.textContent = '';

    console.log(blocks.value, textRefs, normText);
    blocks.value.splice(idx, 0, ...normText);
    console.log(blocks.value, textRefs, normText);

    nextTick(() => {
        changeFocuse(idx, idx + len);
    });
};

const handleBackspace = (idx: number) => {
    const el = textRefs[idx];
    if (!isDef(el) || idx >= blocks.value.length) return false;
    const text = (el.textContent || '');
    const len = text.length;

    if (len !== 0) return false;

    const blen = blocks.value.length;

    if (blen < 2) {
        blocks.value = [''];
        nextTick(() => focusOn(0));
        return false;
    }

    blocks.value.splice(idx, 1);

    nextTick(() => focusOn(Math.max(idx - 1, 0)));
    return true;
};

const handleKeydown = (idx: number, e: KeyboardEvent) => {
    if (props.disable) return;
    const caret = getCaretCharacterOffsetWithin(textRefs[idx]);
    switch (e.key) {
        case 'Enter': {
            enterPressed();
            break;
        }
        case 'Left':
        case 'ArrowLeft': {
            if (caret === 0) {
                const nidx = Math.max(idx - 1, 0);
                changeFocuse(idx, nidx);
                e.preventDefault();
            }
            break;
        }
        case 'Right':
        case 'ArrowRight': {
            const text = textRefs[idx]?.textContent || '';
            const len = text.length;
            if (len === caret) {
                if (idx + 1 < textRefsLen.value) changeFocuse(idx, idx + 1, false);
                else focusOn(idx);
                e.preventDefault();
            }
            break;
        }
        case 'Backspace':
        case 'Delete': {
            if (handleBackspace(idx)) e.preventDefault();
            break;
        }

        default: break;
    }
};

const normalizePlaceholderColor = computed(() => props.placeholderColor || useTheme().getColor('white'));

onMounted(() => {
    const el = rootEl.value;
    if (isDef(el)) {
        useContextMenu().registerCustomInput(el, (text) => {
            blocks.value.push(text);
            focusLastElem();
        });
    }
});

onBeforeUpdate(() => {
    resetTextRefs();
});

onUnmounted(() => {
    const el = rootEl.value;
    if (isDef(el)) useContextMenu().removeCustomInput(el);
});

</script>

<script lang="ts">
export default {
    name: 'VAddressBar',
};
</script>

<style scoped lang="scss">
.address-bar {
    min-width: 10rem;
    min-height: 2rem;
    padding: 0 1rem 0 1rem;
    border: 2px solid transparent;
    gap: 5px;
    cursor: text;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &:focus-within {
        border: 2px solid $primary;
    }

    &::-webkit-scrollbar {
        display: none;
    }

    &-text {
        padding: 0.2rem;

        &[contenteditable="true"] {
            position: relative;
            background-color: transparent;

            &:focus {
                // background-color: $;
                outline: none;
            }

            &::before {
                z-index: 0;
                position: absolute;
                content: attr(data-placeholder);
                color: v-bind(normalizePlaceholderColor);
                opacity: 0.3;
            }
        }
    }
}
</style>

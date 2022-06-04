import { defineStore } from 'pinia';
import { copyToClipboard, QList, QMenu } from 'quasar';
import { computed, ref } from 'vue';
import { notifyNeg } from '../scripts/notify';
import { IActionValue, PIDType, VueHTMLElementType } from '../scripts/types';
import {
    isDef, isEditable, isInputElement, isTextAreaElement,
} from '../scripts/utils';

interface IContextMenu {
    taskBtn: {
        minimize: (pid: PIDType) => void;
        maximize: (pid: PIDType) => void;
        close: (pid: PIDType) => void;
    };
    text: {
        copy: (el: unknown) => void;
        paste: (el: unknown) => void;
    };
    icon: {
        copy: (el: unknown) => void;
        rename: (callback: () => void) => void;
    };
}

export interface IContextMenuValue {
    icon?: IActionValue['icon'],
    action: () => void,
    showCondition?: () => boolean,
}

type PasteCallbackType = (text: string) => void;

const useContextMenu = defineStore('useContextMenuStore', () => {
    const currContextMenu = ref<Record<string, IContextMenuValue>>({});
    const _el = ref<HTMLElement | null>();
    const pasteCallback = new Map<HTMLElement, PasteCallbackType>();
    const _contextMenuRef = ref<QList | null>(null);

    const replaceSeletedText = (text: string): boolean => {
        const selText = window.getSelection();
        if (!isDef(selText)) return false;
        if (selText.rangeCount === 0) return false;
        const range = selText.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        return true;
    };

    const defaultPasteAction = (el: HTMLElement, text: string) => {
        if (replaceSeletedText(text)) return;

        if (isInputElement(el) || isTextAreaElement(el)) {
            el.value += text;
        } else {
            el.innerText += text;
        }
    };

    const pasteAction = async (el?: HTMLElement | null) => {
        if (!isDef(el)) return;
        const temp = await navigator.clipboard.readText();
        const customCB = pasteCallback.get(el);
        const defCB = (text: string) => defaultPasteAction(el, text);
        (customCB || defCB)(temp);
    };

    const constructPasteAction = (): IContextMenuValue | {} => {
        const el = _el.value;
        if (!isEditable(el)) return {};
        return {
            paste: {
                icon: 'content_paste',
                action: async () => pasteAction(el),
            } as IContextMenuValue,
        };
    };

    const getSelectedText = (): string => {
        const sel = window.getSelection();
        if (sel && sel.type === 'Range') return sel.toString();
        return '';
    };

    const constructCopyAction = (): IContextMenuValue | {} => {
        const text = getSelectedText();
        if (text.length === 0) return {};
        return {
            copy: {
                icon: 'content_copy',
                action: async () => {
                    try {
                        await copyToClipboard(text);
                    } catch (e) {
                        notifyNeg(e);
                    }
                },
            } as IContextMenuValue,
        };
    };

    const normalizedContextMenuHelper = computed<Record<string, IContextMenuValue | {}>>(() => {
        if (('copy' in currContextMenu.value) && ('paste' in currContextMenu.value)) {
            return currContextMenu.value;
        }
        if (('copy' in currContextMenu.value) && !('paste' in currContextMenu.value)) {
            return { ...currContextMenu.value, ...constructPasteAction() };
        }
        if (!('copy' in currContextMenu.value) && ('paste' in currContextMenu.value)) {
            return { ...currContextMenu.value, ...constructCopyAction() };
        }
        return { ...currContextMenu.value, ...constructPasteAction(), ...constructCopyAction() };
    });

    const normalizedContextMenu = computed(() => {
        const temp = normalizedContextMenuHelper.value;
        const keys = Object.keys(temp);
        const len = keys.length;
        const shouldRemove = (el: IContextMenuValue) => el.showCondition?.() === false;
        for (let i = 0; i < len; i += 1) {
            const ac = temp[keys[i]];
            if (Object.keys(ac).length === 0 || !isDef(ac) || shouldRemove(ac as IContextMenuValue)) {
                delete temp[keys[i]];
            }
        }
        return temp as Record<string, IContextMenuValue> | {};
    });

    return {
        _el,
        currContextMenu,
        normalizedContextMenu,
        registerCustomInput: (el: HTMLElement, callback: PasteCallbackType) => pasteCallback.set(el, callback),
        removeCustomInput: (el: HTMLElement) => pasteCallback.delete(el),
        _contextMenuRef,
        resetContextMenu: () => { currContextMenu.value = {}; },
    };
});

export default useContextMenu;

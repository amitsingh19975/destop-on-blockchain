import { storeToRefs } from 'pinia';
import { DirectiveBinding, Directive } from 'vue';
import { isDef, checkKeys } from '../scripts/basic';
import {
    getNodeRoot, HTMLElementFromVueRef, isEditable,
} from '../scripts/utils';
import useContextMenu, { IContextMenuValue } from '../stores/contextMenu';

type EventHandlerType<R = void> = (e: Event) => R;

type CHTMLElement = HTMLElement & {
    _contextMenu?: Record<number, {
        onContextMenu: EventHandlerType,
    }>
};

export interface IContextMenuBindingArgs {
    handler?: EventHandlerType;
    closeConditional?: EventHandlerType<boolean>;
    actions?: () => Record<string, IContextMenuValue>;
}

const defaultBindingArgs: Required<IContextMenuBindingArgs> = {
    handler: () => void 0,
    closeConditional: () => true,
    actions: () => ({}),
};

interface IContextMenuDirective
    extends DirectiveBinding<EventHandlerType | IContextMenuBindingArgs | undefined> { }

const getBindingValue = <
    K extends keyof IContextMenuBindingArgs,
    R extends typeof defaultBindingArgs[K]
>(
    binding: IContextMenuDirective,
    key: K,
): R => {
    const { value } = binding;
    if (!isDef(value)) return defaultBindingArgs.handler as unknown as R;
    if (typeof value === 'function') return (key === 'handler' ? value : defaultBindingArgs[key]) as unknown as R;
    return (value[key] || defaultBindingArgs[key]) as unknown as R;
};

const checkIsActive = (
    e: Event,
    binding: IContextMenuDirective,
): boolean => {
    const isActive = getBindingValue(binding, 'closeConditional');
    return e instanceof Event && isActive(e);
};

const showPhase = (val: number): string => {
    if (val === Event.AT_TARGET) return 'AT_TARGET';
    if (val === Event.CAPTURING_PHASE) return 'CAPTURING_PHASE';
    if (val === Event.BUBBLING_PHASE) return 'BUBBLING_PHASE';
    return 'None';
};

const checkIfContains = (a: Node, b: Node): boolean => {
    const aHas = checkKeys<HTMLElement>(a, ['contains']);
    const bHas = checkKeys<HTMLElement>(b, ['contains']);

    if (aHas && bHas) return a.contains(b) || b.contains(a);
    if (aHas && !bHas) return a.contains(b);
    if (!aHas && bHas) return b.contains(a);
    return false;
};

const checkEvent = (e: Event, el: HTMLElement, binding: IContextMenuDirective): boolean => {
    if (!checkIsActive(e, binding)) return false;

    const root = getNodeRoot(el);

    if (
        typeof ShadowRoot !== 'undefined'
        && root instanceof ShadowRoot
        && root.host === e.target
    ) return false;

    const temp = getBindingValue(binding, 'actions')();
    // console.log(el, e.target, checkIfContains(el, e.target as Node));
    if (checkIfContains(el, e.target as Node)) {
        if (Object.keys(temp).length !== 0) {
            // console.log(e.target);
            const { currContextMenu, _el } = storeToRefs(useContextMenu());
            currContextMenu.value = temp;
            if (!isDef(_el.value)) _el.value = el;
            // console.log(temp, showPhase(e.eventPhase), el);
            return true;
        }
    }

    return false;
};

const directive = (
    e: Event,
    el: CHTMLElement,
    binding: IContextMenuDirective,
): void => {
    const handler = getBindingValue(binding, 'handler');
    // const { _notSet } = useContextMenu();
    const { target } = e;
    // console.log(target, isEditable(target));
    if (isEditable(target)) useContextMenu()._el = target as HTMLElement;
    if (checkIsActive(e, binding)
        && checkEvent(e, el, binding)
    ) {
        handler(e);
    }
};

const handleShadow = (
    el: CHTMLElement,
    callback: (val: NonNullable<ReturnType<typeof getNodeRoot>>) => void,
): void => {
    const root = getNodeRoot(el);

    callback(document);

    if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
        callback(root);
    }
};

const contextMenu: Directive = {
    mounted: (el: unknown, binding: IContextMenuDirective) => {
        const tempEl = HTMLElementFromVueRef(el) as (CHTMLElement | CHTMLElement[] | undefined);
        if (!tempEl || Array.isArray(tempEl)) return;

        const { instance } = binding;
        if (typeof instance === 'undefined' || instance === null) return;

        const onContextMenu = (e: Event) => directive(e as Event, tempEl, binding);

        handleShadow(tempEl, (app: Document | ShadowRoot) => {
            app.addEventListener('contextmenu', onContextMenu, true);
        });

        tempEl._contextMenu = tempEl._contextMenu || {};

        tempEl._contextMenu[instance.$.uid] = {
            onContextMenu,
        };
    },
    unmounted: (el: unknown, binding: IContextMenuDirective) => {
        const tempEl = HTMLElementFromVueRef(el) as (CHTMLElement | CHTMLElement[] | undefined);
        if (!tempEl || Array.isArray(tempEl)) return;

        const { instance } = binding;
        if (typeof instance === 'undefined' || instance === null) return;

        const { _contextMenu } = tempEl;

        if (typeof _contextMenu === 'undefined') return;

        const { uid } = instance.$;

        handleShadow(tempEl, (app: Document | ShadowRoot) => {
            if (!app) return;

            const { onContextMenu } = _contextMenu[uid]!;

            app.removeEventListener('contextmenu', onContextMenu, true);
        });

        delete _contextMenu[uid];
    },
};

export default contextMenu;

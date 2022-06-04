import { storeToRefs } from 'pinia';
import { DirectiveBinding, Directive } from 'vue';
import { getNodeRoot, HTMLElementFromVueRef } from '../scripts/utils';
import useContextMenu from '../stores/contextMenu';

type EventHandlerType<R = void> = (e: Event) => R;

type CHTMLElement = HTMLElement & {
    _clickOutside?: {
        lastMousedownWasOutside: boolean,
    } & Record<number, {
        onClick: EventHandlerType,
        onMousedown: EventHandlerType,
    }>
};

export interface IClickOutsideBindingArgs {
    handler: EventHandlerType;
    closeConditional?: EventHandlerType<boolean>;
    include?: () => unknown[];
}

interface IClickOutsideDirective
    extends DirectiveBinding<EventHandlerType | IClickOutsideBindingArgs | undefined> { }

const defaultBindingArgs: Required<IClickOutsideBindingArgs> = {
    handler: () => void 0,
    closeConditional: () => true,
    include: () => [],
};

const getBindingValue = <
    K extends keyof IClickOutsideBindingArgs,
    R extends Required<IClickOutsideBindingArgs>[K]
>(
    binding: IClickOutsideDirective,
    key: K,
): R => {
    const { value } = binding;
    if (typeof value === 'undefined' || value === null) return defaultBindingArgs.handler as unknown as R;
    if (typeof value === 'function') return (key === 'handler' ? value : defaultBindingArgs[key]) as unknown as R;
    return (value[key] || defaultBindingArgs[key]) as unknown as R;
};

const checkIsActive = (
    e: Event,
    binding: IClickOutsideDirective,
): boolean => {
    const isActive = getBindingValue(binding, 'closeConditional');
    return e instanceof Event && isActive(e);
};

const checkEvent = (e: Event, el: CHTMLElement, binding: IClickOutsideDirective): boolean => {
    if (!checkIsActive(e, binding)) return false;

    const root = getNodeRoot(el);

    if (
        typeof ShadowRoot !== 'undefined'
        && root instanceof ShadowRoot
        && root.host === e.target
    ) return false;

    const tempElements = HTMLElementFromVueRef(getBindingValue(binding, 'include')()) || [];
    const elements = Array.isArray(tempElements) ? tempElements : [tempElements];

    elements.push(el);
    const { _contextMenuRef } = storeToRefs(useContextMenu());
    if (_contextMenuRef.value) elements.push(_contextMenuRef.value.$el);

    return !elements.some((elem) => elem.contains(e.target as Node));
};

const directive = (
    e: Event,
    el: CHTMLElement,
    binding: IClickOutsideDirective,
): void => {
    const handler = getBindingValue(binding, 'handler');
    // console.log(el);
    // console.log(el._clickOutside?.lastMousedownWasOutside, checkEvent(e, el, binding), checkIsActive(e, binding), e.target);
    if (el._clickOutside?.lastMousedownWasOutside
        && checkEvent(e, el, binding)
        && checkIsActive(e, binding)
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

const clickOutside: Directive = {
    mounted: (el: unknown, binding: IClickOutsideDirective, vnode: unknown) => {
        const tempEl = HTMLElementFromVueRef(el) as (CHTMLElement | CHTMLElement[] | undefined);
        if (!tempEl || Array.isArray(tempEl)) return;

        const { instance } = binding;

        if (typeof instance === 'undefined' || instance === null) return;

        const onClick = (e: Event) => directive(e as Event, tempEl, binding);

        const onMousedown = (e: Event) => {
            const { _clickOutside } = tempEl;
            if (_clickOutside) {
                _clickOutside.lastMousedownWasOutside = checkEvent(e as Event, tempEl, binding);
            }
        };

        handleShadow(tempEl, (app: Document | ShadowRoot) => {
            app.addEventListener('click', onClick, true);
            app.addEventListener('mousedown', onMousedown, true);
        });

        tempEl._clickOutside = {
            lastMousedownWasOutside: !!tempEl._clickOutside?.lastMousedownWasOutside,
        };

        tempEl._clickOutside[instance.$.uid] = {
            onClick,
            onMousedown,
        };
    },
    unmounted: (el: unknown, binding: IClickOutsideDirective) => {
        const tempEl = HTMLElementFromVueRef(el) as (CHTMLElement | CHTMLElement[] | undefined);
        if (!tempEl || Array.isArray(tempEl)) return;

        const { instance } = binding;
        if (typeof instance === 'undefined' || instance === null) return;

        const { _clickOutside } = tempEl;

        if (typeof _clickOutside === 'undefined') return;

        const { uid } = instance.$;

        handleShadow(tempEl, (app: Document | ShadowRoot) => {
            if (!app) return;

            const { onClick, onMousedown } = _clickOutside[uid]!;

            app.removeEventListener('click', onClick, true);
            app.removeEventListener('mousedown', onMousedown, true);
        });

        delete _clickOutside[uid];
    },
};

export default clickOutside;

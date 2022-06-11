import { defineStore } from 'pinia';
import { dom } from 'quasar';
import { transformMenus } from '../scripts/action';
import { notifyNeg } from '../scripts/notify';
import {
    CSSUnitType,
    IPosition,
    IWindow,
    MakeWindowArgType,
    PIDType,
    IActionValue,
    ShapeType,
    IWindowLifeCycle,
    VueHTMLElementType,
} from '../scripts/types';
import {
    addVariationToPosition,
    HTMLElementFromVueRef,
    windowPosition,
} from '../scripts/utils';
import useProcess from './process';
import useEvent from './events';
import MainApp from '..';
import { ComponentType, registeredComponentName } from '../windowApp';
import { isDef } from '../scripts/basic';

const { width: vW, height: vH } = dom;

interface IOldSetting {
    position?: {
        x: {
            amount: number;
            unit: CSSUnitType;
        };
        y: {
            amount: number;
            unit: CSSUnitType;
        };
    };
    shape?: {
        width: number;
        height: number;
    };
}
type WindowLifeCycleType = { [k in keyof Required<IWindowLifeCycle>]: () => Promise<void> }

const _removeFromArray = <T>(arr: T[], el: T) => {
    const idx = arr.indexOf(el);
    if (idx < 0) return;
    arr.splice(idx, 1);
};

const FocusKind = {
    desktop: -1,
    taskbar: -2,
    startMenu: -3,
    window: Number,
} as const;

const useWindowManager = defineStore('useWindowManagerStore', {
    state: () => ({
        viewBoxElement: undefined as HTMLElement | undefined,
        windows: new Map<PIDType, IWindow>(),
        windowLifeCycleEvents: new Map<PIDType, WindowLifeCycleType>(),
        indices: [] as PIDType[],
        renderOrder: [] as PIDType[],
        HTMLElementToPidMapping: new Map<HTMLElement, PIDType>(),
        default: { width: 500, height: 500 },
        _focus: -1,
        _old: new Map<PIDType, IOldSetting>(),
    }),
    getters: {
        process: () => (pid: PIDType) => useProcess().process[pid],
        _window: (state) => (pid: PIDType) => state.windows.get(pid) as IWindow,
        isFocused: ({ _focus }) => (kind: keyof typeof FocusKind, pid?: PIDType): boolean => {
            if (kind === 'window') return isDef(pid) ? _focus === pid : false;
            return _focus === FocusKind[kind];
        },
    },
    actions: {
        initWindowManager(el: unknown): void {
            const temp = HTMLElementFromVueRef(el);
            this.viewBoxElement = Array.isArray(temp) ? temp[0] : temp;
        },
        parentShape(): { width: number; height: number } {
            if (this.viewBoxElement) {
                return {
                    width: vW(this.viewBoxElement),
                    height: vH(this.viewBoxElement),
                };
            }
            return {
                width: 0,
                height: 0,
            };
        },
        windowShape(pid?: PIDType): { width: number; height: number } {
            if (!isDef(pid)) return this.parentShape();
            const win = this.windows.get(pid);
            return win ? { width: win.width, height: win.height } : { height: 0, width: 0 };
        },
        _adjPosIfEqual(pos: IPosition): IPosition {
            const temp = this.windows.values();
            // eslint-disable-next-line no-restricted-syntax
            for (const el of temp) {
                if (el.position.x === pos.x && el.position.y === pos.y) {
                    return addVariationToPosition(pos);
                }
            }
            return pos;
        },
        makeWindow<C extends ComponentType>(args: MakeWindowArgType<C>): void {
            if (typeof this.viewBoxElement === 'undefined') {
                notifyNeg('WindowManager is not initialized!');
                return;
            }
            const {
                name,
                icon,
                position = 'centre',
                width = this.default.width,
                height = this.default.height,
                menubar: argMenubar = {},
                hideMenubar = false,
                isFullScreen = false,
                props = {},
            } = args;

            const componentName = registeredComponentName(args.componentName || 'VDefaultWindow');
            if (typeof MainApp.component(componentName) === 'undefined') {
                notifyNeg(`Component with name="${componentName}" not found`);
                return;
            }

            const pid = useProcess().makeProcess({ name, icon });
            const menubar = transformMenus(pid, argMenubar);

            this.windows.set(pid, {
                componentName,
                height,
                width,
                position: this._adjPosIfEqual(
                    windowPosition(position, { width, height }, this.parentShape()),
                ),
                pid,
                menubar,
                hideMenubar,
                props: { ...props, pid },
                isFullScreen,
                positionUnit: { x: 'px', y: 'px' },
                state: 'create',
            });

            this.renderOrder.push(pid);

            if (isFullScreen) {
                this.setToFullScreen(pid);
            }
        },
        addItemToMenubar(
            pid: PIDType,
            key: string,
            name: string,
            action: IActionValue,
            override = false,
        ): boolean {
            const win = this.windows.get(pid);
            if (!win) return false;
            if (key in win.menubar) {
                if (name in win.menubar[key]) {
                    if (override) {
                        win.menubar[key][name] = action;
                        return true;
                    }
                    return false;
                }
                win.menubar[key][name] = action;
                return true;
            }

            win.menubar[key] = {
                [name]: action,
            };

            return true;
        },
        _storeOldPosition(win: IWindow): void {
            const { pid } = win;
            const { x: ox, y: oy } = win.position;
            const { x: oxu, y: oyu } = win.positionUnit;
            const oldPos = {
                x: {
                    amount: ox,
                    unit: oxu,
                },
                y: {
                    amount: oy,
                    unit: oyu,
                },
            };
            const temp = this._old.get(pid);
            if (temp) {
                temp.position = oldPos;
            } else {
                this._old.set(pid, { position: oldPos });
            }
        },
        _restoreOldPosition(win: IWindow): void {
            const { pid } = win;
            const temp = this._old.get(pid);
            if (temp && temp.position) {
                win.position = {
                    x: temp.position.x.amount,
                    y: temp.position.y.amount,
                };
                win.positionUnit = {
                    x: temp.position.x.unit,
                    y: temp.position.y.unit,
                };
            }
        },
        _storeOldShape(win: IWindow): void {
            const { pid, width, height } = win;
            const oldShape = {
                width,
                height,
            };
            const temp = this._old.get(pid);
            if (temp) {
                temp.shape = oldShape;
            } else this._old.set(pid, { shape: oldShape });
        },
        _restoreOldShape(win: IWindow): void {
            const { pid } = win;
            const temp = this._old.get(pid);
            if (temp && temp.shape) {
                win.width = temp.shape.width;
                win.height = temp.shape.height;
            }
        },
        updatePosition(
            pid: PIDType,
            args: Partial<{
                x: [number, CSSUnitType];
                y: [number, CSSUnitType];
            }>,
        ): void {
            const win = this.windows.get(pid);
            if (win) {
                const { x: ox, y: oy } = win.position;
                const { x: oxu, y: oyu } = win.positionUnit;

                let x = ox;
                let y = oy;
                let ux = oxu;
                let uy = oyu;
                if (args.x) {
                    const [nx, xu] = args.x;
                    x = nx;
                    ux = xu;
                }
                if (args.y) {
                    const [ny, yu] = args.y;
                    y = ny;
                    uy = yu;
                }
                win.position = {
                    x,
                    y,
                };
                win.positionUnit = {
                    x: ux,
                    y: uy,
                };
            }
        },
        updateShape(pid: PIDType, width: number, height: number): void {
            const win = this.windows.get(pid);
            if (win) {
                win.height = height;
                win.width = width;
                useEvent().dispatchEvent<ShapeType>('change:shape', pid, {
                    width,
                    height,
                });
            }
        },
        bringToTopForRender(pid: PIDType): void {
            const idx = this.renderOrder.indexOf(pid);
            if (idx < 0) return;

            const tempId = this.renderOrder[idx];

            this.renderOrder.splice(idx, 1);
            useEvent().notifyAllInArray('focusOut', this.renderOrder);
            this._focus = tempId;

            this.renderOrder.push(tempId);
            useEvent().dispatchEvent('focusIn', tempId);
            // console.log(this.renderOrder);
        },

        changePositionForIndices({
            addedIndex,
            removedIndex,
        }: {
            addedIndex: number;
            removedIndex: number;
        }): void {
            if (addedIndex >= this.indices.length || addedIndex < 0) return;
            if (removedIndex >= this.indices.length || removedIndex < 0) return;

            const el = this.indices.splice(removedIndex, 1);
            this.indices.splice(addedIndex, 0, ...el);
        },

        resize(pid: PIDType, shape: ShapeType): void {
            const win = this.windows.get(pid);
            if (!isDef(win)) return;
            if (win.isFullScreen) this.restoreWindowShape(pid);
            win.height = shape.height;
            win.width = shape.width;
        },

        closeAllWindows(): void {
            useEvent().notifyAll('before:close');
            this.windows.forEach((_, pid) => {
                this.closeWindow(pid);
            });
            this.indices = [];
            this._focus = -1;
            this.HTMLElementToPidMapping.clear();
            useEvent().notifyAll('after:close');
        },

        _closeWindow(pid: PIDType): void {
            if (this.windows.has(pid)) {
                useEvent().dispatchEvent('before:close', pid);

                _removeFromArray(this.indices, pid);
                _removeFromArray(this.renderOrder, pid);
                this.windowLifeCycleEvents.delete(pid);

                this.windows.delete(pid);
                useProcess().removeProcess(pid);
                useEvent().dispatchEvent('after:close', pid);

                const len = this.renderOrder.length;
                this._focus = len !== 0 ? this.renderOrder[len - 1] : -1;
                useEvent().dispatchEvent('focusIn', pid);
                this.HTMLElementToPidMapping.forEach((v, k) => {
                    if (v === pid) this.HTMLElementToPidMapping.delete(k);
                });
            }
        },
        setToFullScreen(pid: PIDType): void {
            const win = this.windows.get(pid);
            if (win) {
                this._storeOldPosition(win);
                this._storeOldShape(win);
                const { width, height } = this.parentShape();
                win.position = {
                    x: 0,
                    y: 0,
                };
                win.height = height;
                win.width = width;
                win.isFullScreen = true;
                useEvent().dispatchEvent('fullscreen', pid);
            }
        },
        restoreWindowShape(pid: PIDType): void {
            const win = this.windows.get(pid);
            if (win) {
                this._restoreOldPosition(win);
                this._restoreOldShape(win);
                this._old.delete(pid);
                win.isFullScreen = false;
                useEvent().dispatchEvent('restoreShape', pid);
            }
        },
        matchElement(el?: VueHTMLElementType | null): PIDType[] {
            const hel = HTMLElementFromVueRef(el);
            if (!isDef(hel)) return [-1];
            if (Array.isArray(hel)) return hel.map((elm) => this.HTMLElementToPidMapping.get(elm) || -1);
            return [this.HTMLElementToPidMapping.get(hel) || -1];
        },
        registerWindowElement(pid: PIDType, el?: VueHTMLElementType | null): void {
            const temp = HTMLElementFromVueRef(el);
            const win = this.windows.get(pid);
            if (!isDef(temp) || !isDef(win)) return;
            if (Array.isArray(temp)) temp.forEach((elm) => this.HTMLElementToPidMapping.set(elm, pid));
            else this.HTMLElementToPidMapping.set(temp, pid);
        },
        registerWindowLifeCycle(pid: PIDType, lifeCycle: IWindowLifeCycle): void {
            const win = this.windows.get(pid);
            if (win === undefined) {
                throw new Error(`invalid process id; pid="${pid}"`);
            }
            const temp: WindowLifeCycleType = {
                beforeLoaded: async () => {
                    win.state = 'beforeLoaded';
                    try {
                        await lifeCycle.beforeLoaded?.(pid);
                    } catch (e) {
                        notifyNeg(e);
                        this._closeWindow(pid);
                    }
                },
                visible: async () => {
                    win.state = 'visible';
                    this.process(pid).state = true;
                    this.indices.push(pid);
                    this._focus = pid;
                    try {
                        await lifeCycle.visible?.(pid);
                    } catch (e) {
                        notifyNeg(e);
                        this._closeWindow(pid);
                    }
                },
                beforeDestroy: async () => {
                    win.state = 'beforeDestroy';
                    const proc = this.process(pid);
                    proc.state = false;
                    _removeFromArray(this.indices, pid);
                    try {
                        await lifeCycle.beforeDestroy?.(pid);
                    } catch (e) {
                        notifyNeg(e);
                        this._closeWindow(pid);
                    }
                },
                destroy: async () => {
                    win.state = 'destroy';
                    this._closeWindow(pid);
                    try {
                        await lifeCycle.destroy?.();
                    } catch (e) {
                        notifyNeg(e);
                        this._closeWindow(pid);
                    }
                },
            };
            this.windowLifeCycleEvents.set(pid, temp);
        },
        closeWindow(pid: PIDType): void {
            const win = this.windows.get(pid);
            if (!win) return;

            const lifeCycle = this.windowLifeCycleEvents.get(pid);
            if (!lifeCycle) {
                this._closeWindow(pid);
                return;
            }

            lifeCycle.visible()
                .then(async () => {
                    await lifeCycle.beforeDestroy();
                    await lifeCycle.destroy();
                })
                .catch((e) => notifyNeg(e));
        },

        async invokeLifeCycle(pid: PIDType, type: keyof WindowLifeCycleType): Promise<void> {
            const win = this.windows.get(pid);
            if (!win) return;

            const lifeCycle = this.windowLifeCycleEvents.get(pid);
            if (!lifeCycle) {
                this._closeWindow(pid);
                return;
            }

            if (win.state === 'create' && type === 'beforeLoaded') {
                lifeCycle.beforeLoaded();
            } else if (win.state === 'beforeLoaded' && type === 'visible') {
                lifeCycle.visible();
            } else if (win.state === 'visible' && type === 'beforeDestroy') {
                lifeCycle.beforeDestroy();
            } else if (win.state === 'beforeDestroy' && type === 'destroy') {
                lifeCycle.destroy();
            }
        },

        focusOn(kind: keyof typeof FocusKind, pid?: PIDType): void {
            if (kind === 'window') {
                if (!isDef(pid)) throw new Error('"pid" cannot be undefined or null');
                this.bringToTopForRender(pid);
                return;
            }
            this._focus = FocusKind[kind];
        },
    },
});

export default useWindowManager;

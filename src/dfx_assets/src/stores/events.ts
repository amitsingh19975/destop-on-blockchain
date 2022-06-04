import { defineStore } from 'pinia';
import { IWindowEvent, PIDType, WindowEventType } from '../scripts/types';

type EventCallbackType = (e: IWindowEvent) => void;

const useEvent = defineStore('useEventStore', {
    state: () => ({
        _windowEvents: new Map<WindowEventType, Map<PIDType, EventCallbackType>>(),
    }),
    actions: {
        addEventListener(
            type: WindowEventType,
            pid: PIDType,
            callback: EventCallbackType,
        ): void {
            const temp = this._windowEvents.get(type);
            if (temp) temp.set(pid, callback);
            else {
                const map = new Map();
                map.set(pid, callback);
                this._windowEvents.set(type, map);
            }
        },
        removeEventListener(pid: PIDType, type?: WindowEventType): void {
            if (typeof type !== 'undefined') {
                const temp = this._windowEvents.get(type);
                if (temp) temp.delete(pid);
            } else {
                this._windowEvents.forEach((v) => v.delete(pid));
            }
        },
        dispatchEvent<T extends IWindowEvent['data']>(
            type: WindowEventType,
            pid: PIDType,
            data?: T,
        ): void {
            const temp = this._windowEvents.get(type);
            if (temp) {
                const cb = temp.get(pid);
                if (cb) {
                    cb({
                        type,
                        pid,
                        data,
                    });
                }
            }
        },
        notifyAll<T extends IWindowEvent['data']>(
            type: WindowEventType,
            data?: T,
        ): void {
            const temp = this._windowEvents.get(type);
            temp?.forEach((cb, pid) => cb({
                type,
                pid,
                data,
            }));
        },
        notifyAllInArray<T extends IWindowEvent['data']>(
            type: WindowEventType,
            pids: PIDType[],
            data?: T,
        ): void {
            const temp = this._windowEvents.get(type);
            for (let i = 0; i < pids.length; i += 1) {
                const cb = temp?.get(pids[i]);
                if (cb) {
                    cb({
                        type,
                        pid: pids[i],
                        data,
                    });
                }
            }
        },
    },
});

export default useEvent;

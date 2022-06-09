import { AcceptableType } from './canisterHelper';
import { isDef } from './utils';

type ResoveType<T> = (value?: T | PromiseLike<T>) => void;
type RejectType = (reason?: any) => void;

// type ITaskActionCallbackType = (resolve: ResoveType<void>, reject: RejectType) => void;

type TaskType<K extends PropertyKey> = {
    action: K,
    payload: () => any,
};

type FunctionType = (...args: any) => any;

export class TaskManager<K extends PropertyKey, V extends FunctionType> {
    private _queue: (TaskType<K> & {
        _resolve: ResoveType<any>,
        _reject: RejectType,
    })[];

    private _pendingPromise = false;

    private _actions: Record<K, V>;

    constructor(actions: Record<K, V>) {
        this._queue = [];
        this._actions = actions;
    }

    async enqueue<P = any>(action: K, ...args: Parameters<Record<K, V>[K]>): Promise<P> {
        return new Promise((resolve, reject) => {
            this._queue.push({
                action,
                payload: () => args,
                _reject: reject,
                _resolve: resolve,
            });
            this.dequeue();
        });
    }

    async dequeue(): Promise<boolean> {
        console.log('DEQ START');
        if (this._pendingPromise) return false;

        const item = this._queue.shift();
        if (!isDef(item)) return false;
        console.log('DEQ ITEM: ', item);

        try {
            this._pendingPromise = true;
            const payload = item.payload();
            const result = await this._actions[item.action](...payload);
            this._pendingPromise = false;
            item._resolve(result);
        } catch (e) {
            this._pendingPromise = false;
            item._reject(e);
        } finally {
            this.dequeue();
        }

        return true;
    }

    cancellAllTask(): void {
        this._queue = [];
    }
}

import {
    AcceptableType, handelCanisterErr, UIDType,
} from './canisterHelper';
import { dispatchCanisterEvent } from './events';
import { isBlob, isDef } from './utils';

interface IValue {
    name: string,
    data: AcceptableType;
    timerId: ReturnType<typeof setTimeout> | null;
    isDirty: boolean,
    timeout: number,
}

export type WriteType =
    'append'
    | 'overwrite'
    | 'prepend';

export type ErrCallbackType = <E extends Error>(err: E) => void;
export type LocalCommitCompletionCallbackType = (uid: UIDType) => void;
export type CanisterCommitCallbackType = (uid: UIDType) => void;

const DEFAULT_UPDATE_TIMER = 0 * 1000;
const DEFAULT_ERROR_CALLBACK: ErrCallbackType = (e: Error) => { throw e; };

const typeToHumanReadableType = (data: unknown): AcceptableType => {
    if (typeof data === 'string') return 'String';
    return 'Json';
};

const typeMismatchError = (l: AcceptableType, r: AcceptableType) => {
    const temp = `type mismatch; stored type found to be "${typeToHumanReadableType(l)}", but given type found to be "${typeToHumanReadableType(r)}"`;
    return new Error(temp);
};

const handleCommit = async (
    uid: UIDType,
    val: IValue,
    lazy: boolean,
    {
        errCallback, canisterCommitCallback,
    }: {
        errCallback: ErrCallbackType,
        canisterCommitCallback: CanisterCommitCallbackType,
    },
): Promise<void> => {
    // const commitHelper = () => commit(uid, val.data)
    //     .then(() => canisterCommitCallback(uid))
    //     .catch(errCallback);
    const commitHelper = () => void 0;
    try {
        dispatchCanisterEvent('write', 'start', {
            uid,
            timeout: val.timeout,
            localEvent: false,
            name: val.name,
        });
        if (!lazy) commitHelper();
        else if (!isDef(val.timerId)) {
            val.timerId = setTimeout(async () => {
                await commitHelper();
                val.isDirty = false;
                val.timerId = null;
                dispatchCanisterEvent('write', 'end', {
                    uid,
                    timeout: val.timeout,
                    localEvent: false,
                    name: val.name,
                });
            }, val.timeout);
        }
    } catch (e) {
        errCallback(e as Error);
    }
};

export default class CacheManager {
    private _data = new Map<UIDType, IValue>();

    async forceCommit(uid: string, errCallback?: ErrCallbackType): Promise<void> {
        const temp = this._data.get(uid);
        if (!temp) return;
        const { timerId, data, isDirty } = temp;
        if (timerId) {
            clearTimeout(timerId);
            temp.timerId = null;
        }
        if (!isDirty) return;
        try {
            // const result = await commit(uid, data);
            // handelCanisterErr(result);
            // temp.isDirty = false;
        } catch (e) {
            (errCallback || DEFAULT_ERROR_CALLBACK)(e as Error);
        }
    }

    async commitAll(errCallback?: ErrCallbackType): Promise<void> {
        // const payload = [] as BatchDataType;
        this._data.forEach(async (val, k) => {
            const { timerId, data, isDirty } = val;
            if (timerId) {
                clearTimeout(timerId);
                val.timerId = null;
            }
            // if (isDirty) {
            //     payload.push([k, await stringify(data)]);
            //     val.isDirty = false;
            // }
        });
        try {
            // const result = await commitBatch(payload);
            // handelCanisterErr(result);
        } catch (e) {
            (errCallback || DEFAULT_ERROR_CALLBACK)(e as Error);
        }
    }

    async set(
        name: string,
        uid: UIDType,
        val: AcceptableType,
        options?: {
            mode?: WriteType,
            lazy?: boolean,
            timeout?: number,
            errCallback?: ErrCallbackType,
            canisterCommitCallback?: CanisterCommitCallbackType,
            localCommitCompletionCallback?: LocalCommitCompletionCallbackType,
        },
    ): Promise<number> {
        const {
            mode = 'append',
            errCallback = DEFAULT_ERROR_CALLBACK,
            lazy = true,
            timeout = DEFAULT_UPDATE_TIMER,
            canisterCommitCallback = (() => void 0),
            localCommitCompletionCallback = (() => void 0),
        } = options || {};

        let oldVal = this._data.get(uid);
        let size = 0;

        if (isDef(oldVal) && mode !== 'overwrite') {
            const res = await CacheManager
                ._updateData(
                    oldVal,
                    mode || 'append',
                    val,
                    errCallback || DEFAULT_ERROR_CALLBACK,
                );
            if (isDef(res)) {
                localCommitCompletionCallback(uid);
                size = res;
            }
        } else {
            const temp: IValue = {
                data: val,
                timerId: null,
                isDirty: true,
                timeout,
                name,
            };
            try {
                this._data.set(uid, temp);
                localCommitCompletionCallback(uid);
                oldVal = temp;
                size = JSON.stringify(temp).length;
            } catch (e) {
                errCallback(e as Error);
                return 0;
            }
        }

        handleCommit(uid, oldVal, lazy, {
            canisterCommitCallback,
            errCallback,
        });
        return size;
    }

    private static async _updateData(
        oldValue: IValue,
        mode: WriteType,
        data: AcceptableType,
        errCallback: ErrCallbackType,
    ): Promise<number | undefined> {
        switch (mode) {
            case 'append': {
                let temp = oldValue.data;
                if (typeof data === 'string' && typeof temp === 'string') {
                    temp = data;
                } else if (typeof data === 'object' && typeof temp === 'object') {
                    temp = { ...temp, ...data };
                } else if (isBlob(temp) && isBlob(data) && temp.type === data.type) {
                    const left = await temp.arrayBuffer();
                    const right = await data.arrayBuffer();
                    temp = new Blob([left, right], { type: temp.type });
                } else {
                    errCallback(typeMismatchError(temp, data));
                    return undefined;
                }
                oldValue.data = temp;
                oldValue.isDirty = true;
                break;
            }
            case 'prepend': {
                let temp = oldValue.data;
                if (typeof data === 'string' && typeof temp === 'string') {
                    temp = data + temp;
                } else if (typeof data === 'object' && typeof temp === 'object') {
                    temp = { ...data, ...temp };
                } else if (isBlob(temp) && isBlob(data) && temp.type === data.type) {
                    const left = await data.arrayBuffer();
                    const right = await temp.arrayBuffer();
                    temp = new Blob([left, right], { type: temp.type });
                } else {
                    errCallback(typeMismatchError(temp, data));
                    return undefined;
                }
                oldValue.data = temp;
                oldValue.isDirty = true;
                break;
            }

            default: return undefined;
        }
        return JSON.stringify(oldValue.data).length;
    }

    async get<T extends AcceptableType>(
        name: string,
        uid: string,
        options?: {
            createIfRequired?: boolean,
            def?: AcceptableType,
            errCallback?: ErrCallbackType,
        },
    ): Promise<T | undefined> {
        const val = this._data.get(uid);
        if (val) return val.data as T;
        const {
            createIfRequired = false,
            def = {},
            errCallback = DEFAULT_ERROR_CALLBACK,
        } = options || {};
        try {
            dispatchCanisterEvent('read', 'start', {
                uid,
                timeout: 0,
                localEvent: false,
                name,
            });
            // const res = await fetchFromCanister(uid, { createIfRequired, def, kind: 'storage' });
            // if (res) {
            //     const tempData = {
            //         data: res,
            //         timerId: null,
            //         timeout: DEFAULT_UPDATE_TIMER,
            //         isDirty: false,
            //         name,
            //     };
            //     this._data.set(uid, tempData);
            // }
            dispatchCanisterEvent('read', 'end', {
                uid,
                timeout: 0,
                localEvent: false,
                name,
            });
            // return res as T | undefined;
            return undefined;
        } catch (e) {
            errCallback(e as Error);
            return undefined;
        }
    }

    async delete(
        name: string,
        uid: string,
        errCallback = DEFAULT_ERROR_CALLBACK,
    ): Promise<void> {
        this._data.delete(uid);
        try {
            dispatchCanisterEvent('delete', 'start', {
                uid,
                timeout: 0,
                localEvent: false,
                name,
            });
            // await deleteFromCanister(uid);
            dispatchCanisterEvent('delete', 'end', {
                uid,
                timeout: 0,
                localEvent: false,
                name,
            });
        } catch (e) {
            errCallback(e as Error);
        }
    }
}

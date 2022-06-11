import { dfx } from '../dfx';
import type {
    ContentChunk, ChunkId, ResultOkType, ResultType,
} from '../dfx/dfx.did.d';
import { checkKeys, isDef } from '../basic';
import { TaskManager } from './task';
import {
    CanisterErrorResponseType,
    CanisterMethodType,
    GetCanisterPayloadType,
    GetCanisterResponseType,
    ICanisterAddChunkPayload,
    ICanisterFetchChunkPayload,
    ResponseErrorType,
} from './types';

const {
    addAssetChunk: addAssetChunkById, fetchAssetChunkById,
} = dfx;

// type CanisterWorker = typeof window;
// declare const self: CanisterWorker;

// const ctx: CanisterWorker = self;

type CallbackType =
    | ((payload: ICanisterAddChunkPayload) => Promise<ChunkId | string>)
    | ((payload: ICanisterFetchChunkPayload) => Promise<ContentChunk | string>);

const handelCanisterErr = <R, V extends ResultOkType>(result: ResultType<V>, callback: (val: V) => R): string | R => {
    if ('err' in result) {
        const entries = Object.entries(result.err);
        const err = entries[0];
        if (!isDef(err)) return '[addAssetChunk]: unknown error occured';
        return `[addAssetChunk]: ${err[0]}(${err[1]})`;
    }
    return callback(result.ok);
};

const addAssetChunk = async ({ uid, chunk }: ICanisterAddChunkPayload): Promise<ChunkId | string> => {
    const res = await addAssetChunkById(uid, chunk);
    return handelCanisterErr(res, () => chunk.chunkId);
};

const fetchAssetChunk = async ({ uid, chunkId }: ICanisterFetchChunkPayload): Promise<ContentChunk | string> => {
    const res = await fetchAssetChunkById(uid, chunkId);
    return handelCanisterErr(res, (ok) => ok);
};

const reportErr = (message: string, type: ResponseErrorType) => ({
    error: {
        message,
        type,
    },
} as CanisterErrorResponseType);

const ACTIONS: Record<Exclude<CanisterMethodType, 'cancelAllPendingTask'>, CallbackType> = {
    addAssetChunk,
    fetchAssetChunk,
};

const checkPayload = (method: CanisterMethodType, payload: ICanisterAddChunkPayload | ICanisterFetchChunkPayload) => {
    switch (method) {
        case 'addAssetChunk': {
            const tempPayload = payload as ICanisterAddChunkPayload;
            if (!checkKeys<ICanisterAddChunkPayload>(tempPayload, ['chunk', 'uid'])) {
                return 'invalid "payload"! Maybe "chunk" or "uid" or both are missing';
            }
            return undefined;
        }
        case 'fetchAssetChunk': {
            const tempPayload = payload as ICanisterFetchChunkPayload;
            if (!checkKeys<ICanisterFetchChunkPayload>(tempPayload, ['chunkId', 'uid'])) {
                return 'invalid "payload"! Maybe "chunkId" or "uid" or both are missing';
            }
            return undefined;
        }
        default: return undefined;
    }
};

export default class CanisterWorker {
    private _taskManager = new TaskManager(ACTIONS);

    private _id: number;

    constructor(id: number) {
        this._id = id;
    }

    private async _handleAddAssetChunk(
        payload: GetCanisterPayloadType<'addAssetChunk'>,
    ): Promise<GetCanisterResponseType<'addAssetChunk'> | CanisterErrorResponseType> {
        const response = await this._taskManager.enqueue<ChunkId | string>('addAssetChunk', payload);
        if (typeof response === 'string') {
            return reportErr(response, 'canister');
        }
        return {
            result: {
                method: 'addAssetChunk',
                chunkID: response,
            },
        };
    }

    private async _handleFetchAssetChunk(
        payload: GetCanisterPayloadType<'fetchAssetChunk'>,
    ): Promise<GetCanisterResponseType<'fetchAssetChunk'> | CanisterErrorResponseType> {
        const response = await this._taskManager.enqueue<ContentChunk | string>('fetchAssetChunk', payload);
        if (typeof response === 'string') {
            return reportErr(response, 'canister');
        }
        return {
            result: {
                method: 'fetchAssetChunk',
                chunk: response,
            },
        };
    }

    async submitTask<K extends CanisterMethodType, P>(
        method: K,
        payload: GetCanisterPayloadType<K>,
    ): Promise<GetCanisterResponseType<K> | CanisterErrorResponseType> {
        type ReturnType = Promise<GetCanisterResponseType<K> | CanisterErrorResponseType>;
        if (method === 'addAssetChunk') {
            return this._handleAddAssetChunk(payload as ICanisterAddChunkPayload) as ReturnType;
        }
        if (method === 'fetchAssetChunk') {
            return this._handleFetchAssetChunk(payload as ICanisterFetchChunkPayload) as ReturnType;
        }

        this._taskManager.cancellAllTask();
        const temp = {
            result: {
                method: 'cancelAllPendingTask',
            },
        } as GetCanisterResponseType<'cancelAllPendingTask'>;
        return temp as unknown as ReturnType;
    }
}

// export const canisterWorker = async (message: CanisterMessageType): Promise<CanisterResponseType> => {
//     // if (!checkKeys<CanisterMessageType>(data, ['method', 'payload'])) {
//     //     reportErr('invalid payload! Maybe "method" or "payload" or both are missing', 'preprocess');
//     //     return;
//     // }
//     const { method, payload } = message;
//     // if (!CanisterMethods.includes(method)) {
//     //     reportErr(`invalid method found! expectd one of [${CanisterMethods.join(', ')}], but found ${method}.`, 'preprocess');
//     //     return;
//     // }

//     // const res = checkPayload(method, payload);

//     // if (typeof res === 'string') {
//     //     reportErr(res, 'preprocess');
//     //     return;
//     // }
//     switch (method) {
//         case 'addAssetChunk':
//             return handleAddAssetChunk(payload);
//         case 'fetchAssetChunk':
//             return handleFetchAssetChunk(payload);
//         case 'cancelAllPendingTask': {
//             TASK_MANAGER.cancellAllTask();
//             return {
//                 result: {
//                     method: 'cancelAllPendingTask',
//                 },
//             } as CanisterResponseType;
//         }
//         default: break;
//     }
//     return reportErr('unreachable', 'preprocess');
// };

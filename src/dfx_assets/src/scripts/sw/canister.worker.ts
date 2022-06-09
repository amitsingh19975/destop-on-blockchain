import { dfx } from '../dfx';
import type {
    ContentChunk, ChunkId, ResultOkType, ResultType,
} from '../dfx/dfx.did.d';
import { TaskManager } from '../task';
import { checkKeys, isDef } from '../utils';
import {
    CanisterMessageType,
    CanisterMethods,
    CanisterMethodType,
    CanisterResponseType,
    ICanisterAddChunkPayload,
    ICanisterFetchChunkPayload,
    ResponseErrorType,
} from './types';

const {
    addAssetChunk: addAssetChunkById, fetchAssetChunkById,
} = dfx;

type CanisterWorker = typeof window;
declare const self: CanisterWorker;

const ctx: CanisterWorker = self;

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

const ACTIONS: Record<Exclude<CanisterMethodType, 'cancelAllPendingTask'>, CallbackType> = {
    addAssetChunk,
    fetchAssetChunk,
};

const TASK_MANAGER = new TaskManager(ACTIONS);

const reportErr = (message: string, type: ResponseErrorType) => {
    ctx.postMessage({
        error: {
            message,
            type,
        },
    } as CanisterResponseType);
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

const handleAddAssetChunk = async (payload: ICanisterAddChunkPayload) => {
    const response = await TASK_MANAGER.enqueue<ChunkId | string>('addAssetChunk', payload);
    if (typeof response === 'string') {
        reportErr(response, 'canister');
        return;
    }
    ctx.postMessage({
        result: {
            method: 'addAssetChunk',
            chunkID: response,
        },
    } as CanisterResponseType);
};

const handleFetchAssetChunk = async (payload: ICanisterFetchChunkPayload) => {
    const response = await TASK_MANAGER.enqueue<ContentChunk | string>('fetchAssetChunk', payload);
    if (typeof response === 'string') {
        reportErr(response, 'canister');
        return;
    }
    ctx.postMessage({
        result: {
            method: 'fetchAssetChunk',
            chunk: response,
        },
    } as CanisterResponseType);
};

// eslint-disable-next-line no-restricted-globals
ctx.addEventListener('message', ({ data }: MessageEvent) => {
    console.log('WORKER THREAD: ', data);
    const message = data as CanisterMessageType;
    if (!checkKeys<CanisterMessageType>(data, ['method', 'payload'])) {
        reportErr('invalid payload! Maybe "method" or "payload" or both are missing', 'preprocess');
        return;
    }
    const { method, payload } = message;
    if (!CanisterMethods.includes(method)) {
        reportErr(`invalid method found! expectd one of [${CanisterMethods.join(', ')}], but found ${method}.`, 'preprocess');
        return;
    }

    const res = checkPayload(method, payload);

    if (typeof res === 'string') {
        reportErr(res, 'preprocess');
        return;
    }
    switch (method) {
        case 'addAssetChunk':
            handleAddAssetChunk(payload);
            break;
        case 'fetchAssetChunk':
            handleFetchAssetChunk(payload);
            break;
        case 'cancelAllPendingTask': {
            TASK_MANAGER.cancellAllTask();
            ctx.postMessage({
                result: {
                    method: 'cancelAllPendingTask',
                },
            } as CanisterResponseType);
            break;
        }
        default: break;
    }
});

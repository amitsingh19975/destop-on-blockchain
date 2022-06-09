import {
    div, GenericObjType, isDef, MAX_HARDWARE_CONCURRENCY,
} from './utils';
import { dfx } from './dfx';
import type {
    ContentInfo, ContentChunk, ResultType, ResultOkType, ChunkId,
} from './dfx/dfx.did.d';
import {
    CanisterMessageType,
    CanisterAddAssetChunkResponseType,
    CanisterErrorResponseType,
    ICanisterAddChunkPayload,
    ResponseErrorType,
    ICanisterFetchChunkPayload,
    CanisterFetchAssetChunkResponseType,
} from './sw/types';

const {
    commitAssetChunk, deleteAsset, fetchAssetInfo, initiateAssetUpload,
} = dfx;

export type AcceptableType = GenericObjType | string | {} | Blob;
export type UIDType = string;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5MB

// console.log(new URL('./sw/canister.worker.ts', import.meta.url));

const constructWorker = () => new Worker(new URL(/* webpackChunkName: "CanisterWorker" */ './sw/canister.worker.ts', import.meta.url), { type: 'module' });
const constructWorkerPool = (len: number): Worker[] => {
    const res = Array<Worker>(len);
    for (let i = 0; i < len; i += 1) {
        res[i] = constructWorker();
    }
    return res;
};

const CANISTER_WORKER_POOL = constructWorkerPool(MAX_HARDWARE_CONCURRENCY);

// @ts-ignore
window._worker = CANISTER_WORKER_POOL;

// const _storedData = {} as Record<string, AcceptableType>;

// export const commit = async (uid: UIDType, data: AcceptableType) => {
//     // TODO: make API request to store data
//     _storedData[uid] = data;
// };

// export const commitBatch = async (data: [UIDType, string][]) => {
//     // TODO: make API request to store data
// };

// export const fetchFromCanister = async (uid: UIDType, args = { createIfRequired: false, def: {} }): Promise<AcceptableType | undefined> => {
//     if (uid in _storedData) return _storedData[uid];
//     if (args.createIfRequired) _storedData[uid] = args.def;
//     return _storedData[uid];
// };
// export const deleteFromCanister = async (uid: UIDType): Promise<void> => {
//     if (uid in _storedData) delete _storedData[uid];
// };

const CUSTOM_STRING_MIME_TYPE = 'amt:string' as const;

export const normalizePayload = async (data: AcceptableType): Promise<{ blob: number[], type: string }> => {
    if (data instanceof Blob) {
        return {
            blob: [...new Uint8Array(await data.arrayBuffer())],
            type: data.type,
        };
    }
    return {
        blob: [...TEXT_ENCODER.encode(JSON.stringify(data))],
        type: CUSTOM_STRING_MIME_TYPE,
    };
};

export const parse = (data: { blob: number[], type: string }): AcceptableType => {
    if (data.type !== CUSTOM_STRING_MIME_TYPE) {
        return new Blob([new Uint8Array(data.blob)], { type: data.type });
    }
    const temp = new Uint8Array(data.blob);
    return JSON.parse(TEXT_DECODER.decode(temp));
};

export const handelCanisterErr = <V extends ResultOkType>(val: ResultType<V>): val is { ok: V } => {
    if ('err' in val) {
        const messgae = Object.entries(val.err)[0];
        if (isDef(messgae)) {
            throw new Error(`${messgae[0]}("${messgae[1]}")`);
        }
        throw new Error('unknown error occured in the canister!');
    }
    return true;
};

const addAssetChunkThroughWorker = (
    workerId: number,
    payload: ICanisterAddChunkPayload,
    completionHandler: (workerId: number, result: { type: ResponseErrorType, message: string } | ChunkId) => void,
) => {
    const worker = CANISTER_WORKER_POOL[workerId];
    worker.onerror = console.error;
    worker.onmessage = ({ data }: MessageEvent) => {
        const message = data as (CanisterAddAssetChunkResponseType | CanisterErrorResponseType);
        console.log('START', data);
        if ('error' in message) {
            completionHandler(workerId, message.error);
        } else {
            completionHandler(workerId, message.result.chunkID);
        }
        console.log('FINISHED', data);
        worker.onmessage = null;
    };
    worker.postMessage({
        method: 'addAssetChunk',
        payload,
    } as CanisterMessageType);
};

const fetchAssetChunkThroughWorker = (
    workerId: number,
    payload: ICanisterFetchChunkPayload,
    completionHandler: (workerId: number, args: { type: ResponseErrorType, message: string } | ContentChunk) => void,
) => {
    const worker = CANISTER_WORKER_POOL[workerId];
    worker.onmessage = ({ data }: MessageEvent) => {
        const message = data as (CanisterFetchAssetChunkResponseType | CanisterErrorResponseType);
        if ('error' in message) {
            completionHandler(workerId, message.error);
        } else {
            completionHandler(workerId, message.result.chunk);
        }
        worker.onmessage = null;
    };
    worker.postMessage({
        method: 'fetchAssetChunk',
        payload,
    } as CanisterMessageType);
};

export const storeAssets = async (uid: UIDType, name: string, payload: AcceptableType, overwrite = false) => {
    const { blob, type } = await normalizePayload(payload);
    const len = blob.length;
    const { q, r } = div(len, CHUNK_SIZE);
    const chunks = q + (r === 0 ? 0 : 1);
    const info: ContentInfo = {
        uid,
        name,
        size: BigInt(len),
        totalChunks: BigInt(chunks),
        dtype: type,
    };
    const initErr = await initiateAssetUpload(info, [overwrite]);
    handelCanisterErr(initErr);

    const promises: Promise<void>[] = [];
    for (let i = 0, j = 0; i < len; i += CHUNK_SIZE, j += 1) {
        const ib = Math.min(CHUNK_SIZE, len - i);
        const chunk = blob.slice(i, i + ib);
        const workerId = j % CANISTER_WORKER_POOL.length;
        const temp: ICanisterAddChunkPayload = {
            chunk: {
                chunk,
                chunkId: BigInt(j),
            },
            uid,
        };
        promises.push(new Promise<void>((resolve, reject) => {
            addAssetChunkThroughWorker(workerId, temp, (id, result) => {
                if (typeof result === 'bigint') {
                    resolve();
                    return;
                }
                reject(result.message);
            });
        }));
    }

    await Promise.all(promises);

    const commitErr = await commitAssetChunk(uid);
    handelCanisterErr(commitErr);
};

export const fetchAsset = async (uid: UIDType): Promise<AcceptableType> => {
    const infoErr = await fetchAssetInfo(uid);
    handelCanisterErr(infoErr);

    const { ok: info } = infoErr as { ok: ContentInfo };

    const { totalChunks, dtype: type, size } = info;
    const promises: Promise<void>[] = [];
    const one = BigInt(1);
    const chunks = Array<number[]>(Number(totalChunks));

    for (let chunkId = BigInt(0), j = 0; chunkId < totalChunks; chunkId += one, j += 1) {
        const workerId = j % CANISTER_WORKER_POOL.length;
        promises.push(new Promise<void>((resolve, reject) => {
            fetchAssetChunkThroughWorker(workerId, { chunkId, uid }, (id, result) => {
                if ('message' in result) {
                    reject(result.message);
                    return;
                }
                const { chunk, chunkId: cid } = result;
                chunks[Number(cid)] = chunk;
                resolve();
            });
        }));
    }
    await Promise.all(promises);
    const flatenedArray = chunks.flat();
    return parse({ blob: flatenedArray, type });
};

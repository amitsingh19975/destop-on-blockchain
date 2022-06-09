import type { UIDType } from '../canisterHelper';
import type { ContentChunk, ChunkId } from '../dfx/dfx.did.d';

export const CanisterMethods = ['addAssetChunk', 'fetchAssetChunk', 'cancelAllPendingTask'] as const;
export type CanisterMethodType = typeof CanisterMethods[number];

export interface ICanisterAddChunkPayload {
    uid: UIDType;
    chunk: ContentChunk;
}

export interface ICanisterFetchChunkPayload {
    uid: UIDType;
    chunkId: ChunkId;
}

export type CanisterMessageType = {
    method: 'addAssetChunk';
    payload: ICanisterAddChunkPayload;
} | {
    method: 'fetchAssetChunk';
    payload: ICanisterFetchChunkPayload;
} | {
    method: 'cancelAllPendingTask';
    payload: ICanisterFetchChunkPayload;
};

export type ResponseErrorType = 'canister' | 'preprocess' | 'queue';

export type CanisterErrorResponseType = {
    error: {
        type: ResponseErrorType,
        message: string;
    }
};

export type CanisterAddAssetChunkResponseType = {
    result: {
        method: 'addAssetChunk',
        chunkID: ChunkId,
    }
};

export type CanisterFetchAssetChunkResponseType = {
    result: {
        method: 'fetchAssetChunk',
        chunk: ContentChunk,
    }
};

export type CanisterCancelAllTaskResponseType = {
    result: {
        method: 'cancelAllPendingTask',
    }
};

export type CanisterResponseType =
    | CanisterAddAssetChunkResponseType
    | CanisterFetchAssetChunkResponseType
    | CanisterCancelAllTaskResponseType
    | CanisterErrorResponseType;

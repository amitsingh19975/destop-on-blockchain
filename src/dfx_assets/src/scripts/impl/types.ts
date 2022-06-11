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

export type GetCanisterPayloadType<K extends CanisterMethodType> =
    K extends 'addAssetChunk' ? ICanisterAddChunkPayload : K extends 'fetchAssetChunk' ? ICanisterFetchChunkPayload : never;

export type CanisterMessageType = {
    method: 'addAssetChunk';
    payload: GetCanisterPayloadType<'addAssetChunk'>;
} | {
    method: 'fetchAssetChunk';
    payload: GetCanisterPayloadType<'fetchAssetChunk'>;
} | {
    method: 'cancelAllPendingTask';
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

export type GetCanisterResponseType<K extends CanisterMethodType> = K extends 'addAssetChunk'
    ? CanisterAddAssetChunkResponseType : K extends 'fetchAssetChunk' ? CanisterFetchAssetChunkResponseType : CanisterCancelAllTaskResponseType;

export type CanisterResponseType =
    | CanisterAddAssetChunkResponseType
    | CanisterFetchAssetChunkResponseType
    | CanisterCancelAllTaskResponseType
    | CanisterErrorResponseType;

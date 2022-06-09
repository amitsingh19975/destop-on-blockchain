import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type ChunkId = bigint;
export type Content = Array<number>;
export type SerializedJsonType = string;
export type UidType = string;
export interface ContentChunk { 'chunk': Content, 'chunkId': ChunkId }
export type DataType = string;

export interface ContentInfo {
    'uid': UidType,
    'name': string,
    'size': bigint,
    'totalChunks': bigint,
    'dtype': DataType,
}

export interface UserInfoWithUid {
    'uid': string,
    'firstname': string,
    'lastname': string,
    'avatar': [] | [string],
}

export type Error =
    { 'assetOutOfBoundAccess': string } |
    { 'assetCommit': string } |
    { 'userAlreadyExists': string } |
    { 'assetInitialize': string } |
    { 'anonymous': string } |
    { 'assetNotFound': string } |
    { 'userDoesnotExist': string } |
    { 'assetAlreadyExists': string } |
    { 'fetch': string };

export type ResultOkType = null | UserInfoWithUid | SerializedJsonType | ContentInfo | ContentChunk;

export type ResultType<O extends ResultOkType, E = Error> = { ok: O } | { err: E };

export type Result = { 'ok': null } | { 'err': Error };
export type Result_1 = { 'ok': UserInfoWithUid } | { 'err': Error };
export type Result_2 = { 'ok': SerializedJsonType } | { 'err': Error };
export type Result_3 = { 'ok': ContentInfo } | { 'err': Error };
export type Result_4 = { 'ok': ContentChunk } | { 'err': Error };

export interface UserInfo {
    'firstname': string,
    'lastname': string,
    'avatar': [] | [string],
}

export interface _SERVICE {
    'addAssetChunk': ActorMethod<[UidType, ContentChunk], ResultType<null>>,
    'commitAssetChunk': ActorMethod<[UidType], ResultType<null>>,
    'createUser': ActorMethod<[UserInfo, [] | [SerializedJsonType]], ResultType<null>>,
    'deleteAsset': ActorMethod<[UidType], ResultType<null>>,
    'deleteFromSettings': ActorMethod<[UidType], ResultType<null>>,
    'fetchAssetChunkById': ActorMethod<[UidType, ChunkId], ResultType<ContentChunk>>,
    'fetchAssetInfo': ActorMethod<[UidType], ResultType<ContentInfo>>,
    'fetchFileSystem': ActorMethod<[], ResultType<SerializedJsonType>>,
    'fetchSetting': ActorMethod<[UidType], ResultType<SerializedJsonType>>,
    'fetchUserInfo': ActorMethod<[], ResultType<UserInfoWithUid>>,
    'initiateAssetUpload': ActorMethod<[ContentInfo, [] | [boolean]], ResultType<null>>,
    'reset': ActorMethod<[], undefined>,
    'updateFileSystem': ActorMethod<[SerializedJsonType], ResultType<null>>,
    'updateSetting': ActorMethod<[UidType, SerializedJsonType], ResultType<null>>,
}

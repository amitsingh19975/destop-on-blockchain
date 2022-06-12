import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type ChunkId = bigint;
export type Content = Array<number>;
export interface ContentChunk { 'chunk' : Content, 'chunkId' : ChunkId }
export interface ContentInfo {
  'uid' : UidType,
  'name' : string,
  'size' : bigint,
  'totalChunks' : bigint,
  'dtype' : DataType,
}
export type DataType = string;
export interface DebugUserInfo {
  'userInfo' : UserInfo,
  'principal' : Principal,
  'settings' : Array<[UidType, string]>,
  'fileSystem' : string,
}
export type Error = { 'assetOutOfBoundAccess' : string } |
  { 'assetCommit' : string } |
  { 'userAlreadyExists' : string } |
  { 'assetInitialize' : string } |
  { 'anonymous' : string } |
  { 'assetNotFound' : string } |
  { 'userDoesnotExist' : string } |
  { 'assetAlreadyExists' : string } |
  { 'fetch' : string };
export type Result = { 'ok' : null } |
  { 'err' : Error };
export type Result_1 = { 'ok' : UserInfoWithUid } |
  { 'err' : Error };
export type Result_2 = { 'ok' : SerializedJsonType } |
  { 'err' : Error };
export type Result_3 = { 'ok' : ContentInfo } |
  { 'err' : Error };
export type Result_4 = { 'ok' : ContentChunk } |
  { 'err' : Error };
export type SerializedJsonType = string;
export type UidType = string;
export interface UserInfo {
  'firstname' : string,
  'lastname' : string,
  'avatar' : [] | [string],
}
export interface UserInfoWithUid {
  'uid' : string,
  'firstname' : string,
  'lastname' : string,
  'avatar' : [] | [string],
}
export interface _SERVICE {
  'addAssetChunk' : ActorMethod<[UidType, ContentChunk], Result>,
  'commitAssetChunk' : ActorMethod<[UidType], Result>,
  'createUser' : ActorMethod<[UserInfo, [] | [SerializedJsonType]], Result>,
  'deleteAsset' : ActorMethod<[UidType], Result>,
  'deleteFromSettings' : ActorMethod<[UidType], Result>,
  'fetchAssetChunkById' : ActorMethod<[UidType, ChunkId], Result_4>,
  'fetchAssetInfo' : ActorMethod<[UidType], Result_3>,
  'fetchFileSystem' : ActorMethod<[], Result_2>,
  'fetchSetting' : ActorMethod<[UidType], Result_2>,
  'fetchUserInfo' : ActorMethod<[], Result_1>,
  'initiateAssetUpload' : ActorMethod<[ContentInfo, [] | [boolean]], Result>,
  'reset' : ActorMethod<[], undefined>,
  'showAllInAssetPermBuffer' : ActorMethod<
    [],
    Array<[string, { 'info' : ContentInfo, 'buffer' : Array<ContentChunk> }]>,
  >,
  'showAllInAssetTempBuffer' : ActorMethod<
    [],
    Array<
      [string, { 'info' : ContentInfo, 'buffer' : Array<[] | [ContentChunk]> }]
    >,
  >,
  'showAllUsers' : ActorMethod<[], Array<DebugUserInfo>>,
  'updateFileSystem' : ActorMethod<[SerializedJsonType], Result>,
  'updateSetting' : ActorMethod<[UidType, SerializedJsonType], Result>,
  'updateUserInfo' : ActorMethod<[UserInfo], Result>,
}

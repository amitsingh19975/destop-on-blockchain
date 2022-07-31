import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import { UIDType } from '../canisterHelper';
import { isDef } from '../basic';

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

type ErrorKindType =
    'assetOutOfBoundAccess' |
    'assetCommit' |
    'userAlreadyExists' |
    'assetInitialize' |
    'anonymous' |
    'assetNotFound' |
    'userDoesnotExist' |
    'assetAlreadyExists' |
    'fetch';

export type ResultOkType = null | UserInfoWithUid | SerializedJsonType | ContentInfo | ContentChunk;

export type ResultType<O extends ResultOkType, E = Error> = { ok: O } | { err: E };

export type Result = { 'ok': null } | { 'err': Error };
export type Result_1 = { 'ok': UserInfoWithUid } | { 'err': Error };
export type Result_2 = { 'ok': SerializedJsonType } | { 'err': Error };
export type Result_3 = { 'ok': ContentInfo } | { 'err': Error };
export type Result_4 = { 'ok': ContentChunk } | { 'err': Error };

const err = (type: ErrorKindType, message: string): {err: Error} => ({ err: { [type]: message } as Error });
const ok = <T extends ResultOkType>(resp: T): {ok: T} => ({ ok: resp });

export interface UserInfo {
    'firstname': string,
    'lastname': string,
    'avatar': [] | [string],
}

export interface _SERVICE {
    'addAssetChunk': (id: UidType, chunk: ContentChunk) => ResultType<null>,
    'commitAssetChunk': (id: UidType) => ResultType<null>,
    'createUser': (user: UserInfo, data: [] | [SerializedJsonType]) => ResultType<null>,
    'deleteAsset': (id: UidType) => ResultType<null>,
    'deleteFromSettings': (id: UidType) => ResultType<null>,
    'fetchAssetChunkById': (id: UidType, chunkId: ChunkId) => ResultType<ContentChunk>,
    'fetchAssetInfo': (id: UidType) => ResultType<ContentInfo>,
    'fetchFileSystem': () => ResultType<SerializedJsonType>,
    'fetchSetting': (id: UidType) => ResultType<SerializedJsonType>,
    'fetchUserInfo': () => ResultType<UserInfoWithUid>,
    'initiateAssetUpload': (info: ContentInfo, flag: [] | [boolean]) => ResultType<null>,
    'reset': () => undefined,
    'updateFileSystem': (fs: SerializedJsonType) => ResultType<null>,
    'updateSetting': (id: UidType, settings: SerializedJsonType) => ResultType<null>,
    'updateUserInfo': (info: UserInfo) => Result,
}

type User = {
    uid: UIDType|null,
    userInfo: Omit<UserInfoWithUid, 'uid'>,
    fileSystem: string,
    settings: Record<UIDType, string>,
};
let G_ASSET: Record<UIDType, {info: ContentInfo, buffer: ContentChunk[]}> = {};
let G_STREAMING: Record<UIDType, {info: ContentInfo, buffer: (ContentChunk|null)[]}> = {};
let G_USER: User = {
    uid: null,
    userInfo: {
        avatar: [],
        firstname: 'Anon',
        lastname: 'anon',
    },
    fileSystem: '',
    settings: {},
};

const createActor = (): _SERVICE => ({
    addAssetChunk: (id: UidType, chunk: ContentChunk): ResultType<null> => {
        if (!(id in G_STREAMING)) {
            return err('assetInitialize', "[Assets.add]: before calling 'add', please call 'initContent'!");
        }
        G_STREAMING[id].buffer[Number(chunk.chunkId)] = chunk;
        return ok(null);
    },
    commitAssetChunk: (id: UidType): ResultType<null> => {
        if (!(id in G_STREAMING)) {
            return err('assetCommit', "[Assets.commit]: before calling 'commit', please call 'initContent'!");
        }
        const { buffer, info } = G_STREAMING[id];
        const chunks = buffer.filter((el) => isDef(el)).length;
        const totalChunks = Number(info.totalChunks);
        if (chunks !== totalChunks) {
            return err('assetCommit', `[Assets.commit]: corrupt data found; expected chunks='${totalChunks}', but found='${chunks}'`);
        }
        G_ASSET[id] = {
            info,
            buffer: buffer as ContentChunk[],
        };
        delete G_STREAMING[id];
        return ok(null);
    },
    createUser: (user: UserInfo, fs: [] | [SerializedJsonType]): ResultType<null> => {
        G_USER.uid = '0';
        G_USER.userInfo = user;
        G_USER.fileSystem = fs[0] || '';
        return ok(null);
    },
    deleteAsset: (id: UidType): ResultType<null> => {
        if (id in G_ASSET) {
            delete G_ASSET[id];
        }
        return ok(null);
    },
    deleteFromSettings: (id: UidType): ResultType<null> => {
        if (('settings' in G_USER) && (id in G_USER.settings)) {
            delete G_USER.settings[id];
        }
        return ok(null);
    },
    fetchAssetChunkById: (id: UidType, chunkId: ChunkId): ResultType<ContentChunk> => {
        if (id in G_ASSET) {
            const idx = Number(chunkId);
            const { buffer } = G_ASSET[id];
            const error = err('assetOutOfBoundAccess', `[Assets.fetchAssetChunkById]: out of bound access; index='${idx}', but size='${buffer.length}'`);
            if (idx >= buffer.length) {
                return error;
            }
            return ok(buffer[idx]);
        }
        return err('assetNotFound', `[Assets.fetchAssetChunkById]: content with UID='${id}' does not exisit`);
    },
    fetchAssetInfo: (id: UidType): ResultType<ContentInfo> => {
        if (id in G_ASSET) {
            const { info } = G_ASSET[id];
            return ok(info);
        }
        return err('assetNotFound', `[Assets.fetchInfo]: content with UID='${id}' does not exisit`);
    },
    fetchFileSystem: (): ResultType<SerializedJsonType> => {
        if ('fileSystem' in G_USER) {
            return ok(G_USER.fileSystem);
        }
        return ok('');
    },
    fetchSetting: (id: UidType): ResultType<SerializedJsonType> => {
        if (('settings' in G_USER) && (id in G_USER.settings)) {
            return ok(G_USER.settings[id]);
        }
        return err('fetch', `[fetchSetting]: no setting found with id='${id}'`);
    },
    fetchUserInfo: (): ResultType<UserInfoWithUid> => {
        const { uid } = G_USER;
        if (!isDef(uid)) return err('userDoesnotExist', 'no user found');
        return ok({ ...G_USER.userInfo, uid });
    },
    initiateAssetUpload: (info: ContentInfo, replace: [] | [boolean]): ResultType<null> => {
        const shouldReplace = replace[0] || false;
        if (info.uid in G_ASSET && !shouldReplace) {
            return err('assetAlreadyExists', `[Assets.initContent]: asset='${info.name}' with uid=${info.uid}' already exists!`);
        }
        G_STREAMING[info.uid] = {
            info,
            buffer: new Array(Number(info.totalChunks)).fill(null),
        };
        return ok(null);
    },
    reset: () => {
        G_ASSET = {};
        G_STREAMING = {};
        G_USER = {
            uid: '0',
            userInfo: {
                avatar: [],
                firstname: 'Anon',
                lastname: 'anon',
            },
            fileSystem: '',
            settings: {},
        };
        return undefined;
    },
    updateFileSystem: (fs: SerializedJsonType): ResultType<null> => {
        G_USER.fileSystem = fs;
        return ok(null);
    },
    updateSetting: (id: UidType, settings: SerializedJsonType): ResultType<null> => {
        G_USER.settings[id] = settings;
        return ok(null);
    },
    updateUserInfo: (info: UserInfo): Result => {
        G_USER.userInfo = info;
        return ok(null);
    },
});

export const dfx = createActor();

export const idlFactory = ({ IDL }) => {
  const UidType = IDL.Text;
  const Content = IDL.Vec(IDL.Nat8);
  const ChunkId = IDL.Nat;
  const ContentChunk = IDL.Record({ 'chunk' : Content, 'chunkId' : ChunkId });
  const Error = IDL.Variant({
    'assetOutOfBoundAccess' : IDL.Text,
    'assetCommit' : IDL.Text,
    'userAlreadyExists' : IDL.Text,
    'assetInitialize' : IDL.Text,
    'anonymous' : IDL.Text,
    'assetNotFound' : IDL.Text,
    'userDoesnotExist' : IDL.Text,
    'assetAlreadyExists' : IDL.Text,
    'fetch' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  const UserInfo = IDL.Record({
    'firstname' : IDL.Text,
    'lastname' : IDL.Text,
    'avatar' : IDL.Opt(IDL.Text),
  });
  const SerializedJsonType = IDL.Text;
  const Result_4 = IDL.Variant({ 'ok' : ContentChunk, 'err' : Error });
  const DataType = IDL.Text;
  const ContentInfo = IDL.Record({
    'uid' : UidType,
    'name' : IDL.Text,
    'size' : IDL.Nat,
    'totalChunks' : IDL.Nat,
    'dtype' : DataType,
  });
  const Result_3 = IDL.Variant({ 'ok' : ContentInfo, 'err' : Error });
  const Result_2 = IDL.Variant({ 'ok' : SerializedJsonType, 'err' : Error });
  const UserInfoWithUid = IDL.Record({
    'uid' : IDL.Text,
    'firstname' : IDL.Text,
    'lastname' : IDL.Text,
    'avatar' : IDL.Opt(IDL.Text),
  });
  const Result_1 = IDL.Variant({ 'ok' : UserInfoWithUid, 'err' : Error });
  return IDL.Service({
    'addAssetChunk' : IDL.Func([UidType, ContentChunk], [Result], []),
    'commitAssetChunk' : IDL.Func([UidType], [Result], []),
    'createUser' : IDL.Func(
        [UserInfo, IDL.Opt(SerializedJsonType)],
        [Result],
        [],
      ),
    'deleteAsset' : IDL.Func([UidType], [Result], []),
    'deleteFromSettings' : IDL.Func([UidType], [Result], []),
    'fetchAssetChunkById' : IDL.Func([UidType, ChunkId], [Result_4], ['query']),
    'fetchAssetInfo' : IDL.Func([UidType], [Result_3], ['query']),
    'fetchFileSystem' : IDL.Func([], [Result_2], ['query']),
    'fetchSetting' : IDL.Func([UidType], [Result_2], ['query']),
    'fetchUserInfo' : IDL.Func([], [Result_1], ['query']),
    'initiateAssetUpload' : IDL.Func(
        [ContentInfo, IDL.Opt(IDL.Bool)],
        [Result],
        [],
      ),
    'reset' : IDL.Func([], [], []),
    'updateFileSystem' : IDL.Func([SerializedJsonType], [Result], []),
    'updateSetting' : IDL.Func([UidType, SerializedJsonType], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };

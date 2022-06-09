import Result "mo:base/Result";
import HashMap "mo:base/HashMap";

module {
    public type Error = {
        #anonymous: Text;
        #userAlreadyExists: Text;
        #userDoesnotExist: Text;
        #fetch: Text;
        #assetNotFound: Text;
        #assetAlreadyExists: Text;
        #assetInitialize: Text;
        #assetCommit: Text;
        #assetOutOfBoundAccess: Text;
    };

    public type ChunkId = Nat;
    public type DataType = Text;
    public type String = Text;
    public type UidType = Text;

    public type Result<V> = Result.Result<V, Error>;

    public type Content = Blob;

    public type ContentInfo = {
        uid: UidType;
        name: Text;
        dtype: DataType;
        size: Nat;
        totalChunks: Nat;
    };

    public type ContentChunk = {
        chunk: Content;
        chunkId: ChunkId;
    };

    public type SerializedJsonType = Text;
    public type Settings = HashMap.HashMap<UidType, SerializedJsonType>;

    public type UserInfo = {
        firstname: Text;
        lastname: Text;
        avatar: ?Text;
    };

    public type UserInfoWithUid = {
        uid: Text;
        firstname: Text;
        lastname: Text;
        avatar: ?Text;
    };
}

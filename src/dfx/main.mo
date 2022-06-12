import Assets "assets";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Trie "mo:base/Trie";
import Types "types";

actor OperatingSystem{

    type Result<V> = Types.Result<V>;

    type Assets = Assets.Assets;

    let mAssets: Assets = Assets.Assets(10, 10);

    public shared({caller}) func initiateAssetUpload(contentInfo: Types.ContentInfo, replace: ?Bool): async Result<()> {
        mAssets.initContent(caller, contentInfo, replace)
    };

    public shared({caller}) func addAssetChunk(uid: Types.UidType, chunk: Types.ContentChunk): async Result<()> {
        mAssets.add(caller, uid, chunk)
    };

    public shared({caller}) func commitAssetChunk(uid: Types.UidType): async Result<()> {
        mAssets.commit(caller, uid)
    };

    public shared({caller}) func deleteAsset(uid: Types.UidType): async Result<()> {
        mAssets.delete(caller, uid)
    };

    public query({caller}) func fetchAssetInfo(uid: Types.UidType): async Result<Types.ContentInfo>{
        mAssets.fetchInfo(caller, uid)
    };

    public query({caller}) func fetchAssetChunkById(uid: Types.UidType, chunkId: Types.ChunkId): async Result<Types.ContentChunk> {
        mAssets.fetchByChunkId(caller, uid, chunkId)
    };

    public query func showAllInAssetTempBuffer(): async [(Text, {info: Types.ContentInfo; buffer: [?Types.ContentChunk]})] {
        mAssets.showAllInTempBuffer()
    };

    public query func showAllInAssetPermBuffer(): async [(Text, {info: Types.ContentInfo; buffer: [Types.ContentChunk]})] {
        mAssets.showAllInPermBuffer()
    };

    class User(uidArg: Types.UidType, userInfoArg: Types.UserInfo, fileSystemArg: Types.SerializedJsonType, settingsArgs: Types.Settings) {
        public let uid: Types.UidType = uidArg;
        public var userInfo: Types.UserInfo = userInfoArg;
        public var fileSystem: Types.SerializedJsonType = fileSystemArg;
        public var settings: Types.Settings = settingsArgs;
    };

    type UsersMappingType = Trie.Trie<Principal, User>;
    var mUsersMapping: UsersMappingType = Trie.empty();

    func userKey(t: Principal) : Trie.Key<Principal> { { key = t; hash = Principal.hash(t) } };

    // TODO: remove this in the future.
    public shared func reset(): async () {
        mUsersMapping:= Trie.empty();
        mAssets.reset();
        return ();
    };

    type DebugUserInfo = {
        principal: Principal;
        userInfo: Types.UserInfo;
        fileSystem: Text;
        settings: [(Types.UidType, Text)];
    };

    public query func showAllUsers(): async [DebugUserInfo] {
        let iter = Trie.iter(mUsersMapping);
        let normalizedData = Iter.map(iter, func ((k: Principal, v: User)): DebugUserInfo {
            {
                principal = k;
                userInfo = v.userInfo;
                fileSystem = v.fileSystem;
                settings = Iter.toArray(v.settings.entries());
            }
        });
        return Iter.toArray(normalizedData);
    };

    func createUserMapping(caller: Principal, user: User): Result<()> {
        let nMapping = Trie.put(mUsersMapping, userKey(caller), Principal.equal, user);
        if (Option.isSome(nMapping.1)) {
            return #err(#userAlreadyExists("[OperatingSystem.updateUserMapping]: user('" # Principal.toText(caller) # "') already exists"));
        };

        mUsersMapping := nMapping.0;

        #ok(())
    };

    func updateUserMapping(caller: Principal, user: User): () {
        let nMapping = Trie.put(mUsersMapping, userKey(caller), Principal.equal, user);
        mUsersMapping := nMapping.0;
        ()
    };

    public shared({caller}) func createUser(
        userInfo: Types.UserInfo,
        fileSystem: ?Types.SerializedJsonType,
    ) : async Result<()>{
        // if (Principal.isAnonymous(caller) == true) {
        //     return #err(#anonymous("Anonymous users are not allowed"));
        // };

        let uid = Principal.toText(caller);
        let user = User(uid, userInfo, Option.get(fileSystem, ""), HashMap.HashMap(10, Text.equal, Text.hash));

        createUserMapping(caller, user)
    };

    func fetchUser(caller: Principal): Result<User> {
        let userOr = Trie.get(mUsersMapping, userKey(caller), Principal.equal);
        switch (userOr) {
            case (?user) return #ok(user);
            case (_) return #err(#userDoesnotExist("[OperatingSystem.fetchUser]: user('" # Principal.toText(caller) # "') does not exist"));
        };
    };

    public shared({caller}) func updateUserInfo(userInfo: Types.UserInfo): async Result<()> {
        let userOr = Trie.get(mUsersMapping, userKey(caller), Principal.equal);
        switch (userOr) {
            case (?user) {
                user.userInfo := userInfo;
                #ok(updateUserMapping(caller, user))
            };
            case (_) return #err(#userDoesnotExist("[OperatingSystem.updateUserInfo]: user('" # Principal.toText(caller) # "') does not exist"));
        };
    };

    public query({caller}) func fetchUserInfo(): async Result<Types.UserInfoWithUid> {
        Result.mapOk(fetchUser(caller), func (user: User): Types.UserInfoWithUid {
            let userInfo = user.userInfo;
            {
                uid = user.uid;
                firstname = userInfo.firstname;
                lastname = userInfo.lastname;
                avatar = userInfo.avatar
            }
        })
    };

    public query({caller}) func fetchFileSystem(): async Result<Types.SerializedJsonType> {
        Result.mapOk(fetchUser(caller), func (user: User): Types.SerializedJsonType {
            user.fileSystem
        });
    };

    public query({caller}) func fetchSetting(id: Types.UidType): async Result<Types.SerializedJsonType> {
        let userOr = fetchUser(caller);
        switch(userOr) {
            case (#ok(user)) {
                switch(user.settings.get(id)) {
                    case (?val) #ok(val);
                    case (_) #err(#fetch("[OperatingSystem.fetchSetting]: no setting found with id='" # id # "'"));
                }
            };
            case(#err(err)) #err(err)
        };
    };

    public shared({caller}) func updateFileSystem(payload: Types.SerializedJsonType): async Result<()> {
        let userOr = fetchUser(caller);
        switch(userOr) {
            case (#ok(user)) {
                user.fileSystem := payload;
                #ok(updateUserMapping(caller, user))
            };
            case(#err(err)) #err(err)
        };
    };

    public shared({caller}) func updateSetting(uid: Types.UidType, payload: Types.SerializedJsonType): async Result<()> {
        let userOr = fetchUser(caller);
        switch(userOr) {
            case (#ok(user)) {
                user.settings.put(uid, payload);
                #ok(updateUserMapping(caller, user))
            };
            case(#err(err)) #err(err)
        };
    };

    public shared({caller}) func deleteFromSettings(id: Types.UidType): async Result<()> {
        let userOr = fetchUser(caller);
        switch(userOr) {
            case (#ok(user)) {
                user.settings.delete(id);
                #ok(updateUserMapping(caller, user))
            };
            case(#err(err)) #err(err)
        };
    };

};

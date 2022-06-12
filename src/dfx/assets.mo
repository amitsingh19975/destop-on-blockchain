import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Types "types";

module {

    public class Assets(initUsers: Nat, initItems: Nat){

        type Result<V> = Types.Result<V>;
        type InternalContentImpl<T> = {
            info: Types.ContentInfo;
            buffer: T;
        };

        type InternalContent = InternalContentImpl<[var ?Types.ContentChunk]>;
        type FrozenInternalContent = InternalContentImpl<[Types.ContentChunk]>;

        type UidToInternalContentMapping = HashMap.HashMap<Types.UidType, FrozenInternalContent>;

        type StreamingMapping = HashMap.HashMap<Types.UidType, InternalContent>;

        var mUidToInternalContent: UidToInternalContentMapping = HashMap.HashMap(initItems, Text.equal, Text.hash);

        var mStreaming: StreamingMapping = HashMap.HashMap(initItems, Text.equal, Text.hash);

        public func reset(): () {
            mStreaming := HashMap.HashMap(initItems, Text.equal, Text.hash);
            mUidToInternalContent := HashMap.HashMap(initItems, Text.equal, Text.hash);
        };

        public func initContent(caller: Principal, info: Types.ContentInfo, replace: ?Bool): Result<()> {
            let id = Principal.toText(caller) # info.uid;
            let shouldReplace = Option.get(replace, false);
            let content = mUidToInternalContent.get(id);
            switch (content) {
                case (?{info}) {
                    if (not shouldReplace) {
                        return #err(#assetAlreadyExists("[Assets.initContent]: asset=''" # info.name # "' with uid='" # id # "' already exists!"));
                    };
                };
                case (_) {}
            };

            mStreaming.put(id, {
                info = info;
                buffer = Array.init(info.totalChunks, null);
            });

            #ok(())
        };

        public func add(caller: Principal, uid: Types.UidType, chunk: Types.ContentChunk): Result<()> {
            let newUid = Principal.toText(caller) # uid;
            let content = mStreaming.get(newUid);
            switch (content) {
                case (?{info; buffer}) {
                    let idx = chunk.chunkId;
                    buffer[idx] := ?chunk;
                    mStreaming.put(newUid, {
                        info = info;
                        buffer = buffer;
                    });
                    #ok(())
                };
                case (_) #err(#assetInitialize("[Assets.add]: before calling 'add', please call 'initContent'!"));
            }
        };

        public func showAllInTempBuffer() : [(Text, {info: Types.ContentInfo; buffer: [?Types.ContentChunk]})] {
            let arr = Buffer.Buffer<(Text, {info: Types.ContentInfo; buffer: [?Types.ContentChunk]})>(mStreaming.size());
            for ((uid, { info; buffer }) in mStreaming.entries()) {
                arr.add((
                    uid,
                    {
                        info = info;
                        buffer = Array.freeze(buffer);
                    }
                ));
            };
            return arr.toArray();
        };

        public func showAllInPermBuffer() : [(Text, {info: Types.ContentInfo; buffer: [Types.ContentChunk]})] {
            let arr = Buffer.Buffer<(Text, {info: Types.ContentInfo; buffer: [Types.ContentChunk]})>(mStreaming.size());
            for ((uid, { info; buffer }) in mUidToInternalContent.entries()) {
                arr.add((
                    uid,
                    {
                        info = info;
                        buffer = buffer;
                    }
                ));
            };
            return arr.toArray();
        };

        public func commit(caller: Principal, uid: Types.UidType): Result<()> {
            let newUid = Principal.toText(caller) # uid;
            let content = mStreaming.get(newUid);
            switch (content) {
                case (?{info; buffer}) {
                    let zero: Nat = 0;
                    let one: Nat = 1;
                    let frozenArray = Array.freeze(buffer);
                    let chunks = Array.foldLeft(frozenArray, zero, func (acc: Nat, el: ?Types.ContentChunk): Nat { if (Option.isSome(el)) one + acc else acc });

                    if (chunks != info.totalChunks) {
                        return #err(#assetCommit("[Assets.commit]: corrupt data found; expected chunks='" # Nat.toText(info.totalChunks) # "', but found='" # Nat.toText(chunks) # "'"));
                    };

                    mUidToInternalContent.put(newUid, {
                        info = info;
                        buffer = Array.map(frozenArray, func(el: ?Types.ContentChunk): Types.ContentChunk {
                            let temp: Types.ContentChunk = {
                                chunkId = 0;
                                chunk = Blob.fromArrayMut(Array.init(0, Nat8.fromNat(0)));
                            };
                            Option.get(el, temp)
                        });
                    });
                    mStreaming.delete(newUid);

                    #ok(())
                };
                case (_) #err(#assetInitialize("[Assets.commit]: before calling 'commit', please call 'initContent'!"));
            }
        };

        public func fetchInfo(caller: Principal, uid: Types.UidType): Result<Types.ContentInfo> {
            let newUid = Principal.toText(caller) # uid;
            let content = mUidToInternalContent.get(newUid);
            switch(content) {
                case (?{info}) #ok(info);
                case (_) #err(#assetNotFound("[Assets.fetchInfo]: content with UID='" # uid # "' does not exisit"));
            }
        };

        public func fetchByChunkId(caller: Principal, uid: Types.UidType, chunkId: Types.ChunkId): Result<Types.ContentChunk> {
            let newUid = Principal.toText(caller) # uid;
            let content = mUidToInternalContent.get(newUid);
            switch(content) {
                case (?{buffer}) {
                    if (chunkId >= buffer.size()) {
                        return #err(#assetOutOfBoundAccess("[Assets.fetchInfo]: out of bound access; index='" # Nat.toText(chunkId) # "', but size='" # Nat.toText(buffer.size())# "'"));
                    };
                    return #ok(buffer[chunkId]);
                };
                case (_) #err(#assetNotFound("[Assets.fetchInfo]: content with UID='" # uid # "' does not exisit"));
            }
        };

        public func delete(caller: Principal, uid: Types.UidType): Result<()> {
            let newUid = Principal.toText(caller) # uid;
            mUidToInternalContent.delete(newUid);
            mStreaming.delete(newUid);
            #ok(())
        }
    }


};

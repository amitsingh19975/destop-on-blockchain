import { isDef } from './basic';
import { AcceptableType, UIDType } from './canisterHelper';

declare global {
    interface Window {
        mozIndexedDB: IDBFactory;
        webkitIndexedDB: IDBFactory;
        msIndexedDB: IDBFactory;
        webkitIDBTransaction: IDBTransaction;
        msIDBTransaction: IDBTransaction;
        webkitIDBKeyRange: IDBKeyRange;
        msIDBKeyRange: IDBKeyRange;
    }
}

interface IItemMetaData {
    isDirty: boolean;
    lastRW: number;
    isProcessOfCommitedToCanister: boolean;
}

interface IItem {
    name: string;
    data: AcceptableType;
    meta: IItemMetaData;
}

export namespace Database {
    const _INDEXEDDB: IDBFactory = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    const _IDB_TRANSACTION = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
    const _IDB_KEY_RANGE = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    export const hasPersistentStorage: Readonly<boolean> = isDef(_INDEXEDDB);

    export const open = async (name: string, callback: (db: IDBDatabase) => void | Promise<void>): Promise<IDBDatabase> => {
        const request = _INDEXEDDB.open(name);
        return new Promise<IDBDatabase>((resolve, reject) => {
            request.onerror = () => {
                const err = request.error;
                if (isDef(err)) reject(err);
                else reject(`unable to open DB="${name}"`);
            };
            request.onupgradeneeded = async () => {
                await callback(request.result);
            };
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    };

    export const put = async <I>(store: IDBObjectStore, item: I, key?: Parameters<IDBObjectStore['put']>[1]) => {
        await new Promise<void>((resolve, reject) => {
            const q = store.put(item, key);
            q.onerror = () => {
                if (isDef(q.error)) reject(q.error);
                else reject('unable to put the item in the database');
            };
            q.onsuccess = () => resolve();
        });
    };

    export const complete = async (transaction: IDBTransaction) => {
        await new Promise<void>((resolve, reject) => {
            transaction.onerror = () => {
                if (isDef(transaction.error)) reject(transaction.error);
                else reject('unable complete transaction');
            };
            transaction.oncomplete = () => resolve();
        });
    };
}

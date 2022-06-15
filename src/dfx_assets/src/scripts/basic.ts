export const isDef = <T>(val: T): val is NonNullable<T> => (typeof val !== 'undefined' && val !== null);

export type GenericObjType = Record<string | number | symbol, unknown>;

export const checkKeys = <T>(
    data: Object,
    keys: (keyof T)[],
): boolean => keys.every((key) => key in data);

export type JsonObjectType =
    | string
    | number
    | boolean
    | { [x: string]: JsonObjectType }
    | Array<JsonObjectType>;

export const MAX_HARDWARE_CONCURRENCY = navigator?.hardwareConcurrency || 4;

export const persistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        if (!isPersisted) console.warn('User data may not persist, or you lose it on page refresh');
        return isPersisted;
    }
    return false;
};

export const patchObject = (obj: GenericObjType, patch: GenericObjType) => {
    Object.entries(patch).forEach(([k, v]) => {
        if (k in obj) {
            if (typeof obj[k] !== 'object') {
                obj[k] = v;
                return;
            }
            if (typeof v === 'object') patchObject(obj[k] as GenericObjType, v as GenericObjType);
        } else {
            obj[k] = v;
        }
    });
};

export const matchObject = (lhs: any, rhs: any): boolean => {
    if (typeof lhs !== typeof rhs) return false;
    if (typeof lhs !== 'object') return lhs === rhs;
    if (lhs === null) {
        if (rhs === null) return true;
        return false;
    }
    return Object.keys(lhs).every((lk) => {
        if (!(lk in rhs)) return false;
        const le = lhs[lk];
        const re = rhs[lk];
        return matchObject(le, re);
    });
};

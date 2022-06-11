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

type OperationType = 'write' | 'delete' | 'read';

interface IEventObject {
    localEvent: boolean;
    uid: string;
    timeout: number;
    name: string,
}

type EventSuffixType = 'start' | 'interrupt' | 'end';
type EventCallbackType = (e: IEventObject, optype: OperationType, suffix: EventSuffixType) => void;
type EventType = Record<OperationType, Record<EventSuffixType, Set<EventCallbackType>>>

const _events = {
    delete: {
        end: new Set(),
        start: new Set(),
        interrupt: new Set(),
    },
    write: {
        end: new Set(),
        start: new Set(),
        interrupt: new Set(),
    },
    read: {
        end: new Set(),
        start: new Set(),
        interrupt: new Set(),
    },
} as EventType;

export const addCanisterEvent = (
    opType: OperationType,
    suffix: EventSuffixType,
    callback: EventCallbackType,
) => {
    _events[opType][suffix].add(callback);
};

export const removeCanisterEvent = (
    opType: OperationType,
    suffix: EventSuffixType,
    callback: EventCallbackType,
) => {
    _events[opType][suffix].delete(callback);
};

export const dispatchCanisterEvent = (
    opType: OperationType,
    suffix: EventSuffixType,
    e: IEventObject,
) => {
    _events[opType][suffix].forEach((cb) => cb(e, opType, suffix));
};

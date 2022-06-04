import { PiniaPluginContext } from 'pinia';

interface IPiniaErrorOptions {
    callback?: (err: unknown, storeId: string, actionName: string) => void;
}

export default (
    { callback }: IPiniaErrorOptions,
) => ({ store }: PiniaPluginContext) => {
    store.$onAction(({
        name, onError,
    }) => {
        if (callback) {
            onError((err) => {
                callback(err, store.$id, name);
            });
        }
    }, true);
};

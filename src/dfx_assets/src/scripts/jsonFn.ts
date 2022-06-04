// https://github.com/vkiryukhin/jsonfn

export namespace JSONFn {
    export const stringify = (obj: unknown) => JSON.stringify(obj, (key, value) => {
        let fnBody;
        if (value instanceof Function || typeof value === 'function') {
            fnBody = value.toString();

            if (fnBody.length < 8 || fnBody.substring(0, 8) !== 'function') { // this is ES6 Arrow Function
                return `_NuFrRa_${fnBody}`;
            }
            return fnBody;
        }
        if (value instanceof RegExp) {
            return `_PxEgEr_${value}`;
        }
        return value;
    });

    export const parse = (str: string, date2obj?: Date) => {
        const iso8061 = date2obj ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/ : false;

        return JSON.parse(str, (key, value) => {
            if (typeof value !== 'string') {
                return value;
            }
            if (value.length < 8) {
                return value;
            }

            const prefix = value.substring(0, 8);

            if (iso8061 && value.match(iso8061)) {
                return new Date(value);
            }
            if (prefix === 'function') {
                // eslint-disable-next-line no-eval
                return eval(`(${value})`);
            }
            if (prefix === '_PxEgEr_') {
                // eslint-disable-next-line no-eval
                return eval(value.slice(8));
            }
            if (prefix === '_NuFrRa_') {
                // eslint-disable-next-line no-eval
                return eval(value.slice(8));
            }

            return value;
        });
    };

    export const clone = (obj: unknown, date2obj: Date) => parse(stringify(obj), date2obj);
}

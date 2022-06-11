/* eslint-disable */

declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: string;
        VUE_ROUTER_MODE: "hash" | "history" | "abstract" | undefined;
        VUE_ROUTER_BASE: string | undefined;
    }
}

declare let __webpack_public_path__: string;
declare let __webpack_get_script_filename__: (chunkId: string) => string;

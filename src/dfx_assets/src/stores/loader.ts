import { defineStore } from 'pinia';

const useLoader = defineStore('useLoaderStore', {
    state: () => ({
        isLoading: true,
    }),
    actions: {
        loaded(): void {
            this.isLoading = false;
        },
    },
});

export default useLoader;

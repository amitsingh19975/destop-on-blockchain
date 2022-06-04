import { defineStore } from 'pinia';

interface IUser {
    uuid: string;
    firstName: string;
    lastName: string;
    password: string;
}

const useUser = defineStore('useUserStore', {
    state: () => ({
        uuid: '0',
        firstName: 'Amit',
        lastName: 'Singh',
        password: 'xty',
    } as IUser),
});

export default useUser;

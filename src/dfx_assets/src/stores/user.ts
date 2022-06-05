import { defineStore } from 'pinia';
import { IIcon } from '../scripts/types';

interface IUser {
    uid: string;
    firstName: string;
    lastName: string;
    password: string;
    profileAvatar: IIcon,
}

const useUser = defineStore('useUserStore', {
    state: () => ({
        uid: '0',
        firstName: 'Amit',
        lastName: 'Singh',
        password: 'xty',
        profileAvatar: { type: 'Image', data: 'https://cdn.quasar.dev/img/avatar.png' },
    } as IUser),
});

export default useUser;

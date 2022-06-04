import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { addCanisterEvent } from '../scripts/events';

const useWriteInProgress = defineStore('useWriteInProgressStore', () => {
    const apps = reactive<{
        [k: string]: {
            name: string,
            time: number,
            timerID: ReturnType<typeof setInterval> | null;
            progress: number,
            curTime: number,
        }
    }>({});

    const removeInterval = (uid: string) => {
        const { timerID } = apps[uid];
        if (timerID !== null) clearInterval(timerID);
        apps[uid].timerID = null;
    };

    const remove = (uid: string) => {
        if (uid in apps) {
            delete apps[uid];
            removeInterval(uid);
        }
    };

    const add = (uid: string, name: string, time: number) => {
        const fn = () => {
            apps[uid].timerID = setInterval(() => {
                if (apps[uid].curTime === apps[uid].time) {
                    remove(uid);
                }
                apps[uid].curTime += 1;
                apps[uid].progress = apps[uid].curTime / Math.max(1, apps[uid].time);
            }, time);
        };

        if (uid in apps) {
            const prog = apps[uid];
            if (prog.timerID !== null) clearInterval(prog.timerID);
        }

        apps[uid] = {
            name,
            time,
            timerID: null,
            curTime: -1,
            progress: 0,
        };

        fn();
    };

    addCanisterEvent('write', 'start', ({ uid, name, timeout }) => {
        add(uid, name, timeout);
    });

    addCanisterEvent('write', 'end', ({ uid, name, timeout }) => {
        remove(uid);
    });

    return {
        remove,
        add,
        apps,
    };
});

export default useWriteInProgress;

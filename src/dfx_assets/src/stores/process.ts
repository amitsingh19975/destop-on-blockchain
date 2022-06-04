import { defineStore } from 'pinia';
import { uid } from 'quasar';
import PidGen from '../scripts/pidGen';
import { IProcess, MakeProcessArgType, PIDType } from '../scripts/types';
import useIcons from './icons';

const useProcess = defineStore('useProcessStore', {
    state: () => ({
        _pidGen: new PidGen(),
        process: {} as Record<PIDType, IProcess>,
    }),
    actions: {
        makeProcess({ name, icon, state = false }: MakeProcessArgType): PIDType {
            const id = this._pidGen.next;
            this.process[id] = {
                uid: uid(),
                icon:
                    typeof icon === 'undefined'
                        ? useIcons().icons.unknown
                        : icon,
                name,
                state,
            };
            return id;
        },
        removeProcess(id: number): void {
            if (id in this.process) {
                this._pidGen.free(id);
                delete this.process[id];
            }
        },
        registerHTMLElement(pid: PIDType, el?: HTMLElement | null): void {
            if (pid in this.process) this.process[pid].el = el;
        },
    },
});

export default useProcess;

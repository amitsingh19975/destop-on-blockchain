import { ActionType, PIDType } from './types';
import { capitalize } from './utils';

export const transformActions = (pid: PIDType, actions: ActionType) => {
    const res: ActionType = {};
    Object.entries(actions).forEach(([k, v]) => {
        const tk = capitalize(k);
        res[tk] = {
            ...v,
            action: () => v.action(pid),
        };
    });
    return res;
};

export const transformMenus = (
    pid: PIDType,
    menu: Record<string, ActionType>,
) => {
    const res: Record<string, ActionType> = {};
    Object.entries(menu).forEach(([k, v]) => {
        const tk = capitalize(k);
        res[tk] = transformActions(pid, v);
    });
    return res;
};

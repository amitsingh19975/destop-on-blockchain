import { PIDType } from './types';

export default class PidGen {
    private _freeIds = [] as PIDType[];

    private _curId = -1;

    get next(): PIDType {
        const id = this._freeIds.pop();
        if (id) return id;
        this._curId += 1;
        return this._curId;
    }

    get curId(): PIDType {
        return this._curId;
    }

    free(id: PIDType): void {
        if (id < 0 || id > this._curId) return;
        this._freeIds.push(id);
        if (this._freeIds.length === this._curId + 1) {
            this.reset();
        }
    }

    reset(): void {
        this._freeIds = [];
        this._curId = -1;
    }
}

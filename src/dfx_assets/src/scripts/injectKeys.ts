import type { InjectionKey } from 'vue';
import { IDirectory } from './fs';

export const rootInjectKey = Symbol('Filesystem root') as InjectionKey<IDirectory>;

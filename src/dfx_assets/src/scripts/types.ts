import { Component, DefineComponent } from 'vue';
import { ComponentType, ComponentValueType } from '../windowApp';
import { GenericObjType } from './utils';

export type PIDType = number;

export type CSSUnitType =
    | '%'
    | 'px'
    | 'cm'
    | 'mm'
    | 'in'
    | 'pt'
    | 'pc'
    | 'em'
    | 'ex'
    | 'ch'
    | 'rem'
    | 'vw'
    | 'vh'
    | 'vmin'
    | 'vmax';

export type PositionKindType =
    | 'centre'
    | 'centre-left'
    | 'centre-right'
    | 'centre-top'
    | 'centre-bottom'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

export type ShapeType = { width: number; height: number };

export interface IPosition {
    x: number;
    y: number;
}

export type PositionType = PositionKindType | IPosition | [number, number];

export interface IIcon {
    type: 'Material' | 'Fontawesome' | 'Image' | 'Ion';
    data: string;
}

export interface IProcess {
    uid: string;
    name: string;
    icon: string | IIcon;
    state: boolean;
    el?: HTMLElement | null;
}

export type MakeProcessArgType = Omit<IProcess, 'state' | 'id' | 'uid' | 'icon'> & {
    icon?: IProcess['icon'];
    state?: boolean;
};

export interface IPositionUnit {
    x: CSSUnitType;
    y: CSSUnitType;
}

export interface IActionValue {
    icon?: string | IIcon;
    action: (pid?: PIDType) => void;
}

export type ActionType = Record<string, IActionValue>;

export interface IWindowLifeCycle {
    beforeLoaded?: (pid: PIDType) => Promise<void> | void;
    visible?: (pid: PIDType) => Promise<void> | void;
    beforeDestroy?: (pid: PIDType) => Promise<void> | void;
    destroy?: () => Promise<void> | void;
}

export type VueHTMLElementType = HTMLElement | DefineComponent | VueHTMLElementType[];

export interface IWindow {
    position: IPosition;
    positionUnit: IPositionUnit;
    width: number;
    height: number;
    pid: PIDType;
    menubar: Record<string, ActionType>;
    hideMenubar: boolean;
    isFullScreen: boolean;
    componentName: string;
    props: {
        pid: number,
    } & GenericObjType;
    state: 'create' | keyof IWindowLifeCycle;
}

export type MakeWindowArgType<C extends ComponentType> = {
    position?: PositionType;
    positionUnit?: IWindow['positionUnit'];
    width?: IWindow['width'];
    height?: IWindow['height'];
    menubar?: IWindow['menubar'];
    hideMenubar?: IWindow['hideMenubar'];
    isFullScreen?: boolean;
    props?: Omit<InstanceType<ComponentValueType[C]>['$props'], 'pid'>;
    componentName?: C,
} & MakeProcessArgType;

export const WindowEvents = [
    'before:close',
    'after:close',
    'restoreShape',
    'fullscreen',
    'minimized',
    'change:position',
    'change:shape',
    'focusIn',
    'focusOut',
] as const;

export type WindowEventType = typeof WindowEvents[number];

export interface IWindowEvent {
    type: WindowEventType;
    pid: PIDType;
    data?: unknown | ShapeType | IPosition;
}

export interface WinApp {
    name: string;
    organization?: string;
    author: string;
    icon: IIcon | string;
    meta: {
        external?: {
            url: string,
        },
        builtin?: {
            component: ComponentType,
        }
    },
}

export type ClassType = string | ClassType[] | Record<string, boolean>;

export const DefaultAudioExt = ['mp3', 'wav'] as const;
export const DefaultVideoExt = ['mp4', 'webm', 'ogv'] as const;
export const DefaultImageExt = ['gif', 'jpeg', 'jpg', 'tiff', 'tif', 'png', 'webp', 'bmp'] as const;
export type DefaultAudioExtType = typeof DefaultAudioExt[number];
export type DefaultVideoExtType = typeof DefaultVideoExt[number];
export type DefaultImageExtType = typeof DefaultImageExt[number];

export type MediaType = {
    data: string,
    type: string,
} | Blob;

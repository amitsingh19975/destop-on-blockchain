import { App } from 'vue';
import AppJsonEditor from './AppJsonEditor.vue';
import AppFileManager from './AppFileManager.vue';
import VDefaultWindow from '../components/VDefaultWindow.vue';
import AppTextEditor from './AppTextEditor.vue';
import AppImageViewer from './AppImageViewer.vue';
import AppVideoViewer from './AppVideoViewer.vue';
import AppMusicPlayer from './AppMusicPlayer.vue';
import AppDesktopWallpaper from './AppDesktopWallpaper.vue';
import AppProfile from './AppProfile.vue';
import AppDownloadManager from './AppDownloadManager.vue';
import AppPingPong from './AppPingPong.vue';

const components = {
    AppJsonEditor,
    VDefaultWindow,
    AppFileManager,
    AppTextEditor,
    AppImageViewer,
    AppVideoViewer,
    AppMusicPlayer,
    AppDesktopWallpaper,
    AppProfile,
    AppDownloadManager,
    AppPingPong,
} as const;

export default function registerWinApp(app: App): void {
    Object.entries(components).forEach(([k, comp]) => {
        let { name } = comp;
        if (typeof name === 'undefined') name = k;
        if (typeof app.component(name) === 'undefined') {
            app.component(name, comp);
            comp.registerExtenstion?.();
            comp.registerIcon?.();
        }
    });
}

export type ComponentType = keyof typeof components;
export type ComponentValueType = typeof components;
export const registeredComponentName = (key: ComponentType) => {
    const { name } = components[key];
    return typeof name === 'undefined' ? key : name;
};

const makeNameFromKey = (str: string): string => str.substring(3)
    .replace(/([A-Z])/g, ' $1').trim();

export const getAllApps = () => {
    const res = [] as { name: string, component: ComponentType }[];
    Object.keys(components).forEach((k) => {
        if (k === 'VDefaultWindow' || k === 'AppProfile') return;
        res.push({
            name: makeNameFromKey(k),
            component: k as ComponentType,
        });
    });
    return res;
};

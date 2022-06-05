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
} as const;

export default function registerWinApp(app: App): void {
    Object.entries(components).forEach(([k, comp]) => {
        let { name } = comp;
        if (typeof name === 'undefined') name = k;
        if (typeof app.component(name) === 'undefined') {
            app.component(name, comp);
            comp.registerExtenstion?.();
        }
    });
}

export type ComponentType = keyof typeof components;
export type ComponentValueType = typeof components;
export const registeredComponentName = (key: ComponentType) => {
    const { name } = components[key];
    return typeof name === 'undefined' ? key : name;
};

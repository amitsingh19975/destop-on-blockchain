import useExtMapping from '../stores/extMapping';
import useWindowManager from '../stores/windowManager';
import {
    findChild, IDirectory, IFileSystem, Path,
} from './fs';
import { notifyInfo } from './notify';
import { readFile } from './storage';
import { WinApp } from './types';
import { isDef } from './basic';

export namespace FileManager {

    type OpenModeType = 'traverse' | 'normal';

    export const addTohistory = ({ history, dir, level }: { history: Readonly<IFileSystem>[], dir: Readonly<IDirectory>, level: number }) => {
        history.splice(level, history.length - level);
        history.push(dir);
    };

    export const openFolder = ({
        dir, curDir, level, history,
    }: { dir: IDirectory, curDir: IDirectory, level: number, history: Readonly<IFileSystem>[] }) => {
        // if (this.pid) {

        curDir = dir;
        level += 1;
        // } else {
        //     // TODO: Create Window
        // }
        addTohistory({ dir: curDir, level, history });
        return { level, curDir };
    };

    export const open = async ({
        name, curDir, noNewWindow = true, level, history, mode = 'normal',
    }: {
        name?: string,
        curDir: IDirectory,
        noNewWindow?: boolean,
        level: number,
        history: Readonly<IFileSystem>[],
        mode?: OpenModeType
    }): Promise<{ level: number, curDir: IDirectory }> => {
        if (!name) return { level, curDir };
        const { makeWindow } = useWindowManager();

        const dir = findChild(curDir, name, 'Dir');
        const file = findChild(curDir, name, 'File');
        if (dir) {
            if (noNewWindow) {
                return openFolder({
                    curDir, level, history, dir,
                });
            }
            makeWindow(({
                name: `File Manager - ["${Path.realname(dir)}"]`,
                componentName: 'AppFileManager',
                props: {
                    node: dir,
                },
                width: 800,
                height: 800,
            }));
        } else if (file) {
            if (mode === 'traverse') return { level, curDir };

            const app = await useExtMapping().getFileComponent(file);
            if (!isDef(app)) {
                notifyInfo(`No suitable app found for the extenstion="${file.ext}"`);
                return { level, curDir };
            }
            const data = await readFile<'generic', WinApp>({ node: file });
            const winName = data?.name || app;
            makeWindow({
                name: winName,
                width: 800,
                height: 800,
                componentName: app,
                props: {
                    node: file,
                    isSelf: data?.meta?.builtin?.component === app,
                },
            });
        }
        return { level, curDir };
    };

    export const goBack = ({
        level, curDir, root, history,
    }: {
        root: IDirectory, curDir?: IDirectory, level: number, history?: IFileSystem[]
    }) => {
        if (level === 0) return { level, curDir };
        level -= 1;
        if (curDir) {
            curDir = (curDir.parent as IDirectory) || root;
            return { level, curDir };
        }
        if (history && history.length > level) {
            return { level, curDir: history[level] as IDirectory };
        }
        return { level, curDir };
    };

    export const defaultExtList = {
        all: /.*/,
        text: '.txt',
        app: '.app',
        image: /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i,
        audio: /\.(mp3|wav)$/i,
        video: /\.(mp4|webm|ogv)$/i,
        file: '%File',
        dir: '%Dir',
    } as const;
}

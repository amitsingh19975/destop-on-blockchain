import {
    defineComponent, inject, PropType, reactive,
} from 'vue';
import useProcess from '../stores/process';
import useWindowManager from '../stores/windowManager';
import { rootInjectKey } from './injectKeys';
import {
    IActionValue,
    IIcon, IProcess, IWindow, PIDType, ShapeType,
} from './types';
import { capitalize } from './utils';
import VDialogBox from '../components/VDialogBox.vue';
import {
    asDir, asFile, findChild, IDirectory, IFile, IFileSystem, isFile,
} from './fs';
import { notifyNeg } from './notify';
import VFilePicker from '../components/VFilePicker.vue';
import { isDef } from './basic';
import useUser from '../stores/user';

declare module 'vue' {
    interface ComponentCustomProperties {
        wBeforeLoaded?: () => Promise<void> | void;
        wVisible?: () => Promise<void> | void;
        wBeforeDestroy?: () => Promise<void> | void;
        wDestory?: () => Promise<void> | void;
    }
    interface ComponentCustomOptions {
        registerExtenstion?(): void;
        registerIcon?(): void;
    }
}
const BoxTypes = ['danger', 'confirm', 'warning', 'info', 'loading'] as const;
type BoxType = typeof BoxTypes[number];
type BtnType = 'green' | 'red';

interface IDialogBox {
    type: BoxType,
    message: string,
    show: boolean,
    btns: {
        [key in BoxType]?: {
            [btnKey in BtnType]?: {
                label: string,
                callback?: (e: Event) => void,
            }
        }
    },
    onClose?: () => void,
}

const DEFAULT_DIALOG_MESSAGE: Record<BoxType, string> = {
    loading: 'Loading, please wait...',
    danger: '',
    confirm: '',
    warning: '',
    info: '',
} as const;

const mDialogBox = reactive<IDialogBox>({
    type: 'loading',
    message: DEFAULT_DIALOG_MESSAGE.loading,
    show: false,
    btns: {},
});

interface IFilePicker {
    resolve?: () => void,
    show: boolean,
    closeOnFailure: boolean,
}

const mFilePicker = reactive<IFilePicker>({
    show: false,
    closeOnFailure: false,
});

export default defineComponent({
    name: 'VBaseWindowComponent',
    components: {
        VDialogBox,
        VFilePicker,
    },
    props: {
        pid: {
            type: Number as PropType<PIDType>,
            required: true,
        },
        node: {
            type: Object as PropType<IFileSystem>,
            required: false,
        },
        isSelf: {
            type: Boolean,
            required: false,
            default: false,
        },
        // root: {
        //     type: Object as PropType<IFileSystem>,
        //     required: true,
        // },
    },
    setup() {
        return {
        };
    },
    computed: {
        self(): { window: IWindow, process: IProcess } {
            return {
                window: useWindowManager()._window(this.pid),
                process: useProcess().process[this.pid],
            };
        },
        // _root(): IFileSystem | undefined {
        //     return this.node && reactive(markRaw(this.node));
        // },
        dir(): IDirectory | undefined {
            if (typeof this.node === 'undefined') return undefined;
            return asDir(this.node);
        },
        file(): IFile | undefined {
            if (typeof this.node === 'undefined') return undefined;
            return asFile(this.node);
        },
        rootDir(): IDirectory {
            return useUser().root;
        },
        dialogBoxProps: () => ({
            type: mDialogBox.type,
            message: mDialogBox.message,
            modelValue: mDialogBox.show,
            'onUpdate:modelValue': (val: boolean) => { mDialogBox.show = val; },
            btns: mDialogBox.btns[mDialogBox.type],
            onClick({ btnType, e }: { btnType: BtnType, e: Event }): void {
                const btn = mDialogBox.btns[mDialogBox.type]?.[btnType];
                btn?.callback?.(e);
            },
            onClose: () => {
                if (mDialogBox.onClose) mDialogBox.onClose();
                else mDialogBox.show = false;
            },
        }),
        filePickerProps() {
            return {
                modelValue: mFilePicker.show,
                'onUpdate:modelValue': (val: boolean) => { mFilePicker.show = val; },
                root: this.rootDir,
                onClose: () => {
                    if (mFilePicker.closeOnFailure) {
                        this.close();
                    }
                },
            };
        },
    },
    methods: {
        close(): void {
            const { pid } = this;
            useWindowManager().closeWindow(pid);
        },
        setIcon(icon: IIcon): void {
            const { process } = this.self;
            process.icon = icon;
        },
        setTitle(name: string): void {
            const { process } = this.self;
            process.name = name;
        },
        addAction(category: string, name: string, action: IActionValue, override = false): boolean {
            const nname = capitalize(name);
            const store = useWindowManager();
            return store.addItemToMenubar(this.pid, category, nname, action, override);
        },
        async show(): Promise<void> {
            const store = useWindowManager();
            await store.invokeLifeCycle(this.pid, 'visible');
        },

        initDialogBox(args: IDialogBox['btns']): void {
            Object.assign(mDialogBox.btns, args);
        },

        openDialogBox<T extends IDialogBox['type']>(type: T, message?: string, args?: IDialogBox['btns'][T]): void {
            if (isDef(args)) mDialogBox.btns[type] = args;
            mDialogBox.message = message || DEFAULT_DIALOG_MESSAGE[type];
            mDialogBox.type = type;
            mDialogBox.show = true;
        },
        closeDialogBox(): void {
            mDialogBox.show = false;
        },
        openFileHelper(
            currDir: IDirectory,
            currSelection: IFileSystem | null,
            filename: string | null,
        ): IFile | undefined {
            const { resolve } = mFilePicker;
            resolve?.();
            mFilePicker.closeOnFailure = false;

            const node = isDef(currSelection) ? currSelection : findChild(currDir, filename || '', 'File');
            if (!isDef(node)) {
                notifyNeg('invalid state; no node is selected');
                return undefined;
            }
            if (!isFile(node)) {
                console.log('HERE', currSelection, filename);
                this.openDialogBox('danger', `Open File must be a "File" kind, but found "${node._nodeKind}"`);
                return undefined;
            }
            return node;
        },
        resize(shape: ShapeType): void {
            useWindowManager().resize(this.pid, shape);
        },

        async openBlockingFilePicker({ closeOnFailure = false }: {
            closeOnFailure?: boolean
        }): Promise<void> {
            this.closeDialogBox();
            await new Promise<void>((resolve) => {
                mFilePicker.closeOnFailure = closeOnFailure;
                mFilePicker.resolve = () => {
                    resolve();
                    delete mFilePicker.resolve;
                };
                this.openFilePicker();
            });
        },

        openFilePicker(): void {
            mFilePicker.show = true;
        },

        closeFilePicker(): void {
            mFilePicker.show = false;
        },

    },
    async mounted() {
        const store = useWindowManager();
        mDialogBox.btns.danger = {
            red: {
                label: 'Close',
                callback: this.closeDialogBox,
            },
        };

        this.openDialogBox('loading');
        store.registerWindowElement(this.$el);
        store.registerWindowLifeCycle(this.pid, {
            beforeLoaded: this.wBeforeLoaded,
            visible: this.wVisible,
            beforeDestroy: this.wBeforeDestroy,
            destroy: this.wDestory,
        });
        await store.invokeLifeCycle(this.pid, 'beforeLoaded');
    },
    unmounted() {
        this.closeDialogBox();
        this.closeFilePicker();
    },
});

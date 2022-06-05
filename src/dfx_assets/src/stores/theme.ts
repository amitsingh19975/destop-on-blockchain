import { defineStore } from 'pinia';
import {
    getCssVar, setCssVar, Dark, colors,
} from 'quasar';

type BaseColorsType = {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    positive: string;
    negative: string;
    info: string;
    warning: string;
    separator: string;
    separatorDark: string;
    readonly white: string;
    readonly black: string;
};

const baseColors: BaseColorsType = {
    primary: getCssVar('primary') || '#1976D2',
    secondary: getCssVar('secondary') || '#26A69A',
    accent: getCssVar('accent') || '#9C27B0',
    dark: getCssVar('dark') || '#1d1d1d',
    positive: getCssVar('positive') || '#21BA45',
    negative: getCssVar('negative') || '#C10015',
    info: getCssVar('info') || '#31CCEC',
    warning: getCssVar('warning') || '#F2C037',
    white: '#ffffff',
    black: '#000000',
    separator: colors.rgbToHex({
        r: 0,
        g: 0,
        b: 0,
        a: 12,
    }),
    separatorDark: colors.rgbToHex({
        r: 255,
        g: 255,
        b: 255,
        a: 28,
    }),
};

export type ComponentsType = {
    taskbar: {
        backgroundColor: string;
        textColor: string;
    };
    taskbarStartBtn: {
        backgroundColor: string;
        textColor: string;
    };
    avatar: {
        backgroundColor: string;
    };
    taskbarStartMenu: {
        leftBackgroundColor: string;
        rightBackgroundColor: string;
        leftTextColor: string;
        rightTextColor: string;
        borderColor: string;
        separatorColor: string;
    };
    windowTitle: {
        backgroundColor: string;
        textColor: string;
    };
    window: {};
    windowTitleMenubar: {
        backgroundColor: string;
        textColor: string;
    };
    desktop: {
        backgroundColor: string;
    };
    selection: {
        backgroundColor: string,
        borderColor: string,
        textColor: string,
    }
};

const useTheme = defineStore('useThemeStore', {
    state: () => ({
        colors: {
            baseColors,

            components: {
                taskbar: {
                    backgroundColor: baseColors.primary,
                    textColor: baseColors.white,
                },
                taskbarStartBtn: {
                    backgroundColor: baseColors.secondary,
                    textColor: baseColors.white,
                },
                taskbarStartMenu: {
                    leftBackgroundColor: colors.lighten(baseColors.primary, 20),
                    rightBackgroundColor: baseColors.white,
                    leftTextColor: baseColors.white,
                    rightTextColor: baseColors.black,
                    borderColor: baseColors.black,
                    separatorColor: baseColors.separator,
                },
                avatar: {
                    backgroundColor: baseColors.white,
                },
                windowTitleMenubar: {
                    backgroundColor: baseColors.primary,
                    textColor: baseColors.white,
                },
                windowTitle: {
                    backgroundColor: baseColors.primary,
                    textColor: baseColors.white,
                },
                window: {},
                desktop: {
                    backgroundColor: baseColors.secondary,
                },
                selection: {
                    backgroundColor: baseColors.primary,
                    borderColor: colors.lighten(baseColors.primary, -10),
                    textColor: baseColors.white,
                },
            } as ComponentsType,
        },
        images: {
            desktop: {
                backgroundImage: undefined as string | undefined,
            },
        },
    }),
    getters: {
        compColor:
            (state) => <Comp extends keyof ComponentsType>(
                comp: Comp,
                key: keyof ComponentsType[Comp],
                lightenPer?: number,
            ) => {
                const temp = state.colors.components[comp][
                    key
                ] as unknown as string;
                return lightenPer ? colors.lighten(temp, lightenPer) : temp;
            },
        getColor:
            (state) => (key: keyof BaseColorsType, lightenPer?: number): string => {
                const temp = state.colors.baseColors[key];
                return lightenPer ? colors.lighten(temp, lightenPer) : temp;
            },
        isDarkMode: () => Dark.isActive,
    },
    actions: {
        updateBaseColor(key: keyof BaseColorsType, color: string): void {
            if (key !== 'white' && key !== 'black') {
                baseColors[key] = color;
                if (key !== 'separator' && key !== 'separatorDark') {
                    setCssVar(key, color);
                }
            }
        },
        updateComponent<Comp extends keyof ComponentsType>(
            comp: Comp,
            key: keyof ComponentsType[Comp],
            color: string,
        ): void {
            const temp = this.colors.components[comp];
            (temp[key] as unknown as string) = color;
        },
        onDarkMode(): void {
            Dark.set(true);
        },
        offDarkMode(): void {
            Dark.set(false);
        },
        setDesktopWallpapr(type: 'color' | 'image', srcOrColor: string): void {
            if (type === 'color') {
                this.images.desktop.backgroundImage = undefined;
                this.updateComponent('desktop', 'backgroundColor', srcOrColor);
            } else {
                this.images.desktop.backgroundImage = srcOrColor;
            }
        },
    },
});

export default useTheme;

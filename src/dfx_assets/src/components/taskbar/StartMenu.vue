<template>
    <q-menu
        :offset="[12, 5]"
        class="no-shadow"
        square
        :style="qMenuStyle"
        style="height: 400px; width: 400px"
        transition-show="jump-up"
        transition-hide="jump-down"
    >
        <span class="start-menu">
            <div class="start-menu-left fit">
                <start-menu-left-side></start-menu-left-side>
            </div>
            <div class="start-menu-right" :style="rightStyle">
                <start-menu-right-side></start-menu-right-side>
            </div>
        </span>
    </q-menu>
</template>

<script lang="ts">
import { defineComponent, ref, StyleValue } from 'vue';
import { mapState } from 'pinia';
import StartMenuRightSide from './StartMenuRightSide.vue';
import StartMenuLeftSide from './StartMenuLeftSide.vue';
import useTheme, { ComponentsType } from '../../stores/theme';

export default defineComponent({
    name: 'TheTaskBarStartMenu',
    components: { StartMenuRightSide, StartMenuLeftSide },
    setup() {
        return {
            alwaysOn: ref(true),
        };
    },
    computed: {
        ...mapState(useTheme, ['compColor', 'colors']),
        seprartorColor(): string {
            return this.colors.baseColors.separator;
        },
        qMenuStyle(): StyleValue {
            return {
                backgroundColor: this.getMenuColors('leftBackgroundColor'),
                color: this.getMenuColors('leftTextColor'),
                borderTopLeftRadius: '5px',
                overflow: 'visible',
            };
        },
        leftStyle(): StyleValue {
            return {};
        },
        rightStyle(): StyleValue {
            return {
                borderLeft: `1px solid ${this.seprartorColor}`,
                backgroundColor: this.getMenuColors('rightBackgroundColor'),
                color: this.getMenuColors('rightTextColor'),
                borderTopLeftRadius: '5px',
                borderBottomLeftRadius: '5px',
            };
        },
    },
    methods: {
        getMenuColors(
            key: keyof ComponentsType['taskbarStartMenu'],
            lightenPer?: number,
        ): string {
            return this.compColor('taskbarStartMenu', key, lightenPer);
        },
    },
    watch: {
        alwaysOn() {
            if (!this.alwaysOn) this.alwaysOn = true;
        },
    },
});
</script>

<style lang="scss" scoped>
.start-menu {
    display: grid;
    grid-template-columns: 1.5fr 2fr;
    height: 100%;
    width: 100%;

    &-right {
        margin: 0.5rem;
        margin-right: 0;
        margin-left: 0;
    }
}
</style>

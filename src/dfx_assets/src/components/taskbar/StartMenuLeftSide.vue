<template>
    <span class="fit user">
        <v-icon class="user-avatar" font-size="90%" :icon="profileAvatar" size="5rem"></v-icon>
        <div class="scroll user-info">
            <div class="text-caption">Account</div>
            <span class="text-h6 text-capitalize" style="padding-left: 5px">
                {{ firstName }} {{ lastName }}
            </span>
        </div>
        <q-btn class="logout-btn" flat :style="userBtnStyle">
            <q-icon name="logout" left></q-icon>
            <span>Logout</span>
        </q-btn>
    </span>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { defineComponent, StyleValue } from 'vue';
import useTheme from '../../stores/theme';
import useUser from '../../stores/user';
import VIcon from '../VIcon.vue';

export default defineComponent({
    name: 'TheTaskBarStartMenuLeftSide',
    components: { VIcon },
    computed: {
        ...mapState(useTheme, ['compColor', 'colors', 'getColor']),
        ...mapState(useUser, ['firstName', 'lastName', 'profileAvatar']),
        imgStyle(): StyleValue {
            return {
                border: `5px solid ${this.getBgColor()}`,
                backgroundColor: this.compColor('avatar', 'backgroundColor'),
            };
        },
        userBtnStyle(): StyleValue {
            return {
                backgroundColor: this.getColor('negative', 30),
            };
        },
    },
    methods: {
        getBgColor(lightenPer?: number): string {
            return this.compColor('taskbarStartMenu', 'leftBackgroundColor', lightenPer);
        },
    },
    mounted() { },
});
</script>

<style lang="scss" scoped>
.user {
    display: grid;
    grid-template-rows: 90% 10%;
    padding-bottom: 0.5rem;
}

.user-avatar {
    position: absolute;
    top: -2rem;
    left: 0;
}

.user-info {
    // max-height: 10rem;
    margin: 0.5rem 0 0 0.5rem;
    padding: 3rem 0.5rem 1rem 0.5rem;
}

.logout-btn {
    margin: 0 1rem 0 1rem;
    // border-top: 1px solid white;
    // border-bottom: 1px solid white;
}
</style>

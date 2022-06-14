<template>
    <q-layout view="hHh lpR fFf" class="no-scroll relative-position">
        <q-page-container class="no-scroll">
            <router-view />
        </q-page-container>
        <the-taskbar-vue></the-taskbar-vue>
        <v-new-user-dialog-box></v-new-user-dialog-box>
        <the-login></the-login>
    </q-layout>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { defineComponent } from 'vue';
import TheTaskbarVue from './components/TheTaskbar.vue';
import useUser from './stores/user';
import VNewUserDialogBox from './components/VNewUserDialogBox.vue';
import TheLogin from './components/TheLogin.vue';

export default defineComponent({
    name: 'App',
    components: {
        TheTaskbarVue,
        VNewUserDialogBox,
        TheLogin,
    },
    setup() {
        return {
        };
    },
    computed: {
        ...mapState(useUser, ['isLogOutInProcess']),
    },
    methods: {
    },
    async mounted() {
        await useUser().init();
        // document.addEventListener('contextmenu', (e) => e.preventDefault());
    },
});
</script>

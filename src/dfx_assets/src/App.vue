<template>
    <q-layout view="hHh lpR fFf" class="no-scroll relative-position">
        <q-page-container class="no-scroll">
            <router-view />
        </q-page-container>
        <the-taskbar-vue></the-taskbar-vue>
    </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import TheTaskbarVue from './components/TheTaskbar.vue';

export default defineComponent({
    name: 'App',
    components: {
        TheTaskbarVue,
    },
    setup() {
        return {
            processSnapshot: ref(),
        };
    },
    mounted() {
        // document.addEventListener('contextmenu', (e) => e.preventDefault());
    },
});
</script>

<template>
    <q-page class="fit column justify-center">
        <div class="text-h1 text-center">404</div>
        <div class="text-h4 text-center">Page not found!</div>
    </q-page>
</template>

<script lang="ts">
// import { mapActions } from 'pinia';
import { defineComponent } from 'vue';
// import useLoader from '../stores/loader';

export default defineComponent({
    name: 'NotFoundView',
    methods: {
        // ...mapActions(useLoader, ['loaded']),
    },
    mounted() {
        // this.loaded();
    },
});
</script>

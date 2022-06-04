<template>
    <span>
        <div class="text-h3">Hello</div>
        <v-dialog-box v-model="loading" type="loading" message="Loading, please wait...">
        </v-dialog-box>
    </span>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import BaseWindowComp from '../scripts/baseWindowComp';
import VDialogBox from './VDialogBox.vue';

export default defineComponent({
    name: 'VDefaultWindow',
    extends: BaseWindowComp,
    components: {
        VDialogBox,
    },
    setup() {
        return {
            loading: ref(true),
        };
    },
    methods: {
        async wBeforeLoaded(): Promise<void> {
            // await new Promise((resolve) => { setTimeout(resolve, 5000); });
            this.loading = false;
            this.show();
        },
    },
    mounted() {
    },
});
</script>

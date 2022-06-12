<script lang="ts">
export default {
    name: 'TheLogin',
};
</script>

<template>
    <q-dialog :model-value="!isLoggedIn" persistent>
        <q-card class="bg-blue-grey-8" style="width: 500px">
            <q-card-actions align="stretch">
                <v-btn flat border icon="login" label="Login" style="width:100%; height: 4rem;" :loading="isLoggingIn"
                    class="bg-blue text-white" @click="loginUser" :percentage="loadingPercentage">
                </v-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import VBtn from './VBtn.vue';
import useUser from '../stores/user';

const isLoggingIn = ref(false);
const userStore = useUser();
const { isLoggedIn, loadingPercentage } = storeToRefs(userStore);

const loginUser = async (): Promise<void> => {
    isLoggingIn.value = true;
    try {
        await userStore.login();
    } finally {
        isLoggingIn.value = false;
    }
};

</script>

<style lang="scss" scoped>
</style>

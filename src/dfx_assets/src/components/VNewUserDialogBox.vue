<script lang="ts">
export default {
    name: 'VNewUserDialogBox',
};
</script>

<template>
    <q-dialog :model-value="isNewUser">
        <q-card class="bg-blue-grey-8" style="width: 500px">
            <q-card-section class="column no-wrap" style="gap: 1rem">
                <v-icon font-size="90%" :icon="getAvatar" size="6rem" class="text-white" fallback-icon="account_circle">
                </v-icon>
                <div class="row no-wrap" style="gap:0.5rem">
                    <q-select class="bg-blue-grey-10 col-4" :readonly="userCreationInProgress" dark color="white"
                        outlined v-model="profileAvatarType" :options="options" label="Type" />
                    <q-input class="bg-blue-grey-10 col-grow" :readonly="userCreationInProgress"
                        v-model.trim="profileAvatarData" label="Avatar" outlined color="white" dark>
                    </q-input>
                </div>
                <q-input class="bg-blue-grey-10" v-model.trim="firstname" :readonly="userCreationInProgress"
                    label="Firstname" outlined color="white" dark>
                </q-input>
                <q-input class="bg-blue-grey-10" v-model.trim="lastname" :readonly="userCreationInProgress"
                    label="Lastname" outlined color="white" dark>
                </q-input>
            </q-card-section>
            <q-card-actions align="stretch">
                <v-btn flat border label="submit" style="width:100%; height: 4rem;" :loading="userCreationInProgress"
                    class="bg-green text-white" @click="createNewUser" :percentage="getLoadingPercentate">
                </v-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import VIcon from './VIcon.vue';
import { ICON_TYPES } from '../scripts/types';
import VBtn from './VBtn.vue';
import useUser from '../stores/user';
import { notifyNeg } from '../scripts/notify';
import { makeDir, makeFile } from '../scripts/fs';
import { serializeUserSettings } from '../stores';
import { UserInfo } from '../scripts/dfx/dfx.did.d';

const profileAvatarType = ref<typeof ICON_TYPES[number]>('Material');
const profileAvatarData = ref('');
const firstname = ref('');
const lastname = ref('');
const userCreationInProgress = ref(false);
const userStore = useUser();
const { isNewUser, root } = storeToRefs(userStore);
const itemsLoaded = ref(0);
let totalItemsToBeLoaded = 1;

const options = computed((): string[] => ICON_TYPES.concat());
const getAvatar = computed(() => ({
    type: profileAvatarData.value.length === 0 ? 'Material' : profileAvatarType.value,
    data: profileAvatarData.value.length === 0 ? 'account_circle' : profileAvatarData.value,
}));
const getLoadingPercentate = computed(() => (itemsLoaded.value / totalItemsToBeLoaded));

const constructDefaultFileSystem = () => {
    makeDir({ name: 'user' }, root.value);
    makeDir({ name: 'desktop' }, root.value);
    makeDir({ name: 'test' }, '/desktop', { root: root.value });

    const text = makeFile({
        name: 'test.txt',
        useNameToGetExt: true,
    }, root.value);

    const music = makeFile({
        name: 'Lofi Study',
        ext: 'mp3',
    }, root.value);

    const img = makeFile({
        name: 'Screenshot',
        ext: 'png',
    }, root.value);

    const video = makeFile({
        name: 'Crab Rave',
        ext: 'mp4',
    }, root.value);

    return [
        {
            uid: text._uid,
            name: text.name,
            payload: 'This is an awesome TEXT EDITOR!',
        },
        {
            uid: music._uid,
            name: music.name,
            payload: {
                data: './music/lofi-study.mp3',
                type: 'audio/mp3',
            },
        },
        {
            uid: img._uid,
            name: img.name,
            payload: {
                data: './img/Screenshot.png',
                type: 'image/png',
            },
        },
        {
            uid: video._uid,
            name: video.name,
            payload: {
                data: 'https://www.youtube.com/watch?v=LDU_Txk06tM',
                type: 'video/mp4',
            },
        },
    ];
};

const createNewUser = async () => {
    if (firstname.value.length === 0) {
        notifyNeg('Field["firstname"] cannot be empty!');
        return;
    }
    if (lastname.value.length === 0) {
        notifyNeg('Field["lastname"] cannot be empty!');
        return;
    }
    itemsLoaded.value = 0;
    try {
        userCreationInProgress.value = true;
        const avatar = getAvatar.value;
        const settings = serializeUserSettings();
        const assets = constructDefaultFileSystem();
        const user: UserInfo = {
            avatar: [JSON.stringify(avatar)],
            firstname: firstname.value,
            lastname: lastname.value,
        };
        await userStore.createNewUser(user, root.value, settings, assets, (args) => {
            const { type } = args;
            if (type === 'itemEstimation') totalItemsToBeLoaded = args.items;
            else itemsLoaded.value += 1;
        });
    } catch (e) {
        notifyNeg(e);
    }

    userCreationInProgress.value = false;
};

</script>

<style lang="scss" scoped>
</style>

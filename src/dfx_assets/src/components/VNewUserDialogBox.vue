<script lang="ts">
export default {
    name: 'VNewUserDialogBox',
};
</script>

<template>
    <q-dialog :model-value="isNewUser" persistent>
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
                <v-btn flat border label="Submit" style="width:100%; height: 4rem;" :loading="userCreationInProgress"
                    class="bg-green text-white" @click="createNewUser" :percentage="getLoadingPercentate" no-caps>
                    <template #loading>
                        <div class="fit progress-bar">
                            <q-circular-progress show-value font-size="12px" :value="getLoadingPercentate" size="50px"
                                :thickness="0.22" color="teal" track-color="grey-3">
                                {{ Math.floor(getLoadingPercentate) }}%
                            </q-circular-progress>
                            <div class="ellipsis text-caption">{{ currentProcessingElement }}</div>
                        </div>
                    </template>
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
import {
    IDirectory, makeDir, makeFile, makeRoot,
} from '../scripts/fs';
import { serializeUserSettings } from '../stores';
import { UserInfo } from '../scripts/dfx/dfx.did.d';
import { AcceptableType } from '../scripts/canisterHelper';
import { images, videos, mediaJSON } from '../scripts/dummy_data/videos_images';

const profileAvatarType = ref<typeof ICON_TYPES[number]>('Material');
const profileAvatarData = ref('');
const firstname = ref('');
const lastname = ref('');
const userCreationInProgress = ref(false);
const userStore = useUser();
const { isNewUser, root: mainRoot } = storeToRefs(userStore);
const itemsLoaded = ref(0);
let totalItemsToBeLoaded = 1;
const currentProcessingElement = ref('Initializing...');

const options = computed((): string[] => ICON_TYPES.concat());
const getAvatar = computed(() => ({
    type: profileAvatarData.value.length === 0 ? 'Material' : profileAvatarType.value,
    data: profileAvatarData.value.length === 0 ? 'account_circle' : profileAvatarData.value,
}));
const getLoadingPercentate = computed(() => (itemsLoaded.value / totalItemsToBeLoaded) * 100);

const constructDefaultFileSystem = (root: IDirectory) => {
    makeDir({ name: 'user' }, root);
    makeDir({ name: 'test' }, '/desktop', { root });
    const videosDir = makeDir({ name: 'videos' }, root);
    const imagesDir = makeDir({ name: 'images' }, root);

    const text = makeFile({
        name: 'test.txt',
        useNameToGetExt: true,
    }, root);

    const music = makeFile({
        name: 'Lofi Study',
        ext: 'mp3',
    }, root);

    const img = makeFile({
        name: 'Screenshot',
        ext: 'png',
    }, root);

    const json = makeFile({
        name: 'media.json',
        useNameToGetExt: true,
    }, root);

    const assets = [
        {
            uid: json._uid,
            name: json.name,
            payload: mediaJSON,
        },
        {
            uid: text._uid,
            name: text.name,
            payload: 'This is an awesome TEXT EDITOR!',
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
            uid: music._uid,
            name: music.name,
            payload: {
                data: './music/lofi-study.mp3',
                type: 'audio/mp3',
            },
        },
    ] as { uid: string, name: string, payload: AcceptableType }[];

    images().forEach((v) => {
        const temp = makeFile({
            name: v.name,
            useNameToGetExt: true,
        }, imagesDir);
        assets.push({
            uid: temp._uid,
            name: temp.name,
            payload: v.payload,
        });
    });
    videos().forEach((v) => {
        const temp = makeFile({
            name: v.name,
            useNameToGetExt: true,
        }, videosDir);
        assets.push({
            uid: temp._uid,
            name: temp.name,
            payload: v.payload,
        });
    });

    return assets;
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
        const tempRoot = makeRoot();
        const avatar = getAvatar.value;
        const settings = serializeUserSettings();
        const assets = constructDefaultFileSystem(tempRoot);
        const user: UserInfo = {
            avatar: [JSON.stringify(avatar)],
            firstname: firstname.value,
            lastname: lastname.value,
        };
        await userStore.createNewUser(user, tempRoot, settings, assets, (args) => {
            const { type } = args;
            if (type === 'itemEstimation') totalItemsToBeLoaded = args.items;
            else {
                itemsLoaded.value += 1;
                currentProcessingElement.value = args.item.name || args.item.uid;
            }
        });
        mainRoot.value = tempRoot;
    } catch (e) {
        notifyNeg(e);
    }

    userCreationInProgress.value = false;
};

</script>

<style lang="scss" scoped>
.progress-bar {
    display: grid;
    grid-template-columns: 4rem calc(100% - 4rem);
    align-items: center;
    padding: 0 1rem 0 1rem;
}
</style>

<template>
    <div class="fit bg-blue-grey-8 container q-pa-sm">
        <v-icon font-size="90%" :icon="{ type: profileAvatarType, data: profileAvatarData }" size="6rem"
            class="text-white" fallback-icon="account_circle"></v-icon>
        <div style="margin-top: 1rem; gap: 0.5rem" class="column">
            <q-input class="bg-blue-grey-10" readonly :model-value="uid" label="UID" outlined color="white" dark>
            </q-input>
            <q-input class="bg-blue-grey-10" v-model="firstName" label="Firstname" outlined color="white" dark>
            </q-input>
            <q-input class="bg-blue-grey-10" v-model="lastName" label="Lastname" outlined color="white" dark>
            </q-input>
            <div class="row" style="gap:0.5rem">
                <q-select class="bg-blue-grey-10" dark color="white" outlined v-model="profileAvatarType"
                    :options="options" label="Type" />
                <q-input class="bg-blue-grey-10 col-grow" v-model="profileAvatarData" label="Avatar" outlined
                    color="white" dark>
                </q-input>
            </div>
        </div>
        <v-btn flat border :disable="!needsSave" label="Save" class="bg-green text-white absolute"
            style="bottom: 4%; right: 2%" @click="save">
        </v-btn>
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import { mapState } from 'pinia';
import baseWindowComp from '../scripts/baseWindowComp';
import VBtn from '../components/VBtn.vue';
import VIcon from '../components/VIcon.vue';
import useUser from '../stores/user';
import { ICON_TYPES } from '../scripts/types';

export default defineComponent({
    name: 'AppProfile',
    extends: baseWindowComp,
    components: {
        VBtn,
        VIcon,
    },
    setup() {
        const store = useUser();
        const profileAvatarData = ref(store.profileAvatar?.data || 'account_circle');
        const profileAvatarType = ref<typeof ICON_TYPES[number]>(store.profileAvatar?.type || 'Material');
        const firstName = ref(store.firstName);
        const lastName = ref(store.lastName);
        return {
            ICON_TYPES,
            profileAvatarData,
            profileAvatarType,
            firstName,
            lastName,
        };
    },
    computed: {
        ...mapState(useUser, ['uid']),
        options(): string[] {
            return ICON_TYPES.concat();
        },
        needsSave(): boolean {
            const { firstName, lastName, profileAvatar } = useUser();
            return this.firstName !== firstName
                || this.lastName !== lastName
                || profileAvatar?.type !== this.profileAvatarType
                || profileAvatar?.data !== this.profileAvatarData;
        },
    },
    methods: {
        async wBeforeLoaded(): Promise<void> {
            this.closeDialogBox();
            await this.show();
        },
        save(): void {
            useUser().$patch({
                firstName: this.firstName,
                lastName: this.lastName,
                profileAvatar: {
                    type: this.profileAvatarType,
                    data: this.profileAvatarData,
                },
            });
            this.openDialogBox('info', 'Saved successfully', {
                green: {
                    label: 'OK',
                    callback: () => this.closeDialogBox(),
                },
            });
        },
    },
});
</script>

<style lang="scss" scoped>
</style>

<script lang="ts">
export default {
    name: 'TheTaskBarStartMenuRightSide',
};
</script>
<template>
    <q-list dense style="min-width: 100px">
        <q-item clickable v-close-popup @click="handleClick('Profile')">
            <v-menu-item label="Profile" icon="manage_accounts"> </v-menu-item>
        </q-item>

        <q-separator />

        <q-item clickable>
            <v-menu-item label="Applications" icon="apps"> </v-menu-item>
            <q-item-section side>
                <q-icon name="keyboard_arrow_right" />
            </q-item-section>

            <q-menu anchor="top end" self="top start">
                <q-list>
                    <q-item v-for="app in apps" :key="app.component" dense clickable v-close-popup
                        @click="handleClick('Applications', app)">
                        <v-menu-item :label="app.name" :icon="compIcon(app.component)"></v-menu-item>
                    </q-item>
                </q-list>
            </q-menu>
        </q-item>
        <q-separator />
    </q-list>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { isDef } from '../../scripts/utils';
import useIcons from '../../stores/icons';
import useWindowManager from '../../stores/windowManager';
import { ComponentType, getAllApps } from '../../windowApp';
import VMenuItem from '../VMenuItem.vue';
// import useTheme, { ComponentsType } from '../../stores/theme';

const apps = getAllApps();
const { compIcon } = storeToRefs(useIcons());

const handleClick = (label: string, app?: typeof apps[0]) => {
    const windowManagerStore = useWindowManager();
    switch (label) {
        case 'Profile': {
            windowManagerStore
                .makeWindow({
                    name: 'Profile Setting',
                    componentName: 'AppProfile',
                    icon: {
                        type: 'Material',
                        data: 'manage_accounts',
                    },
                });
            break;
        }
        case 'Applications': {
            if (!isDef(app)) return;
            windowManagerStore
                .makeWindow({
                    name: app.name,
                    componentName: app.component,
                    props: {
                        isSelf: true,
                    },
                });
            break;
        }
        default: break;
    }
};

</script>

<style lang="scss" scoped>
</style>

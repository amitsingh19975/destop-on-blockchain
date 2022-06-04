<template>
    <q-list dense style="min-width: 100px">
        <q-item clickable v-close-popup>
            <v-menu-item label="Profile" icon="manage_accounts"> </v-menu-item>
        </q-item>

        <q-item clickable v-close-popup>
            <v-menu-item label="New" icon="add"> </v-menu-item>
        </q-item>

        <q-separator />

        <q-item clickable>
            <v-menu-item label="Preferences" icon="settings"> </v-menu-item>
            <q-item-section side>
                <q-icon name="keyboard_arrow_right" />
            </q-item-section>

            <q-menu anchor="top end" self="top start">
                <q-list>
                    <q-item v-for="n in 3" :key="n" dense clickable>
                        <q-item-section>Submenu Label</q-item-section>
                        <q-item-section side>
                            <q-icon name="keyboard_arrow_right" />
                        </q-item-section>
                        <q-menu auto-close anchor="top end" self="top start">
                            <q-list>
                                <q-item v-for="n in 3" :key="n" dense clickable>
                                    <q-item-section
                                        >3rd level Label</q-item-section
                                    >
                                </q-item>
                            </q-list>
                        </q-menu>
                    </q-item>
                </q-list>
            </q-menu>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup>
            <v-menu-item label="Quit" icon="cancel_presentation"> </v-menu-item>
        </q-item>
    </q-list>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import VMenuItem from '../VMenuItem.vue';
// import useTheme, { ComponentsType } from '../../stores/theme';

export default defineComponent({
    name: 'TheTaskBarStartMenuRightSide',
    methods: {},
    components: { VMenuItem },
});
</script>

<style lang="scss" scoped></style>

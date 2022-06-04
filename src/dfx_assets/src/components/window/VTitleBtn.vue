<template>
    <q-btn round size="0.4rem" :class="`btn--${props.color}`" :icon="props.icon"></q-btn>
</template>

<script setup lang="ts">

interface IProps {
    icon: string;
    color: 'green' | 'red' | 'yellow';
}

const titleBtn = {
    size: '0.4rem',
};

const props = defineProps<IProps>();

</script>

<script lang="ts">
export default {
    name: 'VDialogBox',
};
</script>

<style scoped lang="scss">
@mixin transition {
    transition-property: border, background-color;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
}

.btn {
    &--red {
        background-color: $red-4;
        border: 1px solid $red-8;
        color: darken($color: $red-8, $amount: 15);
        @include transition;

        &:hover {
            background-color: $red-3;
            border: 1px solid $red-4;
        }
    }

    &--yellow {
        background-color: $yellow-6;
        border: 1px solid $yellow-8;
        color: darken($color: $yellow-8, $amount: 15);
        @include transition;

        &:hover {
            background-color: $yellow-3;
            border: 1px solid $yellow-4;
        }
    }

    &--green {
        background-color: $green-4;
        border: 1px solid $green-8;
        color: darken($color: $green-8, $amount: 15);
        @include transition;

        &:hover {
            background-color: $green-3;
            border: 1px solid $green-4;
        }
    }
}
</style>

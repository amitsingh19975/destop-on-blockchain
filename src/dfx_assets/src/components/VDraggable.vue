<template>
    <div class="absolute" @mousedown="dragMouseDown">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import {
    defineComponent, PropType, reactive,
} from 'vue';
import { dom } from 'quasar';
import { HTMLElementFromVueRef } from '../scripts/utils';
import { IPosition } from '../scripts/types';

const { offset } = dom;

const between = (val: number, left: number, right: number): boolean => left <= val && right >= val;

export default defineComponent({
    name: 'VDraggable',
    components: {},
    props: {
        min: {
            type: Object as PropType<{ x: number; y: number }>,
            required: false,
            default: () => ({ x: 0, y: 0 }),
        },
        max: {
            type: Object as PropType<{ x: number; y: number }>,
            required: false,
            default: () => ({
                x: Number.MAX_SAFE_INTEGER,
                y: Number.MAX_SAFE_INTEGER,
            }),
        },
    },
    emits: [
        'update:position',
        'before:drag',
        'after:drag',
        'dragging',
    ],
    setup() {
        return {
            positions: reactive({
                x: 0,
                y: 0,
                movementX: 0,
                movementY: 0,
            }),
            lastPosition: {
                x: 0, y: 0,
            } as IPosition,
            updated: false,
        };
    },
    computed: {
    },
    methods: {
        dragMouseDown(event: MouseEvent) {
            event.preventDefault();
            const { clientX, clientY } = event;
            this.positions.x = clientX;
            this.positions.y = clientY;
            document.addEventListener('mousemove', this.elementDrag);
            document.addEventListener('mouseup', this.closeDragElement);
        },
        elementDrag(event: MouseEvent) {
            this.$emit('before:drag');
            event.preventDefault();
            this.positions.movementX = this.positions.x - event.clientX;
            this.positions.movementY = this.positions.y - event.clientY;
            this.positions.x = event.clientX;
            this.positions.y = event.clientY;
            const temp = HTMLElementFromVueRef(this.$el);
            if (!temp) return;
            const draggableContainer = Array.isArray(temp) ? temp[0] : temp;
            const top = Math.max(draggableContainer.offsetTop - this.positions.movementY, 0);
            const left = Math.max(draggableContainer.offsetLeft - this.positions.movementX, 0);
            const topValid = between(top, this.min.y, this.max.y);
            const leftValid = between(left, this.min.x, this.max.x);
            let prev = {
                top: 0,
                left: 0,
            };

            if (this.$el instanceof HTMLElement) {
                const { top: pTop, left: pLeft } = offset(this.$el);
                prev = {
                    left: pLeft,
                    top: pTop,
                };
            }
            if (topValid && leftValid) {
                draggableContainer.style.top = `${top}px`;
                draggableContainer.style.left = `${left}px`;
                this.lastPosition = { y: top, x: left };
                this.updated = true;
            } else if (topValid && !leftValid) {
                draggableContainer.style.top = `${top}px`;
                this.lastPosition = { y: top, x: prev.left };
                this.updated = true;
            } else if (!topValid && leftValid) {
                draggableContainer.style.top = `${top}px`;
                this.lastPosition = { y: prev.top, x: left };
                this.updated = true;
            }
        },
        closeDragElement() {
            if (this.updated) this.$emit('update:position', this.lastPosition);
            this.updated = false;
            document.removeEventListener('mousemove', this.elementDrag);
            document.removeEventListener('mouseup', this.closeDragElement);
            this.$emit('after:drag');
        },
    },
    mounted() {
    },
});
</script>

<style lang="scss" scoped>
.draggable-header {
    cursor: grab;
}
</style>

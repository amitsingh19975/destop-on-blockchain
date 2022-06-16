<template>
    <div class="fit bg-blue-grey-8 container">
        <canvas ref="canvasRef"></canvas>
        <v-dialog-box v-bind="dialogBoxProps"></v-dialog-box>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import baseWindowComp from '../scripts/baseWindowComp';
import { isDef } from '../scripts/basic';
import useEvent from '../stores/events';
import useIcons from '../stores/icons';

const DIRECTION = {
    IDLE: 0,
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
} as const;

const rounds = [5, 5, 3, 3, 2];
const colors = ['#1abc9c', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6'];

export default defineComponent({
    name: 'AppPingthis',
    extends: baseWindowComp,
    components: {
    },
    setup() {
        return {
            canvasRef: ref<HTMLCanvasElement | null>(null),
            context: ref<CanvasRenderingContext2D | null>(null),
            player: {} as Record<string, number> | null,
            paddle: {} as Record<string, number> | null,
            ball: {} as Record<string, number> | null,
            turn: {} as Record<string, number> | null,
            running: ref(false),
            over: ref(false),
            timer: ref(0),
            round: ref(0),
            color: '',
            beep: new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='),
        };
    },
    computed: {

    },
    methods: {
        async wBeforeLoaded(): Promise<void> {
            this.closeDialogBox();
            this.initialize();
            useEvent().addEventListener('change:shape', this.pid, () => this.initialize());
            await this.show();
        },
        newBall(incrementedSpeed?: number) {
            if (!isDef(this.canvasRef)) return null;
            return {
                width: 18,
                height: 18,
                x: (this.canvasRef.width / 2) - 9,
                y: (this.canvasRef.height / 2) - 9,
                moveX: DIRECTION.IDLE,
                moveY: DIRECTION.IDLE,
                speed: incrementedSpeed || 9,
            };
        },
        newPaddle(side: string) {
            if (!isDef(this.canvasRef)) return null;
            return {
                width: 18,
                height: 70,
                x: side === 'left' ? 150 : this.canvasRef.width - 150,
                y: (this.canvasRef.height / 2) - 35,
                score: 0,
                move: DIRECTION.IDLE,
                speed: 10,
            };
        },
        endGameMenu(text: string) {
            if (!isDef(this.canvasRef)) return;
            if (!isDef(this.context)) return;
            this.context.font = '50px Courier New';
            this.context.fillStyle = this.color;

            this.context.fillRect(
                this.canvasRef.width / 2 - 350,
                this.canvasRef.height / 2 - 48,
                700,
                100,
            );

            this.context.fillStyle = '#ffffff';

            this.context.fillText(
                text,
                this.canvasRef.width / 2,
                this.canvasRef.height / 2 + 15,
            );

            setTimeout(() => {
                this.initialize();
            }, 3000);
        },
        initialize() {
            if (!isDef(this.canvasRef)) return;
            this.context = this.canvasRef.getContext('2d');

            if (!isDef(this.context)) return;

            this.canvasRef.width = this.windowShape.width * 2;
            this.canvasRef.height = this.windowShape.height * 2 - 100;

            this.canvasRef.style.width = `${this.canvasRef.width / 2}px`;
            this.canvasRef.style.height = `${this.canvasRef.height / 2}px`;

            this.player = this.newPaddle('left');
            this.paddle = this.newPaddle('right');
            this.ball = this.newBall();

            if (isDef(this.paddle)) this.paddle.speed = 8;
            this.running = false;
            this.over = false;
            this.turn = this.paddle;
            this.timer = 0;
            this.round = 0;
            this.color = '#2c3e50';

            this.menu();
            this.listen();
        },

        menu() {
            if (!isDef(this.canvasRef)) return;
            if (!isDef(this.context)) return;
            this.draw();

            this.context.font = '50px Courier New';
            this.context.fillStyle = this.color;

            this.context.fillRect(
                this.canvasRef.width / 2 - 350,
                this.canvasRef.height / 2 - 48,
                700,
                100,
            );

            this.context.fillStyle = '#ffffff';

            this.context.fillText(
                'Press any key to begin',
                this.canvasRef.width / 2,
                this.canvasRef.height / 2 + 15,
            );
        },
        update() {
            if (!isDef(this.canvasRef)) return;
            if (!isDef(this.context)) return;
            if (!isDef(this.ball)) return;
            if (!isDef(this.player)) return;
            if (!isDef(this.paddle)) return;
            if (!this.over) {
                if (this.ball.x <= 0) this._resetTurn.call(this, this.paddle, this.player);
                if (this.ball.x >= this.canvasRef.width - this.ball.width) this._resetTurn.call(this, this.player, this.paddle);
                if (this.ball.y <= 0) this.ball.moveY = DIRECTION.DOWN;
                if (this.ball.y >= this.canvasRef.height - this.ball.height) this.ball.moveY = DIRECTION.UP;

                if (this.player.move === DIRECTION.UP) this.player.y -= this.player.speed;
                else if (this.player.move === DIRECTION.DOWN) this.player.y += this.player.speed;

                if (this._turnDelayIsOver.call(this) && this.turn) {
                    this.ball.moveX = this.turn === this.player ? DIRECTION.LEFT : DIRECTION.RIGHT;
                    this.ball.moveY = [DIRECTION.UP, DIRECTION.DOWN][Math.round(Math.random())];
                    this.ball.y = Math.floor(Math.random() * this.canvasRef.height - 200) + 200;
                    this.turn = null;
                }

                if (this.player.y <= 0) this.player.y = 0;
                else if (this.player.y >= (this.canvasRef.height - this.player.height)) this.player.y = (this.canvasRef.height - this.player.height);

                if (this.ball.moveY === DIRECTION.UP) this.ball.y -= (this.ball.speed / 1.5);
                else if (this.ball.moveY === DIRECTION.DOWN) this.ball.y += (this.ball.speed / 1.5);
                if (this.ball.moveX === DIRECTION.LEFT) this.ball.x -= this.ball.speed;
                else if (this.ball.moveX === DIRECTION.RIGHT) this.ball.x += this.ball.speed;

                if (this.paddle.y > this.ball.y - (this.paddle.height / 2)) {
                    if (this.ball.moveX === DIRECTION.RIGHT) this.paddle.y -= this.paddle.speed / 1.5;
                    else this.paddle.y -= this.paddle.speed / 4;
                }
                if (this.paddle.y < this.ball.y - (this.paddle.height / 2)) {
                    if (this.ball.moveX === DIRECTION.RIGHT) this.paddle.y += this.paddle.speed / 1.5;
                    else this.paddle.y += this.paddle.speed / 4;
                }

                if (this.paddle.y >= this.canvasRef.height - this.paddle.height) this.paddle.y = this.canvasRef.height - this.paddle.height;
                else if (this.paddle.y <= 0) this.paddle.y = 0;

                if (this.ball.x - this.ball.width <= this.player.x && this.ball.x >= this.player.x - this.player.width) {
                    if (this.ball.y <= this.player.y + this.player.height && this.ball.y + this.ball.height >= this.player.y) {
                        this.ball.x = (this.player.x + this.ball.width);
                        this.ball.moveX = DIRECTION.RIGHT;

                        this.beep.play();
                    }
                }

                if (this.ball.x - this.ball.width <= this.paddle.x && this.ball.x >= this.paddle.x - this.paddle.width) {
                    if (this.ball.y <= this.paddle.y + this.paddle.height && this.ball.y + this.ball.height >= this.paddle.y) {
                        this.ball.x = (this.paddle.x - this.ball.width);
                        this.ball.moveX = DIRECTION.LEFT;

                        this.beep.play();
                    }
                }
            }

            if (this.player.score === rounds[this.round]) {
                if (!rounds[this.round + 1]) {
                    this.over = true;
                    setTimeout(() => { this.endGameMenu('Winner!'); }, 1000);
                } else {
                    this.color = this._generateRoundColor();
                    this.player.score = 0;
                    this.paddle.score = 0;
                    this.player.speed += 0.5;
                    this.paddle.speed += 1;
                    this.ball.speed += 1;
                    this.round += 1;

                    this.beep.play();
                }
            } else if (this.paddle.score === rounds[this.round]) {
                this.over = true;
                setTimeout(() => { this.endGameMenu('Game Over!'); }, 1000);
            }
        },
        draw() {
            if (!isDef(this.canvasRef)) return;
            if (!isDef(this.context)) return;
            if (!isDef(this.player)) return;
            if (!isDef(this.paddle)) return;
            if (!isDef(this.ball)) return;

            this.context.clearRect(
                0,
                0,
                this.canvasRef.width,
                this.canvasRef.height,
            );

            this.context.fillStyle = this.color;

            this.context.fillRect(
                0,
                0,
                this.canvasRef.width,
                this.canvasRef.height,
            );

            this.context.fillStyle = '#ffffff';

            this.context.fillRect(
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height,
            );

            this.context.fillRect(
                this.paddle.x,
                this.paddle.y,
                this.paddle.width,
                this.paddle.height,
            );

            if (this._turnDelayIsOver.call(this)) {
                this.context.fillRect(
                    this.ball.x,
                    this.ball.y,
                    this.ball.width,
                    this.ball.height,
                );
            }

            this.context.beginPath();
            this.context.setLineDash([7, 15]);
            this.context.moveTo((this.canvasRef.width / 2), this.canvasRef.height - 100);
            this.context.lineTo((this.canvasRef.width / 2), 140);
            this.context.lineWidth = 10;
            this.context.strokeStyle = '#ffffff';
            this.context.stroke();

            this.context.font = '100px Courier New';
            this.context.textAlign = 'center';

            this.context.fillText(
                this.player.score.toString(),
                (this.canvasRef.width / 2) - 300,
                200,
            );

            this.context.fillText(
                this.paddle.score.toString(),
                (this.canvasRef.width / 2) + 300,
                200,
            );

            this.context.font = '30px Courier New';

            this.context.fillText(
                `Round ${this.round + 1}`,
                (this.canvasRef.width / 2),
                35,
            );

            this.context.font = '40px Courier';

            this.context.fillText(
                `${rounds[this.round] ? rounds[this.round] : rounds[this.round - 1]}`,
                (this.canvasRef.width / 2),
                100,
            );
        },
        loop() {
            this.update();
            this.draw();

            if (!this.over) requestAnimationFrame(this.loop);
        },

        listen() {
            document.addEventListener('keydown', (key) => {
                if (!isDef(this.player)) return;

                if (this.running === false) {
                    this.running = true;
                    window.requestAnimationFrame(this.loop);
                }

                // TODO: update
                if (key.keyCode === 38 || key.keyCode === 87) this.player.move = DIRECTION.UP;

                if (key.keyCode === 40 || key.keyCode === 83) this.player.move = DIRECTION.DOWN;
            });

            document.addEventListener('keyup', () => {
                if (!isDef(this.player)) return;
                this.player.move = DIRECTION.IDLE;
            });
        },

        _resetTurn(victor: Record<string, number> | null, loser: Record<string, number> | null) {
            if (!isDef(this.ball)) return;
            this.ball = this.newBall(this.ball.speed);
            this.turn = loser;
            this.timer = (new Date()).getTime();

            if (isDef(victor)) victor.score += 1;
            this.beep.play();
        },

        _turnDelayIsOver() {
            return ((new Date()).getTime() - this.timer >= 1000);
        },

        _generateRoundColor(): string {
            const newColor = colors[Math.floor(Math.random() * colors.length)];
            if (newColor === this.color) return this._generateRoundColor();
            return newColor;
        },
    },
    registerIcon(): void {
        useIcons().registerComponentIcon('AppPingPong', {
            type: 'Material',
            data: 'sports_cricket',
        });
    },
});
</script>

<style lang="scss" scoped>
</style>

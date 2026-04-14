/**
 * @file player.js
 * The player-controlled car.
 */

class Player {
    x = 0;
    y = 0;
    z = 0;

    sprite        = new AnimatedSprite();
    spriteCardobla = new AnimatedSprite();

    isCardobla   = false;
    isMovingLeft = false;

    get currentSprite() {
        return this.isCardobla ? this.spriteCardobla : this.sprite;
    }

    get width()  { return this.currentSprite.width;  }
    get height() { return this.currentSprite.height; }

    /** Called every frame to read input and update position. */
    update() {
        const left  = keyboard.isKeyDown("arrowleft");
        const right = keyboard.isKeyDown("arrowright");

        this.isCardobla   = left || right;
        this.isMovingLeft = left;

        if (left)       this.x -= CONFIG.PLAYER.LATERAL_SPEED;
        else if (right) this.x += CONFIG.PLAYER.LATERAL_SPEED;
    }

    /**
     * Draw the player car at the bottom-centre of the screen.
     * @param {Render} render
     * @param {Camera} camera
     * @param {number} roadWidth
     */
    render(render, camera, roadWidth) {
        const mid   = camera.screen.midpoint;
        const scale = 1 / camera.h;
        const destX = mid.x;
        const destY = camera.screen.height;
        const ctx   = render.renderingContext;

        if (this.isMovingLeft) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-destX * 2, 0);
        }

        render.drawSprite(this.currentSprite, camera, this, null, roadWidth, scale, destX, destY, 0);

        if (this.isMovingLeft) ctx.restore();
    }
}

/**
 * @file player.js
 * The player-controlled car.
 * Accepts keyboard AND gamepad input for lateral movement.
 * In curves, the car drifts outward if the player doesn't steer to compensate.
 */

class Player {
    x = 0;
    y = 0;
    z = 0;

    sprite         = new AnimatedSprite();
    spriteCardobla = new AnimatedSprite();

    isCardobla   = false;
    isMovingLeft = false;

    /**
     * Current curve value — set each frame by GameplayScene
     * from the active road segment.
     * Positive = right curve, negative = left curve.
     * @type {number}
     */
    currentCurve = 0;

    /**
     * How strongly the curve pushes the car off-lane.
     * Tune this to make curves feel harder or easier.
     * OutRun feel: 0.00012 – 0.00020
     */
    static DRIFT_FACTOR = 0.00015 - 0.00020;

    get currentSprite() {
        return this.isCardobla ? this.spriteCardobla : this.sprite;
    }

    get width()  { return this.currentSprite.width;  }
    get height() { return this.currentSprite.height; }

    /**
     * Called every frame to read input, apply drift and update position.
     * @param {number} speed  current speed 0-255 (from GameState)
     */
    update(speed = 0) {
        const gp    = phaserLayer.gamepad;
        const axisX = gp.axes().lx;

        const left  = keyboard.isKeyDown("arrowleft")
                   || gp.isDown(GamepadButtons.LEFT)
                   || axisX < -0.3;

        const right = keyboard.isKeyDown("arrowright")
                   || gp.isDown(GamepadButtons.RIGHT)
                   || axisX > 0.3;

        this.isCardobla   = left || right;
        this.isMovingLeft = left;

        // ── Lateral steering ───────────────────────────────────
        const lateralSpeed = Math.abs(axisX) > 0.3
            ? CONFIG.PLAYER.LATERAL_SPEED * Math.abs(axisX)
            : CONFIG.PLAYER.LATERAL_SPEED;

        if (left)       this.x -= lateralSpeed;
        else if (right) this.x += lateralSpeed;

        // ── Curve drift ────────────────────────────────────────
        // The faster you go and the sharper the curve,
        // the more the car drifts outward (same sign as curve).
        const drift = this.currentCurve * speed * Player.DRIFT_FACTOR;
        this.x += drift;
    }

    /**
     * Draw the player car at the bottom-centre of the screen.
     * @param {Render} render
     * @param {Camera} camera
     * @param {number} roadWidth
     */
   render(render, camera, roadWidth) {
    const mid    = camera.screen.midpoint;
    const scale  = 1 / camera.h;
    const destX  = mid.x;
    const destY  = camera.screen.height;
    const ctx    = render.renderingContext;
    const sprite = this.currentSprite;

    if (this.isCardobla && this.isMovingLeft) {
        const FACTOR = 1 / 3;
        const sw    = sprite.width  || 64;
        const sh    = sprite.height || 64;
        const destW = (sw * scale * mid.x) * (roadWidth * sprite.scaleX / (sw || 64)) * FACTOR;
        const cx    = Math.round(destX - destW * 0.5) + destW * 0.5;

        ctx.save();
        ctx.translate(cx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-cx, 0);
        render.drawSprite(sprite, camera, this, null, roadWidth, scale, destX, destY, 0);
        ctx.restore();
    } else {
        render.drawSprite(sprite, camera, this, null, roadWidth, scale, destX, destY, 0);
    }
}
}
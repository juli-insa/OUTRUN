/**
 * @file player.js
 * El auto del jugador.
 * stun() recibe deltaMs desde la escena directamente — sin depender
 * de timeObject que puede dar valores incorrectos el primer frame.
 */

class Player {
    x = 0;
    y = 0;
    z = 0;

    sprite         = new AnimatedSprite();
    spriteCardobla = new AnimatedSprite();

    isCardobla   = false;
    isMovingLeft = false;

    currentCurve = 0;

    // ── Stun ──────────────────────────────────────────────────
    static STUN_DURATION  = 2000;  // ms
    static BLINK_INTERVAL = 120;   // ms

    #stunTimer  = 0;
    #blinkTimer = 0;
    #blinkOn    = true;
    #resetPositionAfterStun = false;

    get isStunned() { return this.#stunTimer > 0; }

    stun() {
        this.#stunTimer  = Player.STUN_DURATION;
        this.#blinkTimer = 0;
        this.#blinkOn    = false;   // empieza invisible para feedback inmediato
        this.#resetPositionAfterStun = false;  // reset la bandera cuando comienza nuevo stun
    }

    static DRIFT_FACTOR = 0.00015 - 0.00020;

    get currentSprite() {
        return this.isCardobla ? this.spriteCardobla : this.sprite;
    }

    get width()  { return this.currentSprite.width;  }
    get height() { return this.currentSprite.height; }

    /**
     * @param {number} speed    velocidad 0-255
     * @param {number} deltaMs  ms del frame actual — pasado desde la escena
     */
    update(speed = 0, deltaMs = 16) {
        // ── Tick del stun ──────────────────────────────────────
        if (this.#stunTimer > 0) {
            this.#stunTimer  -= deltaMs;
            this.#blinkTimer += deltaMs;
            if (this.#blinkTimer >= Player.BLINK_INTERVAL) {
                this.#blinkTimer -= Player.BLINK_INTERVAL;
                this.#blinkOn     = !this.#blinkOn;
            }
            this.isCardobla   = false;
            this.isMovingLeft = false;
            return;
        }

        // El stun terminó — reubica el auto al centro SOLO UNA VEZ
        if (!this.#resetPositionAfterStun) {
            this.x = 0;
            this.#resetPositionAfterStun = true;
        }
        
        this.#blinkOn = true;

        // ── Input ─────────────────────────────────────────────
        const gp    = phaserLayer.gamepad;
        const axisX = gp.axes().lx?.value ?? gp.axes().lx ?? 0;

        const left  = keyboard.isKeyDown("arrowleft")
                   || gp.isDown(GamepadButtons.LEFT)
                   || axisX < -0.3;

        const right = keyboard.isKeyDown("arrowright")
                   || gp.isDown(GamepadButtons.RIGHT)
                   || axisX > 0.3;

        this.isCardobla   = left || right;
        this.isMovingLeft = left;

        const lateralSpeed = Math.abs(axisX) > 0.3
            ? CONFIG.PLAYER.LATERAL_SPEED * Math.abs(axisX)
            : CONFIG.PLAYER.LATERAL_SPEED;

        if (left)       this.x -= lateralSpeed;
        else if (right) this.x += lateralSpeed;

        this.x += this.currentCurve * speed * Player.DRIFT_FACTOR;
    }

    render(render, camera, roadWidth) {
        if (!this.#blinkOn) return;

        const mid    = camera.screen.midpoint;
        const scale  = 1 / camera.h;
        const destX  = mid.x;
        const destY  = camera.screen.height;
        const ctx    = render.renderingContext;
        const sprite = this.currentSprite;

        if (this.isCardobla && this.isMovingLeft) {
            const FACTOR = 1 / 3;
            const sw    = sprite.width  || 64;
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

/**
 * @file scene-intro.js
 * INTRO scene — road scrolls, car slides in, press ENTER or gamepad START.
 * Uses phaserLayer for intro music and tween-based blink.
 */

class IntroScene {
    /** @type {SceneManager} */ #mgr;

    #carY        = 0;
    #carTargetY  = 0;
    #carAnimDone = false;

    #blinkTimer   = 0;
    #blinkVisible = true;
    #BLINK_RATE   = 500;
    #SCROLL_SPEED = 0.3;

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const H = CANVAS.height;
        this.#carY        = H + 100;
        this.#carTargetY  = H * 1;
        this.#carAnimDone = false;
        this.#blinkTimer  = 0;
        this.#blinkVisible = true;

        const road   = this.#mgr.road;
        const camera = this.#mgr.camera;
        camera.cursor       = road.segmentLength * 60;
        camera.acceleration = 0;

        // ── Audio ──────────────────────────────────────────────
        phaserLayer.audio.playMusic("music-intro");

        // ── Keyboard / gamepad listener ────────────────────────
        this._onKey = (e) => {
            if ((e.key === "Enter" || e.key === " ") && this.#carAnimDone) {
                this._startGame();
            }
        };
        window.addEventListener("keydown", this._onKey);
    }

    exit() {
        window.removeEventListener("keydown", this._onKey);
        phaserLayer.audio.stopMusic();
        phaserLayer.particles.stopRain();
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road } = this.#mgr;
        const W = CANVAS.width;
        const H = CANVAS.height;
        const ctx = render.renderingContext;

        // Gamepad START button also starts the game
        if (this.#carAnimDone && phaserLayer.gamepad.isDown(GamepadButtons.START)) {
            this._startGame();
            return;
        }

        camera.cursor += road.segmentLength * this.#SCROLL_SPEED;
        if (camera.cursor >= road.trackLength) camera.cursor -= road.trackLength;
        camera.y = camera.h;

        render.clear(0, 0, W, H);
        render.save();
        this.#mgr.sky.render(render.renderingContext);
        road.render(render, camera, player);

        // Car slide-in
        if (!this.#carAnimDone) {
            this.#carY += (this.#carTargetY - this.#carY) * 0.07;
            if (Math.abs(this.#carY - this.#carTargetY) < 1) {
                this.#carY        = this.#carTargetY;
                this.#carAnimDone = true;
                phaserLayer.audio.playSFX("sfx-start");
            }
        }
        this.#drawCar(render, camera, road.width);

        // Dark overlay
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H * 0.55);
        ctx.restore();

        // Title
        ctx.save();
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font      = "bold 72px monospace";
        ctx.fillText("OUT RUN", W / 2 + 4, H * 0.18 + 4);

        const grad = ctx.createLinearGradient(0, H * 0.12, 0, H * 0.25);
        grad.addColorStop(0, "#ff4dd3");
        grad.addColorStop(1, "#ff0000");
        ctx.fillStyle = grad;
        ctx.font      = "bold 72px monospace";
        ctx.fillText("OUT RUN", W / 2, H * 0.18);

        ctx.fillStyle = "#ffffff";
        ctx.font      = "20px monospace";
        ctx.fillText("REMAKE by JULIETA INSAURRALDE", W / 2, H * 0.30);
        ctx.restore();

        // Blinking prompt
        if (this.#carAnimDone) {
            this.#blinkTimer += deltaMs;
            if (this.#blinkTimer >= this.#BLINK_RATE) {
                this.#blinkTimer  -= this.#BLINK_RATE;
                this.#blinkVisible = !this.#blinkVisible;
            }
            if (this.#blinkVisible) {
                ctx.save();
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle    = "#ffffff";
                ctx.font         = "bold 22px monospace";
                ctx.fillText("[ ENTER ] para jugar", W / 2, H * 0.42);
                ctx.restore();
            }
        }

        render.restore();
    }

    _startGame() {
        this.#mgr.transitionTo(CONFIG.SCENES.GAMEPLAY);
    }

    #drawCar(render, camera, roadWidth) {
        const player = this.#mgr.player;
        const ctx    = render.renderingContext;
        const scale  = 1 / camera.h;
        const destX  = CANVAS.width / 2;
        const savedY = CANVAS.height;

        ctx.save();
        ctx.translate(0, this.#carY - savedY);
        render.drawSprite(player.sprite, camera, player, null, roadWidth, scale, destX, savedY, 0);
        ctx.restore();
    }
}
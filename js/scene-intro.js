/**
 * @file scene-intro.js
 * INTRO scene:
 *  - Road renders in the background (camera auto-scrolls slowly).
 *  - The player car animates in from the bottom of the screen.
 *  - A title card and "Press ENTER" prompt are drawn on top.
 *  - When the player presses Enter the scene transitions to GAMEPLAY.
 */

class IntroScene {
    /** @type {SceneManager} */ #mgr;

    // Car slide-in animation
    #carY        = 0;   // current Y on canvas (starts below screen)
    #carTargetY  = 0;   // resting position
    #carAnimDone = false;

    // Blinking prompt
    #blinkTimer   = 0;
    #blinkVisible = true;
    #BLINK_RATE   = 500; // ms

    // Slow auto-scroll speed for the background road
    #SCROLL_SPEED = 0.3;

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const h = CANVAS.height;
        this.#carY        = h + 100;          // start below visible area
        this.#carTargetY  = h * 0.72;         // rest near the bottom
        this.#carAnimDone = false;
        this.#blinkTimer  = 0;
        this.#blinkVisible = true;

        // Position camera at a scenic spot
        const road   = this.#mgr.road;
        const camera = this.#mgr.camera;
        camera.cursor       = road.segmentLength * 60;
        camera.acceleration = 0;

        // Listen for Enter
        this._onKey = (e) => {
            if ((e.key === "Enter" || e.key === " ") && this.#carAnimDone) {
                this.#mgr.transitionTo(CONFIG.SCENES.GAMEPLAY);
            }
        };
        window.addEventListener("keydown", this._onKey);
    }

    exit() {
        window.removeEventListener("keydown", this._onKey);
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road } = this.#mgr;
        const W = CANVAS.width;
        const H = CANVAS.height;
        const ctx = render.renderingContext;

        // ── Slowly scroll the background road ──────────────────
        camera.cursor += road.segmentLength * this.#SCROLL_SPEED;
        if (camera.cursor >= road.trackLength) camera.cursor -= road.trackLength;
        camera.y = camera.h;

        render.clear(0, 0, W, H);
        render.save();
        road.render(render, camera, player);

        // ── Animate car sliding up from bottom ─────────────────
        if (!this.#carAnimDone) {
            this.#carY += (this.#carTargetY - this.#carY) * 0.07;
            if (Math.abs(this.#carY - this.#carTargetY) < 1) {
                this.#carY        = this.#carTargetY;
                this.#carAnimDone = true;
            }
        }
        this.#drawCar(render, camera, road.width);

        // ── Dark overlay for readability ───────────────────────
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H * 0.55);
        ctx.restore();

        // ── Title ──────────────────────────────────────────────
        ctx.save();
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font      = "bold 72px monospace";
        ctx.fillText("START", W / 2 + 4, H * 0.18 + 4);

        // Main text with gradient
        const grad = ctx.createLinearGradient(0, H * 0.12, 0, H * 0.25);
        grad.addColorStop(0, "#ff4dd3");
        grad.addColorStop(1, "#ff0000");
        ctx.fillStyle = grad;
        ctx.font      = "bold 72px monospace";
        ctx.fillText("START", W / 2, H * 0.18);

        // Subtitle
        ctx.fillStyle = "#ffffff";
        ctx.font      = "20px monospace";
        ctx.fillText("OUT RUN X AKIRA", W / 2, H * 0.30);

        ctx.restore();

        // ── Blinking "Press ENTER" ─────────────────────────────
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

    /** Draw the player sprite at the animated Y position (centred). */
    #drawCar(render, camera, roadWidth) {
        const player  = this.#mgr.player;
        const ctx     = render.renderingContext;
        const scale   = 1 / camera.h;
        const destX   = CANVAS.width / 2;
        const savedY  = CANVAS.height; // render.drawSprite uses canvas height as destY

        // We temporarily override the canvas height illusion by
        // translating the context so the sprite lands at #carY
        ctx.save();
        ctx.translate(0, this.#carY - savedY);
        render.drawSprite(player.sprite, camera, player, null, roadWidth, scale, destX, savedY, 0);
        ctx.restore();
    }
}

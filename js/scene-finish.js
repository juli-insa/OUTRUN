/**
 * @file scene-finish.js
 * FINISH scene — Phaser particles + audio + tween result card.
 * The confetti rain now comes from phaserLayer.particles (Phaser)
 * instead of the manual Canvas implementation.
 */

class FinishScene {
    /** @type {SceneManager} */ #mgr;

    #DISPLAY_DURATION = 6000;
    #timer            = 0;
    #carOscillation   = 0;
    #SCROLL_SPEED     = 0.2;

    // Result card slide-in (plain object tweened by Phaser)
    #card = { alpha: 0, offsetY: 80 };

    #finalScore = "";
    #finalHi    = "";
    #timeUp     = false;

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const { camera, state } = this.#mgr;
        this.#timer         = 0;
        this.#carOscillation = 0;
        this.#finalScore    = this.#padScore(state.score);
        this.#finalHi       = this.#padScore(state.hiScore);
        this.#timeUp        = state.isTimeUp;
        camera.acceleration = 0;

        // Reset card animation state
        this.#card.alpha   = 0;
        this.#card.offsetY = 80;

        // ── Audio ──────────────────────────────────────────────
        phaserLayer.audio.playSFX(this.#timeUp ? "sfx-timeup" : "sfx-finish");

        // ── Phaser particles ───────────────────────────────────
       // if (!this.#timeUp) {
        //    phaserLayer.particles.startRain();
            // Initial burst at the centre of the screen
          //  phaserLayer.particles.burst(CANVAS.width / 2, CANVAS.height / 2, 60);
       // }

        // ── Tween: slide + fade result card in ─────────────────
        phaserLayer.tweens.add({
            targets:  this.#card,
            alpha:    1,
            offsetY:  0,
            duration: 600,
            ease:     "Back.Out",
        });
    }

    exit() {
        phaserLayer.particles.stopRain();
        phaserLayer.audio.stopMusic();
        this.#mgr.player.x = 0;
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road } = this.#mgr;
        const W   = CANVAS.width;
        const H   = CANVAS.height;
        const ctx = render.renderingContext;

        this.#timer += deltaMs;

        if (this.#timer >= this.#DISPLAY_DURATION) {
            this.#mgr.transitionTo(CONFIG.SCENES.INTRO);
            return;
        }

        // Scroll background
        camera.cursor += road.segmentLength * this.#SCROLL_SPEED;
        if (camera.cursor >= road.trackLength) camera.cursor -= road.trackLength;
        camera.y = camera.h;

        // Car wiggle
        this.#carOscillation += 0.08;
        player.x = Math.sin(this.#carOscillation) * 0.25;

        // Render road + car
        render.clear(0, 0, W, H);
        render.save();
        this.#mgr.sky.render(render.renderingContext);
        road.render(render, camera, player);
        player.render(render, camera, road.width);

        // Result card (drawn on Canvas; Phaser particles render above via its canvas)
        this.#drawResultCard(ctx, W, H);

        render.restore();
    }

    #drawResultCard(ctx, W, H) {
        const cardW  = 380;
        const cardH  = 170;
        const cardX  = (W - cardW) / 2;
        const baseY  = H * 0.08;
        const cardY  = baseY + this.#card.offsetY;

        ctx.save();
        ctx.globalAlpha = this.#card.alpha;

        // Background
        ctx.fillStyle = "rgba(0,0,0,0.88)";
        ctx.beginPath();
        ctx.roundRect?.(cardX, cardY, cardW, cardH, 14) ?? ctx.rect(cardX, cardY, cardW, cardH);
        ctx.fill();

        ctx.strokeStyle = this.#timeUp ? "#ff4400" : "#ffff00";
        ctx.lineWidth   = 3;
        ctx.stroke();

        const midX = cardX + cardW / 2;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        // Title
        ctx.font      = "bold 26px monospace";
        ctx.fillStyle = this.#timeUp ? "#ff4400" : "#ffff00";
        ctx.fillText(this.#timeUp ? "⏱  TIME UP!" : "🏆  GOAL!", midX, cardY + 35);

        // Score columns
        ctx.font      = "bold 14px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("SCORE",    midX - 70, cardY + 72);
        ctx.fillText("HI-SCORE", midX + 70, cardY + 72);

        ctx.font      = "bold 26px monospace";
        ctx.fillStyle = "#ffff00";
        ctx.fillText(this.#finalScore, midX - 70, cardY + 98);
        ctx.fillStyle = "#ff6600";
        ctx.fillText(this.#finalHi,    midX + 70, cardY + 98);

        // Countdown
        const remaining = Math.ceil((this.#DISPLAY_DURATION - this.#timer) / 1000);
        ctx.font      = "13px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`Volviendo al menú en ${remaining}…`, midX, cardY + 148);

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    #padScore(n) {
        return String(Math.min(n, 9_999_999)).padStart(7, "0");
    }
}
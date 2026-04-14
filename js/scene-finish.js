/**
 * @file scene-finish.js
 * FINISH scene:
 *  - Road keeps scrolling slowly in the background.
 *  - Player car "celebrates" by bouncing side to side.
 *  - Confetti particles rain down from the top.
 *  - Result card shows the final time.
 *  - After DISPLAY_DURATION ms the scene auto-transitions back to INTRO.
 */

// ── Confetti particle ─────────────────────────────────────────────────────────

class ConfettiParticle {
    static COLORS = ["#ffe44d","#ff4d4d","#4dff91","#4db8ff","#ff4ddb","#ffffff","#ff8c00"];

    constructor(canvasW, canvasH) {
        this.reset(canvasW, canvasH);
    }

    reset(W, H) {
        this.x     = Math.random() * W;
        this.y     = -10 - Math.random() * 40;
        this.vy    = 2 + Math.random() * 3;
        this.vx    = (Math.random() - 0.5) * 2;
        this.w     = 6 + Math.random() * 8;
        this.h     = 4 + Math.random() * 6;
        this.angle = Math.random() * Math.PI * 2;
        this.spin  = (Math.random() - 0.5) * 0.2;
        this.color = ConfettiParticle.COLORS[Math.floor(Math.random() * ConfettiParticle.COLORS.length)];
        this._H    = H;
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const dt    = deltaMs / 16;
        this.x     += this.vx  * dt;
        this.y     += this.vy  * dt;
        this.angle += this.spin * dt;
    }

    isDead() { return this.y > this._H + 20; }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}

// ── Scene ─────────────────────────────────────────────────────────────────────

class FinishScene {
    /** @type {SceneManager} */ #mgr;

    /** Total ms before auto-returning to INTRO */
    #DISPLAY_DURATION = 5000;
    #timer            = 0;

    /** @type {ConfettiParticle[]} */
    #particles = [];
    #PARTICLE_COUNT   = 120;
    #SPAWN_RATE       = 3;   // new particles per frame
    #spawned          = 0;

    // Car celebration: oscillate left/right
    #carOscillation = 0;
    #SCROLL_SPEED   = 0.2;

    #finalScore = "";
    #finalHi    = "";
    #timeUp     = false;

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const { camera, state } = this.#mgr;
        this.#timer      = 0;
        this.#particles  = [];
        this.#spawned    = 0;
        this.#finalScore = this.#padScore(state.score);
        this.#finalHi    = this.#padScore(state.hiScore);
        this.#timeUp     = state.isTimeUp;
        camera.acceleration = 0;
    }

    exit() {
        this.#mgr.player.x = 0;
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road } = this.#mgr;
        const W   = CANVAS.width;
        const H   = CANVAS.height;
        const ctx = render.renderingContext;

        this.#timer += deltaMs;

        // Auto-transition back to INTRO
        if (this.#timer >= this.#DISPLAY_DURATION) {
            this.#mgr.transitionTo(CONFIG.SCENES.INTRO);
            return;
        }

        // ── Scroll background slowly ───────────────────────────
        camera.cursor += road.segmentLength * this.#SCROLL_SPEED;
        if (camera.cursor >= road.trackLength) camera.cursor -= road.trackLength;
        camera.y = camera.h;

        // ── Car celebration: wiggle side to side ───────────────
        this.#carOscillation += 0.08;
        player.x = Math.sin(this.#carOscillation) * 0.25;

        // ── Confetti spawn ─────────────────────────────────────
        if (this.#spawned < this.#PARTICLE_COUNT) {
            const toSpawn = Math.min(this.#SPAWN_RATE, this.#PARTICLE_COUNT - this.#spawned);
            for (let i = 0; i < toSpawn; i++) {
                this.#particles.push(new ConfettiParticle(W, H));
                this.#spawned++;
            }
        }

        // Update & recycle dead particles (keep raining)
        for (const p of this.#particles) {
            p.update(deltaMs);
            if (p.isDead()) p.reset(W, H);
        }

        // ── Render ────────────────────────────────────────────
        render.clear(0, 0, W, H);
        render.save();

        road.render(render, camera, player);
        player.render(render, camera, road.width);

        // Draw confetti on top of road but below UI
        ctx.save();
        for (const p of this.#particles) p.draw(ctx);
        ctx.restore();

        // ── Result card ───────────────────────────────────────
        this.#drawResultCard(ctx, W, H);

        render.restore();
    }

    #drawResultCard(ctx, W, H) {
        const progress = Math.min(this.#timer / 600, 1);
        const cardW    = 380;
        const cardH    = 170;
        const cardX    = (W - cardW) / 2;
        const cardY    = H * 0.08 - (1 - progress) * (cardH + 20);

        // Card background
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.beginPath();
        ctx.roundRect?.(cardX, cardY, cardW, cardH, 14) ??
            ctx.rect(cardX, cardY, cardW, cardH);
        ctx.fill();

        // Border color depends on whether player ran out of time
        ctx.strokeStyle = this.#timeUp ? "#ff4400" : "#ffff00";
        ctx.lineWidth   = 3;
        ctx.stroke();

        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        const midX = cardX + cardW / 2;

        // Title
        ctx.font      = `bold 26px monospace`;
        ctx.fillStyle = this.#timeUp ? "#ff4400" : "#ffff00";
        ctx.fillText(
            this.#timeUp ? "⏱  TIME UP!" : "🏆  GOAL!",
            midX, cardY + 35
        );

        // Score
        ctx.font      = "bold 14px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("SCORE", midX - 70, cardY + 72);
        ctx.font      = "bold 26px monospace";
        ctx.fillStyle = "#ffff00";
        ctx.fillText(this.#finalScore, midX - 70, cardY + 98);

        // Hi-score
        ctx.font      = "bold 14px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("HI-SCORE", midX + 70, cardY + 72);
        ctx.font      = "bold 26px monospace";
        ctx.fillStyle = "#ff6600";
        ctx.fillText(this.#finalHi, midX + 70, cardY + 98);

        // Countdown
        const remaining = Math.ceil((this.#DISPLAY_DURATION - this.#timer) / 1000);
        ctx.font      = "13px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`Volviendo al menú en ${remaining}…`, midX, cardY + 148);

        ctx.restore();
    }

    #padScore(n) {
        return String(Math.min(n, 9_999_999)).padStart(7, "0");
    }
}

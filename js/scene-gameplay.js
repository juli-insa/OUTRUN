/**
 * @file scene-gameplay.js
 * GAMEPLAY scene — OutRun style.
 *
 * HUD layout (bottom bar):
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  SCORE          KM/H            TIME                    │
 *  │  0000000         000             75                     │
 *  │  HI-SCORE                                               │
 *  │  0000000                                                │
 *  └─────────────────────────────────────────────────────────┘
 */

const TOTAL_LAPS = 2;

// ── HUD constants (tuned for 800×600 canvas) ──────────────────────────────────
const HUD = Object.freeze({
    BAR_H:        80,
    PAD_X:        18,
    LABEL_SIZE:   13,
    SCORE_SIZE:   22,
    TIMER_SIZE:   36,
    SPEED_SIZE:   34,
    FONT:         "monospace",
    LABEL_COLOR:  "#ffffff",
    SCORE_COLOR:  "#ffff00",
    HISCORE_COLOR:"#ff6600",
    SPEED_COLOR:  "#ffffff",
    TIMER_NORMAL: "#ff4400",
    TIMER_LOW:    "#ff0000",
    BAR_COLOR:    "rgba(0,0,0,0.82)",
});

class GameplayScene {
    /** @type {SceneManager} */ #mgr;

    #prevSegmentIndex  = -1;
    #FINISH_INDEX      = CONFIG.FINISH_LINE_INDEX;
    #lap               = 0;
    #crossingCooldown  = false;

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const { camera, road, state } = this.#mgr;
        state.reset();
        camera.cursor       = -road.segmentLength * road.rumbleLength;
        camera.acceleration = 0;
        this.#mgr.player.x  = 0;
        this.#prevSegmentIndex = -1;
        this.#lap              = 0;
        this.#crossingCooldown = false;
    }

    exit() {}

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road, state } = this.#mgr;
        const W = CANVAS.width;
        const H = CANVAS.height;

        // Speed: acceleration mapped to 0-255 (OutRun KPH style)
        const speed = Math.round((camera.acceleration / CONFIG.CAMERA.MAX_ACCELERATION) * 255);
        state.update(deltaMs, speed);

        camera.update(road);
        player.update();

        // ── Finish-line / lap detection ────────────────────────
        const currentIndex = road.getSegment(camera.cursor)?.index ?? -1;
        const crossingNow  = this.#prevSegmentIndex > 100
                          && currentIndex <= this.#FINISH_INDEX + road.rumbleLength;

        if (crossingNow && !this.#crossingCooldown) {
            this.#crossingCooldown = true;
            this.#lap++;
            state.addCheckpointBonus();   // +20s like OutRun checkpoints

            if (this.#lap >= TOTAL_LAPS) {
                this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
                return;
            }
        }

        if (this.#crossingCooldown && currentIndex > this.#FINISH_INDEX + road.rumbleLength + 5) {
            this.#crossingCooldown = false;
        }

        this.#prevSegmentIndex = currentIndex;

        // ── Time up ───────────────────────────────────────────
        if (state.isTimeUp) {
            this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
            return;
        }

        // ── Render ────────────────────────────────────────────
        render.clear(0, 0, W, H);
        render.save();
        road.render(render, camera, player);
        player.render(render, camera, road.width);
        this.#drawHUD(render.renderingContext, W, H, state);
        render.restore();
    }

    // ── HUD ───────────────────────────────────────────────────

    #drawHUD(ctx, W, H, state) {
        const barY = H - HUD.BAR_H;

        ctx.save();

        // Background bar
        ctx.fillStyle = HUD.BAR_COLOR;
        ctx.fillRect(0, barY, W, HUD.BAR_H);

        // Top separator line
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(W, barY);
        ctx.stroke();

        // ── SCORE (left) ───────────────────────────────────────
        this.#label(ctx, "SCORE",    HUD.PAD_X, barY + 10);
        this.#value(ctx, this.#padScore(state.score),   HUD.PAD_X, barY + 28, HUD.SCORE_COLOR,   HUD.SCORE_SIZE);
        this.#label(ctx, "HI-SCORE", HUD.PAD_X, barY + 52);
        this.#value(ctx, this.#padScore(state.hiScore), HUD.PAD_X, barY + 64, HUD.HISCORE_COLOR, HUD.SCORE_SIZE - 5);

        // ── SPEED (centre) ─────────────────────────────────────
        const cx = W / 2;
        this.#label(ctx, "KM/H", cx, barY + 10, "center");
        this.#value(ctx, String(state.speed).padStart(3, "0"), cx, barY + 26, HUD.SPEED_COLOR, HUD.SPEED_SIZE, "center");

        // Lap counter below speed
        ctx.font         = `bold 12px ${HUD.FONT}`;
        ctx.fillStyle    = "#aaaaaa";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`LAP ${Math.min(this.#lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`, cx, barY + 66);

        // ── TIMER (right) ──────────────────────────────────────
        const timeLeft   = state.timeLeft;
        const isLow      = timeLeft <= 10;
        const timerColor = isLow ? HUD.TIMER_LOW : HUD.TIMER_NORMAL;
        const pulse      = isLow && Math.floor(Date.now() / 250) % 2 === 0;

        this.#label(ctx, "TIME", W - HUD.PAD_X, barY + 10, "right");

        if (!pulse) {
            ctx.font         = `bold ${HUD.TIMER_SIZE}px ${HUD.FONT}`;
            ctx.fillStyle    = timerColor;
            ctx.textAlign    = "right";
            ctx.textBaseline = "top";
            ctx.fillText(String(timeLeft).padStart(2, "0"), W - HUD.PAD_X, barY + 24);
        }

        ctx.restore();
    }

    #label(ctx, text, x, y, align = "left") {
        ctx.font         = `bold ${HUD.LABEL_SIZE}px ${HUD.FONT}`;
        ctx.fillStyle    = HUD.LABEL_COLOR;
        ctx.textAlign    = align;
        ctx.textBaseline = "top";
        ctx.fillText(text, x, y);
    }

    #value(ctx, text, x, y, color, size, align = "left") {
        ctx.font         = `bold ${size}px ${HUD.FONT}`;
        ctx.fillStyle    = color;
        ctx.textAlign    = align;
        ctx.textBaseline = "top";
        ctx.fillText(text, x, y);
    }

    /** Zero-pad to 7 digits, OutRun style */
    #padScore(n) {
        return String(Math.min(n, 9_999_999)).padStart(7, "0");
    }
}

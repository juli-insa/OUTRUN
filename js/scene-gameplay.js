/**
 * @file scene-gameplay.js
 * GAMEPLAY scene — OutRun style HUD + audio + gamepad.
 */

const TOTAL_LAPS = 2;

const HUD = Object.freeze({
    BAR_H:        80,
    PAD_X:        18,
    LABEL_SIZE:   23,
    SCORE_SIZE:   32,
    STAGE_SIZE:   28,
    TIMER_SIZE:   46,
    SPEED_SIZE:   44,
    SPEED_X: 80,
    FONT:         "monospace",
    LABEL_COLOR:  "#ffffff",
    SCORE_COLOR:  "#868686",
   // HISCORE_COLOR:"#969696",
    SPEED_COLOR:  "#ffffff",
    TIMER_NORMAL: "#fffc58",
    TIMER_LOW:    "#ff0000",
    
    //BAR_COLOR:    "rgba(0,0,0,0.82)",
});

class GameplayScene {
    /** @type {SceneManager} */ #mgr;

    #prevSegmentIndex  = -1;
    #FINISH_INDEX      = CONFIG.FINISH_LINE_INDEX;
    #lap               = 0;
    #crossingCooldown  = false;
    #prevSpeed         = 0;   // to detect engine sound changes

    /** @param {SceneManager} mgr */
    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const { camera, road, state } = this.#mgr;
        state.reset();
        camera.cursor       = -road.segmentLength * road.rumbleLength;
        camera.acceleration = 0;
        this.#mgr.player.x  = 0;
        this.#prevSegmentIndex = -1;
        this.#lap              = -1;
        this.#crossingCooldown = false;
        this.#prevSpeed        = 0;

        // ── Audio ──────────────────────────────────────────────
        phaserLayer.audio.playMusic("music-gameplay");
    }

    exit() {
        phaserLayer.audio.stopMusic();
    }

    /** @param {number} deltaMs */
    update(deltaMs) {
        const { render, camera, player, road, state } = this.#mgr;
        const W = CANVAS.width;
        const H = CANVAS.height;

        const speed = Math.round((camera.acceleration / CONFIG.CAMERA.MAX_ACCELERATION) * 255);
        state.update(deltaMs, speed);

        camera.update(road);

        // Feed the active curve to the player so it can drift
        const activeSegment  = road.getSegment(camera.cursor);
        player.currentCurve  = activeSegment ? activeSegment.curve : 0;
        player.update(speed);

        // ── Finish-line / lap detection ────────────────────────
        const currentIndex = road.getSegment(camera.cursor)?.index ?? -1;
        const crossingNow  = this.#prevSegmentIndex > 100
                          && currentIndex <= this.#FINISH_INDEX + road.rumbleLength;

        if (crossingNow && !this.#crossingCooldown) {
            this.#crossingCooldown = true;
            this.#lap++;
            state.addCheckpointBonus();

            // Checkpoint SFX + particle burst at finish line position
            phaserLayer.audio.playSFX("sfx-checkpoint");
            phaserLayer.particles.burst(W / 2, H * 0., 40);

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
            phaserLayer.audio.playSFX("sfx-timeup");
            this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
            return;
        }

        // ── Render ────────────────────────────────────────────
        render.clear(0, 0, W, H);
        render.save();
        const sky = this.#mgr.sky;
        sky.update(player.x);
        sky.render(render.renderingContext);
        road.render(render, camera, player);
        player.render(render, camera, road.width);
        this.#drawHUD(render.renderingContext, W, H, state);
        render.restore();

        this.#prevSpeed = speed;
    }

    // ── HUD ───────────────────────────────────────────────────

    #drawHUD(ctx, W, H, state) {
        const barY = H - HUD.BAR_H;
        const barX = 0;

      //  ctx.save();
      //  ctx.fillStyle = HUD.BAR_COLOR;
       // ctx.fillRect(0, barY, W, HUD.BAR_H);

       // ctx.strokeStyle = "#ff8a2b";
       // ctx.lineWidth   = 1.5;
       // ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(W, barY);
        //ctx.stroke();

        // SCORE
        this.#label(ctx, "SCORE",    HUD.PAD_X, barY -500 );
        this.#value(ctx, this.#padScore(state.score),   HUD.PAD_X, barY -480, HUD.SCORE_COLOR,   HUD.SCORE_SIZE, );
        //this.#label(ctx, "HI-SCORE", HUD.PAD_X, barY + 52);
        //this.#value(ctx, this.#padScore(state.hiScore), HUD.PAD_X, barY + 64, HUD.HISCORE_COLOR, HUD.SCORE_SIZE - 5);

        // SPEED

       const cx = HUD.SPEED_X;
        this.#label(ctx, "KM/H", cx, barY + 10, "center");
        this.#value(ctx, String(state.speed).padStart(3, "0"), cx, barY + 26, HUD.SPEED_COLOR, HUD.SPEED_SIZE, "center");

        ctx.font         = `bold ${HUD.STAGE_SIZE}px ${HUD.FONT}`;
        ctx.fillStyle    = "#eb3737";
        ctx.textAlign    = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`STAGE ${Math.min(this.#lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`, W - HUD.PAD_X, barY + 20);

        // TIMER
        const timeLeft   = state.timeLeft;
        const isLow      = timeLeft <= 10;
        const timerColor = isLow ? HUD.TIMER_LOW : HUD.TIMER_NORMAL;
        const pulse      = isLow && Math.floor(Date.now() / 250) % 2 === 0;
        

        this.#label(ctx, "TIME", W - HUD.PAD_X, barY - 500, "right");
        if (!pulse) {
            ctx.font         = `bold ${HUD.TIMER_SIZE}px ${HUD.FONT}`;
            ctx.fillStyle    = timerColor;
            ctx.textAlign    = "right";
            ctx.textBaseline = "top";
            ctx.fillText(String(timeLeft).padStart(2, "0"), W - HUD.PAD_X, barY - 480);
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

    #padScore(n) {
        return String(Math.min(n, 9_999_999)).padStart(7, "0");
    }
}
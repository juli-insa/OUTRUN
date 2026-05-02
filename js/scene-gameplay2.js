/**
 * @file scene-gameplay2.js
 * GAMEPLAY scene — Stage 2. NPCs integrados.
 */

class GameplayScene2 {
    /** @type {SceneManager} */ #mgr;

    #prevSegmentIndex  = 1;
    #FINISH_INDEX      = CONFIG.FINISH_LINE_INDEX;
    #lap               = 0;
    #crossingCooldown  = false;
    #prevSpeed         = 0;

    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        const { camera, road, state } = this.#mgr;
        state.reset();
        camera.cursor       = -road.segmentLength * road.rumbleLength;
        camera.acceleration = 0;
        this.#mgr.player.x  = 0;
        this.#prevSegmentIndex = 1;
        this.#lap              = -1;   // necesita 2 cruces
        this.#crossingCooldown = false;
        this.#prevSpeed        = 0;
        phaserLayer.audio.playMusic("music-gameplay");
    }

    exit() {
        phaserLayer.audio.stopMusic();
    }

    update(deltaMs) {
        const { render, camera, player, road, state, npcCars } = this.#mgr;
        const W = CANVAS.width;
        const H = CANVAS.height;

        const speed = Math.round((camera.acceleration / CONFIG.CAMERA.MAX_ACCELERATION) * 255);
        state.update(deltaMs, speed);
        camera.update(road);

        const activeSegment  = road.getSegment(camera.cursor);
        player.currentCurve  = activeSegment ? activeSegment.curve : 0;
        player.update(speed);

        // ── NPCs ──────────────────────────────────────────────
        const camSegIndex = activeSegment?.index ?? -1;
        for (const npc of npcCars) {
            npc.update(road, camera.acceleration);
            npc.checkCollision(player, camera, road, camSegIndex);
            npc.attach(road);
        }

        // ── Detección línea de llegada ─────────────────────────
        const currentIndex = camSegIndex;
        const crossingNow  = this.#prevSegmentIndex > 100
                          && currentIndex <= this.#FINISH_INDEX + road.rumbleLength;

        if (crossingNow && !this.#crossingCooldown) {
            this.#crossingCooldown = true;
            this.#lap++;
            state.addCheckpointBonus();
            phaserLayer.audio.playSFX("sfx-checkpoint");
            phaserLayer.particles.burst(W / 2, 0, 40);

            if (this.#lap >= TOTAL_LAPS) {
                for (const npc of npcCars) npc.detach();
                this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
                return;
            }
        }

        if (this.#crossingCooldown && currentIndex > this.#FINISH_INDEX + road.rumbleLength + 5) {
            this.#crossingCooldown = false;
        }

        this.#prevSegmentIndex = currentIndex;

        if (state.isTimeUp) {
            for (const npc of npcCars) npc.detach();
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

        for (const npc of npcCars) npc.detach();

        this.#prevSpeed = speed;
    }

    #drawHUD(ctx, W, H, state) {
        const barY = H - HUD.BAR_H;
        ctx.moveTo(0, barY);
        ctx.lineTo(W, barY);

        this.#label(ctx, "SCORE", HUD.PAD_X, barY - 500);
        this.#value(ctx, this.#padScore(state.score), HUD.PAD_X, barY - 480, HUD.SCORE_COLOR, HUD.SCORE_SIZE);

        const cx = HUD.SPEED_X;
        this.#label(ctx, "KM/H", cx, barY + 10, "center");
        this.#value(ctx, String(state.speed).padStart(3, "0"), cx, barY + 26, HUD.SPEED_COLOR, HUD.SPEED_SIZE, "center");

        ctx.font         = `bold ${HUD.STAGE_SIZE}px ${HUD.FONT}`;
        ctx.fillStyle    = "#eb3737";
        ctx.textAlign    = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`STAGE 2/${CONFIG.SCENES.TOTAL_STAGES}`, W - HUD.PAD_X, barY + 20);

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

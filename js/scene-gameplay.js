/**
 * @file scene-gameplay.js
 * GAMEPLAY scene — Stage 1.
 * La colisión se detecta ANTES de camera.update() para que el
 * frenado y el parpadeo sean instantáneos.
 */

const TOTAL_LAPS = 2;

const HUD = Object.freeze({
    BAR_H:        70,
    PAD_X:        20,
    LABEL_SIZE:   23,
    SCORE_SIZE:   25,
    STAGE_SIZE:   20,
    TIMER_SIZE:   23,
    SPEED_SIZE:   34,
    SPEED_X:      140,
    SCORE_X:      500,
    TIME_X:       160,
    FONT:         "'Press Start 2P', monospace",
    LABEL_COLOR:  "#ffe2e2", 
    LABEL_COLOR2: "#ff8438",
    SCORE_COLOR:  "#868686",
    SPEED_COLOR:  "#ff4000",
    TIMER_NORMAL: "#fffc58",
    TIMER_LOW:    "#ff0000",
});

class GameplayScene {
    /** @type {SceneManager} */ #mgr;

    #prevSegmentIndex = 1;
    #FINISH_INDEX     = CONFIG.FINISH_LINE_INDEX;
    #stage            = 1;
    #lap              = 0;
    #crossingCooldown = false;
    #prevSpeed        = 0;

    constructor(mgr) { this.#mgr = mgr; }

    enter() {
        this.#startStage(1);
    }

    #startStage(stage) {
        const { camera, road, state } = this.#mgr;
        if (stage === 1) state.reset();

        this.#stage            = stage;
        camera.cursor          = -road.segmentLength * road.rumbleLength;
        camera.acceleration    = 0;
        this.#mgr.player.x     = 0;
        this.#prevSegmentIndex = 1;
        this.#lap              = 0;
        this.#crossingCooldown = false;
        this.#prevSpeed        = 0;

        road.clear();
        road.create(CONFIG.ROAD.TOTAL_SEGMENTS, stage);
        this.#mgr.sky.setStage(stage);
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

        // ── 1. Segmento actual (antes de mover nada) ───────────
        const activeSegment = road.getSegment(camera.cursor);
        const camSegIndex   = activeSegment?.index ?? -1;

        // ── 2. Colisión con árboles — ANTES de camera.update ──
        if (!player.isStunned) {
            if (road.checkSpriteCollision(player, camSegIndex)) {
                player.stun();
                camera.acceleration = 0;   // freno inmediato
            }
        }

        // ── 3. Colisión con NPCs — también antes de mover ──────
        for (const npc of npcCars) {
            npc.update(road, camera.acceleration);
            if (!player.isStunned) {
                npc.checkCollision(player, camera, road, camSegIndex);
            }
            npc.attach(road);
        }

        // ── 4. Cámara: si está stunned, frenar; si no, input normal
        if (player.isStunned) {
            camera.acceleration *= 0.80;
            if (camera.acceleration < 0) camera.acceleration = 0;
            // Avance mínimo para que la escena no se congele visualmente
            camera.cursor += road.segmentLength * 0.2;
            if (camera.cursor >= road.trackLength) camera.cursor -= road.trackLength;
        } else {
            camera.update(road);
        }

        // ── 5. Player update (drift + input) ──────────────────
        player.currentCurve = activeSegment ? activeSegment.curve : 0;
        player.update(speed);

        // ── 6. Finish-line / lap ───────────────────────────────
        const currentIndex = camSegIndex;
        const crossingNow  = this.#prevSegmentIndex > 50
                          && currentIndex <= this.#FINISH_INDEX + road.rumbleLength;

        if (crossingNow && !this.#crossingCooldown) {
            this.#crossingCooldown = true;
            this.#lap++;
            state.addCheckpointBonus();
            phaserLayer.audio.playSFX("sfx-checkpoint");
            phaserLayer.particles.burst(W / 2, 0, 40);

            if (this.#lap >= TOTAL_LAPS) {
                if (this.#stage === 1) {
                    for (const npc of npcCars) npc.detach();
                    this.#startStage(2);
                    return;
                }

                for (const npc of npcCars) npc.detach();
                this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
                return;
            }
        }

        if (this.#crossingCooldown && currentIndex > this.#FINISH_INDEX + road.rumbleLength + 1) {
            this.#crossingCooldown = false;
        }

        this.#prevSegmentIndex = currentIndex;

        if (state.isTimeUp) {
            for (const npc of npcCars) npc.detach();
            phaserLayer.audio.playSFX("sfx-timeup");
            this.#mgr.transitionTo(CONFIG.SCENES.FINISH);
            return;
        }

        // ── 7. Render ─────────────────────────────────────────
        render.clear(0, 0, W, H);
        render.save();
        this.#mgr.sky.update( activeSegment ? activeSegment.curve : 0);
        this.#mgr.sky.render(render.renderingContext);
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

        this.#label(ctx, "SCORE", HUD.SCORE_X, barY - 500, "right");
        this.#value(ctx, this.#padScore(state.score), HUD.SCORE_X, barY - 500, HUD.SCORE_COLOR, HUD.SCORE_SIZE , "left");

        const cx = HUD.SPEED_X;
        this.#label(ctx, "km/h", cx, barY + 10, "left");
        this.#value(ctx, String(state.speed).padStart(3, "0"), cx, barY + 10, HUD.SPEED_COLOR, HUD.SPEED_SIZE, "right");

        ctx.font         = `bold ${HUD.STAGE_SIZE}px ${HUD.FONT}`;
        ctx.fillStyle    = "#eb3737";
        ctx.textAlign    = "right";
        ctx.textBaseline = "top";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(`STAGE ${this.#stage}/${CONFIG.SCENES.TOTAL_STAGES}`, W - HUD.PAD_X, barY + 20);
        ctx.fillText(`STAGE ${this.#stage}/${CONFIG.SCENES.TOTAL_STAGES}`, W - HUD.PAD_X, barY + 20);

        const timeLeft   = state.timeLeft;
        const isLow      = timeLeft <= 10;
        const timerColor = isLow ? HUD.TIMER_LOW : HUD.TIMER_NORMAL;
        const pulse      = isLow && Math.floor(Date.now() / 250) % 2 === 0;

        this.#label(ctx, "TIME", HUD.TIME_X, barY - 500, "right");
        if (!pulse) {
            ctx.font         = `bold ${HUD.TIMER_SIZE}px ${HUD.FONT}`;
            ctx.fillStyle    = timerColor;
            ctx.textAlign    = "left";
            ctx.textBaseline = "top";            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.strokeText(String(timeLeft).padStart(2, "0"), HUD.TIME_X, barY - 500);   
            ctx.fillText(String(timeLeft).padStart(2, "0"), HUD.TIME_X, barY - 500);
        }
        ctx.restore();
    }

    #label(ctx, text, x, y, align = "left") {
        ctx.font = `bold ${HUD.LABEL_SIZE}px ${HUD.FONT}`;
        ctx.fillStyle = HUD.LABEL_COLOR; 
        ctx.textAlign = align;
        ctx.textBaseline = "top";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }

    #value(ctx, text, x, y, color, size, align = "left") {
        ctx.font = `bold ${size}px ${HUD.FONT}`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = "top";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }

    #padScore(n) {
        return String(Math.min(n, 9_999_999)).padStart(7, "0");
    }
}

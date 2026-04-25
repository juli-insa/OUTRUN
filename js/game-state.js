/**
 * @file game-state.js
 * Centralised game state — OutRun style:
 *  - Score increases while driving (based on speed).
 *  - Timer counts DOWN. Reaching 0 ends the run.
 *  - Crossing a checkpoint adds bonus seconds.
 *  - Hi-score persists across runs.
 */

class GameState {
    isRunning    = true;
    isTimeUp     = false;

    // ── Score ─────────────────────────────────────────────────
    score        = 0;
    hiScore      = 0;

    // ── Countdown timer ───────────────────────────────────────
    /** Starting seconds for each stage */
    static START_TIME = 10;
    /** Bonus seconds added when crossing a checkpoint/lap */
    static CHECKPOINT_BONUS = 20;

    #timeLeftMs  = GameState.START_TIME * 1000;

    // ── Speed (set externally by camera each frame) ───────────
    speed        = 0;   // 0-255, like OutRun's KPH display

    /**
     * Call once per frame.
     * @param {number} deltaMs
     * @param {number} speedValue  current speed (0-255)
     */
    update(deltaMs, speedValue = 0) {
        if (!this.isRunning) return;

        this.speed = speedValue;

        // Countdown
        this.#timeLeftMs -= deltaMs;
        if (this.#timeLeftMs <= 0) {
            this.#timeLeftMs = 0;
            this.isTimeUp    = true;
            this.isRunning   = false;
        }

        // Score: points per frame proportional to speed
        const pointsPerSecond = Math.floor(speedValue * 10);
        this.score += Math.floor(pointsPerSecond * deltaMs / 1000);
        if (this.score > this.hiScore) this.hiScore = this.score;
    }

    /** Remaining seconds to display (whole number) */
    get timeLeft() {
        return Math.ceil(this.#timeLeftMs / 1000);
    }

    /** Remaining ms (for color pulsing etc.) */
    get timeLeftMs() {
        return this.#timeLeftMs;
    }

    /** Called when player crosses checkpoint or completes a lap */
    addCheckpointBonus() {
        this.#timeLeftMs += GameState.CHECKPOINT_BONUS * 1000;
    }

    reset() {
        this.isRunning   = true;
        this.isTimeUp    = false;
        this.score       = 0;
        this.speed       = 0;
        this.#timeLeftMs = GameState.START_TIME * 1000;
    }
}
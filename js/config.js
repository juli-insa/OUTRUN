/**
 * @file config.js
 * Central configuration for the racing game.
 * Modify values here to tweak gameplay and visuals.
 */

const CONFIG = Object.freeze({

    // ── Canvas ────────────────────────────────────────────────
    CANVAS: {
        WIDTH:  800,
        HEIGHT: 600,
    },

    // ── Camera / Perspective ──────────────────────────────────
    CAMERA: {
        /** Field of view in degrees */
        FOV_DEG:        120,
        /** Camera height above ground */
        HEIGHT:         1500,
        /** Max acceleration value */
        MAX_ACCELERATION: 300,
    },

    // ── Road ──────────────────────────────────────────────────
    ROAD: {
        SEGMENT_LENGTH: 200,
        RUMBLE_LENGTH:  13,
        WIDTH:          2000,
        TOTAL_SEGMENTS: 4602,
        /** How many segments are drawn ahead */
        VISIBLE_SEGMENTS: 500,
    },

    // ── Colors ────────────────────────────────────────────────
    COLORS: {
        DARK:  Object.freeze({ road: "#333333", grass: "#c8a84b", rumble: "red",   strip: "",      tunnel: "darkblue" }),
        LIGHT: Object.freeze({ road: "#666666", grass: "#e2c46a", rumble: "white", strip: "white", tunnel: "blue"     }),
    },

    // ── Player ────────────────────────────────────────────────
    PLAYER: {
        LATERAL_SPEED: 0.05,
        /** Spritesheet frame size */
        FRAME_WIDTH:   30,
        FRAME_HEIGHT:  35,
        TOTAL_FRAMES:  2,
        FRAME_SPEED:   0.15,
    },

    // ── Timing ────────────────────────────────────────────────
    TIME: {
        TARGET_FPS:    70,
    },

    // ── Scenes ────────────────────────────────────────────────
    SCENES: {
        INTRO:    "intro",
        GAMEPLAY: "gameplay",
        GAMEPLAY2: "gameplay2",
        FINISH:   "finish",
        TOTAL_STAGES: 1,
    },

    // ── Finish line segment index (must match road.js) ────────
    FINISH_LINE_INDEX: 5,
});

// ── Derived constants (computed once) ────────────────────────
const FOV   = CONFIG.CAMERA.FOV_DEG / 180 * Math.PI;
const THETA = FOV * 0.5;
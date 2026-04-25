/**
 * @file phaser-layer.js
 * Phaser 3 layer — runs on a transparent canvas stacked on top of
 * the pseudo-3D engine canvas.
 *
 * Responsibilities:
 *  1. AUDIO     — music + SFX via Phaser.Sound
 *  2. PARTICLES — rich confetti/sparks via Phaser.GameObjects.Particles
 *  3. TWEENS    — smooth UI transitions (slide, fade, scale)
 *  4. GAMEPAD   — Xbox/PS controller support via Phaser.Input.Gamepad
 *
 * The engine canvas and this canvas are siblings in the DOM, both
 * absolutely positioned and centred. This canvas has a transparent
 * background so the road shows through underneath.
 *
 * Public API (called by scene files):
 *   phaserLayer.audio.playMusic(key)
 *   phaserLayer.audio.playSFX(key)
 *   phaserLayer.audio.stopMusic()
 *   phaserLayer.particles.burst(x, y)        ← one-shot burst
 *   phaserLayer.particles.startRain()         ← continuous confetti
 *   phaserLayer.particles.stopRain()
 *   phaserLayer.tweens.slideIn(targets, props)
 *   phaserLayer.tweens.fadeIn(targets, props)
 *   phaserLayer.gamepad.isDown(btn)           ← button constant from GamepadButtons
 *   phaserLayer.gamepad.axes                  ← { lx, ly, rx, ry }
 */

// ── Gamepad button map (Xbox layout) ─────────────────────────────────────────
const GamepadButtons = Object.freeze({
    A:      0,
    B:      1,
    X:      2,
    Y:      3,
    LB:     4,
    RB:     5,
    LT:     6,
    RT:     7,
    SELECT: 8,
    START:  9,
    UP:    12,
    DOWN:  13,
    LEFT:  14,
    RIGHT: 15,
});

// ── Internal Phaser Scene ─────────────────────────────────────────────────────

class PhaserMainScene extends Phaser.Scene {
    constructor() {
        super({ key: "main" });
    }

    preload() {
        // Audio assets — add your files to ./assets/audio/
        // Phaser tries both .ogg and .mp3 for cross-browser support.
        this.load.audio("music-intro",    ["./assets/audio/intro.ogg",    "./assets/audio/intro.mp3"]);
        this.load.audio("music-gameplay", ["./assets/audio/gameplay.ogg", "./assets/audio/gameplay.mp3"]);
        this.load.audio("sfx-start",      ["./assets/audio/start.ogg",    "./assets/audio/start.mp3"]);
        this.load.audio("sfx-checkpoint", ["./assets/audio/checkpoint.ogg","./assets/audio/checkpoint.mp3"]);
        this.load.audio("sfx-finish",     ["./assets/audio/finish.ogg",   "./assets/audio/finish.mp3"]);
        this.load.audio("sfx-engine",     ["./assets/audio/engine.ogg",   "./assets/audio/engine.mp3"]);
        this.load.audio("sfx-timeup",     ["./assets/audio/timeup.ogg",   "./assets/audio/timeup.mp3"]);
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── Audio ──────────────────────────────────────────────
        this._music   = null;
        this._sounds  = {};

        const sfxKeys = ["sfx-start","sfx-checkpoint","sfx-finish","sfx-engine","sfx-timeup"];
        for (const k of sfxKeys) {
            if (this.cache.audio.exists(k)) {
                this._sounds[k] = this.sound.add(k, { volume: 0.7 });
            }
        }

        // ── Particles ──────────────────────────────────────────
        // Use a tiny graphics texture for confetti rectangles
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff);
        g.fillRect(0, 0, 8, 5);
        g.generateTexture("confetti-rect", 8, 5);
        g.destroy();

        const sparkG = this.make.graphics({ x: 0, y: 0, add: false });
        sparkG.fillStyle(0xffffff);
        sparkG.fillCircle(3, 3, 3);
        sparkG.generateTexture("confetti-spark", 6, 6);
        sparkG.destroy();

        // Rain emitter (continuous confetti for finish scene)
        this._rainEmitter = this.add.particles(0, 0, "confetti-rect", {
            x:         { min: 0, max: W },
            y:         -20,
            lifespan:  { min: 2000, max: 3500 },
            speedY:    { min: 80,  max: 180 },
            speedX:    { min: -40, max: 40  },
            rotate:    { min: 0,   max: 360 },
            scaleX:    { min: 0.5, max: 1.5 },
            scaleY:    { min: 0.5, max: 1.5 },
            tint:      [0xffe44d, 0xff4d4d, 0x4dff91, 0x4db8ff, 0xff4ddb, 0xffffff, 0xff8c00],
            frequency: 40,
            quantity:  3,
            emitting:  false,
        });

        // Burst emitter (one-shot spark effect)
        this._burstEmitter = this.add.particles(0, 0, "confetti-spark", {
            lifespan:  800,
            speed:     { min: 100, max: 300 },
            scale:     { start: 1, end: 0 },
            alpha:     { start: 1, end: 0 },
            tint:      [0xffe44d, 0xff4d4d, 0x4dff91, 0x4db8ff],
            emitting:  false,
        });

        // ── Gamepad ────────────────────────────────────────────
        if (this.input.gamepad) {
            this.input.gamepad.once("connected", (pad) => {
                console.log(`🎮 Gamepad connected: ${pad.id}`);
            });
        }

        // ── Expose API on phaserLayer global ──────────────────
        phaserLayer._scene = this;
        phaserLayer._ready = true;
        phaserLayer._emit("ready");
    }

    update() {
        // Gamepad axes are read on demand via phaserLayer.gamepad.axes
    }

    // ── Internal helpers ──────────────────────────────────────

    _playMusic(key, loop = true) {
        if (this._music) {
            this._music.stop();
            this._music = null;
        }
        if (this.cache.audio.exists(key)) {
            this._music = this.sound.add(key, { loop, volume: 0.5 });
            this._music.play();
        }
    }

    _stopMusic() {
        if (this._music) {
            this.tweens.add({
                targets:  this._music,
                volume:   0,
                duration: 500,
                onComplete: () => { this._music?.stop(); this._music = null; },
            });
        }
    }

    _playSFX(key) {
        this._sounds[key]?.play();
    }
}

// ── Public PhaserLayer facade ─────────────────────────────────────────────────

class PhaserLayer {
    #game    = null;
    #scene   = null;
    #ready   = false;
    #queue   = [];   // calls made before Phaser is ready

    constructor() {
        // audio / particles / tweens / gamepad sub-APIs
        this.audio     = this.#makeAudioAPI();
        this.particles = this.#makeParticlesAPI();
        this.tweens    = this.#makeTweensAPI();
        this.gamepad   = this.#makeGamepadAPI();
    }

    /** Boot Phaser on a transparent canvas sibling to the engine canvas. */
    init() {
        const W = CONFIG.CANVAS.WIDTH;
        const H = CONFIG.CANVAS.HEIGHT;

        this.#game = new Phaser.Game({
            type:            Phaser.AUTO,
            width:           W,
            height:          H,
            backgroundColor: "transparent",
            transparent:     true,
            scene:           PhaserMainScene,
            audio: { disableWebAudio: false },
            input: { gamepad: true },
            parent:          document.body,
            // No extra DOM element — Phaser appends its own canvas
        });

        // Style the Phaser canvas to overlay the engine canvas
        this.#game.events.once(Phaser.Core.Events.READY, () => {
            const phCanvas = this.#game.canvas;
            phCanvas.id    = "phaser-canvas";
            phCanvas.style.cssText = `
                position: absolute;
                left: 50%; top: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            `;
        });
    }

    // Called internally by PhaserMainScene.create()
    set _scene(s) { this.#scene = s; }
    set _ready(v) { this.#ready = v; }

    _emit(event) {
        if (event === "ready") {
            for (const fn of this.#queue) fn();
            this.#queue = [];
        }
    }

    /** Run fn now if Phaser is ready, otherwise queue it. */
    #whenReady(fn) {
        if (this.#ready) fn();
        else this.#queue.push(fn);
    }

    // ── Sub-API factories ──────────────────────────────────────

    #makeAudioAPI() {
        return {
            playMusic: (key, loop = true) => this.#whenReady(() => this.#scene._playMusic(key, loop)),
            stopMusic: ()                 => this.#whenReady(() => this.#scene._stopMusic()),
            playSFX:  (key)               => this.#whenReady(() => this.#scene._playSFX(key)),
        };
    }

    #makeParticlesAPI() {
        return {
            /** Continuous rain — call in FinishScene.enter() */
            startRain: () => this.#whenReady(() => {
                this.#scene._rainEmitter.start();
            }),
            stopRain: () => this.#whenReady(() => {
                this.#scene._rainEmitter.stop();
            }),
            /** One-shot burst at canvas coords x, y */
            burst: (x, y, count = 30) => this.#whenReady(() => {
                this.#scene._burstEmitter.explode(count, x, y);
            }),
        };
    }

    #makeTweensAPI() {
        return {
            /**
             * Generic tween wrapper.
             * @param {object} config  Phaser tween config
             * @returns {Promise} resolves when tween completes
             */
            add: (config) => new Promise((resolve) => {
                this.#whenReady(() => {
                    this.#scene.tweens.add({
                        ...config,
                        onComplete: () => {
                            config.onComplete?.();
                            resolve();
                        },
                    });
                });
            }),

            /** Slide an object in from off-screen. target must have x/y properties. */
            slideIn: (target, { fromX, fromY, toX, toY, duration = 500, ease = "Back.Out" } = {}) => {
                if (fromX !== undefined) target.x = fromX;
                if (fromY !== undefined) target.y = fromY;
                return new Promise((resolve) => {
                    this.#whenReady(() => {
                        this.#scene.tweens.add({
                            targets:  target,
                            x:        toX ?? target.x,
                            y:        toY ?? target.y,
                            duration, ease,
                            onComplete: resolve,
                        });
                    });
                });
            },

            /** Fade a canvas element (sets its opacity via a plain object). */
            fadeIn: (ref, { duration = 600, from = 0, to = 1 } = {}) => {
                ref.alpha = from;
                return new Promise((resolve) => {
                    this.#whenReady(() => {
                        this.#scene.tweens.add({
                            targets:  ref,
                            alpha:    to,
                            duration,
                            ease:     "Sine.InOut",
                            onComplete: resolve,
                        });
                    });
                });
            },

            /** Scale punch effect — great for the score incrementing. */
            punch: (ref, { scale = 1.3, duration = 150 } = {}) => {
                return new Promise((resolve) => {
                    this.#whenReady(() => {
                        this.#scene.tweens.chain({
                            targets: ref,
                            tweens: [
                                { scaleX: scale, scaleY: scale, duration: duration / 2, ease: "Quad.Out" },
                                { scaleX: 1,     scaleY: 1,     duration: duration / 2, ease: "Quad.In", onComplete: resolve },
                            ],
                        });
                    });
                });
            },
        };
    }

    #makeGamepadAPI() {
        return {
            /**
             * Check if a gamepad button is currently held.
             * @param {number} buttonIndex  use GamepadButtons constants
             */
            isDown: (buttonIndex) => {
                if (!this.#ready || !this.#scene.input.gamepad) return false;
                const pad = this.#scene.input.gamepad.getPad(0);
                return pad?.buttons[buttonIndex]?.pressed ?? false;
            },

            /**
             * Check if a button was just pressed this frame.
             * @param {number} buttonIndex
             */
            justDown: (buttonIndex) => {
                if (!this.#ready || !this.#scene.input.gamepad) return false;
                const pad = this.#scene.input.gamepad.getPad(0);
                return pad?.buttons[buttonIndex]?.value === 1 ?? false;
            },

            /** Left/right stick axes — values from -1 to 1. */
            axes: () => {
                if (!this.#ready || !this.#scene?.input?.gamepad) {
                    return { lx: 0, ly: 0, rx: 0, ry: 0 };
                }
                const pad = this.#scene.input.gamepad.getPad(0);
                if (!pad) return { lx: 0, ly: 0, rx: 0, ry: 0 };
                return {
                    lx: pad.axes[0] ?? 0,
                    ly: pad.axes[1] ?? 0,
                    rx: pad.axes[2] ?? 0,
                    ry: pad.axes[3] ?? 0,
                };
            },
        };
    }
}

// ── Global singleton ──────────────────────────────────────────────────────────
const phaserLayer = new PhaserLayer();
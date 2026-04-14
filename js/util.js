/**
 * @file util.js
 * Global utilities: canvas reference, keyboard input, resource loader,
 * time tracking, and sprite classes.
 */

const CANVAS = document.querySelector("canvas");

// ── Keyboard ──────────────────────────────────────────────────────────────────

class Keyboard {
    /** @type {Record<string, boolean>} */
    #map = {};

    constructor() {
        window.addEventListener("keydown", (e) => this.#handler(e));
        window.addEventListener("keyup",   (e) => this.#handler(e));
    }

    /** @param {KeyboardEvent} evt */
    #handler(evt) {
        this.#map[evt.key.toLowerCase()] = evt.type === "keydown";
    }

    /** @param {string} key */
    isKeyDown(key) {
        return !!this.#map[key.toLowerCase()];
    }
}

// ── Resource Loader ───────────────────────────────────────────────────────────

class ResourceLoader {
    #cache = new Map();
    #queue = [];

    /**
     * Enqueue an asset for loading.
     * @param {string} name
     * @param {string} [url] - defaults to name if omitted
     * @returns {this}
     */
    add(name, url) {
        this.#queue.push({ name, url: url ?? name });
        return this;
    }

    /** @param {string} name */
    get(name) {
        return this.#cache.get(name) ?? null;
    }

    /**
     * Load all queued assets, then call callback.
     * @param {() => void} callback
     */
    load(callback) {
        if (this.#queue.length === 0) {
            callback?.(this);
            return;
        }
        const { name, url } = this.#queue.pop();
        const image = new Image();
        image.onload = () => {
            this.#cache.set(name, image);
            this.load(callback);
        };
        image.src = url;
    }
}

// ── Time ──────────────────────────────────────────────────────────────────────

class TimeTracker {
    #fps       = CONFIG.TIME.TARGET_FPS;
    #frameRate = 1 / this.#fps;
    #fpm       = this.#frameRate / 1000;
    #delta     = 0;

    elapsed = 0;

    /** Raw ms between frames */
    set delta(ms) { this.#delta = ms; }

    /** Delta scaled for physics calculations */
    get delta() { return this.#delta / this.#fpm; }

    /** Delta in seconds */
    get currentFramerate() { return this.#delta / 1000; }
}

// ── Sprites ───────────────────────────────────────────────────────────────────

class Sprite {
    /** @type {HTMLImageElement} */
    image   = null;
    offsetX = 0;
    offsetY = 0;
    scaleX  = 1;
    scaleY  = 1;

    get width()  { return this.image.width;  }
    get height() { return this.image.height; }
}

class AnimatedSprite extends Sprite {
    frameWidth   = 0;
    frameHeight  = 0;
    frameIndex   = 0;
    totalFrames  = 1;
    frameSpeed   = 0.1;
    #counter     = 0;

    get width()  { return this.frameWidth  || this.image.width;  }
    get height() { return this.frameHeight || this.image.height; }

    /** Auto-detect total frames from spritesheet dimensions */
    #autoTotalFrames() {
        if (!this.frameWidth || !this.frameHeight || !this.image) return 1;
        const cols = Math.floor(this.image.width  / this.frameWidth);
        const rows = Math.floor(this.image.height / this.frameHeight);
        return cols * rows;
    }

    updateAnimation() {
        if (this.totalFrames === 1 && this.frameWidth && this.frameHeight) {
            this.totalFrames = this.#autoTotalFrames();
        }
        this.#counter += this.frameSpeed;
        if (this.#counter >= 1) {
            this.#counter = 0;
            this.frameIndex = (this.frameIndex + 1) % this.totalFrames;
        }
    }

    /** @returns {{ x:number, y:number, width:number, height:number }} */
    getFrameCoords() {
        const cols = Math.floor(this.image.width / this.frameWidth);
        const col  = this.frameIndex % cols;
        const row  = Math.floor(this.frameIndex / cols);
        return {
            x:      col * this.frameWidth,
            y:      row * this.frameHeight,
            width:  this.frameWidth,
            height: this.frameHeight,
        };
    }
}

// ── Tunnel ────────────────────────────────────────────────────────────────────

class TunnelFace {
    offsetX1 = 0;
    offsetX2 = 0;
}

class TunnelVisibility {
    leftFront  = true;
    topFront   = true;
    rightFront = true;
    leftTop    = true;
    top        = true;
    rightTop   = true;
    left       = true;
    right      = true;
}

class Tunnel {
    /** @type {string} */
    title = "";
    /** @type {number} */
    py     = 0;
    /** @type {number} */
    clipH  = 0;
    /** @type {number} */
    worldH = 0;

    leftFace     = new TunnelFace();
    rightFace    = new TunnelFace();
    visibleFaces = new TunnelVisibility();

    /** @type {Line|null} */
    previousSegment = null;
}

// ── Singletons ────────────────────────────────────────────────────────────────

const keyboard    = new Keyboard();
const resource    = new ResourceLoader();
const timeObject  = new TimeTracker();

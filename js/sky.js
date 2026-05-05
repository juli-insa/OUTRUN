/**
 * @file sky.js
 * Two-layer parallax sky with clouds.
 *
 * Behaviour:
 *  - Clouds only move horizontally when the player steers left/right.
 *  - Far layer moves at PARALLAX_FAR speed  (slower  → feels distant).
 *  - Near layer moves at PARALLAX_NEAR speed (faster → feels closer).
 *  - Each layer tiles seamlessly: when a cloud exits one side it wraps
 *    around to the other, so the sky never looks empty.
 *
 * Usage:
 *   const sky = new Sky();
 *   sky.init(resource.get("nuve"));   // call once after assets load
 *   // every frame, before road.render():
 *   sky.update(player.x);
 *   sky.render(render.renderingContext);
 */

class SkyCloud {
    /**
     * @param {number} x        canvas X position
     * @param {number} y        canvas Y position
     * @param {number} scale    draw scale (0.5 = half size)
     * @param {number} alpha    opacity 0–1
     */
    constructor(x, y, scale, alpha) {
        this.x     = x;
        this.y     = y;
        this.scale = scale;
        this.alpha = alpha;
    }
}

class SkyLayer {
    /**
     * @param {object} opts
     * @param {number} opts.y          vertical centre of the layer in canvas px
     * @param {number} opts.ySpread    random Y variance in px
     * @param {number} opts.scale      base draw scale for clouds in this layer
     * @param {number} opts.scaleSpread  random scale variance
     * @param {number} opts.alpha      base opacity
     * @param {number} opts.count      number of clouds in the layer
     * @param {number} opts.parallax   how many px the layer shifts per unit of player.x
     * @param {number} canvasW
     */
    constructor(opts, canvasW) {
        this.parallax = opts.parallax;
        this.canvasW  = canvasW;
        this.clouds   = [];
        this.offsetX  = 0;   // accumulated horizontal shift in canvas px

        // Distribute clouds evenly across the canvas width (×2 for wrap buffer)
        const span = canvasW * 2;
        for (let i = 0; i < opts.count; i++) {
            const x     = (i / opts.count) * span - canvasW * 0.5;
            const y     = opts.y + (Math.random() - 0.5) * opts.ySpread;
            const scale = opts.scale + (Math.random() - 0.5) * opts.scaleSpread;
            const alpha = opts.alpha - Math.random() * 0.15;
            this.clouds.push(new SkyCloud(x, y, Math.max(0.2, scale), alpha));
        }
    }

    /**
    
     * @param {number} curve     road segment curve (-∞ to +∞, negative = left, positive = right)
     */
    update( curve) {
       // const playerDelta = playerX - prevX;

        // Clouds move opposite to player steering.
        // When the player moves right, clouds move left; when left, clouds move right.
        //this.offsetX -= playerDelta * this.parallax;

        // Clouds also move opposite to the road curve direction.
        // A left curve (negative) shifts clouds right, a right curve (positive) shifts them left.
        this.offsetX -= curve * this.parallax * 0.005;
        
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLImageElement}         img
     */
    render(ctx, img) {
        const W = this.canvasW;
        ctx.save();

        for (const cloud of this.clouds) {
            const w = img.width  * cloud.scale;
            const h = img.height * cloud.scale;

            // Wrap offset so clouds cycle seamlessly
            let drawX = ((cloud.x + this.offsetX) % W + W * 0.5) % (W * 2) - W * 0.5;

            ctx.globalAlpha = cloud.alpha;
            ctx.drawImage(img, drawX - w * 0.5, cloud.y - h * 0.5, w, h);

            // Draw a copy one full canvas-width away to fill wrap gap
            ctx.drawImage(img, drawX - w * 0.5 + W * 2, cloud.y - h * 0.5, w, h);
            ctx.drawImage(img, drawX - w * 0.5 - W * 2, cloud.y - h * 0.5, w, h);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }




}

class Sky {
    /** @type {HTMLImageElement} */
    #img     = null;
    /** @type {SkyLayer} */
    #far     = null;
    /** @type {SkyLayer} */
    #near    = null;
    /** @type {SkyLayer} */
    #bushes  = null;
    /** @type {SkyLayer} */
    #mountains = null;

   // #prevPlayerX = 0;

    /** How high on screen the sky occupies (0–1 of canvas height) */
    static SKY_HEIGHT_RATIO = 0.70;

    #stage = 1;

    /**
     * Call once after the cloud image is loaded.
     * @param {HTMLImageElement} cloudImage
     */
    init(cloudImage) {
        this.#img = cloudImage;
        const W   = CANVAS.width;
        const H   = CANVAS.height;
        const skyH = H * Sky.SKY_HEIGHT_RATIO;

        // Far layer — smaller, higher, slower parallax
        this.#far = new SkyLayer({
            y:           skyH * 0.30,
            ySpread:     skyH * 0.15,
            scale:       0.45,
            scaleSpread: 0.15,
            alpha:       0.55,
            count:       2,
            parallax:    100,   // px per unit of player.x delta
        }, W);

        // Near layer — bigger, lower, faster parallax
        this.#near = new SkyLayer({
            y:           skyH * 0.65,
            ySpread:     skyH * 0.12,
            scale:       1.75,
            scaleSpread: 0.20,
            alpha:       0.85,
            count:       1,
            parallax:    200,
        }, W);

        // Bushes layer — on the horizon, medium parallax
        this.#bushes = new SkyLayer({
            y:           skyH * 0.70,
            ySpread:     skyH * 0.05,
            scale:       2,
            scaleSpread: 0.1,
            alpha:       0.7,
            count:       4,
            parallax:    150,
        }, W);

        this.#mountains = new SkyLayer({
            y:           skyH * 0.68,
            ySpread:     skyH * 0.05,
            scale:       2,
            scaleSpread: 0.1,
            alpha:       0.7,
            count:       4,
            parallax:    150,
        }, W);
    }     
    setStage(stage) {
        this.#stage = stage;
    }

    /**
     * Call every frame with the current player.x and road curve.
     * @param {number} playerX
     * @param {number} curve
     */
    update( curve) {
        if (!this.#far) return;
        this.#far.update( curve);
        this.#near.update( curve);
        if (this.#stage === 1 && this.#bushes) {
            this.#bushes.update( curve);
        }
        if (this.#stage === 2 && this.#mountains) {
            this.#mountains.update( curve);
        }
       // this.#prevPlayerX = playerX;
    }

    /**
     * Draw sky background + both cloud layers.
     * Call this BEFORE road.render() so the road draws on top.
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.#img) return;

        const W    = CANVAS.width;
        const H    = CANVAS.height;
        const skyH = H * Sky.SKY_HEIGHT_RATIO;

        // Sky gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, skyH);
        if (this.#stage === 1) {
            grad.addColorStop(0,   "#33a4f5");
            grad.addColorStop(0.6, "#5fbcf6");
            grad.addColorStop(1,   "#77c6f8");
        } else if (this.#stage === 2) {
            grad.addColorStop(0,   "#995aff");
            grad.addColorStop(0.6, "#d1a8ff");
            grad.addColorStop(1,   "#f3c8ff");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, skyH);

        // Clouds — far first (painter's order)
        this.#far.render(ctx,  this.#img);
        this.#near.render(ctx, this.#img);

        if (this.#stage === 1 && this.#bushes) {
            this.#bushes.render(ctx, resource.get("arbusto"));
        }
        if (this.#stage === 2 && this.#mountains) {
            this.#mountains.render(ctx, resource.get("mountain"));
        }
    }
}
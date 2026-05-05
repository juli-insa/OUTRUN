/**
 * @file render.js
 * Wrapper around CanvasRenderingContext2D.
 * All drawing primitives live here; no game logic.
 */

class Render {
    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /** @param {CanvasRenderingContext2D} ctx */
    constructor(ctx) {
        this.#ctx = ctx;
        // Crisp pixel art – disable anti-aliasing
        ctx.imageSmoothingEnabled        = false;
        ctx.webkitImageSmoothingEnabled  = false;
        ctx.mozImageSmoothingEnabled     = false;
    }

    get renderingContext() { return this.#ctx; }

    clear(x, y, w, h)  { this.#ctx.clearRect(x, y, w, h); }
    save()             { this.#ctx.save();    }
    restore()          { this.#ctx.restore(); }

    // ── Primitives ─────────────────────────────────────────────

    /**
     * Draw a filled trapezoid between two horizontal spans.
     * @param {number} x1 @param {number} y1 @param {number} w1
     * @param {number} x2 @param {number} y2 @param {number} w2
     * @param {string} color
     */
    drawQuad(x1, y1, w1, x2, y2, w2, color = "green") {
        this.#polygon(color,
            x1 - w1, y1,
            x1 + w1, y1,
            x2 + w2, y2,
            x2 - w2, y2,
        );
    }

    /**
     * Draw a filled polygon from flat coord pairs.
     * @param {string} color
     * @param {...number} coords  x0,y0, x1,y1, …
     */
    #polygon(color, ...coords) {
        if (coords.length < 4) return;
        const ctx = this.#ctx;
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) {
            ctx.lineTo(coords[i], coords[(i + 1) % coords.length]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ── Road ───────────────────────────────────────────────────

    /**
     * Draw one road segment (asphalt, grass, rumble, centre strip).
     * @param {object}      colors
     * @param {ScreenPoint} prev
     * @param {ScreenPoint} curr
     * @param {Camera}      camera
     */
    drawRoad(colors, prev, curr, camera) {
        const W = camera.screen.width;

        // Asphalt
        this.drawQuad(prev.x, prev.y, prev.w, curr.x, curr.y, curr.w, colors.road);

        // Left grass
        this.#polygon(colors.grass,
            0, prev.y,
            prev.x - prev.w * 1.3, prev.y,
            curr.x - curr.w * 1.3, curr.y,
            0, curr.y,
        );
        // Right grass
        this.#polygon(colors.grass,
            prev.x + prev.w * 1.3, prev.y,
            W, prev.y,
            W, curr.y,
            curr.x + curr.w * 1.3, curr.y,
        );
        // Left rumble
        this.#polygon(colors.rumble,
            prev.x - prev.w * 1.3, prev.y,
            prev.x - prev.w,       prev.y,
            curr.x - curr.w,       curr.y,
            curr.x - curr.w * 1.3, curr.y,
        );
        // Right rumble
        this.#polygon(colors.rumble,
            prev.x + prev.w * 1.3, prev.y,
            prev.x + prev.w,       prev.y,
            curr.x + curr.w,       curr.y,
            curr.x + curr.w * 1.3, curr.y,
        );
        // Centre strip (optional)
        if (colors.strip) {
            const v = 1 / 100;
            this.drawQuad(prev.x, prev.y, prev.w * v, curr.x, curr.y, curr.w * v, colors.strip);
        }
    }

    // ── Sprites ────────────────────────────────────────────────

    /**
     * Draw a road-side sprite or the player car, clipped to the horizon.
     * @param {Sprite|AnimatedSprite} sprite
     * @param {Camera} camera
     * @param {Player} player
     * @param {*}      _enemy   reserved for future use
     * @param {number} roadWidth
     * @param {number} scale
     * @param {number} destX
     * @param {number} destY
     * @param {number} clip
     * @param {boolean} [animate=true]
     */
    drawSprite(sprite, camera, player, _enemy, roadWidth, scale, destX, destY, clip, animate = true) {
        const mid     = camera.screen.midpoint;
        const FACTOR  = 1 / 3;
        const offsetY = sprite.offsetY || 1;
        const destW   = (sprite.width  * scale * mid.x) * (roadWidth * sprite.scaleX / (player.width || 64)) * FACTOR;
        const destH   = (sprite.height * scale * mid.x) * (roadWidth * sprite.scaleY / (player.width || 64)) * FACTOR;

        const drawX = Math.round(destX - destW * 0.5);
        const drawY = Math.round(destY - destH * offsetY);
        const drawW = Math.round(destW);
        const clipH = clip ? Math.max(0, drawY + destH - clip) : 0;
        const drawH = Math.round(destH - clipH);

        if (clipH >= destH) return;

        if (sprite instanceof AnimatedSprite) {
            sprite.updateAnimation(animate);
            const fc      = sprite.getFrameCoords();
            const srcH    = fc.height - (fc.height * clipH / destH);
            this.#ctx.drawImage(sprite.image, fc.x, fc.y, fc.width, srcH, drawX, drawY, drawW, drawH);
            
       } else {
    const srcH = sprite.height - sprite.height * clipH / destH;

    if (sprite.flipX) {
        this.#ctx.save();
        this.#ctx.scale(-1, 1);
        this.#ctx.drawImage(sprite.image, 0, 0, sprite.width, srcH,
            -(drawX + drawW), drawY, drawW, drawH);
        this.#ctx.restore();
    } else {
        this.#ctx.drawImage(sprite.image, 0, 0, sprite.width, srcH,
            drawX, drawY, drawW, drawH);
    }
}
        
    }

    // ── Tunnel ─────────────────────────────────────────────────

    /**
     * Draw the tunnel walls for a single segment.
     * @param {string}      color
     * @param {Tunnel}      tunnel
     * @param {number}      py
     * @param {number}      clipH
     * @param {Camera}      camera
     * @param {number}      h
     * @param {ScreenPoint} screen
     */
    drawTunnel(color, tunnel, py, clipH, camera, h, screen) {
        const lf  = tunnel.leftFace;
        const rf  = tunnel.rightFace;
        const vis = tunnel.visibleFaces;
        const W   = camera.screen.width;

        if (vis.leftFront) {
            this.#polygon(color,
                0,                              py,
                screen.x - screen.w * lf.offsetX1, py,
                screen.x - screen.w * lf.offsetX2, screen.y - clipH,
                0,                              screen.y - clipH,
            );
        }
        if (vis.rightFront) {
            this.#polygon(color,
                W,                              py,
                screen.x + screen.w * rf.offsetX1, py,
                screen.x + screen.w * rf.offsetX2, screen.y - clipH,
                W,                              screen.y - clipH,
            );
        }
        if (vis.topFront) {
            this.#polygon(color,
                0, py, W, py, W, py + h, 0, py + h,
            );
            if (tunnel.title) {
                const ctx = this.#ctx;
                ctx.save();
                ctx.font          = `${h * 0.5}px monospace`;
                ctx.fillStyle     = "blue";
                ctx.textAlign     = "center";
                ctx.textBaseline  = "middle";
                ctx.fillText(tunnel.title, screen.x, py + h * 0.5);
                ctx.restore();
            }
        }

        const prev = tunnel.previousSegment;
        if (!prev) return;

        const ps  = prev.points.screen;
        const pt  = prev.tunnel;
        const plf = pt.leftFace;
        const prf = pt.rightFace;

        if (vis.leftTop) {
            this.#polygon(color,
                0,                             pt.py,
                ps.x - ps.w * plf.offsetX1,   pt.py,
                screen.x - screen.w * lf.offsetX1, py,
                0,                             py,
            );
        }
        if (vis.rightTop) {
            this.#polygon(color,
                W,                             pt.py,
                ps.x + ps.w * plf.offsetX1,   pt.py,
                screen.x + screen.w * lf.offsetX1, py,
                W,                             py,
            );
        }
        if (vis.top) {
            this.#polygon(color,
                ps.x - ps.w * plf.offsetX1,   pt.py,
                ps.x + ps.w * prf.offsetX1,   pt.py,
                screen.x + screen.w * rf.offsetX1, py,
                screen.x - screen.w * lf.offsetX1, py,
            );
        }
        if (vis.left) {
            this.#polygon(color,
                ps.x - ps.w * plf.offsetX1,   pt.py,
                ps.x - ps.w * plf.offsetX2,   ps.y - pt.clipH,
                screen.x - screen.w * lf.offsetX2, screen.y - clipH,
                screen.x - screen.w * lf.offsetX1, py,
            );
        }
        if (vis.right) {
            this.#polygon(color,
                ps.x + ps.w * prf.offsetX1,   pt.py,
                ps.x + ps.w * prf.offsetX2,   ps.y - pt.clipH,
                screen.x + screen.w * rf.offsetX2, screen.y - clipH,
                screen.x + screen.w * rf.offsetX1, py,
            );
        }
    }
}
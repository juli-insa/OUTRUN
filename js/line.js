/**
 * @file line.js
 * A single road segment ("line") in world and screen space.
 */

class WorldPoint {
    x = 0;
    y = 0;
    z = 0;
    w = 0;
}

class ScreenPoint {
    /** Floating-point projected values */
    X = 0;
    Y = 0;
    W = 0;
    /** Rounded pixel values (used for drawing) */
    x = 0;
    y = 0;
    w = 0;
}

class Line {
    scale = 0;
    index = 0;
    curve = 0;
    clip  = 0;

    /** @type {Tunnel|null} */
    tunnel = null;

    /** @type {Sprite[]} */
    sprites = [];

    points = {
        world:  new WorldPoint(),
        screen: new ScreenPoint(),
    };

    #colors = { road: "", grass: "", rumble: "", strip: "", tunnel: "" };

    get colors()       { return this.#colors; }
    set colors(colors) { this.#colors = colors; }

    /**
     * Project this segment from world space into screen space.
     * @param {Camera} camera
     */
    project(camera) {
        const { world, screen } = this.points;
        const mid = camera.screen.midpoint;

        camera.deltaZ = world.z - camera.z;
        const scale   = this.scale = camera.distanceToProjectionPlane / camera.deltaZ;

        screen.X = (1 + (world.x - camera.x) * scale) * mid.x;
        screen.Y = (1 - (world.y - camera.y) * scale) * mid.y;
        screen.W = world.w * scale * camera.screen.width;

        screen.x = Math.round(screen.X);
        screen.y = Math.round(screen.Y);
        screen.w = Math.round(screen.W);
    }

    /**
     * Draw all sprites attached to this segment.
     * @param {Render} render
     * @param {Camera} camera
     * @param {Player} player
     */
    drawSprite(render, camera, player) {
        const { screen, world } = this.points;
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const sprite = this.sprites[i];
            const destX  = screen.X + screen.W * sprite.offsetX;
            render.drawSprite(sprite, camera, player, null, world.w, this.scale, destX, screen.Y, this.clip);
        }
        return this;
    }

    /**
     * Draw the tunnel geometry for this segment (if any).
     * @param {Render} render
     * @param {Camera} camera
     * @param {Player} player
     */
    drawTunnel(render, camera, player) {
        if (!this.tunnel) return this;

        const tunnel         = this.tunnel;
        const { screen }     = this.points;
        const scale          = this.scale;
        const worldH         = tunnel.worldH;
        const mid            = camera.screen.midpoint;

        tunnel.py    = Math.round((1 - (worldH - camera.y) * scale) * mid.y);
        const h      = Math.round(worldH * 0.2 * scale * mid.y);
        tunnel.clipH = this.clip ? Math.max(0, screen.y - this.clip) : 0;

        if (tunnel.clipH < screen.y - (tunnel.py + h)) {
            render.drawTunnel(this.colors.tunnel, tunnel, tunnel.py, tunnel.clipH, camera, h, screen);
        }
        return this;
    }
}
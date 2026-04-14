/**
 * @file road.js
 * Generates and renders the pseudo-3D road.
 */

class Road {
    /** @type {Line[]} */
    #segments = [];

    get segmentLength()  { return CONFIG.ROAD.SEGMENT_LENGTH;  }
    get rumbleLength()   { return CONFIG.ROAD.RUMBLE_LENGTH;   }
    get segmentsLength() { return this.#segments.length;       }
    get trackLength()    { return this.segmentsLength * this.segmentLength; }
    get width()          { return CONFIG.ROAD.WIDTH;           }

    // ── Segment access ─────────────────────────────────────────

    /** @param {number} cursor */
    getSegment(cursor) {
        return this.#segments[Math.floor(cursor / this.segmentLength) % this.segmentsLength];
    }

    /** @param {number} index */
    getSegmentFromIndex(index) {
        return this.#segments[index % this.segmentsLength];
    }

    // ── Creation ───────────────────────────────────────────────

    create(segmentsNumber = CONFIG.ROAD.TOTAL_SEGMENTS) {
        const rumble = this.rumbleLength;
        let previousTunnelSegment = null;
        let hillAngle = 0;

        for (let i = 0; i < segmentsNumber + rumble; i++) {
            const line  = new Line();
            line.index  = i;
            line.colors = this.#colorsForIndex(i);

            const world = line.points.world;
            world.w = this.width;
            world.z = (i + 1) * this.segmentLength;

            this.#applyCurve(line, i);
            previousTunnelSegment = this.#applyHillAndTunnel(line, i, hillAngle, previousTunnelSegment);
            if (i > 1000 && hillAngle < 360 * 2) hillAngle++;

            this.#addSprites(line, i);
            this.#segments.push(line);
        }

        // Starting-line rumble strip
        for (let j = 0; j < rumble; j++) {
            this.#segments[j].colors.road = "#333";
        }
    }

    // ── Private helpers ────────────────────────────────────────

    /**
     * Return alternating dark/light color set for a given segment index.
     * @param {number} index
     */
    #colorsForIndex(index) {
        const isDark = Math.floor(index / this.rumbleLength) % 2 === 0;
        // Spread so each Line gets its own mutable copy
        return isDark
            ? { ...CONFIG.COLORS.DARK  }
            : { ...CONFIG.COLORS.LIGHT };
    }

    /** Apply curve values based on track position. */
    #applyCurve(line, i) {
        if (i > 500 && i < 700)   line.curve =  7.5;
        if (i >= 700 && i < 900)  line.curve = -0.9;
        if (i > 1000 && i < 1360) line.curve =  1;
        if (i >= 1360 && i < 1720) line.curve = -1;
    }

    /**
     * Apply hill geometry and tunnel data.
     * Returns the updated previousTunnelSegment reference.
     */
    #applyHillAndTunnel(line, i, hillAngle, previousTunnelSegment) {
        const world = line.points.world;

        if (i > 1000 && hillAngle < 360 * 2) {
            world.y = Math.sin(hillAngle / 180 * Math.PI) * 2000;
        }

        if (i === 1800) {
            world.y             = Math.sin(Math.PI * 0.5) * 500;
            line.colors.road    = "yellow";
        }

        if (i > 1000 && i < 1720) {
            previousTunnelSegment = this.#addTunnel(line, i, world.y, previousTunnelSegment);
        }

        return previousTunnelSegment;
    }

    /**
     * Attach a Tunnel object to this line segment if needed.
     * @returns {Line} updated previousTunnelSegment
     */
    #addTunnel(line, i, worldY, previousTunnelSegment) {
        const isFirst  = i === 1001;
        const isRumble = i % this.rumbleLength === 0;
        if (!isFirst && !isRumble) return previousTunnelSegment;

        const tunnel    = new Tunnel();
        tunnel.worldH   = 5000 + Math.abs(worldY);
        tunnel.leftFace.offsetX1  = 1.7;
        tunnel.leftFace.offsetX2  = 1.3;
        tunnel.rightFace.offsetX1 = 1.7;
        tunnel.rightFace.offsetX2 = 1.3;

        if (isFirst) {
            tunnel.title      = "Tunnel Racing Pseudo 3D";
            line.colors.tunnel = "#fff";
        } else {
            tunnel.previousSegment      = previousTunnelSegment;
            tunnel.visibleFaces.top     = false;
        }

        line.tunnel = tunnel;
        return line;
    }

    /** Add decorative sprites (trees, finish line) to a segment. */
    #addSprites(line, i) {
        const rumble = this.rumbleLength;

        if (i % rumble === 0) {
            const tree    = new Sprite();
            tree.image    = resource.get("tree1");
            tree.offsetX  = Math.floor(i / 3) % 2
                ? (-Math.random() * 3) - 2
                :  (Math.random() * 3) + 2;
            line.sprites.push(tree);
        }

        if (i === 500) {
            const tree2   = new Sprite();
            tree2.image   = resource.get("tree2");
            tree2.offsetX = -1;
            line.sprites.push(tree2);
        }

        if (i === 5) {
            const finish    = new Sprite();
            finish.image    = resource.get("finish-line");
            finish.offsetX  = 0;
            finish.scaleX   = 1.2;
            line.sprites.push(finish);
        }
    }

    // ── Rendering ──────────────────────────────────────────────

    /**
     * @param {Render} render
     * @param {Camera} camera
     * @param {Player} player
     */
    render(render, camera, player) {
        const segmentsLength  = this.segmentsLength;
        const baseSegment     = this.getSegment(camera.cursor);
        const startPos        = baseSegment.index;
        const visible         = CONFIG.ROAD.VISIBLE_SEGMENTS;
        let maxY = camera.screen.height;
        let x    = 0;
        let dx   = 0;

        camera.y = camera.h + baseSegment.points.world.y;

        // Forward pass – project & draw road geometry
        for (let i = startPos; i < startPos + visible; i++) {
            const seg    = this.getSegmentFromIndex(i);
            camera.z     = camera.cursor - (i >= segmentsLength ? this.trackLength : 0);
            camera.x     = player.x * seg.points.world.w - x;

            seg.project(camera);
            x  += dx;
            dx += seg.curve;

            const sp = seg.points.screen;
            seg.clip = maxY;

            if (sp.y >= maxY || camera.deltaZ <= camera.distanceToProjectionPlane) continue;

            if (i > 0) {
                const prev = this.getSegmentFromIndex(i - 1);
                const pp   = prev.points.screen;
                if (sp.y >= pp.y) continue;
                render.drawRoad(seg.colors, pp, sp, camera);
            }

            maxY = sp.y;
        }

        // Backward pass – draw sprites and tunnels (painter's algorithm)
        for (let i = (visible + startPos) - 1; i > startPos; i--) {
            const seg = this.getSegmentFromIndex(i);
            seg.drawSprite(render, camera, player);
            seg.drawTunnel(render, camera, player);
        }
    }
}

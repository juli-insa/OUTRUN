/**
 * @file road.js
 * Genera y renderiza la ruta pseudo-3D.
 *
 * Colisión con sprites:
 *  - player.x va de -1 (borde izq calzada) a +1 (borde der calzada).
 *  - sprite.offsetX es el multiplicador aplicado sobre screen.W para
 *    posicionar el sprite en pantalla. Un árbol a offsetX=1.5 está
 *    fuera del borde derecho de la calzada.
 *  - La colisión ocurre sólo cuando el jugador sale de la calzada
 *    (|player.x| > ROAD_EDGE) y hay un árbol del mismo lado.
 */

class Road {
    /** @type {Line[]} */
    #segments = [];

    get segmentLength()  { return CONFIG.ROAD.SEGMENT_LENGTH;  }
    get rumbleLength()   { return CONFIG.ROAD.RUMBLE_LENGTH;   }
    get segmentsLength() { return this.#segments.length;       }
    get trackLength()    { return this.segmentsLength * this.segmentLength; }
    get width()          { return CONFIG.ROAD.WIDTH;           }

    getSegment(cursor) {
        return this.#segments[Math.floor(cursor / this.segmentLength) % this.segmentsLength];
    }

    getSegmentFromIndex(index) {
        return this.#segments[index % this.segmentsLength];
    }

    clear() {
        this.#segments = [];
    }

    create(segmentsNumber = CONFIG.ROAD.TOTAL_SEGMENTS, stage = 1) {
        const rumble = this.rumbleLength;
        let previousTunnelSegment = null;
        let hillAngle = 0;

        for (let i = 0; i < segmentsNumber + rumble; i++) {
            const line  = new Line();
            line.index  = i;
            line.colors = this.#colorsForIndex(i, stage);

            const world = line.points.world;
            world.w = this.width;
            world.z = (i + 1) * this.segmentLength;

            this.#applyCurve(line, i, stage);
            previousTunnelSegment = this.#applyHillAndTunnel(line, i, hillAngle, previousTunnelSegment);
            if (i > 1000 && hillAngle < 360 * 2) hillAngle++;

            this.#addSprites(line, i, stage);
            this.#segments.push(line);
        }

        for (let j = 0; j < rumble; j++) {
            this.#segments[j].colors.road = "#424242";
        }
    }
    

    #colorsForIndex(index, stage = 1) {
        const isDark = Math.floor(index / this.rumbleLength) % 2 === 0;
        const colors = stage === 2 ? CONFIG.COLORS2 : CONFIG.COLORS;
        return isDark
            ? { ...colors.DARK  }
            : { ...colors.LIGHT };
    }

    #applyCurve(line, i, stage = 1) {
        if (stage === 1) {
            if (i > 700  && i < 900)   line.curve = -7.5;
            if (i > 1000 && i < 1360)  line.curve =  4.0;
            if (i >= 1360 && i < 1720) line.curve = -5.0;
            if (i > 2000 && i < 2200)  line.curve = -6.5;
            if (i > 2600 && i < 2800)  line.curve =  5.0;
            if (i > 2800 && i < 3200)  line.curve = -6.5;
            if (i > 3400 && i < 3600)  line.curve = -5.5;
            if (i > 3800 && i < 3900)  line.curve = -3.5;
            if (i > 4000 && i < 4100)  line.curve =  3.5;
            
        } else if (stage === 2) {
            // Curvas diferentes para stage 2
            if (i > 600  && i < 800)   line.curve =  5.0;
            if (i > 800  && i < 900)   line.curve = 1.0;
            //if (i > 900  && i < 1200)  line.curve = 5.0;
            if (i > 1300 && i < 1800)  line.curve =  -6.5;
            if (i > 1800 && i < 2000)  line.curve = -4.0;
            if (i > 2200 && i < 2400)  line.curve =  5.5;
            if (i > 2600 && i < 2900)  line.curve = -6.0;
            if (i > 3100 && i < 3300)  line.curve =  4.0;
            if (i > 3500 && i < 3700)  line.curve = 5.5;
            if (i > 3900 && i < 4100)  line.curve =  3.0;
        }
    }

    #applyHillAndTunnel(line, i, hillAngle) {
        const world = line.points.world;
        
        // Primera colina: 600-1720
        if (i > 300 && i < 720)             
             world.y = Math.sin(hillAngle / 180 * Math.PI) * 2000;

        if (i > 400 && i < 720) {
            const localHill = ((i - 400) / (720 - 400)) * 360;
            world.y = Math.sin(localHill / 180 * Math.PI) * 2000;
        }
        
        // Segunda colina: 1720-2000
        if (i > 1720 && i < 2000) {
            const localHill = ((i - 1720) / (2000 - 1720)) * 360;
            world.y = Math.sin(localHill / 180 * Math.PI) * 2000;
        }
        
        // Tercera colina: 3200-3400
        if (i > 3200 && i < 3400) {
            const localHill = ((i - 3200) / (3400 - 3200)) * 360;
            world.y = Math.sin(localHill / 180 * Math.PI) * 1500;
        }
        
        // Cuarta colina: 3800-4100
        if (i > 3800 && i < 4100) {
            const localHill = ((i - 3800) / (4100 - 3800)) * 360;
            world.y = Math.sin(localHill / 180 * Math.PI) * 2000;
        }
        
        return line.tunnel;
    }

    #addSprites(line, i, stage = 1) {
        const rumble = this.rumbleLength;

        

        if (i % rumble === 0) {
            const tree      = new Sprite();
            tree.image      = stage === 2 ? resource.get("tree3") : resource.get("tree1");
            tree.scaleY = 2 + Math.random() * 0.1;
            tree.scaleX = 2 + Math.random() * 0.1;
            tree.collidable = true;
            // offsetX negativo = izquierda, positivo = derecha
            // Valores ≥ 1.4 están fuera de la calzada (borde empieza en 1.0)
            tree.offsetX    = Math.floor(i / 1) % 2
                ? (-Math.random() * 0) - 1.4   // izquierda: -1.4 a -2.4
                :  (Math.random() * 0) + 1.4;  // derecha:   +1.4 a +2.4
            // Guardar el lado para colisión: -1 izquierda, +1 derecha
            tree.roadSide   = tree.offsetX < 0 ? -1 : 1;
            if (tree.roadSide === -1) {
                tree.flipX = true;  // voltear horizontalmente los árboles de la izquierda
            }
            line.sprites.push(tree);
        }

        // Árboles grandes — quedarlos FUERA de la calzada
        const bigTreeSegs = 
           [580, 610, 640, 670, 700, 730, 760, 790, 820, 850, 880, 
            910, 940, 970, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1230, 1260,
            1290, 1320, 1350, 1380, 1410, 1440, 1470, 1500, 1530, 1560, 1590,
            1610, 1640, 1670, 1700, 1990, 2020, 2050, 2080, 2110, 2140,
            2170, 2200,2570, 2600, 2630, 2600, 2690, 2720, 2750, 2780,
            2810, 2840, 2870, 2900, 2930, 2960, 2990, 3020, 3050, 3080, 3110, 3140, 3170, 3370, 3400, 3430, 3460, 
            3490, 3520, 3550, 3580, 3770, 3800, 3820, 3850, 3870, 3970,
            4000, 4020, 4050, 4070];
        if (bigTreeSegs.includes(i)) {
            const tree      = new Sprite();
            tree.image      = stage === 2 ? resource.get("tree2") : resource.get("tree2");
            tree.scaleY = 2 + Math.random() * 0.5;
            tree.scaleX = 2 + Math.random() * 0.5;
            tree.collidable = true;
            tree.offsetX    = 1.5;   // era 1.0 → estaba dentro de calzada
            tree.flipX      = true;
            tree.collidable = true;
            tree.roadSide   = 1;  
            if (line.curve > 0) {
                tree.flipX = false; 
                tree.offsetX = - 1.5;  // voltear horizontalmente los árboles del lado derecho
            }
            line.sprites.push(tree);
        }

        

        if (i === 18) {
            const semaforo      = new AnimatedSprite();
            semaforo.image      = resource.get("semaforo");
            semaforo.offsetX    = -1.5;
            semaforo.frameSpeed = 0.2;
            // line.sprites.push(semaforo);
        }

        if (i === 20) {
            const finish      = new Sprite();
            finish.image      = resource.get("finish-line");
            finish.offsetX    = 0;
            finish.scaleX     = 1.2;
            finish.collidable = false;
            line.sprites.push(finish);
        }
    }

    render(render, camera, player) {
        const segmentsLength = this.segmentsLength;
        const baseSegment    = this.getSegment(camera.cursor);
        const startPos       = baseSegment.index;
        const visible        = CONFIG.ROAD.VISIBLE_SEGMENTS;
        let maxY = camera.screen.height;
        let x    = 0;
        let dx   = 0;

        camera.y = camera.h + baseSegment.points.world.y;

        for (let i = startPos; i < startPos + visible; i++) {
            const seg = this.getSegmentFromIndex(i);
            camera.z  = camera.cursor - (i >= segmentsLength ? this.trackLength : 0);
            camera.x  = player.x * seg.points.world.w - x;

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

        for (let i = (visible + startPos) - 1; i > startPos; i--) {
            const seg = this.getSegmentFromIndex(i);
            seg.drawSprite(render, camera, player);
            seg.drawTunnel(render, camera, player);
        }
    }

    // ── Colisión con sprites de borde de carretera ─────────────

    /**
     * Colisión basada en el borde de la calzada:
     *  - El jugador colisiona con un árbol del lado derecho si player.x > EDGE_THRESHOLD.
     *  - El jugador colisiona con un árbol del lado izquierdo si player.x < -EDGE_THRESHOLD.
     *  - No hay colisión en el centro de la pista.
     *
     * EDGE_THRESHOLD = 0.9 → el jugador tiene que salirse claramente
     * de la calzada para chocar (la calzada va de -1 a +1).
     *
     * @param {Player} player
     * @param {number} camSegIndex
     * @returns {boolean}
     */
    checkSpriteCollision(player, camSegIndex) {
        const EDGE_THRESHOLD = 2.5;  // player.x mínimo para considerarlo "fuera"

        // Solo revisar si el jugador está cerca del borde
        const px = player.x;
        if (Math.abs(px) < EDGE_THRESHOLD) return false;

        const playerSide = px > 0 ? 1 : -1;  // +1 derecha, -1 izquierda

        // Revisar segmento actual y vecinos cercanos
        for (let offset = -1; offset <= 2; offset++) {
            const seg = this.getSegmentFromIndex(camSegIndex + offset);
            if (!seg) continue;

            for (const sprite of seg.sprites) {
                if (!sprite.collidable) continue;

                // El sprite tiene que estar del mismo lado que el jugador
                const spriteSide = sprite.roadSide ?? (sprite.offsetX < 0 ? -1 : 1);
                if (spriteSide !== playerSide) continue;

                // Hay colisión: el jugador salió al borde donde hay árbol
                return true;
            }
        }
        return false;
    }
}

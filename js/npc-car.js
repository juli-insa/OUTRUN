/**
 * @file npc-car.js
 * Autos no-jugables al estilo OutRun.
 *
 * Clave del movimiento:
 *  La cámara avanza: cursor += step + acceleration (cada frame)
 *  donde step = SEGMENT_LENGTH (200) y acceleration llega hasta MAX_ACCELERATION (300).
 *  El NPC avanza: cursor += step * speedFactor (cada frame).
 *  Con speedFactor < 1 el jugador siempre puede alcanzarlo y pasarlo.
 */

class NpcCar {
    x            = 0;   // road-space lateral (-1..+1)
    cursor       = 0;   // posición en world-z (igual que camera.cursor)
    segmentIndex = 0;   // índice del segmento actual

    /** @type {Sprite} */
    sprite = null;

    /** @type {Line|null} */
    _attachedSeg = null;

    /** Pasos por frame = step * speedFactor */
    #speedFactor = 0;

    /**
     * @param {number}           startCursor
     * @param {number}           laneX         -0.4 izquierda | +0.4 derecha
     * @param {number}           speedFactor   0..1, fracción del step por frame
     * @param {HTMLImageElement} image
     */
    constructor(startCursor, laneX, speedFactor, image) {
        this.cursor       = startCursor;
        this.x            = laneX;
        this.#speedFactor = speedFactor;

        this.sprite       = new Sprite();
        this.sprite.image = image;
    }

    /**
     * Avanza el NPC cada frame, igual que la cámara pero más lento.
     * @param {Road}   road
     * @param {number} playerAcceleration  camera.acceleration
     */
    update(road, playerAcceleration) {
        const step     = road.segmentLength;   // 200
        const trackLen = road.trackLength;
        const maxAcc   = CONFIG.CAMERA.MAX_ACCELERATION; // 300

        // El NPC avanza step * factor pasos fijos por frame.
        // Cuando el jugador tiene acceleration alta lo supera; cuando decelera
        // puede quedar atrás o estar al mismo nivel.
        this.cursor += step * this.#speedFactor;

        // Wrap
        if (this.cursor >= trackLen) this.cursor -= trackLen;
        if (this.cursor <  0)        this.cursor += trackLen;

        const seg = road.getSegment(this.cursor);
        if (!seg) return;

        // Deriva en curva (igual que el jugador)
        const speed255 = Math.round((playerAcceleration / maxAcc) * 255);
        this.x        += seg.curve * speed255 * Player.DRIFT_FACTOR;
        this.x         = Math.max(-0.92, Math.min(0.92, this.x));

        this.segmentIndex = seg.index;
    }

    /**
     * Colisión con el jugador: si están en el mismo segmento y cerca
     * lateralmente, frena al jugador.
     */
    checkCollision(player, camera, road, camSegIndex) {
        const totalSegs = road.segmentsLength;
        let diff = Math.abs(this.segmentIndex - camSegIndex);
        if (diff > totalSegs / 2) diff = totalSegs - diff;
        if (diff > 4) return;

        if (Math.abs(player.x - this.x) < 0.22) {
            camera.acceleration *= 0.45;
        }
    }

    /** Adjunta el sprite al segmento — llamar ANTES de road.render(). */
    attach(road) {
        const seg = road.getSegmentFromIndex(this.segmentIndex);
        if (!seg) return;
        this.sprite.offsetX = this.x;
        seg.sprites.push(this.sprite);
        this._attachedSeg = seg;
    }

    /** Desadjunta el sprite — llamar DESPUÉS de road.render(). */
    detach() {
        if (!this._attachedSeg) return;
        const idx = this._attachedSeg.sprites.indexOf(this.sprite);
        if (idx !== -1) this._attachedSeg.sprites.splice(idx, 1);
        this._attachedSeg = null;
    }

    // ── Factory ───────────────────────────────────────────────

    /**
     * Crea una flota distribuida uniformemente en el circuito.
     *
     * speedFactor reference:
     *   - jugador sin acelerar: avanza ~1 step/frame
     *   - jugador acelerando al máximo: ~2.5 steps/frame
     *   - NPCs a 0.5–0.9: siempre más lentos en crucero, el jugador los pasa
     *
     * @param {Road}             road
     * @param {HTMLImageElement} image
     * @returns {NpcCar[]}
     */
    static createFleet(road, image) {
        const trackLen = road.trackLength;
        const count    = 10;
        const lanes    = [-0.38, 0.38];
        const cars     = [];

        for (let i = 0; i < count; i++) {
            // Distribuir uniformemente, saltando la zona de salida
            const startCursor = trackLen * (0.05 + i * 0.09);
            const laneX       = lanes[i % 2];
            // Velocidades escalonadas: 0.55 a 0.85 steps/frame
            // El jugador con aceleración (>1 step) los alcanza a todos
            const speedFactor = 0.55 + (i % 5) * 0.06;
            cars.push(new NpcCar(startCursor, laneX, speedFactor, image));
        }
        return cars;
    }
}

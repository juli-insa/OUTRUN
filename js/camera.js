/**
 * @file camera.js
 * Represents the player's viewpoint over the road.
 */

class ScreenInfo {
    get width()  { return CANVAS.width;  }
    get height() { return CANVAS.height; }

    midpoint = {
        get x() { return CANVAS.width  * 0.5; },
        get y() { return CANVAS.height * 0.5; },
    };
}

class Camera {
    x = 0;
    y = CONFIG.CAMERA.HEIGHT;
    z = 0;

    /** Ground height (used to follow road hills) */
    h = CONFIG.CAMERA.HEIGHT;

    cursor       = 0;
    deltaZ       = 0;
    acceleration = 0;

    screen = new ScreenInfo();

    /** Focal length derived from FOV */
    #distToProjectionPlane = 1 / Math.tan(THETA);

    get distanceToProjectionPlane() {
        return this.#distToProjectionPlane;
    }

    /**
     * Move the camera along the road each frame.
     * @param {Road} road
     */
    update(road) {
        const step   = road.segmentLength;
        const length = road.trackLength;
        const delta  = timeObject.delta / 400_000;
        const speed  = timeObject.currentFramerate * step * delta;
        const maxAcc = CONFIG.CAMERA.MAX_ACCELERATION;

        if (keyboard.isKeyDown("arrowup")) {
            this.cursor += step + this.acceleration;
            if (this.acceleration < maxAcc) this.acceleration += speed;

        } else if (keyboard.isKeyDown("arrowdown")) {
            this.cursor -= step;

        } else if (this.acceleration > 0) {
            // Gradual deceleration
            this.acceleration -= speed;
            this.cursor       += step + this.acceleration;
            if (this.acceleration < 0) this.acceleration = 0;
        }

        // Wrap around the track
        if      (this.cursor >= length) this.cursor -= length;
        else if (this.cursor <  0)      this.cursor += length;
    }
}

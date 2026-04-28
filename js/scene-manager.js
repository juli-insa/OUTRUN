/**
 * @file scene-manager.js
 * Routes each frame to the correct scene and handles transitions.
 *
 * Scenes:
 *  INTRO    → static screen + car drives in → player presses Enter
 *  GAMEPLAY → normal racing loop, detects finish-line crossing
 *  FINISH   → confetti celebration, then auto-loops back to INTRO
 */

class SceneManager {
    #current  = CONFIG.SCENES.INTRO;
    #render   = null;
    #camera   = null;
    #player   = null;
    #road     = null;
    #state    = null;

    /** @type {IntroScene}    */ #intro    = null;
    /** @type {GameplayScene} */ #gameplay = null;
    /** @type {GameplayScene2} */ #gameplay2 = null;
    /** @type {FinishScene}   */ #finish   = null;
    /** @type {Sky}           */ #sky      = null;

    /**
     * @param {Render}    render
     * @param {Camera}    camera
     * @param {Player}    player
     * @param {Road}      road
     * @param {GameState} state
     * @param {Sky}       sky
     */
    init(render, camera, player, road, state, sky) {
        this.#render   = render;
        this.#camera   = camera;
        this.#player   = player;
        this.#road     = road;
        this.#state    = state;
        this.#sky      = sky;

        this.#intro    = new IntroScene(this);
        this.#gameplay = new GameplayScene(this);
        this.#gameplay2 = new GameplayScene2(this);
        this.#finish   = new FinishScene(this);

        this.#intro.enter();
    }

    // ── Public API ─────────────────────────────────────────────

    get render()   { return this.#render;   }
    get camera()   { return this.#camera;   }
    get player()   { return this.#player;   }
    get road()     { return this.#road;     }
    get state()    { return this.#state;    }
    get sky()      { return this.#sky;      }
    get current()  { return this.#current;  }

    /**
     * Called every frame from the main loop.
     * @param {number} deltaMs
     */
    update(deltaMs) {
        this.#currentScene().update(deltaMs);
    }

    /** @param {string} sceneName  one of CONFIG.SCENES */
    transitionTo(sceneName) {
        this.#currentScene().exit();
        this.#current = sceneName;
        this.#currentScene().enter();
    }

    // ── Private ────────────────────────────────────────────────

    #currentScene() {
        switch (this.#current) {
            case CONFIG.SCENES.INTRO:    return this.#intro;
            case CONFIG.SCENES.GAMEPLAY: return this.#gameplay;
            case CONFIG.SCENES.GAMEPLAY2: return this.#gameplay2;
            case CONFIG.SCENES.FINISH:   return this.#finish;
        }
    }
}
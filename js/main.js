/**
 * @file main.js
 * Entry point. Creates all objects once, then delegates every frame
 * to the SceneManager which routes to the correct scene.
 */

// ── Game Loop ─────────────────────────────────────────────────────────────────

/** @param {number} time  timestamp from requestAnimationFrame */
function loop(time, sceneManager) {
    requestAnimationFrame((t) => loop(t, sceneManager));

    const deltaMs      = time - timeObject.elapsed;
    timeObject.delta   = deltaMs;
    timeObject.elapsed = time;

    sceneManager.update(deltaMs);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init(time) {
    const render = new Render(CANVAS.getContext("2d"));
    const camera = new Camera();
    const player = new Player();
    const road   = new Road();
    const state  = new GameState();

    // ── Sprites ────────────────────────────────────────────────
    player.sprite.image       = resource.get("car");
    player.sprite.frameWidth  = CONFIG.PLAYER.FRAME_WIDTH;
    player.sprite.frameHeight = CONFIG.PLAYER.FRAME_HEIGHT;
    player.sprite.totalFrames = CONFIG.PLAYER.TOTAL_FRAMES;
    player.sprite.frameSpeed  = CONFIG.PLAYER.FRAME_SPEED;

    player.spriteCardobla.image       = resource.get("cardobla");
    player.spriteCardobla.frameWidth  = CONFIG.PLAYER.FRAME_WIDTH;
    player.spriteCardobla.frameHeight = CONFIG.PLAYER.FRAME_HEIGHT;
    player.spriteCardobla.totalFrames = CONFIG.PLAYER.TOTAL_FRAMES;
    player.spriteCardobla.frameSpeed  = CONFIG.PLAYER.FRAME_SPEED;

    // ── Road ───────────────────────────────────────────────────
    road.create();

    // ── Scene manager ──────────────────────────────────────────
    const sceneManager = new SceneManager();
    sceneManager.init(render, camera, player, road, state);

    loop(time, sceneManager);
}

// ── Asset Loading ─────────────────────────────────────────────────────────────

resource
    .add("tree1",       "./assets/foliagePack_005.png")
    .add("car",         "./assets/car.png")
    .add("cardobla",    "./assets/cardobla.png")
    .add("finish-line", "./assets/finish.png")
    .add("tree2",       "./assets/foliagePack_013.png")
    .load(() => requestAnimationFrame((t) => init(t)));

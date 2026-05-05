/**
 * @file main.js
 * Entry point.
 * 1. Boots the Phaser layer (audio, particles, tweens, gamepad).
 * 2. Loads game assets.
 * 3. Initialises the pseudo-3D engine and SceneManager.
 */

function loop(time, sceneManager) {
    requestAnimationFrame((t) => loop(t, sceneManager));

    const deltaMs      = time - timeObject.elapsed;
    timeObject.delta   = deltaMs;
    timeObject.elapsed = time;

    sceneManager.update(deltaMs);
}

function init(time) {
    const render = new Render(CANVAS.getContext("2d"));
    const camera = new Camera();
    const player = new Player();
    const road   = new Road();
    const state  = new GameState();

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

    road.create();

    const sky = new Sky();
    sky.init(resource.get("nuve"));

    const sceneManager = new SceneManager();
    sceneManager.init(render, camera, player, road, state, sky);

    loop(time, sceneManager);
}

// ── Boot sequence ─────────────────────────────────────────────────────────────
// 1. Start Phaser (async — loads its canvas and audio context)
phaserLayer.init();

// 2. Load game image assets, then start the engine
resource
    .add("tree1",       "./assets/foliagePack_005.png")
    .add("car",         "./assets/carnuevo.png")
    .add("cardobla",    "./assets/cardoblanuevo.png")
    .add("enemigo",      "./assets/enemy.png")
    .add("finish-line", "./assets/finish.png")
    .add("tree2",       "./assets/foliagePack_013.png")
    .add("tree3",       "./assets/foliagePack_0056.png")
    .add("nuve",        "./assets/nuve.png")
    .add("semaforo",     "./assets/semaforoanim.png")
    .add("arbusto",     "./assets/arbustoplaya.png")
    .add("mountain",     "./assets/mountain.png")
    .load(() => requestAnimationFrame((t) => init(t)));
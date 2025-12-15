// ===== LOADING SCENE =====
// Initial loading screen with progress bar
// Loads all game assets before transitioning to CharacterSelectScene

import AudioManager from '../systems/AudioManager.js';
import SceneStateManager from '../systems/SceneStateManager.js';

class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        const { width, height } = this.scale;

        // Dark background matching game aesthetic
        this.cameras.main.setBackgroundColor(0x06130a);

        // Title text
        const title = this.add.text(width / 2, height / 2 - 50, 'Dimman lättar...', {
            fontSize: '32px',
            fontFamily: 'Georgia',
            color: '#e9c08b'
        }).setOrigin(0.5);

        // Progress bar background
        const barWidth = 300;
        const barHeight = 20;
        const barBg = this.add.rectangle(
            width / 2,
            height / 2 + 20,
            barWidth,
            barHeight,
            0x2a2a2a
        );

        // Progress bar fill (starts at 0 width)
        const barFill = this.add.rectangle(
            width / 2 - barWidth / 2,
            height / 2 + 20,
            0,
            barHeight,
            0xe9c08b
        ).setOrigin(0, 0.5);

        // Percentage text
        const percentText = this.add.text(
            width / 2,
            height / 2 + 60,
            '0%',
            {
                fontSize: '18px',
                fontFamily: 'Georgia',
                color: '#cfa56f'
            }
        ).setOrigin(0.5);

        // Track actual load progress vs display progress
        let actualProgress = 0;
        let displayProgress = 0;
        let loadingComplete = false;

        this.load.on('progress', (value) => {
            actualProgress = value;
        });

        this.load.on('complete', () => {
            loadingComplete = true;
            console.log('[LoadingScene] All assets loaded and ready');
        });

        // Smooth progress animation over 2 seconds
        const progressDuration = 2000; // 2 seconds
        const startTime = Date.now();

        const progressTimer = this.time.addEvent({
            delay: 16, // ~60fps
            loop: true,
            callback: () => {
                const elapsed = Date.now() - startTime;
                const timeProgress = Math.min(elapsed / progressDuration, 1);

                // Blend actual load progress with time-based progress
                // This ensures it takes at least 2 seconds
                displayProgress = Math.min(timeProgress, actualProgress);

                barFill.width = barWidth * displayProgress;
                percentText.setText(Math.floor(displayProgress * 100) + '%');

                // Stop when we reach 100% AND loading is complete
                if (displayProgress >= 1 && loadingComplete) {
                    progressTimer.remove();

                    // Longer delay to ensure audio decoding finishes
                    // Large audio files (like forest-ambient.mp3 @ 7.5MB) need time to decode
                    this.time.delayedCall(1000, () => {
                        // ===== DEBUG: URL-based Scene Selection =====
                        // Check if URL contains ?scene=SceneName parameter
                        // This allows jumping directly to any scene for debugging
                        //
                        // USAGE:
                        //   Normal flow:  http://localhost:3000/
                        //   Skip to Scene1: http://localhost:3000/?scene=Scene1_Meadow
                        //   Skip to Scene2: http://localhost:3000/?scene=Scene2_Crossroads
                        //   Skip to Scene3 (pre-puzzle): http://localhost:3000/?scene=Scene3_Tomb
                        //   Skip to Scene3 (post-puzzle): http://localhost:3000/?scene=Scene3_Tomb&puzzleCompleted=true
                        //
                        const urlParams = new URLSearchParams(window.location.search);
                        const debugScene = urlParams.get('scene');

                        if (debugScene) {
                            console.log('[LoadingScene] DEBUG MODE - Jumping to scene:', debugScene);

                            // Initialize AudioManager (normally done in CharacterSelectScene)
                            // This ensures music and sound effects work when skipping scenes
                            const audioManager = new AudioManager(this);
                            audioManager.init(this);
                            this.registry.set('audioManager', audioManager);
                            console.log('[LoadingScene] AudioManager initialized for debug mode');

                            // Also set default character selection (normally done in CharacterSelectScene)
                            if (!SceneStateManager.hasGlobal('selectedCharacter')) {
                                SceneStateManager.setGlobal('selectedCharacter', 'big');
                                console.log('[LoadingScene] Default character set to: big');
                            }

                            // Check for Scene3_Tomb puzzle completion state override
                            const puzzleCompleted = urlParams.get('puzzleCompleted');
                            if (puzzleCompleted === 'true' && debugScene === 'Scene3_Tomb') {
                                SceneStateManager.setScene('Scene3_Tomb', 'puzzleCompleted', true);
                                console.log('[LoadingScene] DEBUG MODE - Scene3_Tomb puzzle set to completed (Morte will appear)');
                            }

                            // Apply LINEAR filtering to all textures for smooth scaling
                            this.applyTextureFiltering();

                            // Wait for audio to decode BEFORE starting scene and music
                            // forest-ambient.mp3 is 7.5MB and needs extra time
                            this.time.delayedCall(1500, () => {
                                console.log('[LoadingScene] Starting music in debug mode...');
                                try {
                                    audioManager.startMusic();
                                    console.log('[LoadingScene] Music started successfully');
                                } catch (error) {
                                    console.warn('[LoadingScene] Could not start music (audio still decoding?):', error);
                                }

                                // Start the debug scene AFTER music
                                this.scene.start(debugScene, { entry: 'default' });
                            });
                        } else {
                            // Apply LINEAR filtering to all textures for smooth scaling
                            this.applyTextureFiltering();

                            console.log('[LoadingScene] Transitioning to CharacterSelectScene');
                            this.scene.start('CharacterSelectScene');
                        }
                    });
                }
            }
        });

        // Small delay before starting load (so user sees 0%)
        this.time.delayedCall(200, () => {
            this.loadGameAssets();
            this.load.start(); // Manually start the loader
        });
    }

    loadGameAssets() {
        // Character select scene assets
        this.load.image('scen0-menu', 'assets/scenes/scen0-menu.png');
        this.load.image('scen0-menu-button', 'assets/scenes/scen0-menu-button.png');
        this.load.image('wisp', 'assets/sprites/whisp.png');

        // Audio assets
        this.load.audio('click', 'assets/sound/click.wav');
        this.load.audio('menu-select', 'assets/sound/menu-select.wav');
        this.load.audio('forest-ambient', 'assets/sound/forest-ambient.mp3');
        this.load.audio('tomb-ambient', 'assets/sound/tomb-ambient.mp3');
        this.load.audio('step-left', 'assets/sound/grass-step-left.wav');
        this.load.audio('step-right', 'assets/sound/grass-step-right.wav');
        this.load.audio('stone-step', 'assets/sound/stone-step.wav');
        this.load.audio('scraping-stone', 'assets/sound/scraping-stone.wav');
        this.load.audio('stone-crash', 'assets/sound/stone-crash.wav');
        this.load.audio('fire', 'assets/sound/fire.wav');


        // Intro scene assets
        this.load.image('intro-background', 'assets/scenes/scen1-meadow.png');
        this.load.image('portrait1', 'assets/portraits/sister1-portrait.png');
        this.load.image('portrait2', 'assets/portraits/sister2-portrait.png');
        this.load.image('Morte-portrait', 'assets/portraits/Morte-portrait.png');
        this.load.json('introDialogue', 'assets/dialogues/intro-dialogue.json');
        this.load.json('runeDialogue', 'assets/dialogues/rune-dialogue.json');
        this.load.json('tomb-entrance', 'assets/dialogues/tomb-entrance.json');
        this.load.json('tomb-morte-dialogue1', 'assets/dialogues/tomb-morte-dialogue1.json');

        // Game scene assets (Scene1_Meadow)
        this.load.image('background', 'assets/scenes/scen1-meadow.png');
        this.load.image('mask', 'assets/scenes/scen1-mask.png');
        this.load.image('sister1', 'assets/sprites/sister1-idle.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle.png');

        // Game scene assets (Scene2_Crossroads)
        this.load.image('background2', 'assets/scenes/scen2-crossroads.png');
        this.load.image('mask2', 'assets/scenes/scen2-mask.png');
        this.load.image('crossroads-overlay', 'assets/scenes/scen2-crossroads-overlay.png');

        // Game scene assets (Scene3_Tomb)
        this.load.image('background3', 'assets/scenes/scen3-tomb.png');
        this.load.image('background3-open', 'assets/scenes/scen3-tomb-open.png');
        this.load.image('mask3', 'assets/scenes/scen3-tomb-mask.png');
        this.load.image('tomb-overlay', 'assets/scenes/scen3-tomb-overlay.png');
        this.load.image('Morte-idle', 'assets/sprites/Morte-idle.png');

        // Fire glow sprite (used for all braziers)
        this.load.image('fire-glow', 'assets/objects/fire/fire-glow.png');

        // Flame sprites. TODO: justera frameWidth/frameHeight om dina sheets har annan storlek
        this.load.spritesheet('fire-yellow', 'assets/objects/fire/orange/fire-yellow.png', {
            frameWidth: 24,
            frameHeight: 32
        });

        this.load.spritesheet('fire-green', 'assets/objects/fire/green/fire-green.png', {
            frameWidth: 24,
            frameHeight: 32
        });

        this.load.spritesheet('fire-blue', 'assets/objects/fire/blue/fire-blue.png', {
            frameWidth: 24,
            frameHeight: 32
        });

        this.load.spritesheet('fire-purple', 'assets/objects/fire/purple/fire-purple.png', {
            frameWidth: 24,
            frameHeight: 32
        });

    }

    /**
     * Apply LINEAR texture filtering to all loaded textures
     * This prevents pixelated edges when scaling down high-res images
     */
    applyTextureFiltering() {
        const textureManager = this.textures;
        const textureKeys = textureManager.getTextureKeys();

        textureKeys.forEach(key => {
            // Skip internal Phaser textures
            if (key === '__DEFAULT' || key === '__MISSING' || key === '__WHITE') {
                return;
            }

            const texture = textureManager.get(key);
            if (texture) {
                // Set to LINEAR filtering for smooth, anti-aliased scaling
                texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        });

        console.log('[LoadingScene] Applied LINEAR filtering to all textures for smooth scaling');
    }
}

export default LoadingScene;

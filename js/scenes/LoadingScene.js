// ===== LOADING SCENE =====
// Initial loading screen with progress bar
// Loads all game assets before transitioning to CharacterSelectScene

class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        const { width, height } = this.scale;

        // Dark background matching game aesthetic
        this.cameras.main.setBackgroundColor(0x06130a);

        // Title text
        const title = this.add.text(width / 2, height / 2 - 50, 'Saga laddas...', {
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

        this.load.on('progress', (value) => {
            actualProgress = value;
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

                // Stop when we reach 100%
                if (displayProgress >= 1) {
                    progressTimer.remove();

                    // Small delay at 100%, then transition
                    this.time.delayedCall(300, () => {
                        this.scene.start('CharacterSelectScene');
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

        // Intro scene assets
        this.load.image('intro-background', 'assets/scenes/scen1-meadow.png');
        this.load.image('portrait1', 'assets/portraits/sister1-portrait-S.png');
        this.load.image('portrait2', 'assets/portraits/sister2-portrait-S.png');
        this.load.json('introDialogue', 'assets/dialogues/intro-dialogue.json');
        this.load.json('runeDialogue', 'assets/dialogues/rune-dialogue.json');

        // Game scene assets (Scene1_Meadow)
        this.load.image('background', 'assets/scenes/scen1-meadow.png');
        this.load.image('mask', 'assets/scenes/scen1-mask.png');
        this.load.image('sister1', 'assets/sprites/sister1-idle-S.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle-S.png');
    }
}

export default LoadingScene;

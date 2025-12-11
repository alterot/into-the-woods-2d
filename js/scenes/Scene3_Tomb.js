// ===== SCENE 3: TOMB INTERIOR =====
// Third gameplay scene - ancient burial chamber with braziers

import GameScene from './GameScene.js';

class Scene3_Tomb extends GameScene {
    constructor() {
        // Use scene-specific texture keys
        super('Scene3_Tomb', 'background3', 'mask3');

        this.dialogActive = false;

        // Placeholder for future interactive objects
        this.braziers = []; // TODO: add three brazier InteractiveObjects
    }

    init(data) {
        // Call parent init to handle entry tag
        super.init(data);

        // CRITICAL: Reset ALL dialog state when scene starts
        // (Scene might be reused, so constructor isn't always called)
        this.dialogActive = false;

        // Switch to tomb ambient music
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.switchMusic('tomb-ambient');
        }

        console.log('[Scene3] init() - all dialog state reset, tomb music started');
    }

    /**
     * Return spawn point for sisters based on entry tag
     * x,y is the "center" between sisters - GameScene shifts them apart
     *
     * NOTE: If spawn point is in blue (transition) area, pathfinding won't work.
     * Adjust Y coordinate to spawn on green walkable area inside tomb.
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            // Spawn further up/inside tomb to avoid blue entrance area
            from_crossroads: { x: 640, y: 580 },
            default:         { x: 640, y: 580 }
        };

        return spawns[entryTag] || spawns.default;
    }

    // Scene-specific content (braziers, skeleton mage, etc.)
    createSceneContent() {
        // Custom feedback message for this scene
        this.feedbackMessages.cannotWalk = "The tomb walls are too close here, we can't go that way.";

        // === BRAZIER CONFIG ===
        // Gul (vänster), Grön (mitten), Blå (höger)
        const brazierConfigs = [
            {
                id: 'left',
                x: 298,
                y: 190,
                spriteKey: 'fire-yellow',
                animKey: 'fire-yellow-loop',
                glowColor: 0xffc46b,
                angle: -14       // ← luta lite åt vänster
            },
            {
                id: 'middle',
                x: 586,
                y: 150,
                spriteKey: 'fire-green',
                animKey: 'fire-green-loop',
                glowColor: 0xa8ff9b,
                angle: 0         // ← rak
            },
            {
                id: 'right',
                x: 870,
                y: 192,
                spriteKey: 'fire-blue',
                animKey: 'fire-blue-loop',
                glowColor: 0x7cc9ff,
                angle: 8         // ← luta lite åt höger
            }
        ];

        // Skapa animationer EN gång per spriteKey
        const createFireAnim = (key, spriteKey) => {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 7 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
        };

        createFireAnim('fire-yellow-loop', 'fire-yellow');
        createFireAnim('fire-green-loop', 'fire-green');
        createFireAnim('fire-blue-loop', 'fire-blue');

        // Skapa själva eld-spritesen + glow
        this.braziers = brazierConfigs.map(cfg => {
            // Själva flammans sprite
            const sprite = this.add.sprite(cfg.x, cfg.y, cfg.spriteKey);
            sprite.setDepth(900);          // ovanför golvet, under UI
            sprite.setScale(2);            // tweaka vid behov
            sprite.play(cfg.animKey);

            if (cfg.angle !== undefined) {
                sprite.setAngle(cfg.angle);
            }

            // === Nivå 0-glow med sprite istället för cirkel ===
            const glow = this.add.image(cfg.x, cfg.y + 10, 'fire-glow');
            glow.setTint(cfg.glowColor);                         // färga efter eldtyp
            glow.setBlendMode(Phaser.BlendModes.ADD);

            // MYCKET mindre ljus i nivå 0
            glow.setAlpha(0.12);                                 // svag bas
            glow.setDepth(sprite.depth - 1);

            // Liten bas-scale – detta löser ditt “täcker hela rummet”-problem
            const baseScale = 0.25;                              
            glow.setScale(baseScale);

            // Andning: subtil variation
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.10, to: 0.17 },                  // liten ändring
                scale: { from: baseScale * 0.95, to: baseScale * 1.05 },
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

                // Vi sparar state för framtida pussel-logik
            return {
                id: cfg.id,
                sprite,
                glow,
                state: 0,
                config: cfg
                };
        });

        const overlay = this.add.image(640, 360, 'tomb-overlay');

        // Lägg den över systrarna
        overlay.setDepth(2000);
    }

    // Red pixels in mask (interactive objects) - placeholder for now
    handleInteractiveClick(x, y) {
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("It's dark in here… we should check the braziers later.");
    }

    // Blue pixels in mask (exit back to crossroads)
    handleTransitionClick(x, y) {
        console.log('[Scene3] Transition click at', x, y);

        // Block if dialog is already active
        if (this.dialogActive) {
            console.log('[Scene3] Transition click blocked - dialog active');
            return;
        }

        console.log('[Scene3] Exiting tomb - returning to Scene2');

        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        this.showValidClickIndicator(x, y);

        // Transition back to Scene2_Crossroads
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('Scene2_Crossroads', { entry: 'from_tomb' });
        });
    }

    update() {
        super.update();

        // TODO: scene-specific update logic (braziers, puzzles, etc.)
    }
}

export default Scene3_Tomb;

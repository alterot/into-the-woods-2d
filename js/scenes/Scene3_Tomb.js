// ===== SCENE 3: TOMB INTERIOR =====
// Third gameplay scene - ancient burial chamber with braziers

import GameScene from './GameScene.js';

class Scene3_Tomb extends GameScene {
    constructor() {
        // Use scene-specific texture keys
        super('Scene3_Tomb', 'background3', 'mask3');

        this.dialogActive = false;

        // Braziers storage
        this.braziers = [];

        // === PUZZLE STATE ===
        // Correct activation sequence: GREEN → BLUE → YELLOW
        this.puzzleOrder = ['green', 'blue', 'yellow'];
        this.currentPuzzleStep = 0;
        this.puzzleSolved = false;
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

            // Store state for puzzle logic + map color
            return {
                id: cfg.id,
                sprite,
                glow,
                state: 0,
                config: cfg,
                color: this.getBrazierColor(cfg.id)  // Map ID to color
            };
        });

        const overlay = this.add.image(640, 360, 'tomb-overlay');

        // Lägg den över systrarna
        overlay.setDepth(2000);
    }

    // ==========================================
    // PUZZLE INTERACTION SYSTEM
    // ==========================================

    /**
     * Handle clicks on red (interactive) areas - brazier puzzle
     * Override from GameScene to implement puzzle logic
     */
    handleInteractiveClick(x, y) {
        // Block if dialog is active
        if (this.dialogActive) {
            console.log('[Scene3] Interactive click blocked - dialog active');
            return;
        }

        // Block if puzzle already solved
        if (this.puzzleSolved) {
            this.showNoPathIndicator(x, y);
            this.showFeedbackBubble("The braziers are already lit. The tomb feels different now.");
            return;
        }

        // Find which brazier was clicked (closest sprite to click position)
        const clickedBrazier = this.getClosestBrazier(x, y);
        if (!clickedBrazier) {
            console.warn('[Scene3] No brazier found near click position');
            this.showNoPathIndicator(x, y);
            return;
        }

        console.log('[Scene3] Brazier clicked:', clickedBrazier.id, clickedBrazier.color);

        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // Find walkable position near brazier (keep player further back)
        const brazierX = clickedBrazier.sprite.x;
        const brazierY = clickedBrazier.sprite.y + 130; // Further below the brazier to avoid getting too close to flames
        const walkablePos = this.findNearestWalkable(brazierX, brazierY, 80);

        if (!walkablePos) {
            console.warn('[Scene3] No walkable position found near brazier');
            this.showNoPathIndicator(x, y);
            this.showFeedbackBubble("We can't reach that brazier from here.");
            return;
        }

        // Show valid click indicator
        this.showValidClickIndicator(x, y);

        // Move player to walkable position
        this.findPath(this.player.x, this.player.y, walkablePos.x, walkablePos.y);

        // Apply puzzle logic immediately (simple approach)
        // In a more complex implementation, you could wait for player to arrive
        this.activateBrazier(clickedBrazier);
    }

    /**
     * Get closest brazier to a click position
     */
    getClosestBrazier(x, y) {
        if (!this.braziers || this.braziers.length === 0) {
            return null;
        }

        let closest = null;
        let closestDist = Infinity;

        this.braziers.forEach(brazier => {
            const dx = brazier.sprite.x - x;
            const dy = brazier.sprite.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestDist = dist;
                closest = brazier;
            }
        });

        return closest;
    }

    /**
     * Map brazier ID to color name
     */
    getBrazierColor(id) {
        const colorMap = {
            'left': 'yellow',    // fire-yellow
            'middle': 'green',   // fire-green
            'right': 'blue'      // fire-blue
        };
        return colorMap[id] || 'unknown';
    }

    /**
     * Apply puzzle logic when a brazier is activated
     */
    activateBrazier(brazier) {
        // Check if this is the correct next brazier in sequence
        const expectedColor = this.puzzleOrder[this.currentPuzzleStep];
        const isCorrect = (brazier.color === expectedColor);

        console.log(`[Scene3] Activating ${brazier.color}, expected ${expectedColor}, correct: ${isCorrect}`);

        if (isCorrect) {
            // CORRECT BRAZIER
            brazier.state = 1; // Mark as correctly activated

            // Kill existing breathing animation so it stays in activated state
            this.tweens.killTweensOf(brazier.glow);
            this.tweens.killTweensOf(brazier.sprite);

            // Enhance flame sprite (make it larger and brighter)
            this.tweens.add({
                targets: brazier.sprite,
                scale: 2.2,       // Slightly larger flame
                alpha: 1.0,       // Full brightness
                duration: 400,
                ease: 'Cubic.easeOut'
            });

            // Enhance glow for activated brazier (slightly smaller than before)
            const activatedGlowScale = 0.30;
            this.tweens.add({
                targets: brazier.glow,
                alpha: 0.30,      // Brighter than base
                scale: activatedGlowScale,
                duration: 400,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Add gentle breathing animation for activated state
                    this.tweens.add({
                        targets: brazier.glow,
                        alpha: { from: 0.28, to: 0.35 },
                        scale: { from: activatedGlowScale * 0.95, to: activatedGlowScale * 1.05 },
                        duration: 1800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });

            // Advance puzzle step
            this.currentPuzzleStep++;

            // Show positive feedback
            this.showFeedbackBubble(`The ${brazier.color} brazier flares to life!`);

            // Check if puzzle is complete
            if (this.currentPuzzleStep >= this.puzzleOrder.length) {
                // Puzzle solved!
                this.time.delayedCall(800, () => {
                    this.onPuzzleSolved();
                });
            } else {
                // Show hint about next step
                const nextColor = this.puzzleOrder[this.currentPuzzleStep];
                console.log(`[Scene3] Next step: activate ${nextColor} brazier`);
            }
        } else {
            // WRONG BRAZIER - reset puzzle
            this.showFeedbackBubble(`The ${brazier.color} flame flickers and dies. Something's not right...`);

            // Reset after short delay
            this.time.delayedCall(1500, () => {
                this.resetPuzzle();
            });
        }
    }

    /**
     * Reset puzzle to initial state (wrong sequence)
     */
    resetPuzzle() {
        console.log('[Scene3] Resetting puzzle');

        this.currentPuzzleStep = 0;

        // Reset all braziers to state 0 and restore base glow and sprite
        this.braziers.forEach(brazier => {
            brazier.state = 0;

            // Kill existing tweens (both glow and sprite)
            this.tweens.killTweensOf(brazier.glow);
            this.tweens.killTweensOf(brazier.sprite);

            // Restore base flame sprite values
            brazier.sprite.setScale(2);
            brazier.sprite.setAlpha(1.0);

            // Restore base glow values
            const baseScale = 0.25;
            brazier.glow.setAlpha(0.12);
            brazier.glow.setScale(baseScale);

            // Restart breathing animation
            this.tweens.add({
                targets: brazier.glow,
                alpha: { from: 0.10, to: 0.17 },
                scale: { from: baseScale * 0.95, to: baseScale * 1.05 },
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    /**
     * Handle puzzle completion
     * Includes placeholder hooks for future features
     */
    onPuzzleSolved() {
        console.log('[Scene3] ✓ PUZZLE SOLVED!');

        this.puzzleSolved = true;

        // Set all braziers to completed state (2)
        this.braziers.forEach(brazier => {
            brazier.state = 2;

            // Kill existing tweens
            this.tweens.killTweensOf(brazier.glow);
            this.tweens.killTweensOf(brazier.sprite);

            // Enhance flame sprite for completion (even larger than activated)
            this.tweens.add({
                targets: brazier.sprite,
                scale: 2.4,       // Larger than activated state
                alpha: 1.0,
                duration: 600,
                ease: 'Cubic.easeOut'
            });

            // Enhance glow for completed puzzle (reduced size as requested)
            this.tweens.add({
                targets: brazier.glow,
                alpha: 0.40,      // Strong glow
                scale: 0.35,      // Reduced from 0.40
                duration: 600,
                ease: 'Cubic.easeOut'
            });

            // Add gentle breathing animation for completed state
            this.tweens.add({
                targets: brazier.glow,
                alpha: { from: 0.38, to: 0.45 },
                scale: { from: 0.33, to: 0.37 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 600  // Start after initial enhancement
            });
        });

        // Show completion feedback
        this.showFeedbackBubble("The ancient flames burn brightly. The tomb's secrets are revealed!");

        // === DRAMATIC REVEAL SEQUENCE ===
        this.time.delayedCall(1500, () => {
            console.log('[Scene3] Starting reveal sequence...');

            // 1. Camera shake effect (earthquake/rumble)
            this.cameras.main.shake(800, 0.005);  // 800ms duration, subtle shake

            // 2. Fade out to black
            this.cameras.main.fadeOut(800, 0, 0, 0);

            // 3. After fade completes, swap background and add Morte sprite
            this.time.delayedCall(850, () => {
                console.log('[Scene3] Scene is dark - swapping background and adding Morte');

                // Change background to opened tomb
                // Try multiple possible texture keys
                const bgKeys = ['background3-open', 'scene3-tomb-open', 'scen3-tomb-open'];
                let bgLoaded = false;

                for (const key of bgKeys) {
                    if (this.textures.exists(key)) {
                        const newBg = this.add.image(640, 360, key);
                        newBg.setDepth(0);  // Behind everything
                        console.log(`[Scene3] Loaded new background: ${key}`);
                        bgLoaded = true;
                        break;
                    }
                }

                if (!bgLoaded) {
                    console.warn('[Scene3] New background texture not found. Tried:', bgKeys);
                }

                // Add Morte sprite (middle-right position, centered vertically)
                const morteKeys = ['morte-idle', 'Morte-idle'];
                let morteLoaded = false;

                for (const key of morteKeys) {
                    if (this.textures.exists(key)) {
                        const morte = this.add.sprite(900, 360, key);
                        morte.setDepth(850);  // Above background, below UI
                        morte.setScale(1);    // Adjust as needed
                        this.morteSprite = morte;  // Store for later use
                        console.log(`[Scene3] Loaded Morte sprite: ${key}`);
                        morteLoaded = true;
                        break;
                    }
                }

                if (!morteLoaded) {
                    console.warn('[Scene3] Morte sprite texture not found. Tried:', morteKeys);
                }

                // 4. Fade back in to reveal the changes
                this.cameras.main.fadeIn(1000, 0, 0, 0);

                console.log('[Scene3] Reveal sequence complete - fading back in');
            });
        });

        // === PLACEHOLDER HOOKS FOR FUTURE FEATURES ===
        // TODO: Add dialog overlay after reveal sequence completes (around 3350ms total)
        // this.time.delayedCall(3350, () => {
        //     this.dialogActive = true;
        //     const DialogOverlay = this.cache.custom.DialogOverlay;
        //     if (DialogOverlay) {
        //         const dialog = new DialogOverlay(this, {
        //             dialogueData: [ /* dialog data */ ],
        //             spritesVisible: true,
        //             onComplete: () => {
        //                 this.dialogActive = false;
        //             }
        //         });
        //         dialog.start();
        //     }
        // });

        console.log('[Scene3] Puzzle completion sequence initiated');
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

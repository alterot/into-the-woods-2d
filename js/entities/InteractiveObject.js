// ===== INTERACTIVE OBJECT =====
// Base class for all interactive objects in scenes
// Handles click detection, walking to object, and triggering dialogs/actions

import DialogOverlay from '../systems/DialogOverlay.js';

class InteractiveObject {
    /**
     * Create an interactive object
     * @param {Phaser.Scene} scene - The scene this object belongs to
     * @param {Object} config - Configuration object
     *
     * Config options:
     * {
     *   x: number,                    // X position
     *   y: number,                    // Y position
     *   maskColor: 'red',             // Mask color that triggers this object
     *   dialogueKey: string,          // Cache key for JSON dialogue
     *   conversationId: number,       // Which conversation in the JSON
     *   sprite: string,               // Optional sprite key
     *   animation: string,            // Optional animation key
     *   hoverEffect: string,          // 'sparkle', 'glow', 'pulse', null
     *   interactRadius: number,       // How close to walk before triggering (default: 50)
     *   onInteract: function,         // Custom callback on interaction
     *   onHover: function,            // Custom callback on hover
     *   faceObjectDuringDialog: bool  // Should characters face this object? (default: true)
     * }
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = {
            interactRadius: 50,
            faceObjectDuringDialog: true,
            hoverEffect: null,
            ...config
        };

        this.x = config.x;
        this.y = config.y;
        this.sprite = null;
        this.hoverParticles = [];
        this.isHovering = false;

        this.init();
    }

    /**
     * Initialize the object
     */
    init() {
        // Create sprite if provided
        if (this.config.sprite) {
            this.sprite = this.scene.add.sprite(this.x, this.y, this.config.sprite);

            if (this.config.animation) {
                this.sprite.play(this.config.animation);
            }
        }

        // Setup hover detection if hover effect enabled
        if (this.config.hoverEffect) {
            this.setupHoverDetection();
        }

        console.log(`[InteractiveObject] Created at (${this.x}, ${this.y})`);
    }

    /**
     * Handle click on this object
     * Should be called from scene's handleInteractiveClick() when mask color matches
     */
    onClick() {
        const audioManager = this.scene.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // Find nearest walkable spot
        const walkableSpot = this.findNearestWalkable();

        if (walkableSpot && this.scene.findPath) {
            // Walk to object
            this.scene.findPath(
                this.scene.player.x,
                this.scene.player.y,
                walkableSpot.x,
                walkableSpot.y
            );
        }

        // Trigger dialog if configured
        if (this.config.dialogueKey) {
            this.showDialog();
        }

        // Call custom callback
        if (this.config.onInteract) {
            this.config.onInteract();
        }
    }

    /**
     * Show dialog overlay for this object
     */
    showDialog() {
        const dialogData = this.scene.cache.json.get(this.config.dialogueKey);

        if (!dialogData) {
            console.error(`[InteractiveObject] Dialogue not found: ${this.config.dialogueKey}`);
            return;
        }

        const conversation = dialogData.conversations[this.config.conversationId || 0];
        if (!conversation) {
            console.error(`[InteractiveObject] Conversation ${this.config.conversationId} not found`);
            return;
        }

        this.scene.dialogActive = true;

        const overlay = new DialogOverlay(this.scene, {
            dialogueData: conversation.lines,
            spritesVisible: true,
            backgroundDim: 0.6,
            onComplete: () => {
                this.scene.dialogActive = false;
            },
            onLineChange: (line) => {
                // Make characters face the object during dialog
                if (this.config.faceObjectDuringDialog) {
                    this.faceObject(line);
                }
            }
        });

        overlay.start();
    }

    /**
     * Make characters face this object
     */
    faceObject(dialogLine) {
        if (!this.scene.player || !this.scene.follower) return;

        // Determine which character is speaking
        const speaker = dialogLine.role === 'player' ? this.scene.player : this.scene.follower;
        const listener = dialogLine.role === 'player' ? this.scene.follower : this.scene.player;

        // Speaker faces the object
        if (speaker.x < this.x) {
            speaker.setFlipX(false);  // Face right
        } else {
            speaker.setFlipX(true);   // Face left
        }

        // Listener also faces the object
        if (listener.x < this.x) {
            listener.setFlipX(false);
        } else {
            listener.setFlipX(true);
        }
    }

    /**
     * Find nearest walkable spot around this object
     */
    findNearestWalkable() {
        if (!this.scene.getPixelColor) {
            console.error('[InteractiveObject] Scene missing getPixelColor method');
            return null;
        }

        const radius = this.config.interactRadius;
        const step = 10;

        // Search in expanding circles
        for (let r = step; r <= radius; r += step) {
            const angleStep = (2 * Math.PI) / (r / 3);

            for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
                const testX = Math.round(this.x + Math.cos(angle) * r);
                const testY = Math.round(this.y + Math.sin(angle) * r);

                const color = this.scene.getPixelColor(testX, testY);
                if (color === 'green') {
                    return { x: testX, y: testY };
                }
            }
        }

        console.warn('[InteractiveObject] No walkable spot found near object');
        return null;
    }

    /**
     * Setup hover detection for hover effects
     */
    setupHoverDetection() {
        this.scene.input.on('pointermove', (pointer) => {
            if (this.scene.dialogActive) return;

            const color = this.scene.getPixelColor(pointer.x, pointer.y);
            const isOverObject = (color === this.config.maskColor) &&
                                 this.isNearPosition(pointer.x, pointer.y);

            if (isOverObject && !this.isHovering) {
                this.onHoverStart(pointer);
            } else if (!isOverObject && this.isHovering) {
                this.onHoverEnd();
            } else if (isOverObject) {
                this.onHoverUpdate(pointer);
            }
        });
    }

    /**
     * Check if pointer is near this object's position
     */
    isNearPosition(x, y) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance < this.config.interactRadius * 2;  // Wider detection for hover
    }

    /**
     * Called when hover starts
     */
    onHoverStart(pointer) {
        this.isHovering = true;

        if (this.config.onHover) {
            this.config.onHover(true);
        }

        // Start hover effect
        if (this.config.hoverEffect === 'sparkle') {
            this.startSparkleEffect();
        } else if (this.config.hoverEffect === 'glow') {
            this.startGlowEffect();
        } else if (this.config.hoverEffect === 'pulse') {
            this.startPulseEffect();
        }
    }

    /**
     * Called while hovering
     */
    onHoverUpdate(pointer) {
        if (this.config.hoverEffect === 'sparkle') {
            this.spawnSparkles(pointer.x, pointer.y);
        }
    }

    /**
     * Called when hover ends
     */
    onHoverEnd() {
        this.isHovering = false;

        if (this.config.onHover) {
            this.config.onHover(false);
        }

        // Stop hover effects
        this.stopHoverEffects();
    }

    /**
     * Start sparkle trail effect
     */
    startSparkleEffect() {
        // Effect will be triggered in onHoverUpdate
    }

    /**
     * Spawn sparkle particles at position
     */
    spawnSparkles(x, y) {
        const sparkCount = 2;

        for (let i = 0; i < sparkCount; i++) {
            const offsetX = Phaser.Math.Between(-4, 4);
            const offsetY = Phaser.Math.Between(-4, 4);
            const radius = Phaser.Math.Between(1, 2);
            const colors = [0xffffff, 0xfff8d8, 0xfff0b5, 0xdde9ff];
            const color = Phaser.Utils.Array.GetRandom(colors);

            const spark = this.scene.add.circle(
                x + offsetX,
                y + offsetY,
                radius,
                color,
                Phaser.Math.FloatBetween(0.6, 1.0)
            );
            spark.setDepth(1500);
            spark.setBlendMode(Phaser.BlendModes.ADD);

            this.scene.tweens.add({
                targets: spark,
                alpha: 0,
                duration: Phaser.Math.Between(220, 360),
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy()
            });
        }

        // Random flash particle
        if (Math.random() < 0.16) {
            const flashSize = Phaser.Math.Between(3, 5);
            const flash = this.scene.add.circle(x, y, flashSize, 0xffffff, 1.0);
            flash.setDepth(1500);
            flash.setBlendMode(Phaser.BlendModes.ADD);

            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 1.5,
                duration: 180,
                ease: 'Cubic.easeOut',
                onComplete: () => flash.destroy()
            });
        }
    }

    /**
     * Start glow effect (if sprite exists)
     */
    startGlowEffect() {
        if (!this.sprite) return;

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 1.0,
            scale: 1.1,
            duration: 200,
            ease: 'Sine.easeOut'
        });
    }

    /**
     * Start pulse effect (if sprite exists)
     */
    startPulseEffect() {
        if (!this.sprite) return;

        this.scene.tweens.add({
            targets: this.sprite,
            scale: 1.15,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Stop all hover effects
     */
    stopHoverEffects() {
        if (this.sprite) {
            this.scene.tweens.killTweensOf(this.sprite);
            this.sprite.setAlpha(1.0);
            this.sprite.setScale(1.0);
        }
    }

    /**
     * Destroy the interactive object
     */
    destroy() {
        this.stopHoverEffects();

        if (this.sprite) {
            this.sprite.destroy();
        }

        this.hoverParticles.forEach(p => p.destroy());
        this.hoverParticles = [];
    }
}

export default InteractiveObject;

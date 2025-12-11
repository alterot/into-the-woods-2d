// ===== BRAZIER ENTITY =====
// Represents an interactive fire brazier with multiple states
// Handles animations, glow effects, and state transitions
// Supports different flame colors (yellow, green, blue, purple)

class Brazier {
    /**
     * Create a brazier
     * @param {Phaser.Scene} scene - The scene this brazier belongs to
     * @param {Object} config - Configuration object
     *
     * Config options:
     * {
     *   id: string,              // Unique identifier (e.g., 'left', 'middle', 'right')
     *   x: number,               // X position
     *   y: number,               // Y position
     *   color: string,           // Flame color: 'yellow', 'green', 'blue', 'purple'
     *   angle: number,           // Rotation angle in degrees (default: 0)
     *   initialState: number,    // Starting state: 0 (base), 1 (activated), 2 (completed)
     *   depth: number            // Sprite depth (default: 900)
     * }
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = {
            angle: 0,
            initialState: 0,
            depth: 900,
            ...config
        };

        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.color = config.color;
        this.state = config.initialState || 0;

        // Visual components
        this.sprite = null;      // Flame sprite
        this.glow = null;        // Glow effect

        // Animation keys
        this.spriteKey = `fire-${this.color}`;
        this.animKey = `fire-${this.color}-loop`;

        // Color-specific glow colors
        this.glowColors = {
            'yellow': 0xffc46b,
            'green': 0xa8ff9b,
            'blue': 0x7cc9ff,
            'purple': 0xb89bff
        };
        this.glowColor = this.glowColors[this.color] || 0xffffff;

        this.init();
    }

    /**
     * Initialize the brazier (create sprites and animations)
     */
    init() {
        // Create animation if it doesn't exist
        this.createAnimation();

        // Create flame sprite
        this.sprite = this.scene.add.sprite(this.x, this.y, this.spriteKey);
        this.sprite.setDepth(this.config.depth);
        this.sprite.play(this.animKey);

        if (this.config.angle !== 0) {
            this.sprite.setAngle(this.config.angle);
        }

        // Create glow effect
        this.glow = this.scene.add.image(this.x, this.y + 10, 'fire-glow');
        this.glow.setTint(this.glowColor);
        this.glow.setBlendMode(Phaser.BlendModes.ADD);
        this.glow.setDepth(this.config.depth - 1);

        // Apply initial state visuals
        this.applyStateVisuals(this.state, false); // false = no animation, instant

        console.log(`[Brazier] Created ${this.color} brazier '${this.id}' at (${this.x}, ${this.y}) in state ${this.state}`);
    }

    /**
     * Create animation for this brazier's flame
     */
    createAnimation() {
        if (!this.scene.anims.exists(this.animKey)) {
            this.scene.anims.create({
                key: this.animKey,
                frames: this.scene.anims.generateFrameNumbers(this.spriteKey, { start: 0, end: 7 }),
                frameRate: 10,
                repeat: -1
            });
        }
    }

    /**
     * Apply visual appearance for a given state
     * @param {number} state - The state to apply (0, 1, or 2)
     * @param {boolean} animate - Whether to animate the transition (default: true)
     */
    applyStateVisuals(state, animate = true) {
        // Kill any existing tweens
        this.scene.tweens.killTweensOf(this.sprite);
        this.scene.tweens.killTweensOf(this.glow);

        switch (state) {
            case 0:
                this.applyBaseState(animate);
                break;
            case 1:
                this.applyActivatedState(animate);
                break;
            case 2:
                this.applyCompletedState(animate);
                break;
            default:
                console.warn(`[Brazier] Unknown state: ${state}`);
        }
    }

    /**
     * Apply base state (0) - dim, breathing glow
     */
    applyBaseState(animate = true) {
        const baseScale = 0.25;
        const duration = animate ? 400 : 0;

        if (duration > 0) {
            // Animated transition
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 2,
                alpha: 1.0,
                duration: duration,
                ease: 'Cubic.easeOut'
            });

            this.scene.tweens.add({
                targets: this.glow,
                alpha: 0.12,
                scale: baseScale,
                duration: duration,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.startBreathingAnimation(baseScale, 0.10, 0.17);
                }
            });
        } else {
            // Instant
            this.sprite.setScale(2);
            this.sprite.setAlpha(1.0);
            this.glow.setAlpha(0.12);
            this.glow.setScale(baseScale);
            this.startBreathingAnimation(baseScale, 0.10, 0.17);
        }
    }

    /**
     * Apply activated state (1) - brighter, larger
     */
    applyActivatedState(animate = true) {
        const activatedGlowScale = 0.30;
        const duration = animate ? 400 : 0;

        if (duration > 0) {
            // Animated transition
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 2.2,
                alpha: 1.0,
                duration: duration,
                ease: 'Cubic.easeOut'
            });

            this.scene.tweens.add({
                targets: this.glow,
                alpha: 0.30,
                scale: activatedGlowScale,
                duration: duration,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.startBreathingAnimation(activatedGlowScale, 0.28, 0.35);
                }
            });
        } else {
            // Instant
            this.sprite.setScale(2.2);
            this.sprite.setAlpha(1.0);
            this.glow.setAlpha(0.30);
            this.glow.setScale(activatedGlowScale);
            this.startBreathingAnimation(activatedGlowScale, 0.28, 0.35);
        }
    }

    /**
     * Apply completed state (2) - brightest, largest
     */
    applyCompletedState(animate = true) {
        const completedGlowScale = 0.35;
        const duration = animate ? 600 : 0;

        if (duration > 0) {
            // Animated transition
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 2.4,
                alpha: 1.0,
                duration: duration,
                ease: 'Cubic.easeOut'
            });

            this.scene.tweens.add({
                targets: this.glow,
                alpha: 0.40,
                scale: completedGlowScale,
                duration: duration,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.startBreathingAnimation(completedGlowScale, 0.38, 0.45);
                }
            });
        } else {
            // Instant
            this.sprite.setScale(2.4);
            this.sprite.setAlpha(1.0);
            this.glow.setAlpha(0.40);
            this.glow.setScale(completedGlowScale);
            this.startBreathingAnimation(completedGlowScale, 0.38, 0.45);
        }
    }

    /**
     * Start breathing animation for glow
     * @param {number} baseScale - Base scale for the glow
     * @param {number} alphaFrom - Minimum alpha
     * @param {number} alphaTo - Maximum alpha
     */
    startBreathingAnimation(baseScale, alphaFrom, alphaTo) {
        this.scene.tweens.add({
            targets: this.glow,
            alpha: { from: alphaFrom, to: alphaTo },
            scale: { from: baseScale * 0.95, to: baseScale * 1.05 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Activate this brazier (transition to state 1)
     */
    activate() {
        console.log(`[Brazier] Activating ${this.color} brazier '${this.id}'`);
        this.state = 1;
        this.applyStateVisuals(1, true);
    }

    /**
     * Reset this brazier to base state (0)
     */
    reset() {
        console.log(`[Brazier] Resetting ${this.color} brazier '${this.id}'`);
        this.state = 0;
        this.applyStateVisuals(0, true);
    }

    /**
     * Mark this brazier as completed (transition to state 2)
     */
    setCompleted() {
        console.log(`[Brazier] Completing ${this.color} brazier '${this.id}'`);
        this.state = 2;
        this.applyStateVisuals(2, true);
    }

    /**
     * Set the brazier to a specific state
     * @param {number} newState - The state to set (0, 1, or 2)
     * @param {boolean} animate - Whether to animate the transition (default: true)
     */
    setState(newState, animate = true) {
        if (newState === this.state) {
            return; // Already in this state
        }

        console.log(`[Brazier] Setting ${this.color} brazier '${this.id}' to state ${newState}`);
        this.state = newState;
        this.applyStateVisuals(newState, animate);
    }

    /**
     * Get the current state of this brazier
     * @returns {number} Current state (0, 1, or 2)
     */
    getState() {
        return this.state;
    }

    /**
     * Change the color of this brazier's flame
     * @param {string} newColor - New color: 'yellow', 'green', 'blue', 'purple'
     */
    changeColor(newColor) {
        console.log(`[Brazier] Changing ${this.id} from ${this.color} to ${newColor}`);

        this.color = newColor;
        this.spriteKey = `fire-${newColor}`;
        this.animKey = `fire-${newColor}-loop`;
        this.glowColor = this.glowColors[newColor] || 0xffffff;

        // Create animation if needed
        this.createAnimation();

        // Update sprite
        this.sprite.play(this.animKey);

        // Update glow tint
        this.glow.setTint(this.glowColor);
    }

    /**
     * Check if a world position is close to this brazier
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} maxDistance - Maximum distance to consider "close"
     * @returns {boolean} True if position is within maxDistance of brazier
     */
    isNear(x, y, maxDistance = 100) {
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= maxDistance;
    }

    /**
     * Get distance to a world position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {number} Distance in pixels
     */
    distanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Destroy this brazier and clean up
     */
    destroy() {
        // Kill any active tweens
        this.scene.tweens.killTweensOf(this.sprite);
        this.scene.tweens.killTweensOf(this.glow);

        // Destroy visual components
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }

        if (this.glow) {
            this.glow.destroy();
            this.glow = null;
        }

        console.log(`[Brazier] Destroyed ${this.color} brazier '${this.id}'`);
    }
}

export default Brazier;

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

        // Audio components
        this.fireSound = null;   // Fire crackling sound
        this.soundPitchRate = 1.0;      // Playback rate (affects pitch)
        this.soundVolumeMultiplier = 1.0;  // Volume multiplier for variation

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

        // Create fire sound with random variations for natural layering
        this.initializeFireSound();

        // Apply initial state visuals and audio
        this.applyStateVisuals(this.state, false); // false = no animation, instant
    }

    /**
     * Initialize fire sound with random pitch and volume variations
     */
    initializeFireSound() {
        // Random pitch variation (0.9 to 1.1) for unique sound per brazier
        this.soundPitchRate = 0.9 + Math.random() * 0.2;

        // Random volume multiplier (0.9 to 1.1) for slight volume variation
        this.soundVolumeMultiplier = 0.9 + Math.random() * 0.2;

        // Random start delay (0-300ms) so sounds don't sync perfectly
        const startDelay = Math.random() * 300;

        this.scene.time.delayedCall(startDelay, () => {
            if (this.scene.sound) {
                this.fireSound = this.scene.sound.add('fire', {
                    loop: true,
                    volume: 0  // Will be set by updateSoundVolume
                });

                this.fireSound.setRate(this.soundPitchRate);
                this.fireSound.play();

                // Update volume based on current state
                this.updateSoundVolume();
            } else {
                console.warn(`[Brazier] ${this.id} - scene.sound not available!`);
            }
        });
    }

    /**
     * Update fire sound volume based on current state
     */
    updateSoundVolume() {
        if (!this.fireSound) {
            return;
        }

        let baseVolume = 0;

        switch (this.state) {
            case 0:
                baseVolume = 0.34;   // Low volume for base state (increased by 125% total)
                break;
            case 1:
                baseVolume = 0.68;   // Medium volume for activated state (increased by 125% total)
                break;
            case 2:
                baseVolume = 1.0;    // High volume for completed state (increased by 125% total, capped at 1.0)
                break;
        }

        // Apply volume multiplier for variation between braziers
        const finalVolume = baseVolume * this.soundVolumeMultiplier;
        this.fireSound.setVolume(finalVolume);
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

        // Update fire sound volume
        this.updateSoundVolume();
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

        // Update fire sound volume
        this.updateSoundVolume();
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

        // Update fire sound volume
        this.updateSoundVolume();
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
        this.state = 1;
        this.applyStateVisuals(1, true);
    }

    /**
     * Reset this brazier to base state (0)
     */
    reset() {
        this.state = 0;
        this.applyStateVisuals(0, true);
    }

    /**
     * Mark this brazier as completed (transition to state 2)
     */
    setCompleted() {
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

        // Stop and destroy fire sound
        if (this.fireSound) {
            this.fireSound.stop();
            this.fireSound.destroy();
            this.fireSound = null;
        }
    }

    // ==========================================
    // STATIC FACTORY METHODS
    // ==========================================

    /**
     * Create multiple braziers from a config array
     * @param {Phaser.Scene} scene - The scene to create braziers in
     * @param {Array} configs - Array of brazier configs (without defaults)
     * @param {Object} defaults - Default values to apply to all braziers
     * @returns {Array<Brazier>} Array of created Brazier instances
     *
     * Example:
     * const braziers = Brazier.createGroup(this, [
     *   { id: 'left', x: 100, y: 200, color: 'yellow' },
     *   { id: 'right', x: 300, y: 200, color: 'blue' }
     * ], { initialState: 0, depth: 900 });
     */
    static createGroup(scene, configs, defaults = {}) {

        return configs.map(config =>
            new Brazier(scene, {
                ...defaults,
                ...config  // Config overrides defaults
            })
        );
    }

    /**
     * Predefined brazier layouts for common scenes
     * Can be extended with custom presets for your game
     */
    static PRESETS = {
        // Scene 3 tomb layout - three braziers in arc formation
        'tomb-braziers': [
            { id: 'left', x: 298, y: 190, angle: -14 },
            { id: 'middle', x: 586, y: 150, angle: 0 },
            { id: 'right', x: 870, y: 192, angle: 8 }
        ],

        // Example: Simple horizontal line of 3 braziers
        'horizontal-3': [
            { id: 'left', x: 200, y: 300, angle: 0 },
            { id: 'middle', x: 400, y: 300, angle: 0 },
            { id: 'right', x: 600, y: 300, angle: 0 }
        ],

        // Example: Circle formation of 4 braziers
        'circle-4': [
            { id: 'north', x: 400, y: 200, angle: 0 },
            { id: 'east', x: 500, y: 300, angle: 0 },
            { id: 'south', x: 400, y: 400, angle: 0 },
            { id: 'west', x: 300, y: 300, angle: 0 }
        ]
    };

    /**
     * Create braziers from a named preset layout
     * @param {Phaser.Scene} scene - The scene to create braziers in
     * @param {string} presetName - Name of the preset layout
     * @param {Object} overrides - Values to override in the preset (e.g., colors, initialState)
     * @returns {Array<Brazier>} Array of created Brazier instances
     *
     * Example:
     * // Create tomb braziers with yellow/green/blue colors
     * const braziers = Brazier.fromPreset(this, 'tomb-braziers', {
     *   colors: ['yellow', 'green', 'blue'],
     *   initialState: 0
     * });
     */
    static fromPreset(scene, presetName, overrides = {}) {
        const preset = Brazier.PRESETS[presetName];

        if (!preset) {
            console.error(`[Brazier] Unknown preset: ${presetName}`);
            return [];
        }


        // If colors array provided, map them to braziers
        const colors = overrides.colors || [];
        delete overrides.colors;  // Remove from overrides so it doesn't get applied to config

        return preset.map((config, index) => {
            const brazierConfig = {
                ...config,
                ...overrides  // Apply overrides
            };

            // Apply color from colors array if provided
            if (colors[index]) {
                brazierConfig.color = colors[index];
            }

            return new Brazier(scene, brazierConfig);
        });
    }

    /**
     * Add a custom preset layout
     * Useful for defining scene-specific layouts without modifying Brazier.js
     * @param {string} name - Name for the preset
     * @param {Array} configs - Array of brazier configs
     *
     * Example:
     * Brazier.addPreset('my-scene-layout', [
     *   { id: 'torch1', x: 100, y: 200 },
     *   { id: 'torch2', x: 200, y: 200 }
     * ]);
     */
    static addPreset(name, configs) {
        if (Brazier.PRESETS[name]) {
            console.warn(`[Brazier] Overwriting existing preset: ${name}`);
        }

        Brazier.PRESETS[name] = configs;
    }
}

export default Brazier;

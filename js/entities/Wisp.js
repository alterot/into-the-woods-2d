// ===== WISP ENTITY =====
// Reusable Wisp class with animations and interactions
class Wisp {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;

        // Create the wisp sprite
        this.sprite = scene.add.image(x, y, 'wisp');
        this.sprite.setScale(0.1);

        // Make it interactive
        this.sprite.setInteractive({ useHandCursor: true });

        // Store the click handler
        this.clickHandler = null;

        // Set up default click behavior
        this.sprite.on('pointerdown', () => {
            if (this.clickHandler) {
                this.clickHandler();
            }
        });

        // Start animations
        this.setupAnimations();
    }

    setupAnimations() {
        // Float up/down animation (±15px, 2s, yoyo)
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.y - 15,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Sway left/right animation (±8px, 3s, yoyo)
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.x + 8,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Pulse alpha animation (0.7-1.0, 1.5s, yoyo)
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.7,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Set custom click handler
    onClick(callback) {
        this.clickHandler = callback;
    }

    // Clean up the wisp
    destroy() {
        if (this.sprite) {
            // Remove tweens
            this.scene.tweens.killTweensOf(this.sprite);

            // Destroy sprite
            this.sprite.destroy();
            this.sprite = null;
        }

        this.clickHandler = null;
    }

    // Static method to preload wisp assets
    static preload(scene) {
        scene.load.image('wisp', 'assets/sprites/whisp.png');
    }
}

export default Wisp;

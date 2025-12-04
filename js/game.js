class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;
        this.moveSpeed = 2;
    }

    preload() {
        // Load the background image
        this.load.image('background', 'assets/scenes/scen1-meadow.png');

        // Load character sprites
        this.load.image('sister1', 'assets/sprites/sister1-idle-S.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle-S.png');
    }

    create() {
        // Display the background image centered
        this.add.image(512, 512, 'background');

        // Add character sprites WITH const keyword
        this.sister1 = this.add.image(400, 500, 'sister1');
        this.sister1.setScale(0.55);

        const s2 = this.add.image(450, 500, 'sister2');
        s2.setScale(0.5);

        // Add click handler for movement
        this.input.on('pointerdown', (pointer) => {
            this.targetX = pointer.x;
            this.targetY = pointer.y;
            this.isMoving = true;
        });
    }

    update() {
        // Handle sister1 movement
        if (this.isMoving && this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.sister1.x;
            const dy = this.targetY - this.sister1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Stop if close enough to target (within move speed distance)
            if (distance < this.moveSpeed) {
                this.sister1.x = this.targetX;
                this.sister1.y = this.targetY;
                this.isMoving = false;
            } else {
                // Move towards target at constant speed
                const angle = Math.atan2(dy, dx);
                this.sister1.x += Math.cos(angle) * this.moveSpeed;
                this.sister1.y += Math.sin(angle) * this.moveSpeed;
            }
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 1024,
    render: {
        pixelArt: true  // ← VIKTIGT!
    },
    parent: document.body,
    backgroundColor: '#000000',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Initialize the game
const game = new Phaser.Game(config);

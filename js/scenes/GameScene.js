// ===== GAME SCENE =====
// Main gameplay scene with character movement and interactions
import Wisp from '../entities/Wisp.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;
        this.moveSpeed = 2;
        this.bobTime = 0;
        this.baseY = 0;
        this.bobTime2 = 0;
        this.baseY2 = 0;
        this.isMoving2 = false;
    }

    preload() {
        // Load the background image
        this.load.image('background', 'assets/scenes/scen1-meadow.png');

        // Load mask image (invisible, used for walkability detection)
        this.load.image('mask', 'assets/scenes/scen1-mask.png');

        // Load character sprites
        this.load.image('sister1', 'assets/sprites/sister1-idle-S.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle-S.png');

        // Load wisp sprite
        Wisp.preload(this);
    }

    create() {
        // Display the background image centered
        this.add.image(512, 512, 'background');

        // Create mask texture for pixel detection (invisible)
        this.maskTexture = this.textures.get('mask').getSourceImage();

        // Determine player character based on selection
        const isPlayingBig = window.gameState?.selectedCharacter === 'big';

        // Position sprites: player at x:400 (left), sibling at x:450 (right)
        if (isPlayingBig) {
            // Playing as big sister - she's on the left
            this.sister1 = this.add.image(400, 500, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;

            this.sister2 = this.add.image(450, 500, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;
        } else {
            // Playing as little sister - she's on the left
            this.sister2 = this.add.image(400, 500, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;

            this.sister1 = this.add.image(450, 500, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;
        }

        // Create wisp entity (example usage)
        this.wisp = new Wisp(this, 650, 350);
        this.wisp.onClick(() => {
            console.log('Wisp clicked! Add custom behavior here.');
            // TODO: Show proper dialog or interaction
        });

        // Add click handler for movement with mask checking
        this.input.on('pointerdown', (pointer) => {
            const color = this.getPixelColor(pointer.x, pointer.y);

            if (color === 'green') {
                // Walkable area - move sister1
                this.targetX = pointer.x;
                this.targetY = pointer.y;
                this.isMoving = true;
            } else if (color === 'red') {
                // Interactive object - show text
                console.log('Interactive object clicked!');
                // TODO: Show proper UI text
            }
            // All other colors are ignored (no action)
        });
    }

    getPixelColor(x, y) {
        // Create a temporary canvas to read pixel data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.maskTexture.width;
        canvas.height = this.maskTexture.height;
        ctx.drawImage(this.maskTexture, 0, 0);

        // Get pixel data at the clicked position
        const imageData = ctx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        // Check for specific colors
        if (r === 0 && g === 255 && b === 0) {
            return 'green'; // Walkable
        } else if (r === 255 && g === 0 && b === 0) {
            return 'red'; // Interactive
        }
        return 'other'; // Ignore
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
                this.baseY = this.sister1.y;
                this.isMoving = false;
                this.bobTime = 0; // Reset bob animation
            } else {
                // Flip sprite based on horizontal direction
                if (dx < 0) {
                    this.sister1.flipX = false;  // Moving left
                } else if (dx > 0) {
                    this.sister1.flipX = true; // Moving right
                }

                // Move towards target at constant speed
                const angle = Math.atan2(dy, dx);
                this.sister1.x += Math.cos(angle) * this.moveSpeed;

                // Apply vertical bob animation (3 pixels up/down)
                this.bobTime += 0.15; // Controls bob speed
                const bobOffset = Math.sin(this.bobTime) * 3;
                this.baseY += Math.sin(angle) * this.moveSpeed;
                this.sister1.y = this.baseY + bobOffset;
            }
        }

        // Handle sister2 following sister1
        // Calculate direction from sister2 to sister1
        const dx2 = this.sister1.x - this.sister2.x;
        const dy2 = this.sister1.y - this.sister2.y;
        const angle2 = Math.atan2(dy2, dx2);

        // Calculate target follow position (50 pixels behind sister1)
        const targetX2 = this.sister1.x - Math.cos(angle2) * 50;
        const targetY2 = this.sister1.y - Math.sin(angle2) * 50;

        // Calculate distance to target follow position
        const distToTarget = Math.sqrt(
            (targetX2 - this.sister2.x) ** 2 +
            (targetY2 - this.sister2.y) ** 2
        );

        // Only move if distance to target is significant
        if (distToTarget > 5) {
            this.isMoving2 = true;

            // Lerp towards follow position (slower than sister1)
            const lerpFactor = 0.03;
            const newX = this.sister2.x + (targetX2 - this.sister2.x) * lerpFactor;
            const newY = this.sister2.y + (targetY2 - this.sister2.y) * lerpFactor;

            // Flip sprite based on movement direction
            const moveDx = newX - this.sister2.x;
            if (moveDx < 0) {
                this.sister2.flipX = false; // Moving left
            } else if (moveDx > 0) {
                this.sister2.flipX = true; // Moving right
            }

            // Apply vertical bob animation only when moving
            this.bobTime2 += 0.15;
            const bobOffset2 = Math.sin(this.bobTime2) * 3;
            this.baseY2 += (newY - this.sister2.y);
            this.sister2.x = newX;
            this.sister2.y = this.baseY2 + bobOffset2;
        } else {
            // Stop completely when close enough
            this.isMoving2 = false;
            this.bobTime2 = 0;
            this.sister2.y = this.baseY2;
        }

        // Depth sorting: higher Y = closer to camera = render on top
        this.sister1.setDepth(this.sister1.y);
        this.sister2.setDepth(this.sister2.y);
    }
}

export default GameScene;

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

        // Player and follower references (assigned based on selection)
        this.player = null;
        this.follower = null;
        this.playerBobTime = 0;
        this.playerBaseY = 0;
        this.followerBobTime = 0;
        this.followerBaseY = 0;
        this.isFollowerMoving = false;

        // Keep legacy variables for backward compatibility
        this.sister1 = null;
        this.sister2 = null;
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

        // Position sprites
        if (isPlayingBig) {
            // Playing as big sister
            this.sister1 = this.add.image(150, 700, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;

            this.sister2 = this.add.image(200, 700, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;

            // Assign player and follower
            this.player = this.sister1;
            this.follower = this.sister2;
            this.playerBaseY = this.baseY;
            this.followerBaseY = this.baseY2;
        } else {
            // Playing as little sister
            this.sister2 = this.add.image(200, 700, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;

            this.sister1 = this.add.image(250, 700, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;

            // Assign player and follower
            this.player = this.sister2;
            this.follower = this.sister1;
            this.playerBaseY = this.baseY2;
            this.followerBaseY = this.baseY;
        }

        // Flip both sprites to face INTO the clearing
        this.sister1.setFlipX(true);
        this.sister2.setFlipX(true);

        // Create wisp entity (example usage)
        this.wisp = new Wisp(this, 800, 450);
        this.wisp.onClick(() => {
            console.log('Wisp clicked! Add custom behavior here.');
            // TODO: Show proper dialog or interaction
        });

        // Add click handler for movement with mask checking
        this.input.on('pointerdown', (pointer) => {
            const color = this.getPixelColor(pointer.x, pointer.y);

            if (color === 'green') {
                // Walkable area - move player character
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
        // Handle player movement
        if (this.isMoving && this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.player.x;
            const dy = this.targetY - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Stop if close enough to target (within move speed distance)
            if (distance < this.moveSpeed) {
                this.player.x = this.targetX;
                this.player.y = this.targetY;
                this.playerBaseY = this.player.y;
                this.isMoving = false;
                this.playerBobTime = 0; // Reset bob animation
            } else {
                // Flip sprite based on horizontal direction (accounting for initial flip)
                if (dx < 0) {
                    this.player.flipX = false;  // Moving left
                } else if (dx > 0) {
                    this.player.flipX = true; // Moving right
                }

                // Move towards target at constant speed
                const angle = Math.atan2(dy, dx);
                this.player.x += Math.cos(angle) * this.moveSpeed;

                // Apply vertical bob animation (3 pixels up/down)
                this.playerBobTime += 0.15; // Controls bob speed
                const bobOffset = Math.sin(this.playerBobTime) * 3;
                this.playerBaseY += Math.sin(angle) * this.moveSpeed;
                this.player.y = this.playerBaseY + bobOffset;
            }
        }

        // Handle follower following player
        // Calculate direction from follower to player
        const dx2 = this.player.x - this.follower.x;
        const dy2 = this.player.y - this.follower.y;
        const angle2 = Math.atan2(dy2, dx2);

        // Calculate target follow position (50 pixels behind player)
        const targetX2 = this.player.x - Math.cos(angle2) * 50;
        const targetY2 = this.player.y - Math.sin(angle2) * 50;

        // Calculate distance to target follow position
        const distToTarget = Math.sqrt(
            (targetX2 - this.follower.x) ** 2 +
            (targetY2 - this.follower.y) ** 2
        );

        // Only move if distance to target is significant
        if (distToTarget > 5) {
            this.isFollowerMoving = true;

            // Lerp towards follow position (slower than player)
            const lerpFactor = 0.03;
            const newX = this.follower.x + (targetX2 - this.follower.x) * lerpFactor;
            const newY = this.follower.y + (targetY2 - this.follower.y) * lerpFactor;

            // Flip sprite based on movement direction (accounting for initial flip)
            const moveDx = newX - this.follower.x;
            if (moveDx < 0) {
                this.follower.flipX = false; // Moving left
            } else if (moveDx > 0) {
                this.follower.flipX = true; // Moving right
            }

            // Apply vertical bob animation only when moving
            this.followerBobTime += 0.15;
            const bobOffset2 = Math.sin(this.followerBobTime) * 3;
            this.followerBaseY += (newY - this.follower.y);
            this.follower.x = newX;
            this.follower.y = this.followerBaseY + bobOffset2;
        } else {
            // Stop completely when close enough
            this.isFollowerMoving = false;
            this.followerBobTime = 0;
            this.follower.y = this.followerBaseY;
        }

        // Depth sorting: higher Y = closer to camera = render on top
        this.sister1.setDepth(this.sister1.y);
        this.sister2.setDepth(this.sister2.y);
    }
}

export default GameScene;

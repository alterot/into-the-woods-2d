// ===== GAME SCENE (BASE CLASS) =====
// Abstract base class for all gameplay scenes
// Handles movement, pathfinding, follower AI, mask detection, depth sorting
import AudioManager from '../AudioManager.js';
import SpeechBubble from '../entities/SpeechBubble.js';

class GameScene extends Phaser.Scene {
    constructor(sceneKey, backgroundKey, maskKey) {
        super({ key: sceneKey });

        // Scene configuration
        this.sceneKey = sceneKey;
        this.backgroundKey = backgroundKey;
        this.maskKey = maskKey;

        // Movement properties
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

        // Footstep tracking
        this.lastStepX = null;
        this.lastStepY = null;
        this.stepDistanceAccum = 0;

        // Keep legacy variables for backward compatibility
        this.sister1 = null;
        this.sister2 = null;
        this.bobTime = 0;
        this.baseY = 0;
        this.bobTime2 = 0;
        this.baseY2 = 0;
        this.isMoving2 = false;

        // Pathfinding properties
        this.easystar = null;
        this.grid = null;
        this.gridSize = 32; // Size of each grid cell in pixels
        this.path = null;
        this.currentWaypoint = 0;
        this.pathIndicator = null;

        // Feedback messages and bubble
        this.feedbackMessages = {
            cannotWalk: "Vi kan inte gå dit, skogen är för tät."
        };
        this.feedbackBubble = null;
    }

    // Subclasses must implement preload() to load scene-specific assets
    preload() {
        // Override in subclass to load background, mask, sprites, etc.
    }

    create() {
        // Display the background image centered
        this.add.image(640, 360, this.backgroundKey);

        // Create mask texture for pixel detection (invisible)
        this.maskTexture = this.textures.get(this.maskKey).getSourceImage();

        // Initialize pathfinding grid and EasyStar
        this.createGridFromMask();
        this.initializePathfinding();

        // Setup player characters
        this.setupCharacters();

        // Initiera fotstegsposition vid start
        this.lastStepX = this.player.x;
        this.lastStepY = this.player.y;
        this.stepDistanceAccum = 0;

        // Hook for subclasses to add scene-specific content (wisp, objects, etc.)
        this.createSceneContent();

        // Add click handler for movement with mask checking
        this.input.on('pointerdown', (pointer) => {
            // Block clicks if dialog is active
            if (this.dialogActive) {
                return;
            }

            const color = this.getPixelColor(pointer.x, pointer.y);

            if (color === 'green') {
                // Dismiss any active feedback bubble
                if (this.feedbackBubble) {
                    this.feedbackBubble.destroy();
                    this.feedbackBubble = null;
                }

                // Walkable area - find path
                // Play click sound
                const audioManager = this.registry.get('audioManager');
                if (audioManager) {
                    audioManager.playClick();
                }
                this.showValidClickIndicator(pointer.x, pointer.y);
                this.findPath(this.player.x, this.player.y, pointer.x, pointer.y);
            } else if (color === 'red') {
                // Dismiss any active feedback bubble
                if (this.feedbackBubble) {
                    this.feedbackBubble.destroy();
                    this.feedbackBubble = null;
                }

                // Interactive object - handled by subclass
                this.handleInteractiveClick(pointer.x, pointer.y);
            } else {
                // Blocked (black/unpainted) - show red indicator AND speech bubble
                this.showNoPathIndicator(pointer.x, pointer.y);
                this.showFeedbackBubble(this.feedbackMessages.cannotWalk);
            }
        });
    }

    setupCharacters() {
        // Determine player character based on selection
        const isPlayingBig = window.gameState?.selectedCharacter === 'big';

        // Position sprites - player always on the right
        if (isPlayingBig) {
            // Playing as big sister - she's the player (right)
            this.sister2 = this.add.image(150, 550, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;

            this.sister1 = this.add.image(200, 550, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;

            // Assign player and follower
            this.player = this.sister1;
            this.follower = this.sister2;
            this.playerBaseY = this.baseY;
            this.followerBaseY = this.baseY2;
        } else {
            // Playing as little sister - she's the player (right)
            this.sister1 = this.add.image(150, 550, 'sister1');
            this.sister1.setScale(0.55);
            this.baseY = this.sister1.y;

            this.sister2 = this.add.image(200, 550, 'sister2');
            this.sister2.setScale(0.5);
            this.baseY2 = this.sister2.y;

            // Assign player and follower
            this.player = this.sister2;
            this.follower = this.sister1;
            this.playerBaseY = this.baseY2;
            this.followerBaseY = this.baseY;
        }

        // Flip both sprites to face INTO the clearing
        this.sister1.setFlipX(true);
        this.sister2.setFlipX(true);
    }

    // Hook for subclasses to add scene-specific content
    createSceneContent() {
        // Override in subclass to add wisps, objects, interactions, etc.
    }

    // Hook for subclasses to handle interactive object clicks
    handleInteractiveClick(x, y) {
        // Override in subclass to handle red (interactive) clicks
        console.log('Interactive object clicked!');
        this.showNoPathIndicator(x, y);
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

    createGridFromMask() {
        // Create a grid by sampling the mask image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.maskTexture.width;
        canvas.height = this.maskTexture.height;
        ctx.drawImage(this.maskTexture, 0, 0);

        // Calculate grid dimensions
        const cols = Math.ceil(canvas.width / this.gridSize);
        const rows = Math.ceil(canvas.height / this.gridSize);

        // Initialize grid array
        this.grid = [];

        // Sample each grid cell
        for (let row = 0; row < rows; row++) {
            this.grid[row] = [];
            for (let col = 0; col < cols; col++) {
                // Sample the center of the grid cell
                const x = col * this.gridSize + this.gridSize / 2;
                const y = row * this.gridSize + this.gridSize / 2;

                // Get pixel color at this position
                const imageData = ctx.getImageData(x, y, 1, 1);
                const pixel = imageData.data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];

                // Green = walkable (0), anything else = blocked (1)
                if (r === 0 && g === 255 && b === 0) {
                    this.grid[row][col] = 0; // Walkable
                } else {
                    this.grid[row][col] = 1; // Blocked
                }
            }
        }
    }

    initializePathfinding() {
        // Initialize EasyStar
        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.grid);
        this.easystar.setAcceptableTiles([0]); // Only walkable tiles
        this.easystar.enableDiagonals(); // Allow diagonal movement
        this.easystar.enableCornerCutting(false); // Don't cut corners
    }

    worldToGrid(x, y) {
        // Convert world coordinates to grid coordinates
        return {
            col: Math.floor(x / this.gridSize),
            row: Math.floor(y / this.gridSize)
        };
    }

    gridToWorld(col, row) {
        // Convert grid coordinates to world coordinates (center of cell)
        return {
            x: col * this.gridSize + this.gridSize / 2,
            y: row * this.gridSize + this.gridSize / 2
        };
    }

    findPath(startX, startY, endX, endY) {
        // Convert world coordinates to grid coordinates
        const start = this.worldToGrid(startX, startY);
        const end = this.worldToGrid(endX, endY);

        // Find path using EasyStar
        this.easystar.findPath(start.col, start.row, end.col, end.row, (path) => {
            if (path === null) {
                // No path found - show red indicator
                this.showNoPathIndicator(endX, endY);
                this.path = null;
            } else {
                // Path found - convert grid coordinates back to world coordinates
                this.path = path.map(point => this.gridToWorld(point.x, point.y));
                this.currentWaypoint = 0;
                this.isMoving = true;
            }
        });

        // Calculate the path immediately
        this.easystar.calculate();
    }

    showNoPathIndicator(x, y) {
        // Remove previous indicator
        if (this.pathIndicator) {
            this.tweens.killTweensOf(this.pathIndicator);
            this.pathIndicator.destroy();
        }

        // Create red circle (larger!)
        this.pathIndicator = this.add.circle(x, y, 2, 0xff6b6b, 0.8);
        this.pathIndicator.setDepth(1000);

        // Expand + fade animation (like water ripple!)
        this.tweens.add({
            targets: this.pathIndicator,
            radius: 10,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.pathIndicator) {
                    this.pathIndicator.destroy();
                    this.pathIndicator = null;
                }
            }
        });
    }

    showValidClickIndicator(x, y) {
        // Remove previous indicator
        if (this.validClickIndicator) {
            this.tweens.killTweensOf(this.validClickIndicator);
            this.validClickIndicator.destroy();
        }

        // Create green circle
        this.validClickIndicator = this.add.circle(x, y, 2, 0x6bff6b, 0.8);  // Ljusgrön
        this.validClickIndicator.setDepth(1000);

        // Expand + fade animation
        this.tweens.add({
            targets: this.validClickIndicator,
            radius: 10,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.validClickIndicator) {
                    this.validClickIndicator.destroy();
                    this.validClickIndicator = null;
                }
            }
        });
    }

    showFeedbackBubble(message) {
        // Destroy previous bubble if exists
        if (this.feedbackBubble) {
            this.feedbackBubble.destroy();
        }

        // Create bubble FOLLOWING the player
        this.feedbackBubble = new SpeechBubble(
            this,
            this.player.x,     // Startposition – bubblan flyttar sig sen själv
            this.player.y,
            message,
            3000,              // Duration (vi ändrar i steg 3)
            this.player        // 🟢 followTarget → bubblan följer spelaren
        );
    }


    update() {
        // Handle player movement along path
        if (this.isMoving && this.path && this.currentWaypoint < this.path.length) {
            // Get current waypoint
            const waypoint = this.path[this.currentWaypoint];
            const dx = waypoint.x - this.player.x;
            const dy = waypoint.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if reached current waypoint
            if (distance < this.moveSpeed * 2) {
                // Move to next waypoint
                this.currentWaypoint++;

                // Check if path is complete
                if (this.currentWaypoint >= this.path.length) {
                    this.isMoving = false;
                    this.playerBobTime = 0; // Reset bob animation
                    this.path = null;
                }
            } else {
                // Flip sprite based on horizontal direction (accounting for initial flip)
                if (dx < 0) {
                    this.player.flipX = false;  // Moving left
                } else if (dx > 0) {
                    this.player.flipX = true; // Moving right
                }

                // Move towards waypoint at constant speed
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

        // --- Fotsteg baserat på distans ---
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            const anyMoving = this.isMoving || this.isFollowerMoving;

            // Om ingen rör sig: nollställ accumulatorn
            if (!anyMoving) {
                this.lastStepX = this.player.x;
                this.lastStepY = this.player.y;
                this.stepDistanceAccum = 0;
            } else {
                // Se till att vi har en startpunkt
                if (this.lastStepX == null || this.lastStepY == null) {
                    this.lastStepX = this.player.x;
                    this.lastStepY = this.player.y;
                }

                const dx = this.player.x - this.lastStepX;
                const dy = this.player.y - this.lastStepY;
                const frameDist = Math.sqrt(dx * dx + dy * dy);

                this.stepDistanceAccum += frameDist;

                // Tröskel för ett fotsteg – tweaka 12–20 px efter känsla
                const STEP_DISTANCE = 16;

                if (this.stepDistanceAccum >= STEP_DISTANCE) {
                    audioManager.playFootstep();
                    this.stepDistanceAccum = 0;
                }

                this.lastStepX = this.player.x;
                this.lastStepY = this.player.y;
            }
        }
    }
}


export default GameScene;

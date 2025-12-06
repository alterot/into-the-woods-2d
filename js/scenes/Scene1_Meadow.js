// ===== SCENE 1: MEADOW =====
// First gameplay scene - meadow clearing with wisp
import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';
import DialogOverlay from '../systems/DialogOverlay.js';

class Scene1_Meadow extends GameScene {
    constructor() {
        // Call parent constructor with scene-specific keys
        super('Scene1_Meadow', 'background', 'mask');

        // Dialog state
        this.dialogActive = false;
        this.runestoneOverlay = null;
        this.runestonePosition = null;
    }

    createSceneContent() {
        // Add scene-specific content (wisp, interactive objects, etc.)

        // Create wisp at specified position
        this.wisp = new Wisp(this, 500, 300);
        this.wisp.onClick(() => {
            console.log('Wisp clicked in meadow! Add dialog or interaction here.');
            // TODO: Show proper dialog or interaction
        });
    }

    findNearestWalkable(targetX, targetY, maxRadius = 150) {
        // Try increasingly larger radiuses
        for (let radius = 5; radius <= maxRadius; radius += 5) {
            // Check 8 directions around target
            const angles = [0, 45, 90, 135, 180, 225, 270, 315];

            for (let angle of angles) {
                const rad = angle * Math.PI / 180;
                const x = Math.round(targetX + Math.cos(rad) * radius);
                const y = Math.round(targetY + Math.sin(rad) * radius);

                if (this.getPixelColor(x, y) === 'green') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    handleInteractiveClick(x, y) {
        // Ignore clicks if dialog is already active
        if (this.dialogActive) {
            return;
        }

        // Save runestone position for facing direction
        this.runestonePosition = { x, y };

        // Get runestone dialogue data
        const runeData = this.cache.json.get('runeDialogue');
        const dialogData = runeData.conversations[0].lines;

        // Find nearest walkable spot around the runestone (red pixels are not walkable)
        const walkableSpot = this.findNearestWalkable(x, y, 50);
        if (walkableSpot) {
            // Start pathfinding to nearest walkable spot
            this.findPath(this.player.x, this.player.y, walkableSpot.x, walkableSpot.y);
        } else {
            console.warn('No walkable spot found near runestone');
        }

        // Immediately start dialog overlay
        this.dialogActive = true;
        this.runestoneOverlay = new DialogOverlay(this, {
            dialogueData: dialogData,
            spritesVisible: true,     // Keep scene visible
            backgroundDim: 0.6,       // Dark overlay at 60% opacity
            onComplete: () => {
                this.dialogActive = false;
                this.runestoneOverlay = null;
                this.runestonePosition = null;
                // TODO: Mark runestone as read
            }
        });
        this.runestoneOverlay.start();
    }

    update() {
        // Call parent update for movement and pathfinding
        super.update();

        // Fix facing direction when dialog is active and both sisters stopped
        if (this.dialogActive && this.runestonePosition) {
            const bothStopped = !this.isMoving && !this.isFollowerMoving;

            if (bothStopped) {
                // Determine which direction to face based on runestone position
                const sistersLeftOfStone = this.player.x < this.runestonePosition.x;

                // Face toward runestone
                if (sistersLeftOfStone) {
                    // Sisters are left of stone → face right
                    this.sister1.setFlipX(true);
                    this.sister2.setFlipX(true);
                } else {
                    // Sisters are right of stone → face left
                    this.sister1.setFlipX(false);
                    this.sister2.setFlipX(false);
                }
            }
        }
    }
}

export default Scene1_Meadow;

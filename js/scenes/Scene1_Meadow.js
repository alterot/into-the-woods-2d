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

    handleInteractiveClick(x, y) {
        // Ignore clicks if dialog is already active
        if (this.dialogActive) {
            return;
        }

        // Get runestone dialogue data
        const runeData = this.cache.json.get('runeDialogue');
        const dialogData = runeData.conversations[0].lines;

        // Start pathfinding - sisters walk to runestone
        this.findPath(this.player.x, this.player.y, x, y);

        // Immediately start dialog overlay
        this.dialogActive = true;
        this.runestoneOverlay = new DialogOverlay(this, {
            dialogueData: dialogData,
            spritesVisible: true,     // Keep scene visible
            backgroundDim: 0.6,       // Dark overlay at 60% opacity
            onComplete: () => {
                this.dialogActive = false;
                this.runestoneOverlay = null;
                // TODO: Mark runestone as read
            }
        });
        this.runestoneOverlay.start();
    }
}

export default Scene1_Meadow;

// ===== SCENE 1: MEADOW =====
// First gameplay scene - meadow clearing with wisp
import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';

class Scene1_Meadow extends GameScene {
    constructor() {
        // Call parent constructor with scene-specific keys
        super('Scene1_Meadow', 'background', 'mask');
    }

    preload() {
        // Load scene-specific assets
        // Background and mask
        this.load.image('background', 'assets/scenes/scen1-meadow.png');
        this.load.image('mask', 'assets/scenes/scen1-mask.png');

        // Character sprites
        this.load.image('sister1', 'assets/sprites/sister1-idle-S.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle-S.png');

        // Wisp sprite
        Wisp.preload(this);
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
        // Handle red (interactive) pixel clicks
        console.log('Interactive object clicked at:', x, y);
        // TODO: Add scene-specific interactions (runestone, etc.)
        this.showNoPathIndicator(x, y);
    }
}

export default Scene1_Meadow;

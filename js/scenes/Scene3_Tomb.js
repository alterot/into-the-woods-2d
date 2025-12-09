// ===== SCENE 3: TOMB INTERIOR =====
// Third gameplay scene - ancient burial chamber with braziers

import GameScene from './GameScene.js';

class Scene3_Tomb extends GameScene {
    constructor() {
        // Use scene-specific texture keys
        super('Scene3_Tomb', 'background3', 'mask3');

        this.dialogActive = false;

        // Placeholder for future interactive objects
        this.braziers = []; // TODO: add three brazier InteractiveObjects
    }

    /**
     * Return spawn point for sisters based on entry tag
     * x,y is the "center" between sisters - GameScene shifts them apart
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            from_crossroads: { x: 640, y: 660 },
            default:         { x: 640, y: 660 }
        };

        return spawns[entryTag] || spawns.default;
    }

    // Scene-specific content (braziers, skeleton mage, etc.)
    createSceneContent() {
        // TODO: add three brazier InteractiveObjects here
        // TODO: add skeleton mage encounter
        // TODO: add puzzle mechanics (light all braziers to unlock exit?)

        // Custom feedback message for this scene
        this.feedbackMessages.cannotWalk = "The tomb walls are too close here, we can't go that way.";
    }

    // Red pixels in mask (interactive objects) - placeholder for now
    handleInteractiveClick(x, y) {
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("It's dark in here… we should check the braziers later.");
    }

    // Blue pixels in mask (exit back to crossroads)
    handleTransitionClick(x, y) {
        console.log('[Scene3] Transition click at', x, y);

        // Block if dialog is already active
        if (this.dialogActive) {
            console.log('[Scene3] Transition click blocked - dialog active');
            return;
        }

        console.log('[Scene3] Exiting tomb - returning to Scene2');

        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        this.showValidClickIndicator(x, y);

        // Transition back to Scene2_Crossroads
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('Scene2_Crossroads', { entry: 'from_tomb' });
        });
    }

    update() {
        super.update();

        // TODO: scene-specific update logic (braziers, puzzles, etc.)
    }
}

export default Scene3_Tomb;

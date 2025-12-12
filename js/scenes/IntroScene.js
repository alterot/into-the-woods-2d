// ===== INTRO SCENE =====
// Handles the intro dialog sequence with portraits
import DialogOverlay from '../systems/DialogOverlay.js';
import FullscreenButton from '../ui/FullscreenButton.js';

class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
        this.dialogOverlay = null;
    }

    create() {
        // Display background image
        this.add.image(640, 360, 'background');

        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Fullscreen button
        this.fullscreenButton = new FullscreenButton(this);

        // Load dialogue data
        const dialogData = this.cache.json.get('introDialogue').conversations[0].lines;

        // Create dialog overlay
        this.dialogOverlay = new DialogOverlay(this, {
            dialogueData: dialogData,
            spritesVisible: false,  // Hide background during intro
            backgroundDim: 0,       // No dark overlay needed
            textSpeed: 75,          // 75ms per character
            onComplete: () => {
                // Transition to gameplay scene
                this.scene.start('Scene1_Meadow');
            }
        });

        // Start dialog
        this.dialogOverlay.start();
    }
}

export default IntroScene;

// ===== INTRO SCENE =====
// Handles the intro dialog sequence with portraits
class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
        this.dialogData = null;
        this.currentLine = 0;
        this.dialogUI = null;
    }

    preload() {
        // Load background image
        this.load.image('background', 'assets/scenes/scen1-meadow.png');

        // Load portraits (large, for dialog scenes)
        this.load.image('portrait1', 'assets/portraits/sister1-portrait-S.png');
        this.load.image('portrait2', 'assets/portraits/sister2-portrait-S.png');

        // Load dialogue data
        this.load.json('introDialogue', 'assets/dialogues/intro-dialogue.json');
    }

    create() {
        // Display background image FIRST (before portraits)
        this.add.image(512, 512, 'background');

        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Load dialogue data
        this.dialogData = this.cache.json.get('introDialogue').conversations[0].lines;
        this.currentLine = 0;

        // Determine player and sibling based on selection
        const isPlayingBig = window.gameState?.selectedCharacter === 'big';
        const playerPortrait = isPlayingBig ? 'portrait1' : 'portrait2';
        const siblingPortrait = isPlayingBig ? 'portrait2' : 'portrait1';

        // Canvas dimensions
        const canvasWidth = 1024;
        const canvasHeight = 1024;

        // Portrait positions at bottom of screen
        const portraitY = canvasHeight - 200;
        const leftX = 200;
        const rightX = canvasWidth - 200;

        // Textbox positions (above portraits)
        const textboxY = portraitY - 200;
        const textboxWidth = 300;
        const textboxHeight = 120;

        // Create dialog UI
        this.dialogUI = {
            // Portraits at bottom of screen (scaled to ~200-250px height)
            leftPortrait: this.add.image(leftX, portraitY, playerPortrait).setScale(0.15).setAlpha(0.7),
            rightPortrait: this.add.image(rightX, portraitY, siblingPortrait).setScale(0.15).setAlpha(0.7),

            // Left textbox (above left portrait)
            leftTextboxBg: this.add.rectangle(leftX, textboxY, textboxWidth, textboxHeight, 0x8B6F47, 0.9)
                .setStrokeStyle(3, 0x5C4A30),
            leftTextboxText: this.add.text(leftX, textboxY, '', {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: textboxWidth - 30 }
            }).setOrigin(0.5),

            // Right textbox (above right portrait)
            rightTextboxBg: this.add.rectangle(rightX, textboxY, textboxWidth, textboxHeight, 0x8B6F47, 0.9)
                .setStrokeStyle(3, 0x5C4A30),
            rightTextboxText: this.add.text(rightX, textboxY, '', {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: textboxWidth - 30 }
            }).setOrigin(0.5)
        };

        // Fix portrait facing direction - make them face each other
        if (isPlayingBig) {
            // When playing as Big Sister, flip BOTH portraits to face each other
            this.dialogUI.leftPortrait.setFlipX(true);
            this.dialogUI.rightPortrait.setFlipX(true);
        }
        // When playing as Little Sister, no flip needed (default orientation)

        // Initially hide both textboxes
        this.dialogUI.leftTextboxBg.setVisible(false);
        this.dialogUI.leftTextboxText.setVisible(false);
        this.dialogUI.rightTextboxBg.setVisible(false);
        this.dialogUI.rightTextboxText.setVisible(false);

        // Show first line
        this.showDialogLine();

        // Add input for advancing dialog
        this.dialogSpaceHandler = () => this.advanceDialog();
        this.dialogClickHandler = () => this.advanceDialog();
        this.input.keyboard.on('keydown-SPACE', this.dialogSpaceHandler);
        this.input.on('pointerdown', this.dialogClickHandler);
    }

    showDialogLine() {
        if (this.currentLine >= this.dialogData.length) {
            this.endDialog();
            return;
        }

        const line = this.dialogData[this.currentLine];

        // Show only the active speaker's textbox
        if (line.role === 'player') {
            // Player is speaking (left side)
            this.dialogUI.leftTextboxBg.setVisible(true);
            this.dialogUI.leftTextboxText.setVisible(true).setText(line.text);
            this.dialogUI.rightTextboxBg.setVisible(false);
            this.dialogUI.rightTextboxText.setVisible(false);

            // Highlight left portrait (active speaker)
            this.dialogUI.leftPortrait.setAlpha(1).setScale(1); // Scale 1.1x
            this.dialogUI.rightPortrait.setAlpha(0.7).setScale(1);
        } else {
            // Sibling is speaking (right side)
            this.dialogUI.rightTextboxBg.setVisible(true);
            this.dialogUI.rightTextboxText.setVisible(true).setText(line.text);
            this.dialogUI.leftTextboxBg.setVisible(false);
            this.dialogUI.leftTextboxText.setVisible(false);

            // Highlight right portrait (active speaker)
            this.dialogUI.rightPortrait.setAlpha(1).setScale(1); // Scale 1.1x
            this.dialogUI.leftPortrait.setAlpha(0.7).setScale(1);
        }
    }

    advanceDialog() {
        if (!this.dialogUI) return;

        this.currentLine++;
        this.showDialogLine();
    }

    endDialog() {
        if (!this.dialogUI) return;

        // Remove dialog input handlers
        this.input.keyboard.off('keydown-SPACE', this.dialogSpaceHandler);
        this.input.off('pointerdown', this.dialogClickHandler);

        // Fade out portraits and textboxes
        this.tweens.add({
            targets: [
                this.dialogUI.leftPortrait,
                this.dialogUI.rightPortrait,
                this.dialogUI.leftTextboxBg,
                this.dialogUI.leftTextboxText,
                this.dialogUI.rightTextboxBg,
                this.dialogUI.rightTextboxText
            ],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Transition to gameplay scene
                this.scene.start('GameScene');
            }
        });
    }
}

export default IntroScene;

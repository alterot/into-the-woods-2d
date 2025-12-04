// ===== CHARACTER SELECT SCENE =====
class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    create() {
        // Background color - forest green
        this.cameras.main.setBackgroundColor('#2a3d2a');

        // Title text
        const titleText = this.add.text(512, 200, 'Choose Your Character', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#D4A574',
            fontStyle: 'bold'
        });
        titleText.setOrigin(0.5);

        // Button style constants
        const buttonWidth = 300;
        const buttonHeight = 80;
        const buttonColor = 0x8B6F47;
        const buttonHoverColor = 0xA58A68;

        // Big Sister Button
        const bigSisterBtn = this.add.rectangle(512, 400, buttonWidth, buttonHeight, buttonColor);
        bigSisterBtn.setInteractive({ useHandCursor: true });
        const bigSisterText = this.add.text(512, 400, 'Play as Big Sister', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        bigSisterText.setOrigin(0.5);

        // Little Sister Button
        const littleSisterBtn = this.add.rectangle(512, 520, buttonWidth, buttonHeight, buttonColor);
        littleSisterBtn.setInteractive({ useHandCursor: true });
        const littleSisterText = this.add.text(512, 520, 'Play as Little Sister', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        littleSisterText.setOrigin(0.5);

        // Hover effects for Big Sister button
        bigSisterBtn.on('pointerover', () => {
            bigSisterBtn.setFillStyle(buttonHoverColor);
        });
        bigSisterBtn.on('pointerout', () => {
            bigSisterBtn.setFillStyle(buttonColor);
        });

        // Hover effects for Little Sister button
        littleSisterBtn.on('pointerover', () => {
            littleSisterBtn.setFillStyle(buttonHoverColor);
        });
        littleSisterBtn.on('pointerout', () => {
            littleSisterBtn.setFillStyle(buttonColor);
        });

        // Click handlers
        bigSisterBtn.on('pointerdown', () => {
            window.gameState = { selectedCharacter: 'big' };
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });

        littleSisterBtn.on('pointerdown', () => {
            window.gameState = { selectedCharacter: 'little' };
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });
    }
}

// ===== GAME SCENE =====
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

        // Dialog system variables
        this.canMove = false;
        this.dialogData = null;
        this.currentLine = 0;
        this.dialogUI = null;
    }

    preload() {
        // Load the background image
        this.load.image('background', 'assets/scenes/scen1-meadow.png');

        // Load mask image (invisible, used for walkability detection)
        this.load.image('mask', 'assets/scenes/scen1-mask.png');

        // Load character sprites
        this.load.image('sister1', 'assets/sprites/sister1-idle-S.png');
        this.load.image('sister2', 'assets/sprites/sister2-idle-S.png');

        // Load portraits (large, for dialog scenes)
        this.load.image('portrait1', 'assets/portraits/sister1-portrait.png');
        this.load.image('portrait2', 'assets/portraits/sister2-portrait.png');

        // Load dialogue data
        this.load.json('introDialogue', 'assets/dialogues/intro-dialogue.json');
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

        // Add click handler for movement with mask checking
        this.input.on('pointerdown', (pointer) => {
            // Don't allow movement during dialog
            if (!this.canMove) return;

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

        // Start intro dialog sequence
        this.startIntroDialog();
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

    // ===== DIALOG SYSTEM =====
    startIntroDialog() {
        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Hide game sprites during dialog
        this.sister1.setAlpha(0);
        this.sister2.setAlpha(0);

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
        const portraitY = canvasHeight - 150;
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

        // Initially hide both textboxes
        this.dialogUI.leftTextboxBg.setVisible(false);
        this.dialogUI.leftTextboxText.setVisible(false);
        this.dialogUI.rightTextboxBg.setVisible(false);
        this.dialogUI.rightTextboxText.setVisible(false);

        // Show first line
        this.showDialogLine();

        // Add input for advancing dialog (store handlers to remove later)
        this.dialogSpaceHandler = () => this.advanceDialog();
        this.dialogClickHandler = () => this.advanceDialog();
        this.input.keyboard.on('keydown-SPACE', this.dialogSpaceHandler);
        this.dialogClickEvent = this.input.on('pointerdown', this.dialogClickHandler);
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
            this.dialogUI.leftPortrait.setAlpha(1).setScale(0.165); // Scale 1.1x
            this.dialogUI.rightPortrait.setAlpha(0.7).setScale(0.15);
        } else {
            // Sibling is speaking (right side)
            this.dialogUI.rightTextboxBg.setVisible(true);
            this.dialogUI.rightTextboxText.setVisible(true).setText(line.text);
            this.dialogUI.leftTextboxBg.setVisible(false);
            this.dialogUI.leftTextboxText.setVisible(false);

            // Highlight right portrait (active speaker)
            this.dialogUI.rightPortrait.setAlpha(1).setScale(0.165); // Scale 1.1x
            this.dialogUI.leftPortrait.setAlpha(0.7).setScale(0.15);
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
                this.dialogUI.leftPortrait.destroy();
                this.dialogUI.rightPortrait.destroy();
                this.dialogUI.leftTextboxBg.destroy();
                this.dialogUI.leftTextboxText.destroy();
                this.dialogUI.rightTextboxBg.destroy();
                this.dialogUI.rightTextboxText.destroy();
                this.dialogUI = null;
            }
        });

        // Fade in game sprites
        this.tweens.add({
            targets: [this.sister1, this.sister2],
            alpha: 1,
            duration: 500
        });

        // Enable movement
        this.canMove = true;
    }

    update() {
        // Don't update movement during dialog
        if (!this.canMove) return;

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
                    this.sister1.flipX = false;  // Går vänster
                } else if (dx > 0) {
                    this.sister1.flipX = true; // Går höger
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
    scene: [CharacterSelectScene, GameScene],
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

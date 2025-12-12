// ===== DIALOG OVERLAY SYSTEM =====
// Reusable dialog system with portraits and typewriter effect
// Used in IntroScene and gameplay dialog sequences

import SceneStateManager from './SceneStateManager.js';

class DialogOverlay {
    constructor(scene, config) {
        this.scene = scene;

        // Configuration with defaults
        this.dialogueData = config.dialogueData || [];
        this.choiceData = config.choiceData || null;  // NEW: Choice configuration
        this.spritesVisible = config.spritesVisible ?? false;
        this.backgroundDim = config.backgroundDim ?? 0.6;
        this.portraitScale = config.portraitScale ?? 1;
        this.textSpeed = config.textSpeed ?? 75;
        this.onComplete = config.onComplete || (() => {});
        this.onLineChange = config.onLineChange || null;

        // NEW: Flexible character layout configuration
        // Maps dialogue roles to screen sides ('left', 'right', 'narrator')
        this.roleSideMap = config.roleSideMap || null;
        // Maps dialogue roles to portrait texture keys
        this.rolePortraitMap = config.rolePortraitMap || null;

        // State
        this.currentLine = 0;
        this.isTyping = false;
        this.currentTypingEvent = null;
        this.dialogUI = null;
        this.backgroundOverlay = null;
        this.dialogSpaceHandler = null;
        this.dialogClickHandler = null;
        // I constructor, lägg till:
        this.currentTextObject = null;
        this.currentFullText = '';
        this.selectedChoice = null;  // NEW: Store selected choice

        // Cleanup safety flag
        this.destroyed = false;
    }

    start() {
        // Prevent start after destroy
        if (this.destroyed) {
            console.error('[DialogOverlay] Cannot start - overlay has been destroyed');
            return;
        }

        // Lock scene input to prevent clicks from leaking through to the game
        // (Only if scene has lockInput method - GameScene has it, basic Phaser.Scene doesn't)
        if (typeof this.scene.lockInput === 'function') {
            this.scene.lockInput('dialog-overlay');
        }

        // Create background overlay if needed
        if (this.backgroundDim > 0) {
            this.backgroundOverlay = this.scene.add.rectangle(
                640, 360, 1280, 720, 0x000000, this.backgroundDim
            );
            this.backgroundOverlay.setDepth(1000);

            if (this.spritesVisible) {
                // Fade in overlay
                this.backgroundOverlay.setAlpha(0);
                this.scene.tweens.add({
                    targets: this.backgroundOverlay,
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.createDialogUI();
                    }
                });
            } else {
                // No fade needed
                this.createDialogUI();
            }
        } else {
            // No overlay, just create dialog UI
            this.createDialogUI();
        }
    }

    /**
     * Create portrait sprites
     * @param {number} leftX - X position for left portrait
     * @param {number} rightX - X position for right portrait
     * @param {number} portraitY - Y position for both portraits
     * @param {string} leftTexture - Texture key for left portrait
     * @param {string} rightTexture - Texture key for right portrait
     * @param {boolean} flipX - Whether to flip portraits horizontally
     * @returns {Object} Object containing leftPortrait and rightPortrait sprites
     */
    createPortraits(leftX, rightX, portraitY, leftTexture, rightTexture, flipX) {
        const leftPortrait = this.scene.add.image(leftX, portraitY, leftTexture)
            .setScale(this.portraitScale)
            .setAlpha(0)  // Start invisible to prevent flash
            .setOrigin(0.5, 0.5)
            .setDepth(2000);

        const rightPortrait = this.scene.add.image(rightX, portraitY, rightTexture)
            .setScale(this.portraitScale)
            .setAlpha(0)  // Start invisible to prevent flash
            .setOrigin(0.5, 0.5)
            .setDepth(2000);

        // Apply facing direction
        if (flipX) {
            leftPortrait.setFlipX(true);
            rightPortrait.setFlipX(true);
        }

        return { leftPortrait, rightPortrait };
    }

    /**
     * Create textbox UI elements (left, right, and narrator)
     * @param {number} leftX - X position for left textbox
     * @param {number} rightX - X position for right textbox
     * @param {number} narratorX - X position for narrator textbox
     * @param {number} textboxY - Y position for all textboxes
     * @param {number} textboxWidth - Width of side textboxes
     * @param {number} narratorWidth - Width of narrator textbox
     * @param {number} textboxHeight - Height of all textboxes
     * @returns {Object} Object containing all textbox elements
     */
    createTextboxes(leftX, rightX, narratorX, textboxY, textboxWidth, narratorWidth, textboxHeight) {
        // Textbox style constants
        const bgColor = 0x8B6F47;
        const bgAlpha = 0.85;
        const strokeColor = 0x5C4A30;
        const strokeWidth = 3;
        const textStyle = {
            fontSize: '18px',
            fontFamily: 'Georgia',
            color: '#FFFFFF',
            align: 'center'
        };

        // Left textbox
        const leftTextboxBg = this.scene.add.rectangle(
            leftX, textboxY, textboxWidth, textboxHeight, bgColor, bgAlpha
        ).setStrokeStyle(strokeWidth, strokeColor).setDepth(2001).setVisible(false);

        const leftTextboxText = this.scene.add.text(leftX, textboxY, '', {
            ...textStyle,
            wordWrap: { width: textboxWidth - 30 }
        }).setOrigin(0.5).setDepth(2002).setVisible(false);

        // Right textbox
        const rightTextboxBg = this.scene.add.rectangle(
            rightX, textboxY, textboxWidth, textboxHeight, bgColor, bgAlpha
        ).setStrokeStyle(strokeWidth, strokeColor).setDepth(2001).setVisible(false);

        const rightTextboxText = this.scene.add.text(rightX, textboxY, '', {
            ...textStyle,
            wordWrap: { width: textboxWidth - 30 }
        }).setOrigin(0.5).setDepth(2002).setVisible(false);

        // Narrator textbox (centered, italic)
        const narratorTextboxBg = this.scene.add.rectangle(
            narratorX, textboxY, narratorWidth, textboxHeight, bgColor, bgAlpha
        ).setStrokeStyle(strokeWidth, strokeColor).setDepth(2001).setVisible(false);

        const narratorTextboxText = this.scene.add.text(narratorX, textboxY, '', {
            ...textStyle,
            fontStyle: 'italic',
            wordWrap: { width: narratorWidth - 40 }
        }).setOrigin(0.5).setDepth(2002).setVisible(false);

        return {
            leftTextboxBg,
            leftTextboxText,
            rightTextboxBg,
            rightTextboxText,
            narratorTextboxBg,
            narratorTextboxText
        };
    }

    /**
     * Create choice button UI elements
     * @param {number} choiceY - Y position for choice buttons
     * @param {number} canvasWidth - Width of canvas for centering
     * @returns {Array} Array of choice button objects {bg, text}
     */
    createChoiceButtons(choiceY, canvasWidth) {
        const choiceContainer = [];

        if (!this.choiceData || !this.choiceData.options) {
            return choiceContainer;
        }

        const buttonSpacing = 180;
        const buttonWidth = 160;
        const buttonHeight = 60;

        // Calculate starting X to center buttons
        const totalWidth = (this.choiceData.options.length * buttonWidth) +
                          ((this.choiceData.options.length - 1) * (buttonSpacing - buttonWidth));
        let startX = (canvasWidth - totalWidth) / 2 + buttonWidth / 2;

        this.choiceData.options.forEach((option, index) => {
            const x = startX + (index * buttonSpacing);

            // Button background
            const buttonBg = this.scene.add.rectangle(
                x, choiceY, buttonWidth, buttonHeight, 0x8B6F47, 0.95
            ).setStrokeStyle(4, 0x5C4A30).setDepth(2001).setVisible(false);

            // Button text
            const buttonText = this.scene.add.text(x, choiceY, option.label, {
                fontSize: '16px',
                fontFamily: 'Georgia',
                fontStyle: 'bold',
                color: '#FFFFFF',
                align: 'center'
            }).setOrigin(0.5).setDepth(2002).setVisible(false);

            // Make interactive
            buttonBg.setInteractive({ useHandCursor: true });

            // Hover effect
            buttonBg.on('pointerover', () => {
                buttonBg.setFillStyle(0xA08060);
                buttonBg.setScale(1.05);
            });
            buttonBg.on('pointerout', () => {
                buttonBg.setFillStyle(0x8B6F47);
                buttonBg.setScale(1.0);
            });

            // Click handler
            buttonBg.on('pointerdown', () => {
                this.handleChoiceClick(option.id);
            });

            choiceContainer.push({ bg: buttonBg, text: buttonText });
        });

        return choiceContainer;
    }

    /**
     * Setup input handlers for dialog advancement (space key and click)
     */
    setupInputHandlers() {
        this.dialogSpaceHandler = () => this.advanceDialog();
        this.dialogClickHandler = () => this.advanceDialog();
        this.scene.input.keyboard.on('keydown-SPACE', this.dialogSpaceHandler);
        this.scene.input.on('pointerdown', this.dialogClickHandler);
    }

    createDialogUI() {
        // ===== 1. Determine character configuration =====
        const isPlayingBig = SceneStateManager.getGlobal('selectedCharacter') === 'big';
        const playerPortrait = isPlayingBig ? 'portrait1' : 'portrait2';
        const siblingPortrait = isPlayingBig ? 'portrait2' : 'portrait1';

        // Create default maps if none were provided (backward compatibility)
        if (!this.roleSideMap) {
            this.roleSideMap = {
                narrator: 'narrator',
                player: 'left',
                sibling: 'right'
            };
        }
        if (!this.rolePortraitMap) {
            this.rolePortraitMap = {
                player: playerPortrait,
                sibling: siblingPortrait
            };
        }

        // Determine initial portrait textures for left/right slots
        let leftPortraitTexture = playerPortrait;
        let rightPortraitTexture = siblingPortrait;
        for (const [role, side] of Object.entries(this.roleSideMap)) {
            if (side === 'left' && this.rolePortraitMap[role]) {
                leftPortraitTexture = this.rolePortraitMap[role];
            } else if (side === 'right' && this.rolePortraitMap[role]) {
                rightPortraitTexture = this.rolePortraitMap[role];
            }
        }

        // ===== 2. Define layout constants =====
        const canvasWidth = 1280;
        const canvasHeight = 720;
        const portraitY = canvasHeight - 100;
        const leftX = 100;
        const rightX = canvasWidth - 150;
        const textboxY = portraitY - 20;
        const leftTextboxX = leftX + 250;
        const rightTextboxX = rightX - 250;
        const textboxWidth = 280;
        const textboxHeight = 150;
        const narratorTextboxX = canvasWidth / 2;
        const narratorTextboxY = textboxY;
        const narratorTextboxWidth = 600;

        // ===== 3. Create all UI elements using helpers =====
        const portraits = this.createPortraits(
            leftX, rightX, portraitY,
            leftPortraitTexture, rightPortraitTexture,
            isPlayingBig
        );

        const textboxes = this.createTextboxes(
            leftTextboxX, rightTextboxX, narratorTextboxX,
            textboxY, textboxWidth, narratorTextboxWidth, textboxHeight
        );

        const choiceContainer = this.createChoiceButtons(narratorTextboxY, canvasWidth);

        // ===== 4. Assemble dialogUI object =====
        this.dialogUI = {
            ...portraits,
            ...textboxes,
            choiceContainer
        };

        // ===== 5. Setup input handlers and show first line =====
        this.setupInputHandlers();
        this.showDialogLine();
    }

    showDialogLine() {
        if (this.destroyed) return;

        // NEW: Check if we should show choices instead
        if (this.currentLine >= this.dialogueData.length) {
            if (this.choiceData && this.choiceData.options && this.choiceData.options.length > 0) {
                this.showChoices();
                return;
            } else {
                this.endDialog();
                return;
            }
        }

        // Stop any active typing
        if (this.currentTypingEvent) {
            this.currentTypingEvent.remove();
            this.currentTypingEvent = null;
        }

        const line = this.dialogueData[this.currentLine];
        const activeScale = this.portraitScale;
        const inactiveScale = this.portraitScale * 0.95;

        // Call onLineChange callback if provided
        if (this.onLineChange) {
            this.onLineChange(line);
        }

        // Kill existing portrait tweens
        this.scene.tweens.killTweensOf(this.dialogUI.leftPortrait);
        this.scene.tweens.killTweensOf(this.dialogUI.rightPortrait);

        // ===== NEW: FLEXIBLE CHARACTER LAYOUT =====
        // Use roleSideMap to determine which side this role appears on
        // Use rolePortraitMap to determine which portrait texture to use

        const role = line.role;
        const side = this.roleSideMap[role] || 'right';  // Default to right if not found
        const portraitTexture = this.rolePortraitMap[role] || null;

        // Swap portrait texture on the appropriate side if needed
        if (portraitTexture && side === 'left') {
            // Check if texture needs to be swapped
            if (this.dialogUI.leftPortrait.texture.key !== portraitTexture) {
                this.dialogUI.leftPortrait.setTexture(portraitTexture);
            }
        } else if (portraitTexture && side === 'right') {
            // Check if texture needs to be swapped
            if (this.dialogUI.rightPortrait.texture.key !== portraitTexture) {
                this.dialogUI.rightPortrait.setTexture(portraitTexture);
            }
        }

        // Show active speaker's textbox based on side
        if (side === 'narrator') {
            // ===== NARRATOR MODE =====
            // Both portraits faded, centered textbox, italic text with feather emoji

            // Hide player/sibling textboxes
            this.dialogUI.leftTextboxBg.setVisible(false);
            this.dialogUI.leftTextboxText.setVisible(false);
            this.dialogUI.rightTextboxBg.setVisible(false);
            this.dialogUI.rightTextboxText.setVisible(false);

            // Show narrator textbox
            this.dialogUI.narratorTextboxBg.setVisible(true);
            this.dialogUI.narratorTextboxText.setVisible(true).setText('');

            // Hide both portraits completely during narrator dialogue
            this.scene.tweens.add({
                targets: this.dialogUI.leftPortrait,
                alpha: 0,  // Completely invisible
                scale: inactiveScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });
            this.scene.tweens.add({
                targets: this.dialogUI.rightPortrait,
                alpha: 0,  // Completely invisible
                scale: inactiveScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });

            // Prepend feather emoji to narrator text
            const narratorText = '🪶 ' + line.text;
            this.startTypewriter(this.dialogUI.narratorTextboxText, narratorText);

        } else if (side === 'left') {
            // ===== LEFT SIDE SPEAKER =====
            // Show left textbox, hide others
            this.dialogUI.leftTextboxBg.setVisible(true);
            this.dialogUI.leftTextboxText.setVisible(true).setText('');
            this.dialogUI.rightTextboxBg.setVisible(false);
            this.dialogUI.rightTextboxText.setVisible(false);
            this.dialogUI.narratorTextboxBg.setVisible(false);
            this.dialogUI.narratorTextboxText.setVisible(false);

            // Animate portraits - left active, right inactive
            this.scene.tweens.add({
                targets: this.dialogUI.leftPortrait,
                alpha: 1,
                scale: activeScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });
            this.scene.tweens.add({
                targets: this.dialogUI.rightPortrait,
                alpha: 0.7,
                scale: inactiveScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });

            this.startTypewriter(this.dialogUI.leftTextboxText, line.text);

        } else if (side === 'right') {
            // ===== RIGHT SIDE SPEAKER =====
            // Show right textbox, hide others
            this.dialogUI.rightTextboxBg.setVisible(true);
            this.dialogUI.rightTextboxText.setVisible(true).setText('');
            this.dialogUI.leftTextboxBg.setVisible(false);
            this.dialogUI.leftTextboxText.setVisible(false);
            this.dialogUI.narratorTextboxBg.setVisible(false);
            this.dialogUI.narratorTextboxText.setVisible(false);

            // Animate portraits - right active, left inactive
            this.scene.tweens.add({
                targets: this.dialogUI.rightPortrait,
                alpha: 1,
                scale: activeScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });
            this.scene.tweens.add({
                targets: this.dialogUI.leftPortrait,
                alpha: 0.7,
                scale: inactiveScale,
                duration: 200,
                ease: 'Cubic.easeOut'
            });

            this.startTypewriter(this.dialogUI.rightTextboxText, line.text);
        }
    }

    startTypewriter(textObject, fullText) {
    this.isTyping = true;
    this.currentTextObject = textObject;
    this.currentFullText = fullText;

    let currentIndex = 0;

    // safety: om texten är tom, hoppa direkt
    if (!fullText || fullText.length === 0) {
        textObject.setText('');
        this.isTyping = false;
        this.currentTypingEvent = null;
        return;
    }

    // se till att inga gamla timers ligger kvar
    if (this.currentTypingEvent) {
        this.currentTypingEvent.remove();
        this.currentTypingEvent = null;
    }

    this.currentTypingEvent = this.scene.time.addEvent({
        delay: this.textSpeed,
        repeat: fullText.length - 1,
        callback: () => {
            currentIndex++;
            textObject.setText(fullText.substring(0, currentIndex));

            // Set isTyping false immediately when last character is displayed
            if (currentIndex >= fullText.length) {
                this.isTyping = false;
            }
        },
        callbackScope: this,
        onComplete: () => {
            this.isTyping = false;
            this.currentTypingEvent = null;
        }
    });
}

    advanceDialog() {
        if (this.destroyed || !this.dialogUI) return;

        // Klick-ljud
        const audioManager = this.scene.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // 🔹 Om vi håller på att skriva: visa hela raden direkt
        if (this.isTyping) {
            if (this.currentTypingEvent) {
                this.currentTypingEvent.remove();
                this.currentTypingEvent = null;
            }
            this.isTyping = false;

            if (this.currentTextObject && this.currentFullText != null) {
                this.currentTextObject.setText(this.currentFullText);
            }
            return; // stanna på samma rad, nästa klick går vidare
        }

        // 🔹 Annars: gå vidare till nästa rad
        this.currentLine++;
        this.showDialogLine();
    }

    // NEW: Show choice UI
    showChoices() {
        console.log('[DialogOverlay] Showing choices');

        // Hide all textboxes
        this.dialogUI.leftTextboxBg.setVisible(false);
        this.dialogUI.leftTextboxText.setVisible(false);
        this.dialogUI.rightTextboxBg.setVisible(false);
        this.dialogUI.rightTextboxText.setVisible(false);
        this.dialogUI.narratorTextboxBg.setVisible(false);
        this.dialogUI.narratorTextboxText.setVisible(false);

        // Fade both portraits to inactive
        const inactiveScale = this.portraitScale * 0.95;
        this.scene.tweens.add({
            targets: [this.dialogUI.leftPortrait, this.dialogUI.rightPortrait],
            alpha: 0.7,
            scale: inactiveScale,
            duration: 200,
            ease: 'Cubic.easeOut'
        });

        // Show choice buttons
        this.dialogUI.choiceContainer.forEach(choice => {
            choice.bg.setVisible(true);
            choice.text.setVisible(true);

            // Fade in animation
            choice.bg.setAlpha(0);
            choice.text.setAlpha(0);
            this.scene.tweens.add({
                targets: [choice.bg, choice.text],
                alpha: 1,
                duration: 300,
                ease: 'Cubic.easeOut'
            });
        });

        // Remove normal dialog handlers (choices have their own click handlers)
        this.scene.input.keyboard.off('keydown-SPACE', this.dialogSpaceHandler);
        this.scene.input.off('pointerdown', this.dialogClickHandler);
    }

    // NEW: Handle choice click
    handleChoiceClick(choiceId) {
        console.log('[DialogOverlay] Choice selected:', choiceId);

        // Play click sound
        const audioManager = this.scene.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // Store selected choice
        this.selectedChoice = choiceId;

        // End dialog (will call onComplete with choice)
        this.endDialog();
    }

    endDialog() {
        if (this.destroyed || !this.dialogUI) return;

        // Stop typing
        if (this.currentTypingEvent) {
            this.currentTypingEvent.remove();
            this.currentTypingEvent = null;
        }

        // Remove input handlers
        this.scene.input.keyboard.off('keydown-SPACE', this.dialogSpaceHandler);
        this.scene.input.off('pointerdown', this.dialogClickHandler);

        // Collect all elements to fade out
        const fadeTargets = [
            this.dialogUI.leftPortrait,
            this.dialogUI.rightPortrait,
            this.dialogUI.leftTextboxBg,
            this.dialogUI.leftTextboxText,
            this.dialogUI.rightTextboxBg,
            this.dialogUI.rightTextboxText,
            this.dialogUI.narratorTextboxBg,
            this.dialogUI.narratorTextboxText
        ];

        // NEW: Add choice elements to fade targets
        if (this.dialogUI.choiceContainer) {
            this.dialogUI.choiceContainer.forEach(choice => {
                fadeTargets.push(choice.bg, choice.text);
            });
        }

        if (this.backgroundOverlay) {
            fadeTargets.push(this.backgroundOverlay);
        }

        // Fade out all UI
        this.scene.tweens.add({
            targets: fadeTargets,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Unlock AFTER fade completes to prevent click leakage
                if (typeof this.scene.unlockInput === 'function') {
                    this.scene.unlockInput('dialog-overlay');
                }

                this.destroy();
                // NEW: Pass selected choice to onComplete callback
                this.onComplete(this.selectedChoice);
            }
        });
    }

    destroy() {
        // ===== 1. DOUBLE-DESTROY GUARD =====
        if (this.destroyed) {
            console.warn('[DialogOverlay] Already destroyed, skipping cleanup');
            return;
        }

        // ===== 2. CLEAR TYPING TIMER =====
        if (this.currentTypingEvent) {
            this.currentTypingEvent.remove();
            this.currentTypingEvent = null;
        }
        this.currentTextObject = null;
        this.currentFullText = '';

        // ===== 3. KILL ALL ACTIVE TWEENS =====
        if (this.scene && this.scene.tweens) {
            // Kill portrait tweens (from showDialogLine)
            if (this.dialogUI) {
                if (this.dialogUI.leftPortrait) {
                    this.scene.tweens.killTweensOf(this.dialogUI.leftPortrait);
                }
                if (this.dialogUI.rightPortrait) {
                    this.scene.tweens.killTweensOf(this.dialogUI.rightPortrait);
                }

                // Kill choice button tweens (from showChoices)
                if (this.dialogUI.choiceContainer) {
                    this.dialogUI.choiceContainer.forEach(choice => {
                        if (choice.bg) this.scene.tweens.killTweensOf(choice.bg);
                        if (choice.text) this.scene.tweens.killTweensOf(choice.text);
                    });
                }
            }

            // Kill background overlay tweens (from fade animations)
            if (this.backgroundOverlay) {
                this.scene.tweens.killTweensOf(this.backgroundOverlay);
            }
        }

        // ===== 4. REMOVE INPUT HANDLERS =====
        if (this.scene && this.scene.input) {
            if (this.dialogSpaceHandler) {
                this.scene.input.keyboard.off('keydown-SPACE', this.dialogSpaceHandler);
            }
            if (this.dialogClickHandler) {
                this.scene.input.off('pointerdown', this.dialogClickHandler);
            }
        }
        this.dialogSpaceHandler = null;
        this.dialogClickHandler = null;

        // ===== 5. UNLOCK INPUT =====
        if (this.scene && typeof this.scene.unlockInput === 'function') {
            this.scene.unlockInput('dialog-overlay');
        }

        // ===== 6. DESTROY UI ELEMENTS =====
        if (this.dialogUI) {
            // Safely destroy portraits
            if (this.dialogUI.leftPortrait) this.dialogUI.leftPortrait.destroy();
            if (this.dialogUI.rightPortrait) this.dialogUI.rightPortrait.destroy();

            // Safely destroy textboxes
            if (this.dialogUI.leftTextboxBg) this.dialogUI.leftTextboxBg.destroy();
            if (this.dialogUI.leftTextboxText) this.dialogUI.leftTextboxText.destroy();
            if (this.dialogUI.rightTextboxBg) this.dialogUI.rightTextboxBg.destroy();
            if (this.dialogUI.rightTextboxText) this.dialogUI.rightTextboxText.destroy();
            if (this.dialogUI.narratorTextboxBg) this.dialogUI.narratorTextboxBg.destroy();
            if (this.dialogUI.narratorTextboxText) this.dialogUI.narratorTextboxText.destroy();

            // Safely destroy choice elements
            if (this.dialogUI.choiceContainer) {
                this.dialogUI.choiceContainer.forEach(choice => {
                    if (choice.bg) choice.bg.destroy();
                    if (choice.text) choice.text.destroy();
                });
                this.dialogUI.choiceContainer = null;
            }

            this.dialogUI = null;
        }

        // ===== 7. DESTROY BACKGROUND OVERLAY =====
        if (this.backgroundOverlay) {
            this.backgroundOverlay.destroy();
            this.backgroundOverlay = null;
        }

        // ===== 8. SET DESTROYED FLAG =====
        this.destroyed = true;
    }
}

export default DialogOverlay;

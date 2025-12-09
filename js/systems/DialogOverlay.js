// ===== DIALOG OVERLAY SYSTEM =====
// Reusable dialog system with portraits and typewriter effect
// Used in IntroScene and gameplay dialog sequences

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

    }

    start() {
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

    createDialogUI() {
        // Determine player and sibling based on selection
        const isPlayingBig = window.gameState?.selectedCharacter === 'big';
        const playerPortrait = isPlayingBig ? 'portrait1' : 'portrait2';
        const siblingPortrait = isPlayingBig ? 'portrait2' : 'portrait1';

        // Canvas dimensions
        const canvasWidth = 1280;
        const canvasHeight = 720;

        // Portrait positions - bottom edges
        const portraitY = canvasHeight - 100;
        const leftX = 100;
        const rightX = canvasWidth - 150;

        // Textbox positions (beside portraits)
        const textboxY = portraitY - 20;
        const leftTextboxX = leftX + 250;
        const rightTextboxX = rightX - 250;
        const textboxWidth = 280;
        const textboxHeight = 150;

        // Narrator textbox (centered)
        const narratorTextboxX = canvasWidth / 2;
        const narratorTextboxY = textboxY;
        const narratorTextboxWidth = 600;

        // Create dialog UI
        this.dialogUI = {
            // Portraits at bottom
            leftPortrait: this.scene.add.image(leftX, portraitY, playerPortrait)
                .setScale(this.portraitScale)
                .setAlpha(0.7)
                .setOrigin(0.5, 0.5)
                .setDepth(2000),
            rightPortrait: this.scene.add.image(rightX, portraitY, siblingPortrait)
                .setScale(this.portraitScale)
                .setAlpha(0.7)
                .setOrigin(0.5, 0.5)
                .setDepth(2000),

            // Left textbox (brown style)
            leftTextboxBg: this.scene.add.rectangle(
                leftTextboxX, textboxY, textboxWidth, textboxHeight, 0x8B6F47, 0.85
            ).setStrokeStyle(3, 0x5C4A30).setDepth(2001),
            leftTextboxText: this.scene.add.text(leftTextboxX, textboxY, '', {
                fontSize: '18px',
                fontFamily: 'Georgia',
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: textboxWidth - 30 }
            }).setOrigin(0.5).setDepth(2002),

            // Right textbox (brown style)
            rightTextboxBg: this.scene.add.rectangle(
                rightTextboxX, textboxY, textboxWidth, textboxHeight, 0x8B6F47, 0.85
            ).setStrokeStyle(3, 0x5C4A30).setDepth(2001),
            rightTextboxText: this.scene.add.text(rightTextboxX, textboxY, '', {
                fontSize: '18px',
                fontFamily: 'Georgia',
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: textboxWidth - 30 }
            }).setOrigin(0.5).setDepth(2002),

            // Narrator textbox (centered, brown style)
            narratorTextboxBg: this.scene.add.rectangle(
                narratorTextboxX, narratorTextboxY, narratorTextboxWidth, textboxHeight, 0x8B6F47, 0.85
            ).setStrokeStyle(3, 0x5C4A30).setDepth(2001),
            narratorTextboxText: this.scene.add.text(narratorTextboxX, narratorTextboxY, '', {
                fontSize: '18px',
                fontFamily: 'Georgia',
                fontStyle: 'italic',  // Italic style for narrator
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: narratorTextboxWidth - 40 }
            }).setOrigin(0.5).setDepth(2002)
        };

        // Fix portrait facing direction
        if (isPlayingBig) {
            this.dialogUI.leftPortrait.setFlipX(true);
            this.dialogUI.rightPortrait.setFlipX(true);
        }

        // Initially hide textboxes
        this.dialogUI.leftTextboxBg.setVisible(false);
        this.dialogUI.leftTextboxText.setVisible(false);
        this.dialogUI.rightTextboxBg.setVisible(false);
        this.dialogUI.rightTextboxText.setVisible(false);
        this.dialogUI.narratorTextboxBg.setVisible(false);
        this.dialogUI.narratorTextboxText.setVisible(false);

        // NEW: Create choice UI elements (initially hidden)
        this.dialogUI.choiceContainer = [];
        if (this.choiceData && this.choiceData.options) {
            const choiceY = narratorTextboxY;
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

                this.dialogUI.choiceContainer.push({ bg: buttonBg, text: buttonText });
            });
        }

        // Setup input handlers
        this.dialogSpaceHandler = () => this.advanceDialog();
        this.dialogClickHandler = () => this.advanceDialog();
        this.scene.input.keyboard.on('keydown-SPACE', this.dialogSpaceHandler);
        this.scene.input.on('pointerdown', this.dialogClickHandler);

        // Show first line
        this.showDialogLine();
    }

    showDialogLine() {
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

        // Show active speaker's textbox
        if (line.role === 'narrator') {
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

            // Both portraits faded (inactive)
            this.scene.tweens.add({
                targets: this.dialogUI.leftPortrait,
                alpha: 0.7,
                scale: inactiveScale,
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

            // Prepend feather emoji to narrator text
            const narratorText = '🪶 ' + line.text;
            this.startTypewriter(this.dialogUI.narratorTextboxText, narratorText);

        } else if (line.role === 'player') {
            // Player speaking (left side)
            this.dialogUI.leftTextboxBg.setVisible(true);
            this.dialogUI.leftTextboxText.setVisible(true).setText('');
            this.dialogUI.rightTextboxBg.setVisible(false);
            this.dialogUI.rightTextboxText.setVisible(false);
            this.dialogUI.narratorTextboxBg.setVisible(false);
            this.dialogUI.narratorTextboxText.setVisible(false);

            // Animate portraits
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
        } else {
            // Sibling speaking (right side)
            this.dialogUI.rightTextboxBg.setVisible(true);
            this.dialogUI.rightTextboxText.setVisible(true).setText('');
            this.dialogUI.leftTextboxBg.setVisible(false);
            this.dialogUI.leftTextboxText.setVisible(false);
            this.dialogUI.narratorTextboxBg.setVisible(false);
            this.dialogUI.narratorTextboxText.setVisible(false);

            // Animate portraits
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
        if (!this.dialogUI) return;

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
        if (!this.dialogUI) return;

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
                this.destroy();
                // NEW: Pass selected choice to onComplete callback
                this.onComplete(this.selectedChoice);
            }
        });
    }

    destroy() {
        // Destroy all UI elements
        if (this.dialogUI) {
            this.dialogUI.leftPortrait.destroy();
            this.dialogUI.rightPortrait.destroy();
            this.dialogUI.leftTextboxBg.destroy();
            this.dialogUI.leftTextboxText.destroy();
            this.dialogUI.rightTextboxBg.destroy();
            this.dialogUI.rightTextboxText.destroy();
            this.dialogUI.narratorTextboxBg.destroy();
            this.dialogUI.narratorTextboxText.destroy();

            // NEW: Destroy choice elements
            if (this.dialogUI.choiceContainer) {
                this.dialogUI.choiceContainer.forEach(choice => {
                    choice.bg.destroy();
                    choice.text.destroy();
                });
                this.dialogUI.choiceContainer = null;
            }

            this.dialogUI = null;
        }

        if (this.backgroundOverlay) {
            this.backgroundOverlay.destroy();
            this.backgroundOverlay = null;
        }

        // Clear handlers
        this.dialogSpaceHandler = null;
        this.dialogClickHandler = null;
    }
}

export default DialogOverlay;

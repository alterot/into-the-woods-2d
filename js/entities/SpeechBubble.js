// ===== SPEECH BUBBLE ENTITY =====
// Reusable speech bubble class with typewriter effect and auto-destroy
class SpeechBubble {
    constructor(scene, x, y, text, duration = 2500, followTarget = null, choices = null) {
        this.scene = scene;
        this.text = text;
        this.duration = duration;
        this.followTarget = followTarget;
        this.choices = choices; // Array of { text, callback }

        // Determine side based on screen position
        const screenCenterX = scene.scale.width / 2;
        this.isLeftSide = x < screenCenterX;

        // Position bubble to side of character
        const bubbleOffsetX = this.isLeftSide ? 80 : -80;
        this.x = x + bubbleOffsetX;
        this.y = y - 80; // Above character

        // Store character position for tail
        this.characterX = x;

        // Typewriter state
        this.isTyping = false;
        this.typingEvent = null;
        this.fullText = text;
        this.currentIndex = 0;

        // Click handler
        this.clickHandler = null;

        // Auto-destroy timeout
        this.destroyTimeout = null;

        // Create the speech bubble
        this.createBubble();

        // Start typewriter effect
        this.startTypewriter();

        if (this.followTarget) {
        this.scene.events.on('update', this.update, this);
    }
    }

    createBubble() {
        // Measure text to determine bubble size
        const testText = this.scene.add.text(0, 0, this.fullText, {
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            wordWrap: { width: 280 }
        });
        const textBounds = testText.getBounds();
        testText.destroy();

        // Calculate bubble dimensions (with extra space for choices if present)
        const padding = 15;
        let bubbleWidth = Math.max(150, Math.min(300, textBounds.width + padding * 2));
        let bubbleHeight = textBounds.height + padding * 2;

        // Add extra height for choices
        if (this.choices && this.choices.length > 0) {
            const choiceHeight = 22;
            const choiceSpacing = 10;
            bubbleHeight += choiceSpacing + (this.choices.length * choiceHeight);
            bubbleWidth = Math.max(bubbleWidth, 220); // Ensure wide enough for choices
        }

        // 🔹 spara storlek så vi kan använda i update()
        this.bubbleWidth = bubbleWidth;
        this.bubbleHeight = bubbleHeight;

        // Create container for all bubble components
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(2000); // Render above everything

        // Shadow layer (for depth)
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(
            -bubbleWidth/2 + 2,
            -bubbleHeight/2 + 2,
            bubbleWidth,
            bubbleHeight,
            8
        );

        // Main bubble background (more transparent)
        const background = this.scene.add.graphics();
        background.fillStyle(0xFFFFFF, 1);
        background.fillRoundedRect(
            -bubbleWidth/2,
            -bubbleHeight/2,
            bubbleWidth,
            bubbleHeight,
            8
        );

        // Border
        background.lineStyle(2, 0xCCCCCC, 1);
        background.strokeRoundedRect(
            -bubbleWidth/2,
            -bubbleHeight/2,
            bubbleWidth,
            bubbleHeight,
            8
        );

        // 🔹 SKAPA SVANS SOM EGNA GRAPHICS (inte inritad i background)
        const tailWidth = 18;
        const tailHeight = 10;

        const tailShadow = this.scene.add.graphics();
        tailShadow.fillStyle(0x000000, 0.2);
        // rita triangel runt (0,0) lokalt
        tailShadow.fillTriangle(
            -tailWidth / 2, 0,
            tailWidth / 2, 0,
            0, tailHeight
        );

        const tailBg = this.scene.add.graphics();
        tailBg.fillStyle(0xFFFFFF, 1);
        tailBg.fillTriangle(
            -tailWidth / 2, 0,
            tailWidth / 2, 0,
            0, tailHeight
        );

        // spara referenser för update()
        this.tailShadow = tailShadow;
        this.tailBg = tailBg;
        this.tailHeight = tailHeight;

        // initial position av svansen (baserat på isLeftSide)
        const bottomY = bubbleHeight / 2;
        const tailOffsetX = bubbleWidth / 2 - 35;   // hur långt in från kanten
        const sideFactor = this.isLeftSide ? -1 : 1;

        this.tailBg.x = sideFactor * tailOffsetX;
        this.tailBg.y = bottomY - 1;

        this.tailShadow.x = this.tailBg.x + 2;
        this.tailShadow.y = this.tailBg.y + 2;

        // Text object
        this.textObject = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            color: '#000000',
            align: 'center',
            wordWrap: { width: bubbleWidth - padding * 2 }
        });
        this.textObject.setOrigin(0.5);

        // Position main text higher if choices exist
        if (this.choices && this.choices.length > 0) {
            const choiceHeight = 22;
            const totalChoiceHeight = this.choices.length * choiceHeight;
            this.textObject.y = -(totalChoiceHeight / 2) - 8;
        }

        // Container children array
        const containerChildren = [
            shadow,
            this.tailShadow,
            background,
            this.tailBg,
            this.textObject
        ];

        // Add choice text objects if provided
        this.choiceTexts = [];
        if (this.choices && this.choices.length > 0) {
            const choiceStartY = this.textObject.y + textBounds.height / 2 + 15;
            const choiceHeight = 22;

            this.choices.forEach((choice, index) => {
                const choiceText = this.scene.add.text(
                    0,
                    choiceStartY + (index * choiceHeight),
                    `→ ${choice.text}`,
                    {
                        fontSize: '14px',
                        fontFamily: 'Georgia, serif',
                        color: '#555555',
                        align: 'center',
                        fontStyle: 'bold'
                    }
                );
                choiceText.setOrigin(0.5);
                choiceText.setInteractive({ useHandCursor: true });

                // Hover effect - brighten color
                choiceText.on('pointerover', () => {
                    choiceText.setColor('#000000');
                    choiceText.setScale(1.05);
                });
                choiceText.on('pointerout', () => {
                    choiceText.setColor('#555555');
                    choiceText.setScale(1);
                });

                // Click handler
                choiceText.on('pointerdown', () => {
                    if (choice.callback) {
                        choice.callback();
                    }
                });

                this.choiceTexts.push(choiceText);
                containerChildren.push(choiceText);
            });
        }

        // Add all components to container
        this.container.add(containerChildren);

        // Make container interactive (inkl svanshöjd)
        const hitArea = new Phaser.Geom.Rectangle(
            -bubbleWidth/2,
            -bubbleHeight/2,
            bubbleWidth,
            bubbleHeight + tailHeight   // 🔹 svansen ingår i klickytan
        );
        this.container.setInteractive(
            hitArea,
            Phaser.Geom.Rectangle.Contains,
            { useHandCursor: true }
        );

        // Set up click behavior
        this.container.on('pointerdown', (pointer) => {
            this.handleClick();
            pointer.stopPropagation(); // Prevent scene-wide handler from also firing
        });

        // Initial alpha 0 for fade in
        this.container.setAlpha(0);

        // Fade in animation
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 200,
            ease: 'Cubic.easeOut'
        });
    }


    startTypewriter() {
        this.isTyping = true;
        this.currentIndex = 0;

        // 🔹 Starta auto-destroy omedelbart (räknar från att bubblan dykt upp)
        if (this.duration !== null && this.duration > 0) {
            this.destroyTimeout = this.scene.time.delayedCall(this.duration, () => {
                this.destroy();
            });
        }

        // 🔹 Safety: ingen text
        if (!this.fullText || this.fullText.length === 0) {
            this.textObject.setText('');
            this.isTyping = false;
            this.typingEvent = null;
            return;
        }

        // 🔹 Se till att inga gamla timers ligger kvar
        if (this.typingEvent) {
            this.typingEvent.remove();
            this.typingEvent = null;
        }

        this.typingEvent = this.scene.time.addEvent({
            delay: 50,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.currentIndex++;
                this.textObject.setText(this.fullText.substring(0, this.currentIndex));

                // Check if we've shown all text
                if (this.currentIndex >= this.fullText.length) {
                    console.log('⏹️ Typing completed! Setting isTyping = false');
                    this.isTyping = false;
                    this.typingEvent = null;
                    console.log('✓ Bubble ready for next click');
                }
            },
            callbackScope: this
        });
    }


    update() {
    if (!this.followTarget || !this.container) return;

    // Positionera bubblan baserat på spritens nuvarande position
    const spriteX = this.followTarget.x;
    const spriteY = this.followTarget.y;

    const screenCenterX = this.scene.scale.width / 2;
    this.isLeftSide = spriteX < screenCenterX;

    const bubbleOffsetX = this.isLeftSide ? 80 : -80;
    const bubbleOffsetY = -80;

    this.container.x = spriteX + bubbleOffsetX;
    this.container.y = spriteY + bubbleOffsetY;

    // Uppdatera svansens sida/position när isLeftSide ändras
    if (this.tailBg && this.tailShadow && this.bubbleWidth && this.bubbleHeight) {
        const bottomY = this.bubbleHeight / 2;
        const tailOffsetX = this.bubbleWidth / 2 - 35;
        const sideFactor = this.isLeftSide ? -1 : 1;

        this.tailBg.x = sideFactor * tailOffsetX;
        this.tailBg.y = bottomY - 1;

        this.tailShadow.x = this.tailBg.x + 2;
        this.tailShadow.y = this.tailBg.y + 2;
    }
}


    handleClick() {
        console.log('💬 handleClick called, isTyping:', this.isTyping, 'clickHandler:', !!this.clickHandler);

        if (this.isTyping) {
            console.log('⚡ Fast-forwarding typing - showing all text immediately');
            // Stop the typing event
            if (this.typingEvent) {
                this.typingEvent.remove();
                this.typingEvent = null;
            }
            // Show all text immediately
            this.textObject.setText(this.fullText);
            this.isTyping = false;
            console.log('✓ All text shown, bubble stays (click again to advance)');
        } else {
            // Typing already complete - advance to next bubble
            console.log('✅ Typing complete, calling handler and advancing...');
            // Call custom handler BEFORE destroy (destroy nulls it out!)
            if (this.clickHandler) {
                console.log('🎯 Calling clickHandler now!');
                this.clickHandler();
            } else {
                console.log('❌ No clickHandler set!');
            }
            this.destroy();
        }
    }

    // Set custom click handler
    onClick(callback) {
        console.log('📌 onClick() called, setting clickHandler');
        this.clickHandler = callback;
    }

    // Clean up and destroy the speech bubble
    destroy() {
        if (!this.container) return;

        if (this.followTarget) {
            this.scene.events.off('update', this.update, this);
        }

        // Clear timers
        if (this.typingEvent) {
            this.typingEvent.remove();
            this.typingEvent = null;
        }

        if (this.destroyTimeout) {
            this.destroyTimeout.remove();
            this.destroyTimeout = null;
        }

        // Kill any tweens
        this.scene.tweens.killTweensOf(this.container);

        // Fade out animation
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                if (this.container) {
                    this.container.destroy(true); // Destroy container and all children
                    this.container = null;
                    this.textObject = null;
                }
            }
        });

        this.clickHandler = null;
    }
}

export default SpeechBubble;

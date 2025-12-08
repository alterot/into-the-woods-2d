// ===== SPEECH BUBBLE ENTITY =====
// Reusable speech bubble class with typewriter effect and auto-destroy
class SpeechBubble {
    constructor(scene, x, y, text, duration = 2500, followTarget = null) {
        this.scene = scene;
        this.text = text;
        this.duration = duration;
        this.followTarget = followTarget;

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

        // Calculate bubble dimensions
        const padding = 15;
        const bubbleWidth = Math.max(150, Math.min(300, textBounds.width + padding * 2));
        const bubbleHeight = textBounds.height + padding * 2;

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
        background.fillStyle(0xFFFFFF, 0.75);
        background.fillRoundedRect(
            -bubbleWidth/2,
            -bubbleHeight/2,
            bubbleWidth,
            bubbleHeight,
            8
        );

        // Border
        background.lineStyle(2, 0xCCCCCC, 0.75);
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
        tailBg.fillStyle(0xFFFFFF, 0.75);
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
        this.tailBg.y = bottomY;

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

        // Add all components to container (med svans)
        this.container.add([
            shadow,
            this.tailShadow,
            background,
            this.tailBg,
            this.textObject
        ]);

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
        this.container.on('pointerdown', () => {
            this.handleClick();
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

        this.typingEvent = this.scene.time.addEvent({
            delay: 50,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.currentIndex++;
                this.textObject.setText(this.fullText.substring(0, this.currentIndex));
            },
            callbackScope: this,
            onComplete: () => {
                this.isTyping = false;
                this.typingEvent = null;

                // Start auto-destroy timer if duration is set
                if (this.duration !== null && this.duration > 0) {
                    this.destroyTimeout = this.scene.time.delayedCall(this.duration, () => {
                        this.destroy();
                    });
                }
            }
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
        this.tailBg.y = bottomY;

        this.tailShadow.x = this.tailBg.x + 2;
        this.tailShadow.y = this.tailBg.y + 2;
    }
}


    handleClick() {
        if (this.isTyping) {
            // Speed up typewriter drastically (fast forward)
            if (this.typingEvent) {
                this.typingEvent.delay = 3;  // Fast forward to 3ms per character
            }
        } else {
            // Typing complete - destroy on click
            this.destroy();
        }

        // Call custom click handler if set
        if (this.clickHandler) {
            this.clickHandler();
        }
    }

    // Set custom click handler
    onClick(callback) {
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

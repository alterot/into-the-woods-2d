// ===== SPEECH BUBBLE ENTITY =====
// Reusable speech bubble class with typewriter effect and auto-destroy
class SpeechBubble {
    constructor(scene, x, y, text, duration = 3000) {
        this.scene = scene;
        this.text = text;
        this.duration = duration;

        // Determine side based on screen position
        const screenCenterX = scene.scale.width / 2;
        this.isLeftSide = x < screenCenterX;

        // Position bubble to side of character
        const bubbleOffsetX = this.isLeftSide ? 120 : -120;
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
    }

    createBubble() {
        // Measure text to determine bubble size
        const testText = this.scene.add.text(0, 0, this.fullText, {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            wordWrap: { width: 280 }
        });
        const textBounds = testText.getBounds();
        testText.destroy();

        // Calculate bubble dimensions
        const padding = 20;
        const bubbleWidth = Math.max(150, Math.min(300, textBounds.width + padding * 2));
        const bubbleHeight = textBounds.height + padding * 2;

        // Create container for all bubble components
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(2000); // Render above everything

        // Shadow layer (for depth)
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-bubbleWidth/2 + 2, -bubbleHeight/2 + 2, bubbleWidth, bubbleHeight, 8);

        // Main bubble background (more transparent)
        const background = this.scene.add.graphics();
        background.fillStyle(0xFFFFFF, 0.85);
        background.fillRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 8);

        // Border
        background.lineStyle(2, 0xCCCCCC, 1);
        background.strokeRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 8);

        // Tail position at edge of bubble (dynamic based on side)
        const tailX = this.isLeftSide ? -bubbleWidth/2 + 20 : bubbleWidth/2 - 20;

        // Tail (triangle pointing to character - left or right)
        let tail;
        if (this.isLeftSide) {
            // Tail points LEFT (toward character on left)
            tail = this.scene.add.triangle(
                tailX, 0,           // Position at left edge, vertically centered
                -10, 0,             // tip (pointing left)
                0, -10,             // top base
                0, 10,              // bottom base
                0xFFFFFF,
                0.85
            );
        } else {
            // Tail points RIGHT (toward character on right)
            tail = this.scene.add.triangle(
                tailX, 0,           // Position at right edge, vertically centered
                10, 0,              // tip (pointing right)
                0, -10,             // top base
                0, 10,              // bottom base
                0xFFFFFF,
                0.85
            );
        }

        // Text object
        this.textObject = this.scene.add.text(0, 0, '', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#000000',
            align: 'center',
            wordWrap: { width: bubbleWidth - padding * 2 }
        });
        this.textObject.setOrigin(0.5);

        // Add all components to container (NO tail border)
        this.container.add([shadow, background, tail, this.textObject]);

        // Make container interactive
        const hitArea = new Phaser.Geom.Rectangle(
            -bubbleWidth/2, -bubbleHeight/2,
            bubbleWidth, bubbleHeight
        );
        this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });

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

    handleClick() {
        if (this.isTyping) {
            // Skip typing - show full text immediately
            if (this.typingEvent) {
                this.typingEvent.remove();
                this.typingEvent = null;
            }
            this.textObject.setText(this.fullText);
            this.isTyping = false;

            // Start auto-destroy timer if duration is set
            if (this.duration !== null && this.duration > 0) {
                this.destroyTimeout = this.scene.time.delayedCall(this.duration, () => {
                    this.destroy();
                });
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

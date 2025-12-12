// ===== FULLSCREEN BUTTON =====
// Reusable fullscreen button that can be added to any scene
// Only visible when NOT in fullscreen (press ESC to exit)

class FullscreenButton {
    constructor(scene, x = 1230, y = 50) {
        this.scene = scene;
        this.icon = null;

        this.create(x, y);
    }

    create(x, y) {
        // Create bold fullscreen icon (no background)
        this.icon = this.scene.add.text(x, y, '⛶', {
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#ffffff'
        });
        this.icon.setOrigin(0.5, 0.5);
        this.icon.setDepth(10001);
        this.icon.setInteractive({ useHandCursor: true });

        // Set initial visibility based on current fullscreen state
        this.icon.setVisible(!this.scene.scale.isFullscreen);

        // Click handler to enter fullscreen only
        this.icon.on('pointerdown', () => {
            if (!this.scene.scale.isFullscreen) {
                this.scene.scale.startFullscreen();
            }
        });

        // Listen for fullscreen changes to hide/show button
        // Phaser uses separate events for enter and leave fullscreen
        this.enterFullscreenHandler = () => this.updateVisibility();
        this.leaveFullscreenHandler = () => this.updateVisibility();

        this.scene.scale.on('enterfullscreen', this.enterFullscreenHandler);
        this.scene.scale.on('leavefullscreen', this.leaveFullscreenHandler);

        // Hover effect - slight scale up
        this.icon.on('pointerover', () => {
            this.icon.setScale(1.1);
        });

        this.icon.on('pointerout', () => {
            this.icon.setScale(1.0);
        });
    }

    /**
     * Show button only when NOT in fullscreen
     */
    updateVisibility() {
        if (!this.icon) return;

        // Small delay to ensure fullscreen state has updated
        this.scene.time.delayedCall(50, () => {
            if (!this.icon) return; // Check again in case destroyed during delay

            const isFullscreen = this.scene.scale.isFullscreen;
            console.log('[FullscreenButton] Fullscreen state:', isFullscreen);

            if (isFullscreen) {
                this.icon.setVisible(false);
                this.icon.disableInteractive();
            } else {
                this.icon.setVisible(true);
                this.icon.setInteractive({ useHandCursor: true });
            }
        });
    }

    /**
     * Clean up the button
     */
    destroy() {
        if (this.icon) {
            this.icon.off('pointerdown');
            this.icon.off('pointerover');
            this.icon.off('pointerout');
            this.icon.destroy();
            this.icon = null;
        }

        // Remove fullscreen event listeners
        if (this.enterFullscreenHandler) {
            this.scene.scale.off('enterfullscreen', this.enterFullscreenHandler);
        }
        if (this.leaveFullscreenHandler) {
            this.scene.scale.off('leavefullscreen', this.leaveFullscreenHandler);
        }
    }
}

export default FullscreenButton;

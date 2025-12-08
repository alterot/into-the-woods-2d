// ===== AUDIO MANAGER =====
// Singleton class that manages all game audio
// Handles click sounds, background music, and ensures persistence across scenes

class AudioManager {
    constructor(scene) {
        // Singleton pattern - return existing instance if it exists
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        this.scene = scene;
        this.clickSound = null;
        this.menuSelectSound = null;
        this.bgMusic = null;
        this.initialized = false;

        // Footstep state
        this.footstepLeft = null;
        this.footstepRight = null;
        this.stepToggle = false; 
    }

    /**
     * Initialize audio system - load and setup sounds
     * Should be called once after assets are loaded
     */
    init(scene) {
        if (this.initialized) {
            return;
        }

        this.scene = scene;

        // Setup click sound (for gameplay and dialog)
        this.clickSound = this.scene.sound.add('click', {
            volume: 0.2
        });

        // Setup menu select sound (for menu buttons and UI)
        this.menuSelectSound = this.scene.sound.add('menu-select', {
            volume: 0.7
        });

        // Setup background music
        this.bgMusic = this.scene.sound.add('forest-ambient', {
            volume: 0.4,
            loop: true
        });

        // Setup footstep sounds (om de finns laddade)
        this.footstepLeft = this.scene.sound.add('step-left', {
            volume: 0.4
        });
        this.footstepRight = this.scene.sound.add('step-right', {
            volume: 0.4
        });
        this.stepToggle = false;


        this.initialized = true;
        console.log('[AudioManager] Initialized');
    }

    /**
     * Play click sound (for gameplay and dialog)
     * Stops previous click if still playing to prevent overlap
     */
    playClick() {
        if (!this.clickSound) {
            console.warn('[AudioManager] Click sound not initialized');
            return;
        }

        // Stop previous click if still playing
        if (this.clickSound.isPlaying) {
            this.clickSound.stop();
        }

        // Play new click
        this.clickSound.play();
    }

    /**
     * Play menu select sound (for menu buttons and UI)
     * Stops previous sound if still playing to prevent overlap
     */
    playMenuSelect() {
        if (!this.menuSelectSound) {
            console.warn('[AudioManager] Menu select sound not initialized');
            return;
        }

        // Stop previous sound if still playing
        if (this.menuSelectSound.isPlaying) {
            this.menuSelectSound.stop();
        }

        // Play new sound
        this.menuSelectSound.play();
    }

    /**
     * Start background music
     * Will only start if not already playing
     */
    startMusic() {
        if (!this.bgMusic) {
            console.warn('[AudioManager] Background music not initialized');
            return;
        }

        // Only start if not already playing
        if (!this.bgMusic.isPlaying) {
            this.bgMusic.play();
            console.log('[AudioManager] Background music started');
        }
    }

    /**
     * Stop background music
     */
    stopMusic() {
        if (!this.bgMusic) {
            return;
        }

        if (this.bgMusic.isPlaying) {
            this.bgMusic.stop();
            console.log('[AudioManager] Background music stopped');
        }
    }

    /**
     * Pause background music
     */
    pauseMusic() {
        if (!this.bgMusic) {
            return;
        }

        if (this.bgMusic.isPlaying) {
            this.bgMusic.pause();
            console.log('[AudioManager] Background music paused');
        }
    }

    /**
     * Resume background music
     */
    resumeMusic() {
        if (!this.bgMusic) {
            return;
        }

        if (this.bgMusic.isPaused) {
            this.bgMusic.resume();
            console.log('[AudioManager] Background music resumed');
        }
    }

    
        /**
         * Spela ett fotsteg. Växlar mellan vänster och höger.
         */
        playFootstep() {
            if (!this.footstepLeft || !this.footstepRight) {
                // Ljud inte initierade
                return;
            }

            const sound = this.stepToggle ? this.footstepRight : this.footstepLeft;
            this.stepToggle = !this.stepToggle;

            sound.play();
        }

    /**
     * Set click sound volume (0.0 to 1.0)
     */
    setClickVolume(volume) {
        if (this.clickSound) {
            this.clickSound.setVolume(volume);
        }
    }

    /**
     * Set music volume (0.0 to 1.0)
     */
    setMusicVolume(volume) {
        if (this.bgMusic) {
            this.bgMusic.setVolume(volume);
        }
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        return AudioManager.instance;
    }
}

export default AudioManager;

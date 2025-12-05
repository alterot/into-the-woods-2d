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
        this.bgMusic = null;
        this.initialized = false;
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

        // Setup click sound
        this.clickSound = this.scene.sound.add('click', {
            volume: 0.2
        });

        // Setup background music
        this.bgMusic = this.scene.sound.add('forest-ambient', {
            volume: 0.4,
            loop: true
        });

        this.initialized = true;
        console.log('[AudioManager] Initialized');
    }

    /**
     * Play click sound
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

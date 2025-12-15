// ===== SCENE STATE MANAGER =====
// Centralized state management system for game and scene state
// Replaces ad-hoc window.gameState usage with a clean API
// Supports persistence to localStorage for save/load functionality

/**
 * SceneStateManager - Singleton for managing game and scene state
 *
 * Usage:
 * - Global state: SceneStateManager.setGlobal('key', value)
 * - Scene state: SceneStateManager.setScene('SceneName', 'key', value)
 * - Persistence: SceneStateManager.enablePersistence('save-slot-name')
 */
class SceneStateManager {
    constructor() {
        if (SceneStateManager.instance) {
            return SceneStateManager.instance;
        }

        // State structure
        this.state = {
            global: {},      // Global game state (character, settings, etc.)
            scenes: {}       // Per-scene state (puzzles, flags, etc.)
        };

        // Persistence settings
        this.persistenceEnabled = false;
        this.saveKey = 'game-state';
        this.autoSave = true;  // Auto-save on every state change

        SceneStateManager.instance = this;
        console.log('[SceneStateManager] Initialized');
    }

    // ==========================================
    // GLOBAL STATE (character selection, etc.)
    // ==========================================

    /**
     * Set a global state value
     * @param {string} key - State key
     * @param {*} value - State value
     */
    setGlobal(key, value) {
        this.state.global[key] = value;
        console.log(`[SceneStateManager] Global: ${key} = ${value}`);

        if (this.autoSave && this.persistenceEnabled) {
            this.save();
        }
    }

    /**
     * Get a global state value
     * @param {string} key - State key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} The state value or default
     */
    getGlobal(key, defaultValue = null) {
        return this.state.global.hasOwnProperty(key)
            ? this.state.global[key]
            : defaultValue;
    }

    /**
     * Get all global state
     * @returns {Object} Global state object
     */
    getAllGlobal() {
        return { ...this.state.global };
    }

    /**
     * Check if a global state key exists
     * @param {string} key - State key
     * @returns {boolean} True if key exists
     */
    hasGlobal(key) {
        return this.state.global.hasOwnProperty(key);
    }

    // ==========================================
    // SCENE-SPECIFIC STATE (puzzles, flags, etc.)
    // ==========================================

    /**
     * Set a scene-specific state value
     * @param {string} sceneKey - Scene identifier (e.g., 'Scene3_Tomb')
     * @param {string} key - State key
     * @param {*} value - State value
     */
    setScene(sceneKey, key, value) {
        if (!this.state.scenes[sceneKey]) {
            this.state.scenes[sceneKey] = {};
        }

        this.state.scenes[sceneKey][key] = value;
        console.log(`[SceneStateManager] ${sceneKey}.${key} = ${value}`);

        if (this.autoSave && this.persistenceEnabled) {
            this.save();
        }
    }

    /**
     * Get a scene-specific state value
     * @param {string} sceneKey - Scene identifier
     * @param {string} key - State key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} The state value or default
     */
    getScene(sceneKey, key, defaultValue = null) {
        if (!this.state.scenes[sceneKey]) {
            return defaultValue;
        }

        return this.state.scenes[sceneKey].hasOwnProperty(key)
            ? this.state.scenes[sceneKey][key]
            : defaultValue;
    }

    /**
     * Get all state for a specific scene
     * @param {string} sceneKey - Scene identifier
     * @returns {Object} Scene state object (or empty object if scene has no state)
     */
    getAllScene(sceneKey) {
        return this.state.scenes[sceneKey]
            ? { ...this.state.scenes[sceneKey] }
            : {};
    }

    /**
     * Set all state for a specific scene (replaces existing state)
     * @param {string} sceneKey - Scene identifier
     * @param {Object} stateObject - Complete state object for the scene
     */
    setAllScene(sceneKey, stateObject) {
        this.state.scenes[sceneKey] = { ...stateObject };
        console.log(`[SceneStateManager] ${sceneKey} state updated:`, stateObject);

        if (this.autoSave && this.persistenceEnabled) {
            this.save();
        }
    }

    /**
     * Check if a scene has any saved state
     * @param {string} sceneKey - Scene identifier
     * @returns {boolean} True if scene has state
     */
    hasScene(sceneKey) {
        return this.state.scenes.hasOwnProperty(sceneKey);
    }

    /**
     * Check if a scene has a specific state key
     * @param {string} sceneKey - Scene identifier
     * @param {string} key - State key
     * @returns {boolean} True if key exists
     */
    hasSceneKey(sceneKey, key) {
        return this.state.scenes[sceneKey]?.hasOwnProperty(key) || false;
    }

    /**
     * Delete a scene's state key
     * @param {string} sceneKey - Scene identifier
     * @param {string} key - State key to delete
     */
    deleteSceneKey(sceneKey, key) {
        if (this.state.scenes[sceneKey]) {
            delete this.state.scenes[sceneKey][key];
            console.log(`[SceneStateManager] Deleted ${sceneKey}.${key}`);

            if (this.autoSave && this.persistenceEnabled) {
                this.save();
            }
        }
    }

    /**
     * Clear all state for a scene
     * @param {string} sceneKey - Scene identifier
     */
    clearScene(sceneKey) {
        delete this.state.scenes[sceneKey];
        console.log(`[SceneStateManager] Cleared all state for ${sceneKey}`);

        if (this.autoSave && this.persistenceEnabled) {
            this.save();
        }
    }

    // ==========================================
    // PERSISTENCE (localStorage)
    // ==========================================

    /**
     * Enable state persistence to localStorage
     * @param {string} saveKey - Key to use for localStorage (default: 'game-state')
     * @param {boolean} autoSave - Auto-save on every state change (default: true)
     */
    enablePersistence(saveKey = 'game-state', autoSave = true) {
        this.persistenceEnabled = true;
        this.saveKey = saveKey;
        this.autoSave = autoSave;
        console.log(`[SceneStateManager] Persistence enabled: key='${saveKey}', autoSave=${autoSave}`);

        // Try to load existing save
        this.load();
    }

    /**
     * Disable state persistence
     */
    disablePersistence() {
        this.persistenceEnabled = false;
        console.log('[SceneStateManager] Persistence disabled');
    }

    /**
     * Save current state to localStorage
     * @returns {boolean} True if save succeeded
     */
    save() {
        if (!this.persistenceEnabled) {
            console.warn('[SceneStateManager] Cannot save: persistence not enabled');
            return false;
        }

        try {
            const stateJSON = JSON.stringify(this.state);
            localStorage.setItem(this.saveKey, stateJSON);
            console.log(`[SceneStateManager] State saved to localStorage (${stateJSON.length} bytes)`);
            return true;
        } catch (error) {
            console.error('[SceneStateManager] Failed to save state:', error);
            return false;
        }
    }

    /**
     * Load state from localStorage
     * @returns {boolean} True if load succeeded
     */
    load() {
        if (!this.persistenceEnabled) {
            console.warn('[SceneStateManager] Cannot load: persistence not enabled');
            return false;
        }

        try {
            const stateJSON = localStorage.getItem(this.saveKey);

            if (!stateJSON) {
                console.log('[SceneStateManager] No saved state found');
                return false;
            }

            this.state = JSON.parse(stateJSON);
            console.log('[SceneStateManager] State loaded from localStorage');
            console.log('[SceneStateManager] Global state:', this.state.global);
            console.log('[SceneStateManager] Scene states:', Object.keys(this.state.scenes));
            return true;
        } catch (error) {
            console.error('[SceneStateManager] Failed to load state:', error);
            return false;
        }
    }

    /**
     * Delete saved state from localStorage
     */
    deleteSave() {
        if (this.persistenceEnabled) {
            localStorage.removeItem(this.saveKey);
            console.log(`[SceneStateManager] Deleted save from localStorage: ${this.saveKey}`);
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Reset all state (for new game)
     * @param {boolean} keepGlobal - Keep global state (character selection, etc.)
     */
    reset(keepGlobal = false) {
        console.log('[SceneStateManager] Resetting state', keepGlobal ? '(keeping global)' : '(full reset)');

        if (keepGlobal) {
            this.state.scenes = {};
        } else {
            this.state.global = {};
            this.state.scenes = {};
        }

        if (this.persistenceEnabled) {
            this.save();
        }
    }

    /**
     * Get complete state snapshot (for debugging or export)
     * @returns {Object} Complete state object
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Import a complete state snapshot
     * @param {Object} snapshot - State object to import
     */
    importSnapshot(snapshot) {
        this.state = JSON.parse(JSON.stringify(snapshot));
        console.log('[SceneStateManager] Imported state snapshot');

        if (this.persistenceEnabled) {
            this.save();
        }
    }

    /**
     * Get statistics about current state
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            globalKeys: Object.keys(this.state.global).length,
            sceneCount: Object.keys(this.state.scenes).length,
            scenes: Object.keys(this.state.scenes),
            totalSize: JSON.stringify(this.state).length
        };
    }

    /**
     * Print current state to console (for debugging)
     */
    debug() {
        console.log('===== SCENE STATE MANAGER DEBUG =====');
        console.log('Global State:', this.state.global);
        console.log('Scene States:', this.state.scenes);
        console.log('Stats:', this.getStats());
        console.log('Persistence:', this.persistenceEnabled ? `Enabled (${this.saveKey})` : 'Disabled');
        console.log('======================================');
    }
}

// Create singleton instance
const instance = new SceneStateManager();

// Freeze the instance to prevent modifications
Object.freeze(instance);

export default instance;

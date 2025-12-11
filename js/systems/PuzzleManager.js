// ===== PUZZLE MANAGER =====
// Generic system for managing sequence-based puzzles
// Handles validation, progress tracking, and callbacks
// Can be used for any puzzle requiring correct order (braziers, symbols, buttons, etc.)

class PuzzleManager {
    /**
     * Create a puzzle manager
     * @param {Phaser.Scene} scene - The scene this puzzle belongs to
     * @param {Object} config - Configuration object
     *
     * Config options:
     * {
     *   sequence: Array,          // The correct sequence (e.g., ['green', 'blue', 'yellow'])
     *   onCorrectStep: function,  // Called when a correct step is made (step, value)
     *   onWrongStep: function,    // Called when wrong step is attempted (expectedValue, attemptedValue)
     *   onReset: function,        // Called when puzzle is reset
     *   onComplete: function,     // Called when puzzle is solved
     *   allowRepeatSteps: bool,   // Allow clicking the same step multiple times (default: false)
     *   resetOnWrong: bool        // Auto-reset puzzle on wrong step (default: true)
     * }
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = {
            allowRepeatSteps: false,
            resetOnWrong: true,
            ...config
        };

        // Validate required config
        if (!this.config.sequence || this.config.sequence.length === 0) {
            console.error('[PuzzleManager] Invalid config: sequence is required');
            this.config.sequence = [];
        }

        // Puzzle state
        this.sequence = this.config.sequence;
        this.currentStep = 0;
        this.isComplete = false;
        this.attempts = 0;          // Track number of attempts
        this.wrongAttempts = 0;     // Track number of wrong attempts

        console.log('[PuzzleManager] Created with sequence:', this.sequence);
    }

    /**
     * Attempt a step in the puzzle
     * @param {*} value - The value being attempted (must match sequence[currentStep])
     * @returns {Object} Result object: { success: bool, isComplete: bool, step: number }
     */
    attempt(value) {
        if (this.isComplete) {
            console.warn('[PuzzleManager] Puzzle already complete, ignoring attempt');
            return { success: false, isComplete: true, step: this.currentStep };
        }

        this.attempts++;
        const expectedValue = this.sequence[this.currentStep];
        const isCorrect = (value === expectedValue);

        console.log(`[PuzzleManager] Attempt #${this.attempts}: ${value}, expected ${expectedValue}, correct: ${isCorrect}`);

        if (isCorrect) {
            // CORRECT STEP
            this.currentStep++;

            // Call correct step callback
            if (this.config.onCorrectStep) {
                this.config.onCorrectStep(this.currentStep - 1, value);
            }

            // Check if puzzle is complete
            if (this.currentStep >= this.sequence.length) {
                this.complete();
                return { success: true, isComplete: true, step: this.currentStep };
            }

            return { success: true, isComplete: false, step: this.currentStep };
        } else {
            // WRONG STEP
            this.wrongAttempts++;

            // Call wrong step callback
            if (this.config.onWrongStep) {
                this.config.onWrongStep(expectedValue, value);
            }

            // Auto-reset if configured
            if (this.config.resetOnWrong) {
                this.reset();
            }

            return { success: false, isComplete: false, step: this.currentStep };
        }
    }

    /**
     * Reset the puzzle to initial state
     * @param {boolean} silent - If true, don't trigger onReset callback (default: false)
     */
    reset(silent = false) {
        console.log('[PuzzleManager] Resetting puzzle');

        this.currentStep = 0;

        if (!silent && this.config.onReset) {
            this.config.onReset();
        }
    }

    /**
     * Mark puzzle as complete and trigger callback
     */
    complete() {
        console.log('[PuzzleManager] ✓ PUZZLE COMPLETE!');
        console.log(`[PuzzleManager] Stats: ${this.attempts} total attempts, ${this.wrongAttempts} wrong attempts`);

        this.isComplete = true;

        if (this.config.onComplete) {
            this.config.onComplete();
        }
    }

    /**
     * Check if a specific value is the next correct step
     * @param {*} value - The value to check
     * @returns {boolean} True if this is the correct next step
     */
    isNextStep(value) {
        if (this.isComplete) {
            return false;
        }
        return value === this.sequence[this.currentStep];
    }

    /**
     * Get the current expected value
     * @returns {*} The value that should be attempted next
     */
    getExpectedValue() {
        if (this.isComplete) {
            return null;
        }
        return this.sequence[this.currentStep];
    }

    /**
     * Get current puzzle progress
     * @returns {Object} Progress object: { current: number, total: number, percentage: number }
     */
    getProgress() {
        return {
            current: this.currentStep,
            total: this.sequence.length,
            percentage: (this.currentStep / this.sequence.length) * 100
        };
    }

    /**
     * Check if puzzle is solved
     * @returns {boolean} True if puzzle is complete
     */
    isSolved() {
        return this.isComplete;
    }

    /**
     * Get puzzle statistics
     * @returns {Object} Stats object with attempts, wrong attempts, etc.
     */
    getStats() {
        return {
            attempts: this.attempts,
            wrongAttempts: this.wrongAttempts,
            currentStep: this.currentStep,
            stepsRemaining: this.sequence.length - this.currentStep,
            isComplete: this.isComplete
        };
    }

    /**
     * Set puzzle as complete without triggering callbacks
     * Useful for loading saved game state
     */
    setSolved() {
        console.log('[PuzzleManager] Setting puzzle as solved (no callbacks)');
        this.isComplete = true;
        this.currentStep = this.sequence.length;
    }

    /**
     * Check if a value exists in the sequence
     * @param {*} value - The value to check
     * @returns {boolean} True if value is part of the sequence
     */
    isValidValue(value) {
        return this.sequence.includes(value);
    }

    /**
     * Get a hint for the next step
     * @returns {Object} Hint object: { step: number, value: any, stepsRemaining: number }
     */
    getHint() {
        if (this.isComplete) {
            return { step: -1, value: null, stepsRemaining: 0 };
        }

        return {
            step: this.currentStep,
            value: this.sequence[this.currentStep],
            stepsRemaining: this.sequence.length - this.currentStep
        };
    }

    /**
     * Restart the puzzle (reset + clear completion state)
     */
    restart() {
        console.log('[PuzzleManager] Restarting puzzle from scratch');
        this.currentStep = 0;
        this.isComplete = false;
        this.attempts = 0;
        this.wrongAttempts = 0;
    }

    /**
     * Destroy the puzzle manager
     */
    destroy() {
        this.scene = null;
        this.config = null;
        this.sequence = null;
    }
}

export default PuzzleManager;

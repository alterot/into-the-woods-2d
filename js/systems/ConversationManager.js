// ===== CONVERSATION MANAGER =====
// Manages multi-bubble conversations with automatic chaining
// Supports player/follower roles, choices, and callbacks

import SpeechBubble from '../entities/SpeechBubble.js';

class ConversationManager {
    /**
     * Create a conversation manager
     * @param {Phaser.Scene} scene - The scene this conversation belongs to
     * @param {Array} steps - Array of conversation steps
     *
     * Step format:
     * {
     *   speaker: 'player' | 'follower',
     *   text: 'Dialog text',
     *   followTarget: sprite,
     *   choices: [{ text: 'Choice text', action: 'action_id' }]  // Optional
     * }
     */
    constructor(scene, steps) {
        this.scene = scene;
        this.steps = steps;
        this.currentStep = 0;
        this.isActive = false;
        this.onCompleteCallback = null;
        this.selectedChoice = null;
        this.currentBubble = null;
    }

    /**
     * Start the conversation
     * @param {Function} onComplete - Called when conversation ends
     */
    start(onComplete = null) {
        if (this.isActive) {
            console.warn('[ConversationManager] Conversation already active');
            return;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.selectedChoice = null;
        this.onCompleteCallback = onComplete;

        // Lock scene input during conversation
        this.scene.lockInput('conversation-manager');

        this.showStep(0);
    }

    /**
     * Show a specific conversation step
     */
    showStep(stepIndex) {

        if (stepIndex >= this.steps.length) {
            this.end();
            return;
        }

        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;

        // Determine which character is speaking
        const speaker = this.getSpeaker(step.speaker);
        if (!speaker) {
            console.error(`[ConversationManager] Unknown speaker: ${step.speaker}`);
            this.end();
            return;
        }

        // Create speech bubble
        if (step.choices && step.choices.length > 0) {
            // Choice bubble
            this.currentBubble = new SpeechBubble(
                this.scene,
                speaker.x,
                speaker.y,
                '',
                null,
                step.followTarget || speaker,
                step.choices.map(choice => ({
                    text: choice.text,
                    callback: () => {
                        this.selectedChoice = choice.action;
                        this.showStep(stepIndex + 1);
                    }
                }))
            );
        } else {
            // Regular bubble
            this.currentBubble = new SpeechBubble(
                this.scene,
                speaker.x,
                speaker.y,
                step.text,
                null,
                step.followTarget || speaker
            );

            // Advance to next step on click
            this.currentBubble.onClick(() => {
                this.showStep(stepIndex + 1);
            });
        }

        // Store reference so scene-wide clicks can interact
        if (this.scene.currentConversationBubble !== undefined) {
            this.scene.currentConversationBubble = this.currentBubble;
        }
    }

    /**
     * Get speaker sprite based on role
     */
    getSpeaker(role) {
        if (!this.scene.player || !this.scene.follower) {
            console.error('[ConversationManager] Scene missing player/follower sprites');
            return null;
        }

        switch (role) {
            case 'player':
                return this.scene.player;
            case 'follower':
                return this.scene.follower;
            default:
                return null;
        }
    }

    /**
     * End the conversation
     */
    end() {
        this.isActive = false;

        // Unlock scene input (conversation-specific lock)
        // Note: Input may still be locked by other systems (e.g., scene transitions)
        this.scene.unlockInput('conversation-manager');

        // Clear scene-wide bubble reference
        if (this.scene.currentConversationBubble !== undefined) {
            this.scene.currentConversationBubble = null;
        }

        // Call completion callback
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }

        // Destroy the bubble AFTER callback
        if (this.currentBubble) {
            this.currentBubble.destroy();
            this.currentBubble = null;
        }
    }

    /**
     * Get the selected choice action from the last choice step
     */
    getChoice() {
        return this.selectedChoice;
    }

    /**
     * Check if conversation is currently active
     */
    isRunning() {
        return this.isActive;
    }

    /**
     * Skip to a specific step (useful for branching)
     */
    jumpToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            console.error(`[ConversationManager] Invalid step index: ${stepIndex}`);
            return;
        }

        if (this.currentBubble) {
            this.currentBubble.destroy();
        }

        this.showStep(stepIndex);
    }

    /**
     * Cancel the conversation immediately
     */
    cancel() {
        if (this.currentBubble) {
            this.currentBubble.destroy();
        }
        // Safety: ensure input is unlocked
        this.scene.unlockInput('conversation-manager');
        this.end();
    }
}

export default ConversationManager;

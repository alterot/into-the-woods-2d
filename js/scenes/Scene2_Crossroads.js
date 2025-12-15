// ===== SCENE 2: CROSSROADS =====
// Second gameplay scene – skogskorsning med samma baslogik som ängsscenen

import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';
import ConversationManager from '../systems/ConversationManager.js';
import SpeechBubble from '../entities/SpeechBubble.js';
import DialogOverlay from '../systems/DialogOverlay.js';

class Scene2_Crossroads extends GameScene {
    constructor() {
        // Använd egna nycklar för bakgrund & mask
        super('Scene2_Crossroads', 'background2', 'mask2');

        this.dialogActive = false;

        // Wisp conversation state
        this.wispConversationActive = false;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false;
        this.wispClickPending = false;  // Track if movement is from wisp click
        this.isProcessingChoice = false;

        // ConversationManager instance
        this.wispConversation = null;
        this.currentConversationBubble = null;

        // Tomb entrance state
        this.tombEntranceVisited = false;  // Track if tomb entrance has been visited
    }

    init(data) {
        // Call parent init to handle entry tag
        super.init(data);

        // CRITICAL: Reset ALL dialog state when scene starts
        // (Scene might be reused, so constructor isn't always called)
        this.dialogActive = false;
        this.wispConversationActive = false;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false;
        this.wispClickPending = false;
        this.isProcessingChoice = false;
        this.currentConversationBubble = null;

        // IMPORTANT: Remove any existing scene-wide click handlers to prevent duplicates
        // This prevents the handler from being registered multiple times when revisiting the scene
        this.input.off('pointerdown');

        // Switch back to forest ambient music (in case we came from tomb)
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            // Only switch if we're not already playing forest-ambient
            if (audioManager.bgMusic && audioManager.bgMusic.key !== 'forest-ambient') {
                audioManager.switchMusic('forest-ambient');
            }
        }

    }

    /**
     * Returnerar spawn point för systrarna beroende på varifrån vi kom.
     * x,y är "mitten" mellan systrarna – GameScene flyttar dem åt sidan.
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            from_meadow: { x: 550, y: 660 },
            from_tomb:   { x: 560, y: 535 },  
            default:     { x: 550, y: 660 }
        };

        return spawns[entryTag] || spawns.default;
    }

    /**
     * Returnerar spawn point för wisp beroende på varifrån vi kom.
     * Wisp har sina egna positioner oberoende av systrarna.
     */
    getWispSpawnPoint(entryTag) {
        const spawns = {
            from_meadow: { x: 700, y: 660 }, 
            from_tomb:   { x: 700, y: 660 },  
            default:     { x: 700, y: 660 }   
        };

        return spawns[entryTag] || spawns.default;
    }

    // Här lägger vi scen-specifika saker
    createSceneContent() {
        // Flip sprites when entering from tomb (face left instead of default right)
        if (this.entryTag === 'from_tomb') {
            this.sister1.setFlipX(false);
            this.sister2.setFlipX(false);
        }

        // Hämta wisp spawn point (oberoende av systrarna)
        const wispSpawn = this.getWispSpawnPoint(this.entryTag || 'default');

        // ===== WISP =====
        this.wisp = new Wisp(this, wispSpawn.x, wispSpawn.y);
        this.wisp.onClick(() => this.handleWispClick());

        // ===== WALK-IN ANIMATION (when entering from meadow) =====
        if (this.entryTag === 'from_meadow') {
            this.startWalkInAnimation({
                player:   { x: -50, y: 550 },  // Off-screen left, higher Y position
                follower: { x: -100, y: 550 },
                wisp:     { x: -20, y: 510 }   // Wisp slightly above (550 - 40)
            });
        }

        // ===== WISP CONVERSATION (using ConversationManager) =====
        // Conversation: "Ska vi gå tillbaks till gläntan?" with yes/no choice
        this.wispConversation = new ConversationManager(this, [
            {
                speaker: 'follower',
                text: 'Ska vi gå tillbaks till gläntan?',
                followTarget: this.follower
            },
            {
                speaker: 'player',
                text: '',
                followTarget: this.player,
                choices: [
                    { text: 'Ja, vi går tillbaka.', action: 'go_back' },
                    { text: 'Nej, vi stannar här.', action: 'stay' }
                ]
            }
        ]);

        // ===== SCENE-WIDE CLICK HANDLER FOR CONVERSATIONS =====
        // Allows clicking ANYWHERE to advance dialogue (not just on bubble)
        // Blocks clicks from reaching GameScene during conversations
        this.input.on('pointerdown', (pointer) => {
            // During wisp conversation, advance current bubble
            if (this.wispConversationActive) {
                if (this.currentConversationBubble) {
                    // Don't call handleClick for choice bubbles - they handle their own clicks
                    if (!this.currentConversationBubble.choices || this.currentConversationBubble.choices.length === 0) {
                        this.currentConversationBubble.handleClick();
                    } else {
                    }
                }
                // CRITICAL: Block this click from reaching GameScene
                return;
            }
        });

        // Egen text för blockerat område i denna scen
        this.feedbackMessages.cannotWalk = "Skogen är för djup här också, vi måste hitta en annan väg.";

        // Add crossroads overlay (tree branches, foliage in foreground)
        // Depth 900: Above sprites (0-720) but below dialogue system (1000+)
        const overlay = this.add.image(640, 360, 'crossroads-overlay');
        overlay.setDepth(900);
    }

    handleWispClick() {
        // Block if dialog is already active
        if (this.dialogActive || this.wispConversationActive) {
            return;
        }

        // Destroy any existing feedback bubble
        if (this.feedbackBubble) {
            this.feedbackBubble.destroy();
            this.feedbackBubble = null;
        }

        // Calculate direction from wisp to player
        const dx = this.player.x - this.wisp.sprite.x;
        const dy = this.player.y - this.wisp.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction and calculate stop position 60px away from wisp
        const stopDistance = 60;
        const targetX = this.wisp.sprite.x + (dx / distance) * stopDistance;
        const targetY = this.wisp.sprite.y + (dy / distance) * stopDistance;

        // Find walkable spot near that calculated position
        const target = this.findNearestWalkable(targetX, targetY, 50);

        if (target) {
            // Mark that wisp was clicked - flags will be set in update() when movement starts
            this.wispClickPending = true;
            this.findPath(this.player.x, this.player.y, target.x, target.y);

            // Safety: if movement doesn't start in 500ms, reset flag
            this.time.delayedCall(500, () => {
                if (this.wispClickPending) {
                    this.wispClickPending = false;
                }
            });
        }
    }

    handleWispChoice(choice) {

        // Set flag to block all clicks during choice processing
        this.isProcessingChoice = true;

        if (choice === 'go_back') {
            // Clear conversation state before transitioning
            this.wispConversationActive = false;
            this.currentConversationBubble = null;
            this.dialogActive = false;
            this.isProcessingChoice = false;

            // Transition back to Scene 1 (Meadow)
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('Scene1_Meadow', { entry: 'from_crossroads' });
            });
        } else if (choice === 'stay') {
            // Stay in Scene2 - end conversation

            // Clear conversation state immediately
            this.wispConversationActive = false;
            this.currentConversationBubble = null;

            // Wait a moment before clearing dialogActive
            // This prevents clicks from leaking through
            this.time.delayedCall(200, () => {
                this.dialogActive = false;
                this.isProcessingChoice = false;
            });
        }
    }

    update() {
        super.update();

        // ===== WISP CONVERSATION - Set flags when movement starts (only if wisp was clicked) =====
        if (this.wispClickPending && (this.isMoving || this.isFollowerMoving)) {
            // Movement started after wisp click - pathfinding succeeded
            this.wispClickPending = false;
            this.dialogActive = true;
            this.wispConversationActive = true;
            this.wispArrivalHandled = false;
            this.wispWalkStarted = false;
        }

        // ===== WISP CONVERSATION - Trigger on arrival =====
        if (this.wispConversationActive && !this.wispArrivalHandled) {
            // Track when they start walking
            if (!this.wispWalkStarted && (this.isMoving || this.isFollowerMoving)) {
                this.wispWalkStarted = true;
            }

            const playerStopped = !this.isMoving;
            const followerStopped = !this.isFollowerMoving;

            // Only trigger after they've started walking AND both have stopped
            if (this.wispWalkStarted && playerStopped && followerStopped) {
                this.wispArrivalHandled = true;


                // Start conversation
                this.wispConversation.start(() => {
                    this.handleWispChoice(this.wispConversation.getChoice());
                });
            }
        }
    }

    // Röda pixlar i masken (interaktiva saker) – för nu bara en neutral respons
    handleInteractiveClick(x, y) {
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("Vi vågar inte gå ner än, Max verkar inte klar med detta område…");
    }

    // Override handleTransitionClick - single blue zone (tomb entrance)
    handleTransitionClick(x, y) {

        // Block if dialog is already active
        if (this.dialogActive) {
            return;
        }

        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        this.showValidClickIndicator(x, y);

        // ANY blue click triggers tomb entrance (mask now has only one blue zone)
        this.startTombEntranceSequence(x, y);
    }

    // Start tomb entrance sequence (similar to runestone in Scene1)
    startTombEntranceSequence(x, y) {

        // Destroy any existing feedback bubble
        if (this.feedbackBubble) {
            this.feedbackBubble.destroy();
            this.feedbackBubble = null;
        }

        // Block input
        this.dialogActive = true;

        // Find nearest walkable spot around the tomb entrance (larger radius for bigger entrance area)
        const target = this.findNearestWalkable(x, y, 100);

        if (target) {
            // Start pathfinding to tomb entrance
            this.findPath(this.player.x, this.player.y, target.x, target.y);
        } else {
            console.warn('[Scene2_Crossroads] No walkable spot found near tomb entrance');
        }

        // Load tomb entrance dialog data with error handling
        try {
            const tombData = this.cache.json.get('tomb-entrance');
            if (!tombData) {
                console.error('[Scene2] tomb-entrance JSON not found in cache!');
                this.dialogActive = false;
                return;
            }

            const conversation = tombData.conversations[0];
            let dialogData = conversation.lines;
            const choiceData = conversation.choice;

            // On repeat visits, skip all dialogue and go straight to choice
            if (this.tombEntranceVisited) {
                dialogData = [];  // Empty array = skip directly to choice
            } else {
            }


            // Create DialogOverlay (starts immediately while player walks)
            const overlay = new DialogOverlay(this, {
                dialogueData: dialogData,
                choiceData: choiceData,
                spritesVisible: true,
                backgroundDim: 0.6,
                onComplete: (selectedChoice) => {
                    this.handleTombChoice(selectedChoice);
                    // Mark tomb entrance as visited after first interaction
                    this.tombEntranceVisited = true;
                }
            });

            overlay.start();
        } catch (error) {
            console.error('[Scene2] Error creating tomb entrance dialog:', error);
            this.dialogActive = false;
        }
    }

    // Handle choice from tomb entrance dialog
    handleTombChoice(choice) {

        if (choice === 'enter') {
            // Player chose to enter the tomb
            this.dialogActive = false;

            // Fade out camera
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                // Start Scene3 (tomb interior)
                this.scene.start('Scene3_Tomb', { entry: 'from_crossroads' });
            });
        } else if (choice === 'back') {
            // Player chose to stay

            // Just clear dialog state and continue in Scene2
            this.time.delayedCall(200, () => {
                this.dialogActive = false;
            });
        } else {
            // No choice was made (user just advanced through dialog without choices)
            this.time.delayedCall(200, () => {
                this.dialogActive = false;
            });
        }
    }
}

export default Scene2_Crossroads;

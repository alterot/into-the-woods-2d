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
        this.isProcessingChoice = false;

        // ConversationManager instance
        this.wispConversation = null;
        this.currentConversationBubble = null;
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
        this.isProcessingChoice = false;
        this.currentConversationBubble = null;

        // Switch back to forest ambient music (in case we came from tomb)
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            // Only switch if we're not already playing forest-ambient
            if (audioManager.bgMusic && audioManager.bgMusic.key !== 'forest-ambient') {
                audioManager.switchMusic('forest-ambient');
            }
        }

        console.log('[Scene2] init() - all dialog state reset');
    }

    /**
     * Returnerar spawn point för systrarna beroende på varifrån vi kom.
     * x,y är "mitten" mellan systrarna – GameScene flyttar dem åt sidan.
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            from_meadow: { x: 570, y: 660 },
            from_tomb:   { x: 640, y: 480 },  // Spawn near tomb entrance when returning
            default:     { x: 610, y: 690 }
        };

        return spawns[entryTag] || spawns.default;
    }


    // Här lägger vi scen-specifika saker
    createSceneContent() {
        // Hämta spawnpoint (samma som för systrarna)
        const spawn = this.getSpawnPoint(this.entryTag || 'default');

        // Placera wisp lite ovanför/åt höger om systrarna
        const wispX = spawn.x + 30;
        const wispY = spawn.y - 40;

        // ===== WISP =====
        this.wisp = new Wisp(this, wispX, wispY);
        this.wisp.onClick(() => this.handleWispClick());

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
                console.log('[Scene2] Scene-wide click during conversation');
                if (this.currentConversationBubble) {
                    // Don't call handleClick for choice bubbles - they handle their own clicks
                    if (!this.currentConversationBubble.choices || this.currentConversationBubble.choices.length === 0) {
                        console.log('[Scene2] Advancing current bubble');
                        this.currentConversationBubble.handleClick();
                    } else {
                        console.log('[Scene2] Choice bubble - ignoring scene-wide click');
                    }
                }
                // CRITICAL: Block this click from reaching GameScene
                return;
            }
        });

        // Egen text för blockerat område i denna scen
        this.feedbackMessages.cannotWalk = "Skogen är för djup här också, vi måste hitta en annan väg.";
    }

    handleWispClick() {
        // Block if dialog is already active
        if (this.dialogActive || this.wispConversationActive) {
            console.log('[Scene2] Click blocked - dialog already active');
            return;
        }

        console.log('[Scene2] Starting wisp conversation - setting dialogActive = true');
        this.dialogActive = true;
        this.wispConversationActive = true;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false;

        // Find walkable spot near wisp
        const target = this.findNearestWalkable(this.wisp.sprite.x, this.wisp.sprite.y, 80);

        if (target) {
            // Start pathfinding to wisp
            this.findPath(this.player.x, this.player.y, target.x, target.y);
        } else {
            console.warn('[Scene2_Crossroads] No walkable spot found near wisp');
        }
    }

    handleWispChoice(choice) {
        console.log('[Scene2] handleWispChoice called with:', choice);

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
            console.log('[Scene2] Stay choice - clearing conversation state');

            // Clear conversation state immediately
            this.wispConversationActive = false;
            this.currentConversationBubble = null;

            // Wait a moment before clearing dialogActive
            // This prevents clicks from leaking through
            this.time.delayedCall(200, () => {
                console.log('[Scene2] Clearing dialogActive and isProcessingChoice');
                this.dialogActive = false;
                this.isProcessingChoice = false;
            });
        }
    }

    update() {
        super.update();

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

                console.log('[Scene2] Starting wisp conversation');

                // Start conversation
                this.wispConversation.start(() => {
                    console.log('[Scene2] Conversation completed, choice:', this.wispConversation.getChoice());
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

    // Override handleTransitionClick to handle two blue zones
    handleTransitionClick(x, y) {
        console.log('[Scene2] Transition click at', x, y);

        // Block if dialog is already active
        if (this.dialogActive) {
            console.log('[Scene2] Transition click blocked - dialog active');
            return;
        }

        // BLUE ZONE 1: Left exit back to Scene1_Meadow
        // x between 150 and 400, y between 250 and 550
        if (x >= 150 && x <= 400 && y >= 250 && y <= 550) {
            console.log('[Scene2] Left blue zone clicked - returning to Scene1');

            // Play click sound
            const audioManager = this.registry.get('audioManager');
            if (audioManager) {
                audioManager.playClick();
            }

            this.showValidClickIndicator(x, y);

            // Transition back to Scene1_Meadow
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('Scene1_Meadow', { entry: 'from_crossroads' });
            });
            return;
        }

        // BLUE ZONE 2: Middle zone at tomb entrance
        // x between 500 and 780, y between 260 and 530
        if (x >= 500 && x <= 780 && y >= 260 && y <= 530) {
            console.log('[Scene2] Tomb entrance zone clicked - starting tomb sequence');

            // Play click sound
            const audioManager = this.registry.get('audioManager');
            if (audioManager) {
                audioManager.playClick();
            }

            this.showValidClickIndicator(x, y);

            // Start tomb entrance sequence
            this.startTombEntranceSequence(x, y);
            return;
        }

        // Blue zone but not matching any defined zone - fallback
        console.log('[Scene2] Blue zone clicked but no match - showing feedback');
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("Det verkar inte finnas någon väg där.");
    }

    // Start tomb entrance sequence (similar to runestone in Scene1)
    startTombEntranceSequence(x, y) {
        console.log('[Scene2] Starting tomb entrance sequence');

        // Block input
        this.dialogActive = true;

        // Find walkable spot in front of tomb entrance
        // Hardcoded position in front of the hole (adjust as needed)
        const target = { x: 640, y: 520 };

        // Alternative: Find nearest walkable dynamically
        // const target = this.findNearestWalkable(x, y, 60);

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
            const dialogData = conversation.lines;
            const choiceData = conversation.choice;

            console.log('[Scene2] Loaded tomb data - lines:', dialogData.length, 'choices:', choiceData?.options?.length);

            // Create DialogOverlay (starts immediately while player walks)
            const overlay = new DialogOverlay(this, {
                dialogueData: dialogData,
                choiceData: choiceData,
                spritesVisible: true,
                backgroundDim: 0.6,
                onComplete: (selectedChoice) => {
                    console.log('[Scene2] Tomb dialog completed with choice:', selectedChoice);
                    this.handleTombChoice(selectedChoice);
                }
            });

            console.log('[Scene2] DialogOverlay created, starting...');
            overlay.start();
            console.log('[Scene2] DialogOverlay.start() called');
        } catch (error) {
            console.error('[Scene2] Error creating tomb entrance dialog:', error);
            this.dialogActive = false;
        }
    }

    // Handle choice from tomb entrance dialog
    handleTombChoice(choice) {
        console.log('[Scene2] handleTombChoice called with:', choice);

        if (choice === 'enter') {
            // Player chose to enter the tomb
            console.log('[Scene2] Entering tomb - transitioning to Scene3');

            // Fade out camera
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                // Start Scene3 (tomb interior)
                this.scene.start('Scene3_Tomb', { entry: 'from_crossroads' });
            });
        } else if (choice === 'back') {
            // Player chose to stay
            console.log('[Scene2] Staying in Scene2 - clearing dialog state');

            // Just clear dialog state and continue in Scene2
            this.time.delayedCall(200, () => {
                console.log('[Scene2] Clearing dialogActive');
                this.dialogActive = false;
            });
        } else {
            // No choice was made (user just advanced through dialog without choices)
            console.log('[Scene2] No choice made - clearing dialog state');
            this.time.delayedCall(200, () => {
                this.dialogActive = false;
            });
        }
    }
}

export default Scene2_Crossroads;

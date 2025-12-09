// ===== SCENE 2: CROSSROADS =====
// Second gameplay scene – skogskorsning med samma baslogik som ängsscenen

import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';
import ConversationManager from '../systems/ConversationManager.js';
import SpeechBubble from '../entities/SpeechBubble.js';

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

    /**
     * Returnerar spawn point för systrarna beroende på varifrån vi kom.
     * x,y är "mitten" mellan systrarna – GameScene flyttar dem åt sidan.
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            from_meadow: { x: 570, y: 660 },
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
                    console.log('[Scene2] Advancing current bubble');
                    this.currentConversationBubble.handleClick();
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
}

export default Scene2_Crossroads;

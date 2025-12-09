// ===== SCENE 1: MEADOW (REFACTORED) =====
// First gameplay scene - meadow clearing with wisp
// REFACTORED to use ConversationManager and InteractiveObject
import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';
import ConversationManager from '../systems/ConversationManager.js';
import DialogOverlay from '../systems/DialogOverlay.js';
import SpeechBubble from '../entities/SpeechBubble.js';

class Scene1_Meadow extends GameScene {
    constructor() {
        super('Scene1_Meadow', 'background', 'mask');

        // Wisp conversation state
        this.wispConversationCompleted = false;
        this.wispConversationActive = false;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false;
        this.wispIntroBubble = null;
        this.isProcessingChoice = false;  // Prevent click leakage during choice processing

        // ConversationManager instances
        this.wispFirstTimeConvo = null;
        this.wispRepeatConvo = null;
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

        // Clean up any leftover bubble
        if (this.wispIntroBubble) {
            this.wispIntroBubble.destroy();
            this.wispIntroBubble = null;
        }

        console.log('[Scene1] init() - all dialog state reset');
    }

    createSceneContent() {
        // ===== WISP =====
        this.wisp = new Wisp(this, 1075, 500);
        this.wisp.onClick(() => this.handleWispClick());

        // ===== RUNESTONE =====
        // Note: Runestone uses custom logic (not InteractiveObject) because:
        // - It doesn't have a fixed position (clicks anywhere on red mask)
        // - It needs custom hover sparkle trail effect
        // - It needs custom facing logic during dialog
        this.runestonePosition = null;
        this.isPointerOverRunestone = false;
        this.lastHoverSparkTime = 0;
        this.lastHoverX = null;
        this.lastHoverY = null;

        // Setup hover sparkle effect
        this.setupRunestoneHoverHighlight();

        // ===== WISP CONVERSATIONS (using ConversationManager) =====
        // First-time conversation (full 4-bubble sequence + choice)
        this.wispFirstTimeConvo = new ConversationManager(this, [
            // Bubble #1 is shown manually (displays while walking)
            // Bubbles #2-5 handled by ConversationManager
            {
                speaker: 'follower',
                text: 'Vad är det för något?',
                followTarget: this.follower
            },
            {
                speaker: 'player',
                text: 'Ett Irrbloss tror jag. Verkar som att den vill visa oss något.',
                followTarget: this.player
            },
            {
                speaker: 'follower',
                text: 'Vad ska vi göra tycker du?',
                followTarget: this.follower
            },
            {
                speaker: 'player',
                text: '',
                followTarget: this.player,
                choices: [
                    { text: 'Vi följer efter!', action: 'follow' },
                    { text: 'Vi stannar kvar i gläntan.', action: 'stay' }
                ]
            }
        ]);

        // Repeat conversation (just the choice)
        this.wispRepeatConvo = new ConversationManager(this, [
            {
                speaker: 'player',
                text: '',
                followTarget: this.player,
                choices: [
                    { text: 'Vi följer efter!', action: 'follow' },
                    { text: 'Vi stannar kvar i gläntan.', action: 'stay' }
                ]
            }
        ]);

        // ===== SCENE-WIDE CLICK HANDLER FOR CONVERSATIONS =====
        // Allows clicking ANYWHERE to advance dialogue (not just on bubble)
        // Blocks clicks from reaching GameScene during conversations
        this.input.on('pointerdown', (pointer) => {
            // During wisp conversation, advance current bubble
            if (this.wispConversationActive) {
                console.log('[Scene1] Scene-wide click during conversation');
                if (this.currentConversationBubble) {
                    console.log('[Scene1] Advancing current bubble');
                    this.currentConversationBubble.handleClick();
                }
                // CRITICAL: Block this click from reaching GameScene
                // (returning prevents code below from running, but doesn't stop other handlers)
                return;
            }
        });
    }

    handleWispClick() {
        // Block if dialog is already active
        if (this.dialogActive || this.wispConversationActive) {
            console.log('[Scene1] Click blocked - dialog already active');
            return;
        }

        console.log('[Scene1] Starting wisp conversation - setting dialogActive = true');
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
            console.warn('[Scene1_Meadow] No walkable spot found near wisp');
        }

        // If already seen full conversation, skip bubble #1
        if (this.wispConversationCompleted) {
            // Will show choice bubble directly on arrival (in update())
            return;
        }

        // First time - show bubble #1 (displays while walking)
        if (this.wispIntroBubble) {
            this.wispIntroBubble.destroy();
        }

        this.wispIntroBubble = new SpeechBubble(
            this,
            this.player.x,
            this.player.y,
            'Vad är det som lyser där borta?',
            null,
            this.player
        );
    }

    handleWispChoice(choice) {
        console.log('[Scene1] handleWispChoice called with:', choice);
        console.log('[Scene1] dialogActive BEFORE:', this.dialogActive);

        // Set flag to block all clicks during choice processing
        this.isProcessingChoice = true;
        this.wispConversationCompleted = true;

        if (choice === 'follow') {
            // Transition to Scene 2
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('Scene2_Crossroads', { entry: 'from_meadow' });
            });
        } else if (choice === 'stay') {
            // Stay in meadow - end conversation
            console.log('[Scene1] Stay choice - clearing conversation state');

            // Note: ConversationManager.end() already destroyed the bubble
            // Just clear our conversation state

            // Clear conversation state immediately
            this.wispConversationActive = false;
            this.currentConversationBubble = null;

            // Wait a moment before clearing dialogActive
            // This prevents clicks from leaking through
            this.time.delayedCall(200, () => {
                console.log('[Scene1] Clearing dialogActive and isProcessingChoice');
                this.dialogActive = false;
                this.isProcessingChoice = false;
            });
        }
    }

    handleInteractiveClick(x, y) {
        // Ignore clicks if dialog is already active
        if (this.dialogActive) {
            return;
        }

        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // Save runestone position for facing direction
        this.runestonePosition = { x, y };

        // Get runestone dialogue data
        const runeData = this.cache.json.get('runeDialogue');
        const dialogData = runeData.conversations[0].lines;

        // Find nearest walkable spot around the runestone
        const walkableSpot = this.findNearestWalkable(x, y, 50);
        if (walkableSpot) {
            // Start pathfinding to nearest walkable spot
            this.findPath(this.player.x, this.player.y, walkableSpot.x, walkableSpot.y);
        } else {
            console.warn('[Scene1_Meadow] No walkable spot found near runestone');
        }

        // Start dialog overlay (immediately)
        this.dialogActive = true;

        const overlay = new DialogOverlay(this, {
            dialogueData: dialogData,
            spritesVisible: true,
            backgroundDim: 0.6,
            onComplete: () => {
                this.dialogActive = false;
                this.runestonePosition = null;
            },
            onLineChange: (line) => {
                // This callback is called for each line change
                // Facing logic is handled in update() loop
            }
        });
        overlay.start();
    }

    setupRunestoneHoverHighlight() {
        this.input.on('pointermove', (pointer) => {
            // No effect when dialog is active
            if (this.dialogActive) {
                this.isPointerOverRunestone = false;
                this.lastHoverX = null;
                this.lastHoverY = null;
                return;
            }

            const color = this.getPixelColor(pointer.x, pointer.y);

            if (color === 'red') {
                this.isPointerOverRunestone = true;

                const now = this.time.now;

                // Draw trail from previous position?
                if (this.lastHoverX !== null && this.lastHoverY !== null) {
                    const dx = pointer.x - this.lastHoverX;
                    const dy = pointer.y - this.lastHoverY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // How many steps along the line?
                    const steps = Math.min(4, Math.max(1, Math.floor(dist / 12)));

                    // Throttle so we don't go crazy
                    if (now - this.lastHoverSparkTime > 30) {
                        this.lastHoverSparkTime = now;

                        for (let i = 0; i <= steps; i++) {
                            const t = i / (steps || 1);
                            const px = this.lastHoverX + dx * t;
                            const py = this.lastHoverY + dy * t;
                            this.spawnRunestoneSparkTrail(px, py);
                        }
                    }
                }

                // Update last position
                this.lastHoverX = pointer.x;
                this.lastHoverY = pointer.y;
            } else {
                this.isPointerOverRunestone = false;
                this.lastHoverX = null;
                this.lastHoverY = null;
            }
        });
    }

    spawnRunestoneSparkTrail(x, y) {
        const sparkCount = 2;

        for (let i = 0; i < sparkCount; i++) {
            const offsetX = Phaser.Math.Between(-4, 4);
            const offsetY = Phaser.Math.Between(-4, 4);
            const radius = Phaser.Math.Between(1, 2);
            const colors = [0xffffff, 0xfff8d8, 0xfff0b5, 0xdde9ff];
            const color = Phaser.Utils.Array.GetRandom(colors);
            const startAlpha = Phaser.Math.FloatBetween(0.6, 1.0);

            const spark = this.add.circle(
                x + offsetX,
                y + offsetY,
                radius,
                color,
                startAlpha
            );
            spark.setDepth(1500);
            spark.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: spark,
                alpha: { from: startAlpha, to: 0 },
                duration: Phaser.Math.Between(220, 360),
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    if (spark && spark.destroy) {
                        spark.destroy();
                    }
                }
            });
        }

        // Random flash particle
        if (Phaser.Math.Between(0, 5) === 0) {
            const flash = this.add.circle(
                x + Phaser.Math.Between(-2, 2),
                y + Phaser.Math.Between(-2, 2),
                1,
                0xffffff,
                0
            );
            flash.setDepth(1501);
            flash.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: flash,
                alpha: { from: 0, to: 1 },
                duration: 80,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    if (flash && flash.destroy) {
                        flash.destroy();
                    }
                }
            });
        }
    }

    update() {
        super.update();

        // ===== RUNESTONE - Face the runestone during dialog =====
        if (this.dialogActive && this.runestonePosition) {
            const playerStopped = !this.isMoving;
            const followerStopped = !this.isFollowerMoving;

            // Player faces runestone when stopped
            if (playerStopped && this.player) {
                const playerLeftOfStone = this.player.x < this.runestonePosition.x;
                if (playerLeftOfStone) {
                    this.player.setFlipX(true);   // Face right (toward stone)
                } else {
                    this.player.setFlipX(false);  // Face left (toward stone)
                }
            }

            // Follower faces runestone when stopped
            if (followerStopped && this.follower) {
                const followerLeftOfStone = this.follower.x < this.runestonePosition.x;
                if (followerLeftOfStone) {
                    this.follower.setFlipX(true);   // Face right (toward stone)
                } else {
                    this.follower.setFlipX(false);  // Face left (toward stone)
                }
            }
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

                // Destroy bubble #1 (walking bubble)
                if (this.wispIntroBubble) {
                    this.wispIntroBubble.destroy();
                    this.wispIntroBubble = null;
                }

                // Choose which conversation to show
                const conversation = this.wispConversationCompleted
                    ? this.wispRepeatConvo
                    : this.wispFirstTimeConvo;

                console.log('[Scene1] Starting conversation:', this.wispConversationCompleted ? 'REPEAT' : 'FIRST TIME');
                console.log('[Scene1] dialogActive:', this.dialogActive);

                // Start conversation (bubbles #2-5)
                conversation.start(() => {
                    console.log('[Scene1] Conversation completed, choice:', conversation.getChoice());
                    this.handleWispChoice(conversation.getChoice());
                });
            }
        }
    }

    getSpawnPoint(entryTag) {
        const spawns = {
            default: { x: 610, y: 690 },
            from_crossroads: { x: 1050, y: 460 }  // Right side, middle Y, facing inward towards stone
        };
        return spawns[entryTag] || spawns.default;
    }

    applySpawnPoint() {
        // Call parent implementation to position sprites
        super.applySpawnPoint();

        // Adjust facing direction based on entry point
        if (this.entryTag === 'from_crossroads') {
            // Coming from right side - face left (towards runestone in center)
            if (this.sister1 && this.sister2) {
                this.sister1.setFlipX(false);  // Face left
                this.sister2.setFlipX(false);  // Face left
            }
        }
    }

    handleTransitionClick(x, y) {
        // No transitions in this scene yet
    }
}

export default Scene1_Meadow;

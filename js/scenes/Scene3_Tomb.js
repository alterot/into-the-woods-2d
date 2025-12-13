// ===== SCENE 3: TOMB INTERIOR =====
// Third gameplay scene - ancient burial chamber with braziers

import GameScene from './GameScene.js';
import DialogOverlay from '../systems/DialogOverlay.js';
import Brazier from '../entities/Brazier.js';
import PuzzleManager from '../systems/PuzzleManager.js';
import SceneStateManager from '../systems/SceneStateManager.js';

class Scene3_Tomb extends GameScene {
    constructor() {
        // Use scene-specific texture keys
        super('Scene3_Tomb', 'background3', 'mask3');

        this.dialogActive = false;

        // Braziers storage
        this.braziers = [];

        // Puzzle manager (created in createInitialScene if puzzle not solved)
        this.puzzleManager = null;
        this.puzzleSolved = false;  // Loaded from gameState in init()
    }

    init(data) {
        // Call parent init to handle entry tag
        super.init(data);

        // CRITICAL: Reset ALL dialog state when scene starts
        // (Scene might be reused, so constructor isn't always called)
        this.dialogActive = false;

        // Check if puzzle was already completed in a previous visit
        if (SceneStateManager.getScene('Scene3_Tomb', 'puzzleCompleted', false)) {
            this.puzzleSolved = true;
        } else {
            this.puzzleSolved = false;
        }

        // Switch to tomb ambient music with reduced volume (51% quieter for fire sounds)
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.switchMusic('tomb-ambient');
            // Reduce background music volume by 51% total (0.4 * 0.7 * 0.7 = 0.196)
            audioManager.setMusicVolume(0.196);
        }

    }

    /**
     * Return spawn point for sisters based on entry tag
     * x,y is the "center" between sisters - GameScene shifts them apart
     *
     * NOTE: If spawn point is in blue (transition) area, pathfinding won't work.
     * Adjust Y coordinate to spawn on green walkable area inside tomb.
     */
    getSpawnPoint(entryTag) {
        const spawns = {
            // Spawn further up/inside tomb to avoid blue entrance area
            from_crossroads: { x: 640, y: 580 },
            default:         { x: 640, y: 580 }
        };

        return spawns[entryTag] || spawns.default;
    }

    // Scene-specific content (braziers, skeleton mage, etc.)
    createSceneContent() {
        // Custom feedback message for this scene
        this.feedbackMessages.cannotWalk = "The tomb walls are too close here, we can't go that way.";

        // Check if puzzle is already completed
        if (this.puzzleSolved) {
            // Create COMPLETED version of the scene
            this.createCompletedScene();
        } else {
            // Create INITIAL version of the scene
            this.createInitialScene();
        }

        // Add tomb overlay (same for both versions)
        const overlay = this.add.image(640, 360, 'tomb-overlay');
        overlay.setDepth(2000);
    }

    /**
     * Create the initial version of the scene (before puzzle is solved)
     */
    createInitialScene() {

        // Create braziers from preset with colors: yellow (left), green (middle), blue (right)
        this.braziers = Brazier.fromPreset(this, 'tomb-braziers', {
            colors: ['yellow', 'green', 'blue'],
            initialState: 0
        });

        // === PUZZLE MANAGER ===
        // Correct activation sequence: GREEN → BLUE → YELLOW
        this.puzzleManager = new PuzzleManager(this, {
            sequence: ['green', 'blue', 'yellow'],
            resetOnWrong: false,  // We'll manually reset with delay for better UX

            onCorrectStep: (step, color) => {

                // Find and activate the brazier with this color
                const brazier = this.braziers.find(b => b.color === color);
                if (brazier) {
                    brazier.activate();
                }

                // Show feedback only for first two steps (not the final step)
                if (step < this.puzzleManager.sequence.length - 1) {
                    this.showFeedbackBubble(`The ${color} brazier flares to life!`);
                }
            },

            onWrongStep: (expectedColor, attemptedColor) => {

                // Show feedback
                this.showFeedbackBubble(`The ${attemptedColor} flame flickers and dies. Something's not right...`);
            },

            onReset: () => {

                // Reset all braziers to base state
                this.braziers.forEach(brazier => {
                    brazier.reset();
                });
            },

            onComplete: () => {

                // Delay before starting the dramatic reveal
                this.time.delayedCall(800, () => {
                    this.onPuzzleSolved();
                });
            }
        });

    }

    /**
     * Create the completed version of the scene (after puzzle is solved)
     */
    createCompletedScene() {

        // Load opened tomb background
        const bgKeys = ['background3-open', 'scene3-tomb-open', 'scen3-tomb-open'];
        let bgLoaded = false;

        for (const key of bgKeys) {
            if (this.textures.exists(key)) {
                const newBg = this.add.image(640, 360, key);
                newBg.setDepth(0);  // Behind everything
                bgLoaded = true;
                break;
            }
        }

        if (!bgLoaded) {
            console.warn('[Scene3] Opened background texture not found. Using default background.');
        }

        // Create purple braziers in completed state from preset
        this.braziers = Brazier.fromPreset(this, 'tomb-braziers', {
            colors: ['purple', 'purple', 'purple'],
            initialState: 2  // Start in completed state
        });

        // Add Morte sprite
        const morteKeys = ['morte-idle', 'Morte-idle'];
        let morteLoaded = false;

        for (const key of morteKeys) {
            if (this.textures.exists(key)) {
                const morte = this.add.sprite(900, 360, key);
                morte.setDepth(850);
                morte.setScale(0.22);
                this.morteSprite = morte;
                morteLoaded = true;
                break;
            }
        }

        if (!morteLoaded) {
            console.warn('[Scene3] Morte sprite texture not found.');
        }
    }

    // ==========================================
    // PUZZLE INTERACTION SYSTEM
    // ==========================================

    /**
     * Handle clicks on red (interactive) areas - brazier puzzle
     * Override from GameScene to implement puzzle logic
     */
    handleInteractiveClick(x, y) {
        // Block if dialog is active
        if (this.dialogActive) {
            return;
        }

        // Block if puzzle already solved
        if (this.puzzleSolved) {
            this.showNoPathIndicator(x, y);
            this.showFeedbackBubble("The braziers are already lit. The tomb feels different now.");
            return;
        }

        // Find which brazier was clicked (closest sprite to click position)
        const clickedBrazier = this.getClosestBrazier(x, y);
        if (!clickedBrazier) {
            console.warn('[Scene3] No brazier found near click position');
            this.showNoPathIndicator(x, y);
            return;
        }


        // Play click sound
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            audioManager.playClick();
        }

        // Find walkable position near brazier (keep player further back)
        const brazierX = clickedBrazier.x;
        const brazierY = clickedBrazier.y + 130; // Further below the brazier to avoid getting too close to flames
        const walkablePos = this.findNearestWalkable(brazierX, brazierY, 80);

        if (!walkablePos) {
            console.warn('[Scene3] No walkable position found near brazier');
            this.showNoPathIndicator(x, y);
            this.showFeedbackBubble("We can't reach that brazier from here.");
            return;
        }

        // Show valid click indicator
        this.showValidClickIndicator(x, y);

        // Move player to walkable position
        this.findPath(this.player.x, this.player.y, walkablePos.x, walkablePos.y);

        // Apply puzzle logic immediately (simple approach)
        // In a more complex implementation, you could wait for player to arrive
        this.activateBrazier(clickedBrazier);
    }

    /**
     * Get closest brazier to a click position
     */
    getClosestBrazier(x, y) {
        if (!this.braziers || this.braziers.length === 0) {
            return null;
        }

        let closest = null;
        let closestDist = Infinity;

        this.braziers.forEach(brazier => {
            const dist = brazier.distanceTo(x, y);

            if (dist < closestDist) {
                closestDist = dist;
                closest = brazier;
            }
        });

        return closest;
    }

    /**
     * Apply puzzle logic when a brazier is activated
     */
    activateBrazier(brazier) {
        // Delegate to PuzzleManager - it handles all validation and callbacks
        const result = this.puzzleManager.attempt(brazier.color);

        // If wrong, delay the reset for better UX
        if (!result.success && !result.isComplete) {
            this.time.delayedCall(1500, () => {
                // Manually trigger reset (PuzzleManager will call onReset callback)
                this.puzzleManager.reset();
            });
        }
    }

    /**
     * Handle puzzle completion
     * Includes placeholder hooks for future features
     */
    onPuzzleSolved() {

        this.puzzleSolved = true;

        // Save completion state using SceneStateManager
        SceneStateManager.setScene('Scene3_Tomb', 'puzzleCompleted', true);

        // Set all braziers to completed state (2) using Brazier's setCompleted method
        this.braziers.forEach(brazier => {
            brazier.setCompleted();
        });

        // Show completion feedback
        this.showFeedbackBubble("The ancient flames burn brightly. The tomb's secrets are revealed!");

        // === DRAMATIC REVEAL SEQUENCE ===
        // Wait 5000ms to let the completion message fully display before starting reveal
        this.time.delayedCall(5000, () => {

            // FIRST: Destroy feedback bubble before starting visual effects
            if (this.feedbackBubble) {
                this.feedbackBubble.destroy();
                this.feedbackBubble = null;
            }

            // THEN: Start the dramatic sequence
            // 1. Camera shake effect (earthquake/rumble)
            this.cameras.main.shake(800, 0.005);  // 800ms duration, subtle shake

            // 2. Fade out to black
            this.cameras.main.fadeOut(1600, 0, 0, 0);

            // 3. After fade completes, swap background and add Morte sprite
            this.time.delayedCall(1650, () => {

                // Change background to opened tomb
                // Try multiple possible texture keys
                const bgKeys = ['background3-open', 'scene3-tomb-open', 'scen3-tomb-open'];
                let bgLoaded = false;

                for (const key of bgKeys) {
                    if (this.textures.exists(key)) {
                        const newBg = this.add.image(640, 360, key);
                        newBg.setDepth(0);  // Behind everything
                        bgLoaded = true;
                        break;
                    }
                }

                if (!bgLoaded) {
                    console.warn('[Scene3] New background texture not found. Tried:', bgKeys);
                }

                // Add Morte sprite (middle-right position, centered vertically)
                const morteKeys = ['morte-idle', 'Morte-idle'];
                let morteLoaded = false;

                for (const key of morteKeys) {
                    if (this.textures.exists(key)) {
                        const morte = this.add.sprite(900, 360, key);
                        morte.setDepth(850);  // Above background, below UI
                        morte.setScale(0.22);    // Scale down high-res sprite
                        this.morteSprite = morte;  // Store for later use
                        morteLoaded = true;
                        break;
                    }
                }

                if (!morteLoaded) {
                    console.warn('[Scene3] Morte sprite texture not found. Tried:', morteKeys);
                }

                // Change all flames to purple using Brazier's changeColor method
                this.braziers.forEach(brazier => {
                    brazier.changeColor('purple');
                });

                // Stop any ongoing movement/pathfinding
                this.isMoving = false;
                this.isFollowerMoving = false;
                if (this.easystar) {
                    this.easystar.cancelPath();
                }

                // Position sisters center X, bottom third Y, facing right (towards Morte)
                const centerX = 640;  // Canvas width / 2
                const bottomThirdY = 480;  // Canvas height * 2/3 (720 * 2/3)

                if (this.player) {
                    this.player.x = centerX - 25;  // Slightly left of center
                    this.player.y = bottomThirdY;
                    this.player.setFlipX(false);  // Face right
                    this.player.setDepth(bottomThirdY);  // Ensure visible
                }

                if (this.follower) {
                    this.follower.x = centerX + 25;  // Slightly right of center
                    this.follower.y = bottomThirdY;
                    this.follower.setFlipX(false);  // Face right
                    this.follower.setDepth(bottomThirdY);  // Ensure visible
                }


                // 4. Reset camera alpha but keep screen visually black with DialogOverlay
                // This allows UI elements to be visible while screen appears black
                this.cameras.main.resetFX();  // Clear the fade effect

                // (Feedback bubble already destroyed before fade started)

                this.dialogActive = true;

                // Load full dialogue data
                const fullDialogueData = this.cache.json.get('tomb-morte-dialogue1').conversations[0].lines;

                // Split into narrator part (first 3 lines) and conversation part (rest)
                const narratorLines = fullDialogueData.slice(0, 3);
                const conversationLines = fullDialogueData.slice(3);


                // Start narrator dialogue with fully opaque black background
                const narratorOverlay = new DialogOverlay(this, {
                    dialogueData: narratorLines,
                    spritesVisible: false,  // Don't show game sprites behind
                    backgroundDim: 1.0,     // Fully opaque black background (keeps screen black)

                    // Play scraping stone sound when the tomb lid opening line appears
                    onLineChange: (line) => {
                        const audioManager = this.registry.get('audioManager');
                        // Check if this is the second narrator line (index 1) about the stone lid
                        if (line.text && line.text.includes('Ett djupt raspande ljud') && audioManager) {
                            // Wait 2 seconds after dialogue appears, then play scraping sound
                            this.time.delayedCall(2000, () => {
                                audioManager.playScrapingStone();

                                // Then play crash sound 1.8 seconds after scraping starts
                                this.time.delayedCall(1800, () => {
                                    audioManager.playStoneCrash();
                                });
                            });
                        }
                    },

                    onComplete: () => {

                        // 5. DialogOverlay will fade out automatically (500ms), revealing the scene
                        // Wait for fade to complete before starting conversation

                        // 6. After narrator overlay fades out, start conversation dialogue
                        this.time.delayedCall(500, () => {

                            // Determine portraits based on selected character
                            const isPlayingBig = SceneStateManager.getGlobal('selectedCharacter') === 'big';

                            // Start conversation with flexible layout
                            const conversationOverlay = new DialogOverlay(this, {
                                dialogueData: conversationLines,

                                // Flexible character layout: both sisters on left, Morte on right
                                roleSideMap: {
                                    narrator: 'narrator',
                                    player: 'left',
                                    sister: 'left',
                                    morte: 'right'
                                },

                                rolePortraitMap: {
                                    player: isPlayingBig ? 'portrait1' : 'portrait2',
                                    sister: isPlayingBig ? 'portrait2' : 'portrait1',
                                    morte: 'Morte-portrait'
                                },

                                spritesVisible: true,
                                backgroundDim: 0.7,

                                // Fix portrait facing on every line change
                                onLineChange: (line) => {
                                    // Ensure portraits face each other after texture swaps
                                    // Both sister portraits now face RIGHT by default in the asset files
                                    if (conversationOverlay.dialogUI) {
                                        // Sisters on left face right (towards Morte) - no flip needed
                                        conversationOverlay.dialogUI.leftPortrait.setFlipX(false);
                                        // Morte on right faces left (towards sisters) - flip to reverse
                                        conversationOverlay.dialogUI.rightPortrait.setFlipX(true);
                                    }
                                },

                                onComplete: () => {
                                    this.dialogActive = false;
                                }
                            });

                            conversationOverlay.start();
                        });
                    }
                });

                narratorOverlay.start();
            });
        });

    }

    // Blue pixels in mask (exit back to crossroads)
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

        // Stop all fire sounds from braziers
        if (this.braziers) {
            this.braziers.forEach(brazier => {
                if (brazier.fireSound) {
                    brazier.fireSound.stop();
                }
            });
        }

        // Restore normal music volume before leaving
        if (audioManager) {
            audioManager.setMusicVolume(0.4);  // Restore to normal volume
        }

        // Transition back to Scene2_Crossroads
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('Scene2_Crossroads', { entry: 'from_tomb' });
        });
    }

    update() {
        // COPY of GameScene.update() but with stone footsteps instead of grass
        // (We can't call super.update() because it plays grass footsteps)

        // Handle player movement along path
        if (this.isMoving && this.path && this.currentWaypoint < this.path.length) {
            const waypoint = this.path[this.currentWaypoint];
            const dx = waypoint.x - this.player.x;
            const dy = waypoint.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.moveSpeed * 2) {
                this.currentWaypoint++;
                if (this.currentWaypoint >= this.path.length) {
                    this.isMoving = false;
                    this.playerBobTime = 0;
                    this.path = null;
                }
            } else {
                if (dx < 0) {
                    this.player.flipX = false;
                } else if (dx > 0) {
                    this.player.flipX = true;
                }

                const angle = Math.atan2(dy, dx);
                this.player.x += Math.cos(angle) * this.moveSpeed;
                this.playerBobTime += 0.15;
                const bobOffset = Math.sin(this.playerBobTime) * 3;
                this.playerBaseY += Math.sin(angle) * this.moveSpeed;
                this.player.y = this.playerBaseY + bobOffset;
            }
        }

        // Handle follower following player
        const dx2 = this.player.x - this.follower.x;
        const dy2 = this.player.y - this.follower.y;
        const angle2 = Math.atan2(dy2, dx2);
        const targetX2 = this.player.x - Math.cos(angle2) * 50;
        const targetY2 = this.player.y - Math.sin(angle2) * 50;
        const distToTarget = Math.sqrt(
            (targetX2 - this.follower.x) ** 2 +
            (targetY2 - this.follower.y) ** 2
        );

        if (distToTarget > 5) {
            this.isFollowerMoving = true;
            const lerpFactor = 0.03;
            const newX = this.follower.x + (targetX2 - this.follower.x) * lerpFactor;
            const newY = this.follower.y + (targetY2 - this.follower.y) * lerpFactor;

            const moveDx = newX - this.follower.x;
            if (moveDx < 0) {
                this.follower.flipX = false;
            } else if (moveDx > 0) {
                this.follower.flipX = true;
            }

            this.followerBobTime += 0.15;
            const bobOffset2 = Math.sin(this.followerBobTime) * 3;
            this.followerBaseY += (newY - this.follower.y);
            this.follower.x = newX;
            this.follower.y = this.followerBaseY + bobOffset2;
        } else {
            this.isFollowerMoving = false;
            this.followerBobTime = 0;
            this.follower.y = this.followerBaseY;
        }

        // Depth sorting
        this.sister1.setDepth(this.sister1.y);
        this.sister2.setDepth(this.sister2.y);

        // Stone footsteps (instead of grass)
        const audioManager = this.registry.get('audioManager');
        if (audioManager) {
            const anyMoving = this.isMoving || this.isFollowerMoving;
            const centerX = (this.player.x + this.follower.x) / 2;
            const centerY = (this.player.y + this.follower.y) / 2;

            if (!anyMoving) {
                this.lastStepX = null;
                this.lastStepY = null;
                this.stepDistanceAccum = 0;
            } else {
                if (this.lastStepX == null || this.lastStepY == null) {
                    this.lastStepX = centerX;
                    this.lastStepY = centerY;
                }

                const dxCenter = centerX - this.lastStepX;
                const dyCenter = centerY - this.lastStepY;
                const frameDist = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

                this.stepDistanceAccum += frameDist;

                const STEP_DISTANCE = 36;  // 50% slower than grass (24 * 1.5)

                if (this.stepDistanceAccum >= STEP_DISTANCE) {
                    audioManager.playStoneFootstep();
                    this.stepDistanceAccum = 0;
                }

                this.lastStepX = centerX;
                this.lastStepY = centerY;
            }
        }
    }
}

export default Scene3_Tomb;

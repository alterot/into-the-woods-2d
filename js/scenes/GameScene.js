// ===== GAME SCENE (BASE CLASS) =====
// Abstract base class for all gameplay scenes
// Handles movement, pathfinding, follower AI, mask detection, depth sorting
import SpeechBubble from '../entities/SpeechBubble.js';
import SceneStateManager from '../systems/SceneStateManager.js';
import MaskHelper from '../helpers/MaskHelper.js';
import FullscreenButton from '../ui/FullscreenButton.js';

class GameScene extends Phaser.Scene {
    constructor(sceneKey, backgroundKey, maskKey) {
        super({ key: sceneKey });

        // Scene configuration
        this.sceneKey = sceneKey;
        this.backgroundKey = backgroundKey;
        this.maskKey = maskKey;

        // Info om hur vi kom in i scenen
        this.entryTag = null;
        this.entryData = null;

        // Movement properties
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;
        this.moveSpeed = 1.6;  // Reduced by 20% for slower, more deliberate movement

        // Player and follower references (canonical source of truth)
        this.player = null;
        this.follower = null;
        this.playerBobTime = 0;
        this.playerBaseY = 0;
        this.followerBobTime = 0;
        this.followerBaseY = 0;
        this.isFollowerMoving = false;

        // Footstep tracking
        this.lastStepX = null;
        this.lastStepY = null;
        this.stepDistanceAccum = 0;

        // Sprite references (sister1 and sister2 are just references to the sprites)
        // player/follower point to one of these based on character selection
        this.sister1 = null;
        this.sister2 = null;

        // Pathfinding properties
        this.easystar = null;
        this.grid = null;
        this.gridSize = 32; // Size of each grid cell in pixels
        this.path = null;
        this.currentWaypoint = 0;
        this.pathIndicator = null;

        // Feedback messages and bubble
        this.feedbackMessages = {
            cannotWalk: "Vi kan inte gå dit, skogen är för tät."
        };
        this.feedbackBubble = null;

        // Dialog state (used by child scenes)
        this.dialogActive = false;

        // Input locking system - tracks multiple input lock sources
        this.inputLocks = new Set();
    }

    // Subclasses must implement preload() to load scene-specific assets
    preload() {
        // Override in subclass to load background, mask, sprites, etc.
    }

    init(data) {
    // data kan t.ex. vara { entry: 'from_meadow', ... }
    this.entryTag = data?.entry || null;
    this.entryData = data || {};
    }


    create() {
        // Display the background image centered
        this.add.image(640, 360, this.backgroundKey);

        // Initialize MaskHelper for pixel detection and grid generation
        const maskTexture = this.textures.get(this.maskKey);
        this.maskHelper = new MaskHelper(maskTexture);

        // Initialize pathfinding grid and EasyStar
        this.createGridFromMask();
        this.initializePathfinding();

        // Setup player characters
        this.setupCharacters();

        // Flytta dem vid behov beroende på entryTag
        this.applySpawnPoint();

        // Initiera fotstegsposition vid start
        this.lastStepX = this.player.x;
        this.lastStepY = this.player.y;
        this.stepDistanceAccum = 0;

        // Create fullscreen button
        this.fullscreenButton = new FullscreenButton(this);

        // Hook for subclasses to add scene-specific content (wisp, objects, etc.)
        this.createSceneContent();

        // Add click handler for movement with mask checking
        this.input.on('pointerdown', (pointer) => {
            if (this.dialogActive) {
                return;
            }

            const color = this.getPixelColor(pointer.x, pointer.y);

            if (color === 'green') {
                // Walkable area - find path
                if (this.feedbackBubble) {
                    this.feedbackBubble.destroy();
                    this.feedbackBubble = null;
                }

                const audioManager = this.registry.get('audioManager');
                if (audioManager) {
                    audioManager.playClick();
                }

                this.showValidClickIndicator(pointer.x, pointer.y);
                this.findPath(this.player.x, this.player.y, pointer.x, pointer.y);
            }
            else if (color === 'red') {
                // Interaktivt objekt (kummel, runsten etc)
                if (this.feedbackBubble) {
                    this.feedbackBubble.destroy();
                    this.feedbackBubble = null;
                }

                this.handleInteractiveClick(pointer.x, pointer.y);
            }
            else if (color === 'blue') {
                // Transition area – ny hook
                if (this.feedbackBubble) {
                    this.feedbackBubble.destroy();
                    this.feedbackBubble = null;
                }

                this.handleTransitionClick(pointer.x, pointer.y);
            }
            else if (color === 'black') {
                // Svart = ”ingen klickyta” → gör ingenting alls
                return;
            }
            else {
                // Övrigt (om du har någon annan färg som är hårt block)
                this.showNoPathIndicator(pointer.x, pointer.y);
                this.showFeedbackBubble(this.feedbackMessages.cannotWalk);
            }
        });
    }

    setupCharacters() {
        // Determine player character based on selection
        const isPlayingBig = SceneStateManager.getGlobal('selectedCharacter') === 'big';

        // Position sprites - player always on the right
        if (isPlayingBig) {
            // Playing as big sister - she's the player (right)
            this.sister2 = this.add.image(150, 550, 'sister2');
            this.sister2.setScale(0.28);

            this.sister1 = this.add.image(200, 550, 'sister1');
            this.sister1.setScale(0.30);

            // Assign player and follower (canonical references)
            this.player = this.sister1;
            this.follower = this.sister2;
            this.playerBaseY = this.sister1.y;
            this.followerBaseY = this.sister2.y;
        } else {
            // Playing as little sister - she's the player (right)
            this.sister1 = this.add.image(150, 550, 'sister1');
            this.sister1.setScale(0.30);

            this.sister2 = this.add.image(200, 550, 'sister2');
            this.sister2.setScale(0.28);

            // Assign player and follower (canonical references)
            this.player = this.sister2;
            this.follower = this.sister1;
            this.playerBaseY = this.sister2.y;
            this.followerBaseY = this.sister1.y;
        }

        // Flip both sprites to face INTO the clearing
        this.sister1.setFlipX(true);
        this.sister2.setFlipX(true);
    }

        applySpawnPoint() {
        // Om vi inte fått någon entryTag → använd standardläget (ingen flytt)
        if (!this.entryTag) {
            return;
        }

        // Scenen måste själv definiera getSpawnPoint(entryTag)
        if (typeof this.getSpawnPoint !== 'function') {
            console.warn(`[GameScene] getSpawnPoint() saknas i scen "${this.sceneKey}"`);
            return;
        }

        const spawn = this.getSpawnPoint(this.entryTag);
        if (!spawn) {
            console.warn(
                `[GameScene] Ingen spawn point för entry "${this.entryTag}" i scen "${this.sceneKey}"`
            );
            return;
        }

        const { x, y } = spawn;
        const followerOffsetX = -50; // följaren står ~50px till vänster

        if (!this.player || !this.follower) {
            console.warn('[GameScene] Kan inte applicera spawn, saknar sprites');
            return;
        }

        // Position player and follower using canonical references
        this.player.x = x;
        this.player.y = y;
        this.playerBaseY = y;

        this.follower.x = x + followerOffsetX;
        this.follower.y = y;
        this.followerBaseY = y;
    }


    // Hook for subclasses to add scene-specific content
    createSceneContent() {
        // Override in subclass to add wisps, objects, interactions, etc.
    }

    // Hook for subclasses to handle interactive object clicks
    handleInteractiveClick(x, y) {
        // Override in subclass to handle red (interactive) clicks
        console.log('Interactive object clicked!');
        this.showNoPathIndicator(x, y);
    }
    // Hook för transitions-zoner (blå pixlar i masken)
    handleTransitionClick(x, y) {
        // Default: gör ingenting, bara logga
        console.log('Transition area clicked at', x, y);
    }


    getPixelColor(x, y) {
        // Delegate to MaskHelper (no canvas creation needed - it's cached!)
        return this.maskHelper.getPixelColor(x, y);
    }

    /**
     * Find nearest walkable (green) pixel around a target position
     * Searches in expanding circles until a walkable spot is found
     * @param {number} targetX - X position to search around
     * @param {number} targetY - Y position to search around
     * @param {number} maxRadius - Maximum search radius in pixels (default: 50)
     * @returns {{ x: number, y: number } | null} Walkable position or null if not found
     */
    findNearestWalkable(targetX, targetY, maxRadius = 50) {
        const step = 10;

        // Search in expanding circles
        for (let radius = step; radius <= maxRadius; radius += step) {
            // Calculate how many points to check at this radius
            const angleStep = (2 * Math.PI) / (radius / 3);

            for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
                const testX = Math.round(targetX + Math.cos(angle) * radius);
                const testY = Math.round(targetY + Math.sin(angle) * radius);

                const color = this.getPixelColor(testX, testY);
                if (color === 'green') {
                    return { x: testX, y: testY };
                }
            }
        }

        console.warn(`[GameScene] No walkable spot found within ${maxRadius}px of (${targetX}, ${targetY})`);
        return null;
    }


    createGridFromMask() {
        // Delegate to MaskHelper (no canvas creation needed - it's cached!)
        this.grid = this.maskHelper.createGrid(this.gridSize);
    }

    initializePathfinding() {
        // Initialize EasyStar
        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.grid);
        this.easystar.setAcceptableTiles([0]); // Only walkable tiles
        this.easystar.enableDiagonals(); // Allow diagonal movement
        this.easystar.enableCornerCutting(false); // Don't cut corners
    }

    worldToGrid(x, y) {
        // Convert world coordinates to grid coordinates
        return {
            col: Math.floor(x / this.gridSize),
            row: Math.floor(y / this.gridSize)
        };
    }

    gridToWorld(col, row) {
        // Convert grid coordinates to world coordinates (center of cell)
        return {
            x: col * this.gridSize + this.gridSize / 2,
            y: row * this.gridSize + this.gridSize / 2
        };
    }

    findPath(startX, startY, endX, endY) {
        // Convert world coordinates to grid coordinates
        const start = this.worldToGrid(startX, startY);
        const end = this.worldToGrid(endX, endY);

        // Find path using EasyStar
        this.easystar.findPath(start.col, start.row, end.col, end.row, (path) => {
            if (path === null) {
                // No path found - show red indicator
                this.showNoPathIndicator(endX, endY);
                this.path = null;
            } else {
                // Path found - convert grid coordinates back to world coordinates
                this.path = path.map(point => this.gridToWorld(point.x, point.y));
                this.currentWaypoint = 0;
                this.isMoving = true;
            }
        });

        // Calculate the path immediately
        this.easystar.calculate();
    }

    showNoPathIndicator(x, y) {
        // Remove previous indicator
        if (this.pathIndicator) {
            this.tweens.killTweensOf(this.pathIndicator);
            this.pathIndicator.destroy();
        }

        // Create red circle (larger!)
        this.pathIndicator = this.add.circle(x, y, 2, 0xff6b6b, 0.8);
        this.pathIndicator.setDepth(1000);

        // Expand + fade animation (like water ripple!)
        this.tweens.add({
            targets: this.pathIndicator,
            radius: 10,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.pathIndicator) {
                    this.pathIndicator.destroy();
                    this.pathIndicator = null;
                }
            }
        });
    }

    showValidClickIndicator(x, y) {
        // Remove previous indicator
        if (this.validClickIndicator) {
            this.tweens.killTweensOf(this.validClickIndicator);
            this.validClickIndicator.destroy();
        }

        // Create green circle
        this.validClickIndicator = this.add.circle(x, y, 2, 0x6bff6b, 0.8);  // Ljusgrön
        this.validClickIndicator.setDepth(1000);

        // Expand + fade animation
        this.tweens.add({
            targets: this.validClickIndicator,
            radius: 10,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.validClickIndicator) {
                    this.validClickIndicator.destroy();
                    this.validClickIndicator = null;
                }
            }
        });
    }

    showFeedbackBubble(message) {
        // Destroy previous bubble if exists
        if (this.feedbackBubble) {
            this.feedbackBubble.destroy();
        }

        // Create bubble FOLLOWING the player
        this.feedbackBubble = new SpeechBubble(
            this,
            this.player.x,     // Startposition – bubblan flyttar sig sen själv
            this.player.y,
            message,
            4000,              // Duration (vi ändrar i steg 3)
            this.player        // FollowTarget → bubblan följer spelaren
        );
    }



    update() {
        this.updatePlayerMovement();
        this.updateFollowerMovement();
        this.updateDepthSorting();
        this.updateFootsteps();
    }

    updatePlayerMovement() {
        // Handle player movement along path
        if (this.isMoving && this.path && this.currentWaypoint < this.path.length) {
            // Get current waypoint
            const waypoint = this.path[this.currentWaypoint];
            const dx = waypoint.x - this.player.x;
            const dy = waypoint.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if reached current waypoint
            if (distance < this.moveSpeed * 2) {
                // Move to next waypoint
                this.currentWaypoint++;

                // Check if path is complete
                if (this.currentWaypoint >= this.path.length) {
                    this.isMoving = false;
                    this.playerBobTime = 0; // Reset bob animation
                    this.path = null;
                }
            } else {
                // Flip sprite based on horizontal direction (accounting for initial flip)
                if (dx < 0) {
                    this.player.flipX = false;  // Moving left
                } else if (dx > 0) {
                    this.player.flipX = true; // Moving right
                }

                // Move towards waypoint at constant speed
                const angle = Math.atan2(dy, dx);
                this.player.x += Math.cos(angle) * this.moveSpeed;

                // Apply vertical bob animation (3 pixels up/down)
                this.playerBobTime += 0.15; // Controls bob speed
                const bobOffset = Math.sin(this.playerBobTime) * 3;
                this.playerBaseY += Math.sin(angle) * this.moveSpeed;
                this.player.y = this.playerBaseY + bobOffset;
            }
        }
    }

    updateFollowerMovement() {
        // Calculate direction from follower to player
        const dx = this.player.x - this.follower.x;
        const dy = this.player.y - this.follower.y;
        const angle = Math.atan2(dy, dx);

        // Calculate target follow position (50 pixels behind player)
        const targetX = this.player.x - Math.cos(angle) * 50;
        const targetY = this.player.y - Math.sin(angle) * 50;

        // Calculate distance to target follow position
        const distToTarget = Math.sqrt(
            (targetX - this.follower.x) ** 2 +
            (targetY - this.follower.y) ** 2
        );

        // Only move if distance to target is significant
        if (distToTarget > 5) {
            this.isFollowerMoving = true;

            // Lerp towards follow position (slower than player)
            const lerpFactor = 0.03;
            const newX = this.follower.x + (targetX - this.follower.x) * lerpFactor;
            const newY = this.follower.y + (targetY - this.follower.y) * lerpFactor;

            // Flip sprite based on movement direction (accounting for initial flip)
            const moveDx = newX - this.follower.x;
            if (moveDx < 0) {
                this.follower.flipX = false; // Moving left
            } else if (moveDx > 0) {
                this.follower.flipX = true; // Moving right
            }

            // Apply vertical bob animation only when moving
            this.followerBobTime += 0.15;
            const bobOffset = Math.sin(this.followerBobTime) * 3;
            this.followerBaseY += (newY - this.follower.y);
            this.follower.x = newX;
            this.follower.y = this.followerBaseY + bobOffset;
        } else {
            // Stop completely when close enough
            this.isFollowerMoving = false;
            this.followerBobTime = 0;
            this.follower.y = this.followerBaseY;
        }
    }

    updateDepthSorting() {
        // Depth sorting: higher Y = closer to camera = render on top
        this.player.setDepth(this.player.y);
        this.follower.setDepth(this.follower.y);
    }

    updateFootsteps() {
        const audioManager = this.registry.get('audioManager');
        if (!audioManager) return;

        const anyMoving = this.isMoving || this.isFollowerMoving;

        // Mittpunkt mellan player och follower
        const centerX = (this.player.x + this.follower.x) / 2;
        const centerY = (this.player.y + this.follower.y) / 2;

        if (!anyMoving) {
            // Ingen rör sig → nollställ fotstegstillstånd
            this.lastStepX = null;
            this.lastStepY = null;
            this.stepDistanceAccum = 0;
        } else {
            // Se till att vi har en startpunkt
            if (this.lastStepX == null || this.lastStepY == null) {
                this.lastStepX = centerX;
                this.lastStepY = centerY;
            }

            const dxCenter = centerX - this.lastStepX;
            const dyCenter = centerY - this.lastStepY;
            const frameDist = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

            this.stepDistanceAccum += frameDist;

            // Glesare, lugnare steg
            const STEP_DISTANCE = 24; // testa 24–28 vid behov

            if (this.stepDistanceAccum >= STEP_DISTANCE) {
                audioManager.playFootstep();
                this.stepDistanceAccum = 0;
            }

            this.lastStepX = centerX;
            this.lastStepY = centerY;
        }
    }

    /**
     * Start walk-in animation from edge of screen to current spawn point
     * Modular method that any scene can use for cinematic entrances
     * @param {object} edgePositions - { player: {x, y}, follower: {x, y}, wisp: {x, y} }
     * @param {object} options - Optional settings { wispDelay: 500, wispDuration: 1500 }
     */
    startWalkInAnimation(edgePositions, options = {}) {
        const { followerDelay = 200, wispDelay = 500 } = options;

        // Save final positions (already set by applySpawnPoint)
        const finalPositions = {
            player: { x: this.player.x, y: this.player.y },
            follower: { x: this.follower.x, y: this.follower.y },
            wisp: this.wisp ? { x: this.wisp.sprite.x, y: this.wisp.sprite.y } : null
        };

        // Calculate duration based on distance and normal walking speed
        const distance = Math.sqrt(
            Math.pow(finalPositions.player.x - edgePositions.player.x, 2) +
            Math.pow(finalPositions.player.y - edgePositions.player.y, 2)
        );
        const pixelsPerSecond = this.moveSpeed * 60; // moveSpeed is per frame, 60fps
        const playerDuration = (distance / pixelsPerSecond) * 1000; // Convert to ms

        // Kill any existing tweens to prevent conflicts (FIX: wisp moving back/forth)
        this.tweens.killTweensOf([this.player, this.follower]);
        if (this.wisp) this.tweens.killTweensOf(this.wisp.sprite);

        // Move sprites to edge positions (no walkable check needed for tweens!)
        this.player.x = edgePositions.player.x;
        this.player.y = edgePositions.player.y;
        this.playerBaseY = edgePositions.player.y;

        this.follower.x = edgePositions.follower.x;
        this.follower.y = edgePositions.follower.y;
        this.followerBaseY = edgePositions.follower.y;

        if (this.wisp && edgePositions.wisp) {
            this.wisp.sprite.x = edgePositions.wisp.x;
            this.wisp.sprite.y = edgePositions.wisp.y;
        }

        // Block input during animation
        this.dialogActive = true;

        // Click to skip - restart tweens at 2x speed for fast-forward effect
        const skipHandler = () => {
            // Kill current tweens
            this.tweens.killTweensOf([this.player, this.follower]);
            if (this.wisp) this.tweens.killTweensOf(this.wisp.sprite);

            // Remove this handler so it only triggers once
            this.input.off('pointerdown', skipHandler);

            // Calculate remaining distance and time for player (only X movement)
            const playerDistRemaining = Math.abs(finalPositions.player.x - this.player.x);
            const playerTimeRemaining = (playerDistRemaining / pixelsPerSecond) * 1000; // ms
            const playerFastDuration = playerTimeRemaining / 2; // 2x speed = half duration

            // Restart player tween at 2x speed
            this.tweens.add({
                targets: this.player,
                x: finalPositions.player.x,
                duration: playerFastDuration,
                ease: 'Linear'
            });

            // Calculate remaining distance and time for follower (only X movement)
            const followerDistRemaining = Math.abs(finalPositions.follower.x - this.follower.x);
            const followerTimeRemaining = (followerDistRemaining / pixelsPerSecond) * 1000;
            const followerFastDuration = followerTimeRemaining / 2;

            // Restart follower tween at 2x speed
            this.tweens.add({
                targets: this.follower,
                x: finalPositions.follower.x,
                duration: followerFastDuration,
                ease: 'Linear'
            });

            // Handle wisp if present
            if (this.wisp && finalPositions.wisp) {
                const wispDistRemaining = Math.sqrt(
                    Math.pow(finalPositions.wisp.x - this.wisp.sprite.x, 2) +
                    Math.pow(finalPositions.wisp.y - this.wisp.sprite.y, 2)
                );
                const wispTimeRemaining = (wispDistRemaining / pixelsPerSecond) * 1000;
                const wispFastDuration = wispTimeRemaining / 2;

                this.tweens.add({
                    targets: this.wisp.sprite,
                    x: finalPositions.wisp.x,
                    y: finalPositions.wisp.y,
                    duration: wispFastDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.dialogActive = false;
                    }
                });
            } else {
                // No wisp - unlock after longest tween completes
                const maxDuration = Math.max(playerFastDuration, followerFastDuration);
                this.time.delayedCall(maxDuration, () => {
                    this.dialogActive = false;
                });
            }
        };

        this.input.once('pointerdown', skipHandler);

        // Tween player first
        this.tweens.add({
            targets: this.player,
            x: finalPositions.player.x,
            duration: playerDuration,
            ease: 'Linear'
        });

        // Tween follower after delay
        this.time.delayedCall(followerDelay, () => {
            this.tweens.add({
                targets: this.follower,
                x: finalPositions.follower.x,
                duration: playerDuration,
                ease: 'Linear'
            });
        });

        // Tween wisp last
        if (this.wisp && finalPositions.wisp) {
            this.time.delayedCall(wispDelay, () => {
                this.tweens.add({
                    targets: this.wisp.sprite,
                    x: finalPositions.wisp.x,
                    y: finalPositions.wisp.y,
                    duration: playerDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.input.off('pointerdown', skipHandler);
                        this.dialogActive = false;
                    }
                });
            });
        } else {
            // No wisp - unlock after player animation
            this.time.delayedCall(playerDuration + followerDelay, () => {
                this.input.off('pointerdown', skipHandler);
                this.dialogActive = false;
            });
        }
    }

    /**
     * Lock input for a specific reason (e.g., dialog, conversation, transition)
     * Multiple locks can be active simultaneously - input is only unlocked when all are released
     * @param {string} reason - Identifier for the lock source (e.g., 'dialog-overlay', 'conversation')
     */
    lockInput(reason) {
        this.inputLocks.add(reason);
        this.dialogActive = true;
    }

    /**
     * Unlock input for a specific reason
     * Input is only fully unlocked when all lock sources have been removed
     * @param {string} reason - Identifier for the lock source to remove
     */
    unlockInput(reason) {
        this.inputLocks.delete(reason);

        // Only unlock dialogActive if there are no remaining locks
        if (this.inputLocks.size === 0) {
            this.dialogActive = false;
        }
    }

    /**
     * Check if input is currently locked
     * @returns {boolean} True if any input locks are active
     */
    isInputLocked() {
        return this.dialogActive || this.inputLocks.size > 0;
    }

    /**
     * Emergency unlock - clears all input locks (use with caution)
     * Useful for debugging or error recovery
     */
    clearAllInputLocks() {
        this.inputLocks.clear();
        this.dialogActive = false;
        console.warn('[GameScene] All input locks forcibly cleared');
    }

    shutdown() {
        // Clean up input listeners
        // Note: Phaser automatically removes listeners, but we clean up references
        this.input.off('pointerdown');

        // Kill any active tweens
        if (this.pathIndicator) {
            this.tweens.killTweensOf(this.pathIndicator);
            this.pathIndicator.destroy();
            this.pathIndicator = null;
        }

        if (this.validClickIndicator) {
            this.tweens.killTweensOf(this.validClickIndicator);
            this.validClickIndicator.destroy();
            this.validClickIndicator = null;
        }

        // Destroy feedback bubble
        if (this.feedbackBubble) {
            this.feedbackBubble.destroy();
            this.feedbackBubble = null;
        }

        // Clean up fullscreen button
        if (this.fullscreenButton) {
            this.fullscreenButton.destroy();
            this.fullscreenButton = null;
        }

        // Clean up MaskHelper
        if (this.maskHelper) {
            this.maskHelper.destroy();
            this.maskHelper = null;
        }

        // Clear pathfinding references
        this.path = null;
        this.easystar = null;
        this.grid = null;

        // Reset dialog state and clear all input locks
        this.inputLocks.clear();
        this.dialogActive = false;
    }
}


export default GameScene;

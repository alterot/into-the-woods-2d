// ===== SCENE 1: MEADOW =====
// First gameplay scene - meadow clearing with wisp
import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';
import DialogOverlay from '../systems/DialogOverlay.js';
import SpeechBubble from '../entities/SpeechBubble.js'; 

class Scene1_Meadow extends GameScene {
    constructor() {
        // Call parent constructor with scene-specific keys
        super('Scene1_Meadow', 'background', 'mask');

        // Dialog state
        this.dialogActive = false;
        this.runestoneOverlay = null;
        this.runestonePosition = null;
        
        // Hover / glitter över runstenen
        this.isPointerOverRunestone = false;
        this.lastHoverSparkTime = 0;
        this.lastHoverX = null;
        this.lastHoverY = null;

        //Whisp dialog check
        this.wispConversationActive = false;
        this.wispIntroBubble = null;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false; // Track if they've started walking to wisp
        this.wispFollowerBubble = null;
        this.currentConversationBubble = null; // Track current bubble for scene-wide clicks 
    }

    createSceneContent() {
        // Add scene-specific content (wisp, interactive objects, etc.)

        // Create wisp at specified position
        this.wisp = new Wisp(this, 1075, 500);
        this.wisp.onClick(() => {
            this.handleWispClick();
        });

        // Hover-effekt över runstenen
        this.setupRunestoneHoverHighlight();

        // Scene-wide click handler for conversation bubbles
        this.input.on('pointerdown', (pointer) => {
            // During wisp conversation, block all movement clicks
            if (this.wispConversationActive) {
                // If there's a current bubble, advance it
                if (this.currentConversationBubble) {
                    this.currentConversationBubble.handleClick();
                }
                // Always block the click from reaching game world during conversation
                return; // Don't process this click for movement
            }
        });
    }

    handleWispClick() {
        // Blockera om annat dialogläge är aktivt
        if (this.dialogActive || this.wispConversationActive) {
            return;
        }

        this.dialogActive = true;
        this.wispConversationActive = true;
        this.wispArrivalHandled = false;
        this.wispWalkStarted = false; // Reset - they haven't started walking yet  

        // Hitta en gångbar punkt nära wispen (grönt i masken)
        let target = null;
        if (this.wisp && this.wisp.sprite) {
            target = this.findNearestWalkable(this.wisp.sprite.x, this.wisp.sprite.y, 80);
        }

        if (target) {
            // Starta pathfinding mot platsen vid wispen
            this.findPath(this.player.x, this.player.y, target.x, target.y);
        } else {
            console.warn('[Scene1_Meadow] Hittade ingen gångbar punkt nära wispen');
        }

        // Städa ev. tidigare bubbla
        if (this.wispIntroBubble) {
            this.wispIntroBubble.destroy();
            this.wispIntroBubble = null;
        }

        // Skapa bubbla på playern som följer med när de går
        console.log('🟢 Creating BUBBLE #1 on player at', this.player.x, this.player.y);
        this.wispIntroBubble = new SpeechBubble(
            this,
            this.player.x,
            this.player.y,
            'Vad är detta? Verkar som att den vill säga något.',
            null,          // null = ingen auto-destroy, styrs av klick
            this.player    // followTarget → behåller samma placeringslogik + svans mot player
        );
        console.log('✅ BUBBLE #1 created:', !!this.wispIntroBubble);
        // DON'T set currentConversationBubble yet - only after they arrive
        // This prevents accidental clicks while walking from destroying bubble #1
    }

    findNearestWalkable(targetX, targetY, maxRadius = 150) {
        // Try increasingly larger radiuses
        for (let radius = 5; radius <= maxRadius; radius += 5) {
            // Check 8 directions around target
            const angles = [0, 45, 90, 135, 180, 225, 270, 315];

            for (let angle of angles) {
                const rad = angle * Math.PI / 180;
                const x = Math.round(targetX + Math.cos(rad) * radius);
                const y = Math.round(targetY + Math.sin(rad) * radius);

                if (this.getPixelColor(x, y) === 'green') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    handleInteractiveClick(x, y) {
        // Ignore clicks if dialog is already active
        if (this.dialogActive) {
            return;
        }

        // Save runestone position for facing direction
        this.runestonePosition = { x, y };

        // Get runestone dialogue data
        const runeData = this.cache.json.get('runeDialogue');
        const dialogData = runeData.conversations[0].lines;

        // Find nearest walkable spot around the runestone (red pixels are not walkable)
        const walkableSpot = this.findNearestWalkable(x, y, 50);
        if (walkableSpot) {
            // Start pathfinding to nearest walkable spot
            this.findPath(this.player.x, this.player.y, walkableSpot.x, walkableSpot.y);
        } else {
            console.warn('No walkable spot found near runestone');
        }

        // Immediately start dialog overlay
        this.dialogActive = true;
        this.runestoneOverlay = new DialogOverlay(this, {
            dialogueData: dialogData,
            spritesVisible: true,     // Keep scene visible
            backgroundDim: 0.6,       // Dark overlay at 60% opacity
            onComplete: () => {
                this.dialogActive = false;
                this.runestoneOverlay = null;
                this.runestonePosition = null;
                // TODO: Mark runestone as read
            }
        });
        this.runestoneOverlay.start();
    }

    setupRunestoneHoverHighlight() {
        this.input.on('pointermove', (pointer) => {
            // Ingen effekt när dialogen är aktiv
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

                // Finns en tidigare punkt att dra spår från?
                if (this.lastHoverX !== null && this.lastHoverY !== null) {
                    const dx = pointer.x - this.lastHoverX;
                    const dy = pointer.y - this.lastHoverY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Hur många "steg" längs linjen? (max 4)
                    const steps = Math.min(4, Math.max(1, Math.floor(dist / 12)));

                    // Lite throttling så vi inte går bananas
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

                // Uppdatera "förra" positionen
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
    const sparkCount = 2; // få, men tydliga glittror

    for (let i = 0; i < sparkCount; i++) {
        // Liten random offset runt spåret
        const offsetX = Phaser.Math.Between(-4, 4);
        const offsetY = Phaser.Math.Between(-4, 4);

        const radius = Phaser.Math.Between(1, 2); // riktigt små
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

        // Viktigt för glitter: ADD-blend gör att de "lyser"
        spark.setBlendMode(Phaser.BlendModes.ADD);

        // Liten, snabb blink → twinkle
        this.tweens.add({
            targets: spark,
            alpha: { from: startAlpha, to: 0 },
            // lite längre liv = tydligare spår, men inte dimma
            duration: Phaser.Math.Between(220, 360),
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (spark && spark.destroy) {
                    spark.destroy();
                }
            }
        });
    }

    // Ibland en extra "flash" för extra glitter
    if (Phaser.Math.Between(0, 5) === 0) { // ~16% chans
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
    // Låt GameScene sköta pathfinding och följlogik
    super.update();

    // RUNSTEN – vänd systrarna mot stenen när dialog pågår
    if (this.dialogActive && this.runestonePosition) {
        const playerStopped = !this.isMoving;
        const followerStopped = !this.isFollowerMoving;

        // Player vänder sig direkt när hen är framme
        if (playerStopped && this.player) {
            const playerLeftOfStone = this.player.x < this.runestonePosition.x;

            // Är spelaren till vänster om stenen? → titta åt höger (flipX = true)
            if (playerLeftOfStone) {
                this.player.setFlipX(true);
            } else {
                this.player.setFlipX(false);
            }
        }

        // Follower vänder sig när hen är framme
        if (followerStopped && this.follower) {
            const followerLeftOfStone = this.follower.x < this.runestonePosition.x;

            if (followerLeftOfStone) {
                this.follower.setFlipX(true);
            } else {
                this.follower.setFlipX(false);
            }
        }
    }

    // WISP-KONVERSATION – när båda har stannat, byt bubbla
    if (this.wispConversationActive && !this.wispArrivalHandled) {
        // Track when they start walking
        if (!this.wispWalkStarted && (this.isMoving || this.isFollowerMoving)) {
            console.log('🚶 Characters started walking to wisp');
            this.wispWalkStarted = true;
        }

        const playerStopped = !this.isMoving;
        const followerStopped = !this.isFollowerMoving;

        // Only check for arrival AFTER they've started walking
        if (this.wispWalkStarted && playerStopped && followerStopped) {
            console.log('🛑 Both characters arrived! Switching from bubble #1 to bubble #2');
            this.wispArrivalHandled = true;

            // 1) Stäng första bubblan (på playern)
            if (this.wispIntroBubble) {
                console.log('🗑️ Destroying BUBBLE #1');
                this.wispIntroBubble.destroy();
                this.wispIntroBubble = null;
            }

            // 2) Skapa systerns bubbla vid follower (Bubble #2)
            console.log('🟢 Creating BUBBLE #2 on follower');
            this.wispFollowerBubble = new SpeechBubble(
                this,
                this.follower.x,
                this.follower.y,
                'Vad vill den tror du?',
                null,           // ingen auto-timeout
                this.follower   // followTarget → följer systern + svans rätt
            );
            this.currentConversationBubble = this.wispFollowerBubble; // Track for scene-wide clicks

            // Chain to bubble #3 - INLINE
            this.wispFollowerBubble.onClick(() => {
                console.log('🔥 BUBBLE 2 CLICKED - Creating bubble 3');

                // Create bubble #3 on player
                const bubble3 = new SpeechBubble(
                    this,
                    this.player.x,
                    this.player.y,
                    'Jag tror den vill att vi följer efter den.',
                    null,
                    this.player
                );
                this.currentConversationBubble = bubble3; // Track for scene-wide clicks

                // Chain to bubble #4
                bubble3.onClick(() => {
                    // Create bubble #4 on follower
                    const bubble4 = new SpeechBubble(
                        this,
                        this.follower.x,
                        this.follower.y,
                        'Vågar vi det?',
                        null,
                        this.follower
                    );
                    this.currentConversationBubble = bubble4; // Track for scene-wide clicks

                    // Chain to bubble #5 with YES/NO choice
                    bubble4.onClick(() => {
                        console.log('🎯 Creating choice bubble with YES/NO options');

                        // Single bubble with two choices
                        const choiceBubble = new SpeechBubble(
                            this,
                            this.player.x,
                            this.player.y,
                            'Vad ska vi göra?',
                            null,
                            this.player,
                            [
                                {
                                    text: 'Följa efter wispen',
                                    callback: () => {
                                        console.log('✅ YES chosen - Transitioning to Scene2_Crossroads');
                                        this.currentConversationBubble = null;
                                        this.cameras.main.fadeOut(500, 0, 0, 0);
                                        this.time.delayedCall(500, () => {
                                            this.scene.start('Scene2_Crossroads', { entry: 'from_meadow' });
                                        });
                                    }
                                },
                                {
                                    text: 'Stanna här',
                                    callback: () => {
                                        console.log('❌ NO chosen - Closing conversation');
                                        choiceBubble.destroy(); // Close the bubble first

                                        // Reset flags AFTER current click finishes (next frame)
                                        this.time.delayedCall(10, () => {
                                            this.dialogActive = false;
                                            this.wispConversationActive = false;
                                            this.currentConversationBubble = null;
                                        });
                                    }
                                }
                            ]
                        );

                        // Don't set as currentConversationBubble - choices handle their own clicks
                        this.currentConversationBubble = null;
                    });
                });
            });
        }
    }
}
}


export default Scene1_Meadow;

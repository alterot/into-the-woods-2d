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
    }

    handleWispClick() {
        // Blockera om annat dialogläge är aktivt
        if (this.dialogActive || this.wispConversationActive) {
            return;
        }

        this.wispConversationActive = true;

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
        this.wispIntroBubble = new SpeechBubble(
            this,
            this.player.x,
            this.player.y,
            'Vad är detta? Verkar som att den vill säga något.',
            null,          // null = ingen auto-destroy, styrs av klick
            this.player    // followTarget → behåller samma placeringslogik + svans mot player
        );
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
    }

}

export default Scene1_Meadow;

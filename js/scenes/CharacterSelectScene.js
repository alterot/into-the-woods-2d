// ===== CHARACTER SELECT SCENE =====
import Wisp from '../entities/Wisp.js';
import AudioManager from '../AudioManager.js';

class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    create() {
        const { width, height } = this.scale;
        
        // Initialize AudioManager
        const audioManager = new AudioManager(this);
        audioManager.init(this);

        // Start music ONLY after user gesture
        this.input.once('pointerdown', () => {
            audioManager.startMusic();
        });

        // Store in registry for other scenes
        this.registry.set('audioManager', audioManager);


        // --- Bakgrundsbild ---
        const bg = this.add.image(width / 2, height / 2, 'scen0-menu');
        bg.setOrigin(0.5);
        const scale = Math.max(
            width / bg.width,
            height / bg.height
        );

        bg.setScale(scale);
        bg.setPosition(width / 2, height / 2);

        // Mörk overlay för att text/knappar ska poppa
        const overlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x06130a,
            0.45
        );

        // --- Titel + undertitel ---
        const titleText = this.add.text(width / 2, height * 0.22, 'Vem spelar?', {
            fontSize: '52px',
            fontFamily: 'Georgia',
            color: '#e9c08b'
        }).setOrigin(0.5);

        const subtitle = this.add.text(
            width / 2,
            height * 0.29,
            'Välj vilken syster som leder vägen genom skogen.',
            {
                fontSize: '20px',
                fontFamily: 'Georgia',
                color: '#cfa56f'
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: [titleText, subtitle],
            alpha: { from: 0, to: 1 },
            duration: 800,
            ease: 'Quad.Out'
        });

        const menuWisp = new Wisp(
            this,
            width - 120,     // nära högerkanten
            height - 120     // nära botten
        );


        menuWisp.onClick(() => {
            // Play menu select sound
            const audioManager = this.registry.get('audioManager');
            if (audioManager) {
                audioManager.playMenuSelect();
            }

            // liten "pop"-animation
            this.tweens.add({
                targets: menuWisp.sprite,
                scaleX: 0.14,
                scaleY: 0.14,
                yoyo: true,
                duration: 120,
                ease: 'Quad.Out'
            });
        });


        // --- Gemensam knapp-fabrik (träskylt) ---
        const makeWoodButton = (y, label, onClick) => {
            const container = this.add.container(width / 2, y);

            const base = this.add.image(0, 0, 'scen0-menu-button');
            // Skala ner knappen till rimlig meny-storlek
            base.setDisplaySize(320, 96);
            base.setAlpha(0.9);

            const txt = this.add.text(0, 0, label, {
                fontSize: '26px',
                fontFamily: 'Georgia',
                color: '#ffffff'
            }).setOrigin(0.5);

            container.add([base, txt]);
            container.setSize(320, 96);
            container.setInteractive({ useHandCursor: true });

            // Hover: lite större + ljusare
            container.on('pointerover', () => {
                this.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 130,
                    ease: 'Quad.Out'
                });
                this.tweens.add({
                    targets: base,
                    alpha: 1,
                    duration: 130,
                    ease: 'Quad.Out'
                });
            });

            container.on('pointerout', () => {
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 130,
                    ease: 'Quad.Out'
                });
                this.tweens.add({
                    targets: base,
                    alpha: 0.9,
                    duration: 130,
                    ease: 'Quad.Out'
                });
            });

        container.on('pointerdown', () => {

            // liten press-animation
            this.tweens.add({
                targets: container,
                scaleX: 0.97,
                scaleY: 0.97,
                yoyo: true,
                duration: 90,
                ease: 'Quad.Out'
            });

            // Play menu select sound via AudioManager
            const audioManager = this.registry.get('audioManager');
            if (audioManager) {
                audioManager.playMenuSelect();
            }

            // fade + start scen
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, onClick);
        });


            return container;
        };

        // --- Skapa knapparna ---
        const bigBtn = makeWoodButton(height / 2 - 40, 'Storasyster', () => {
            window.gameState = { selectedCharacter: 'big' };
            this.scene.start('IntroScene');
        });

        const littleBtn = makeWoodButton(height / 2 + 80, 'Lillasyster', () => {
            window.gameState = { selectedCharacter: 'little' };
            this.scene.start('IntroScene');
        });

        // --- Fade in hela scenen ---
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }
}

export default CharacterSelectScene;

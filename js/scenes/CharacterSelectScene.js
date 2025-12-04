// ===== CHARACTER SELECT SCENE =====
class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    create() {
        // Background color - forest green
        this.cameras.main.setBackgroundColor('#2a3d2a');

        // Title text
        const titleText = this.add.text(512, 200, 'Choose Your Character', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#D4A574',
            fontStyle: 'bold'
        });
        titleText.setOrigin(0.5);

        // Button style constants
        const buttonWidth = 300;
        const buttonHeight = 80;
        const buttonColor = 0x8B6F47;
        const buttonHoverColor = 0xA58A68;

        // Big Sister Button
        const bigSisterBtn = this.add.rectangle(512, 400, buttonWidth, buttonHeight, buttonColor);
        bigSisterBtn.setInteractive({ useHandCursor: true });
        const bigSisterText = this.add.text(512, 400, 'Play as Big Sister', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        bigSisterText.setOrigin(0.5);

        // Little Sister Button
        const littleSisterBtn = this.add.rectangle(512, 520, buttonWidth, buttonHeight, buttonColor);
        littleSisterBtn.setInteractive({ useHandCursor: true });
        const littleSisterText = this.add.text(512, 520, 'Play as Little Sister', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        littleSisterText.setOrigin(0.5);

        // Hover effects for Big Sister button
        bigSisterBtn.on('pointerover', () => {
            bigSisterBtn.setFillStyle(buttonHoverColor);
        });
        bigSisterBtn.on('pointerout', () => {
            bigSisterBtn.setFillStyle(buttonColor);
        });

        // Hover effects for Little Sister button
        littleSisterBtn.on('pointerover', () => {
            littleSisterBtn.setFillStyle(buttonHoverColor);
        });
        littleSisterBtn.on('pointerout', () => {
            littleSisterBtn.setFillStyle(buttonColor);
        });

        // Click handlers
        bigSisterBtn.on('pointerdown', () => {
            window.gameState = { selectedCharacter: 'big' };
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => {
                this.scene.start('IntroScene');
            });
        });

        littleSisterBtn.on('pointerdown', () => {
            window.gameState = { selectedCharacter: 'little' };
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => {
                this.scene.start('IntroScene');
            });
        });
    }
}

export default CharacterSelectScene;

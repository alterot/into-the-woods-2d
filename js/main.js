// ===== MAIN ENTRY POINT =====
// Import all scenes
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import IntroScene from './scenes/IntroScene.js';
import Scene1_Meadow from './scenes/Scene1_Meadow.js';

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 1024,
    render: {
        pixelArt: true
    },
    parent: document.body,
    backgroundColor: '#000000',
    scene: [CharacterSelectScene, IntroScene, Scene1_Meadow],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Initialize the game
const game = new Phaser.Game(config);

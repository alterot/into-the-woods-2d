// ===== MAIN ENTRY POINT =====
// Import all scenes
import LoadingScene from './scenes/LoadingScene.js';
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import IntroScene from './scenes/IntroScene.js';
import Scene1_Meadow from './scenes/Scene1_Meadow.js';
import Scene2_Crossroads from './scenes/Scene2_Crossroads.js';


// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    render: {
        pixelArt: true
    },
    parent: document.body,
    backgroundColor: '#000000',
    scene: [LoadingScene, CharacterSelectScene, IntroScene, Scene1_Meadow, Scene2_Crossroads],
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

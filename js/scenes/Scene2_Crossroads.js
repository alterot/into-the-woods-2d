// ===== SCENE 2: CROSSROADS =====
// Second gameplay scene – skogskorsning med samma baslogik som ängsscenen

import GameScene from './GameScene.js';
import Wisp from '../entities/Wisp.js';

class Scene2_Crossroads extends GameScene {
    constructor() {
        // Använd egna nycklar för bakgrund & mask
        super('Scene2_Crossroads', 'background2', 'mask2');

        this.dialogActive = false;
    }

    /**
     * Returnerar spawn point för systrarna beroende på varifrån vi kom.
     * x,y är "mitten" mellan systrarna – GameScene flyttar dem åt sidan.
     */
    getSpawnPoint(entryTag) {
        const { width, height } = this.scale;
        const bottomY = height * 0.8;

        const center = { x: width * 0.5, y: bottomY };

        const spawns = {
            from_meadow: center, // när vi kommer från scen 1
            default: center      // fallback om inget entryTag skickas
        };

        return spawns[entryTag] || spawns.default;
    }

    // Här lägger vi scen-specifika saker
    createSceneContent() {
        // Hämta spawnpoint (samma som för systrarna)
        const spawn = this.getSpawnPoint(this.entryTag || 'default');

        // Placera wisp lite ovanför/åt höger om systrarna
        const wispX = spawn.x + 80;
        const wispY = spawn.y - 70;

        this.wisp = new Wisp(this, wispX, wispY);

        this.wisp.onClick(() => {
            console.log("Wisp clicked i Scene2_Crossroads");
            // Här kan du lägga dialog senare
        });

        // Egen text för blockerat område i denna scen
        this.feedbackMessages.cannotWalk = "Skogen är för djup här också, vi måste hitta en annan väg.";
    }

    // Röda pixlar i masken (interaktiva saker) – för nu bara en neutral respons
    handleInteractiveClick(x, y) {
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("Vi vågar inte gå ner än, Max verkar inte klar med detta område…");
    }
}

export default Scene2_Crossroads;

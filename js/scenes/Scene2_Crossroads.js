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

    // Här lägger vi scen-specifika saker
    createSceneContent() {
        // Wisp på en ny position i bilden (justera efter hur din bakgrund ser ut)
        this.wisp = new Wisp(this, 900, 320);

        this.wisp.onClick(() => {
            console.log('Wisp clicked in Scene2_Crossroads – här kan du lägga dialog senare.');
            // TODO: ersätt med riktig dialog / hint / nästa transition
        });

        // Du kan ändra standardtexten för "kan inte gå dit" om du vill
        this.feedbackMessages.cannotWalk = "Den stigen känns för trång… vi får prova en annan.";
    }

    // Röda pixlar i masken (interaktiva saker) – för nu bara en neutral respons
    handleInteractiveClick(x, y) {
        // Om du inte har något interaktivt objekt här ännu:
        this.showNoPathIndicator(x, y);
        this.showFeedbackBubble("Här händer inget än, men något känns viktigt här…");
    }
}

export default Scene2_Crossroads;

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Into the Woods** is a 2D point-and-click narrative adventure game for children ages 5-8. Built with Phaser 3, it features two sisters exploring a Nordic forest, collecting emotional "Memory Fragments" through puzzles and interactions.

**Target Audience:** Children 5-8 years
**Art Style:** Breath of the Wild / Ghibli-inspired painted backgrounds
**Tech Stack:** Phaser 3.80.1, EasyStar.js pathfinding, ES6 modules

## Running the Project

The game requires a local web server (Phaser needs server environment for asset loading):

```bash
# Using http-server (recommended)
npx http-server .

# Or Python
python3 -m http.server

# Or VS Code Live Server extension
```

Then open `http://localhost:8080` (or whichever port the server uses).

### Debug Mode (Skip to Specific Scene)

Use URL parameters to jump directly to any scene:

```
http://localhost:8080/?scene=Scene1_Meadow
http://localhost:8080/?scene=Scene2_Crossroads
http://localhost:8080/?scene=Scene3_Tomb&puzzleCompleted=true
```

This initializes AudioManager and sets default character selection automatically.

## Core Architecture

### GameScene Base Class (`js/scenes/GameScene.js`)

All gameplay scenes extend `GameScene`, which provides:

**Movement & Pathfinding:**
- A* pathfinding via EasyStar.js with grid-based navigation
- Player movement with bob animation and sprite flipping
- Follower AI (non-player sister stays 50px behind)
- Depth sorting by Y-coordinate (higher Y = closer to camera)
- Footstep audio synced to movement distance

**Mask-Based Click Detection:**
Each scene uses TWO images:
- `background.png` - Visual content (1280x720)
- `mask.png` - Color-coded interaction logic (1280x720)

Mask color codes:
- **Green (0,255,0)**: Walkable areas → triggers pathfinding
- **Red (255,0,0)**: Interactive objects → calls `handleInteractiveClick(x, y)`
- **Blue (0,0,255)**: Scene transitions → calls `handleTransitionClick(x, y)`
- **Black (0,0,0)**: No-click zones → no action
- **Other colors**: Blocked areas → shows "cannot walk" feedback

**CRITICAL:** Mask images must use exact RGB values with NO anti-aliasing, saved as PNG-24.

**Required Overrides:**
```javascript
createSceneContent()           // Add entities, dialogs, puzzles
getSpawnPoint(entryTag)       // Return {x, y} based on entry direction
handleInteractiveClick(x, y)  // Handle red mask clicks
handleTransitionClick(x, y)   // Handle blue mask clicks
```

### Scene Lifecycle & Event Handler Cleanup

**CRITICAL BUG FIX:** Scenes are reused when players revisit them. Event handlers MUST be removed in `init()` to prevent duplicates:

```javascript
init(data) {
    super.init(data);

    // ⚠️ CRITICAL: Remove old handlers to prevent click duplication
    this.input.off('pointerdown');
    this.input.off('pointermove');

    // Reset dialog state (scene might be reused)
    this.dialogActive = false;
}
```

**Signs you need this:**
- Clicks trigger multiple times
- Conversations lock up when returning to scenes
- Console shows duplicate event logs

### State Management (`js/systems/SceneStateManager.js`)

**IMPORTANT:** Use `SceneStateManager` for ALL state. Never use `window.gameState` directly.

```javascript
// Global state (character selection, settings)
SceneStateManager.setGlobal('selectedCharacter', 'big');
const char = SceneStateManager.getGlobal('selectedCharacter', 'big');

// Scene-specific state (puzzles, flags)
SceneStateManager.setScene('Scene3_Tomb', 'puzzleCompleted', true);
const completed = SceneStateManager.getScene('Scene3_Tomb', 'puzzleCompleted', false);

// Persistence (optional)
SceneStateManager.enablePersistence('my-game-save', true);
SceneStateManager.save();
SceneStateManager.load();
```

## Reusable Systems

### Brazier Entity (`js/entities/Brazier.js`)

For fires, torches, braziers, magical lights:

```javascript
// Single brazier
const torch = new Brazier(this, {
    id: 'entrance-torch',
    x: 400,
    y: 300,
    color: 'yellow',  // yellow, green, blue, purple
    angle: 0,
    initialState: 0   // 0=base, 1=activated, 2=completed
});

torch.activate();
torch.changeColor('purple');

// Multiple braziers from preset
this.braziers = Brazier.fromPreset(this, 'tomb-braziers', {
    colors: ['yellow', 'green', 'blue'],
    initialState: 0
});
```

### PuzzleManager (`js/systems/PuzzleManager.js`)

For sequence-based puzzles (colors, symbols, buttons):

```javascript
this.puzzle = new PuzzleManager(this, {
    sequence: ['green', 'blue', 'yellow'],
    resetOnWrong: false,

    onCorrectStep: (step, value) => {
        // Activate the item visually
    },

    onWrongStep: (expected, attempted) => {
        // Show error feedback
    },

    onReset: () => {
        // Reset visuals to initial state
    },

    onComplete: () => {
        // Puzzle solved - trigger reward
    }
});

// When player clicks an item
const result = this.puzzle.attempt(item.color);
```

### Dialog Systems

**DialogOverlay** (`js/systems/DialogOverlay.js`) - Full-screen portrait dialogues:
```javascript
const overlay = new DialogOverlay(this, {
    dialogueData: this.cache.json.get('runeDialogue').conversations[0].lines,
    spritesVisible: true,
    backgroundDim: 0.6,

    // Character positioning
    roleSideMap: {
        narrator: 'narrator',
        player: 'left',
        sister: 'left',
        npc: 'right'
    },

    rolePortraitMap: {
        player: SceneStateManager.getGlobal('selectedCharacter') === 'big' ? 'portrait1' : 'portrait2',
        sister: SceneStateManager.getGlobal('selectedCharacter') === 'big' ? 'portrait2' : 'portrait1',
        npc: 'npc-portrait'
    },

    onComplete: () => {
        this.dialogActive = false;
    }
});
overlay.start();
```

**ConversationManager** (`js/systems/ConversationManager.js`) - Speech bubbles with choices:
```javascript
this.conversation = new ConversationManager(this, [
    {
        speaker: 'player',
        text: 'Hello there!',
        followTarget: this.player
    },
    {
        speaker: 'follower',
        text: 'Should we trust them?',
        followTarget: this.follower,
        choices: [
            { text: 'Yes, let\'s talk', action: 'talk' },
            { text: 'No, let\'s leave', action: 'leave' }
        ]
    }
]);

this.conversation.start(() => {
    const choice = this.conversation.getChoice();
    // Handle choice
});
```

**SpeechBubble** (`js/entities/SpeechBubble.js`) - Individual bubbles:
```javascript
this.bubble = new SpeechBubble(
    this,
    this.player.x,
    this.player.y,
    'Vad är det som lyser där borta?',
    4000,              // duration (null = infinite)
    this.player        // followTarget
);
```

## Walk-In Animations

For cinematic scene entrances from off-screen:

```javascript
// In createSceneContent(), check entry tag
if (this.entryTag === 'from_meadow') {
    this.startWalkInAnimation({
        player:   { x: -50, y: 550 },   // Off-screen left
        follower: { x: -100, y: 550 },  // Further left
        wisp:     { x: -20, y: 510 }    // Slightly above
    });
}
```

**Speed:** Controlled by `this.moveSpeed` in GameScene (currently 1.6 px/frame)
- Walk-in uses same speed as normal walking
- Click-to-skip plays at 2x speed (not instant teleport)

## Adding New Scenes

Full guide in `docs/GUIDE_NEW_SCENES.md`. Quick checklist:

1. Create background image (1280x720 PNG)
2. Create mask image (1280x720 PNG, exact RGB colors, no anti-aliasing)
3. Create scene class extending GameScene
4. Implement `createSceneContent()`, `getSpawnPoint()`, interaction handlers
5. Add `this.input.off('pointerdown')` in `init()` to prevent duplicates
6. Load assets in `LoadingScene.js`
7. Register scene in `js/main.js`
8. Use SceneStateManager for state persistence

**Best reference:** `js/scenes/Scene3_Tomb.js` - complete example with braziers, puzzles, state management

## Audio System (`js/systems/AudioManager.js`)

Centralized audio handling via singleton:

```javascript
const audioManager = this.registry.get('audioManager');

// Background music
audioManager.startMusic();
audioManager.switchMusic('tomb-ambient');

// Sound effects
audioManager.playClick();
audioManager.playFootstep();
```

**CRITICAL:** Audio files must be in cache before use. AudioManager now has safety checks:
- Returns early with warnings if audio not loaded
- Prevents "missing from cache" crashes

## Scene Transitions

Standard pattern:

```javascript
handleTransitionClick(x, y) {
    // Save state before leaving
    SceneStateManager.setScene(this.sceneKey, 'lastVisit', Date.now());

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    // Transition with entry tag
    this.time.delayedCall(500, () => {
        this.scene.start('Scene3_Tomb', { entry: 'from_crossroads' });
    });
}
```

## Sprite Sizing Reference

To change sprite sizes (centralized locations):
- **Portraits:** DialogOverlay.js line 16
- **Sister sprites:** GameScene.js lines 169, 172, 182, 185
- **Morte:** Scene3_Tomb.js lines 178, 353
- **Wisp:** Stays at 0.1 (do not change)

## Common Pitfalls

1. **Click duplication:** Always `this.input.off('pointerdown')` in `init()`
2. **State not persisting:** Use SceneStateManager, not window.gameState
3. **Mask not working:** Exact RGB values, PNG-24, no anti-aliasing
4. **Audio crashes:** Files must be loaded and decoded before use (AudioManager has safety checks)
5. **Wisp covering issue:** Use `findNearestWalkable(x, y, maxRadius, minRadius)` to maintain minimum distance

## Code Philosophy & Principles

### KISS Principle

**CRITICAL DEVELOPMENT GUIDELINE:** Always prefer fixing existing code over adding new code. Before introducing new logic:
1. Check if the issue can be solved by adjusting existing code
2. Remove redundant code when adding fixes
3. Keep solutions simple and maintainable

### Modularity & Reusability

**CRITICAL:** This codebase has been carefully architected with reusable systems to make new scenes 5x faster to create. **Always use existing systems** rather than creating one-off solutions:

**Before writing scene-specific code, check if these exist:**
- **Brazier** - For any fire, torch, or light entity
- **PuzzleManager** - For any sequence-based puzzle
- **SceneStateManager** - For ANY state (never use `window.gameState`)
- **DialogOverlay** - For portrait-based narrative
- **ConversationManager** - For multi-step conversations with choices
- **SpeechBubble** - For quick character dialog
- **InteractiveObject** - For hover effects and clickable objects (see `docs/GUIDE_NEW_SCENES.md`)

**Examples of good modularity:**
- Scene3_Tomb uses Brazier + PuzzleManager (not custom fire logic)
- All scenes use SceneStateManager (not individual state tracking)
- Walk-in animations use GameScene's `startWalkInAnimation()` (not per-scene implementations)

**When adding new features:**
1. Check if an existing system can be extended
2. If creating something new, make it reusable (add to `/systems`, `/entities`, or `/helpers`)
3. Document it in `docs/GUIDE_NEW_SCENES.md`
4. Never create one-off solutions when a system could be generalized

## Project Structure

```
js/
├── main.js                     # Phaser config + scene registration
├── entities/
│   ├── Brazier.js             # Fires, torches, braziers (state-managed)
│   ├── SpeechBubble.js        # Individual dialog bubbles
│   └── Wisp.js                # Floating guide entity
├── scenes/
│   ├── GameScene.js           # Base class (movement, pathfinding, masks)
│   ├── LoadingScene.js        # Asset loading + progress bar
│   ├── CharacterSelectScene.js
│   ├── IntroScene.js
│   ├── Scene1_Meadow.js       # First gameplay scene
│   ├── Scene2_Crossroads.js   # Second gameplay scene
│   └── Scene3_Tomb.js         # Best example: puzzles + braziers
└── systems/
    ├── AudioManager.js         # Centralized audio (singleton)
    ├── ConversationManager.js  # Speech bubble conversations
    ├── DialogOverlay.js        # Full-screen portrait dialogs
    ├── PuzzleManager.js        # Sequence-based puzzles
    └── SceneStateManager.js    # State persistence

assets/
├── dialogues/                  # JSON dialog data
├── scenes/                     # Backgrounds + masks
├── sprites/                    # Character sprites
├── portraits/                  # Dialog portraits
├── sound/                      # Audio files
└── objects/fire/              # Fire sprite sheets
```

## Key Files to Reference

- **Core base class:** `js/scenes/GameScene.js`
- **Best scene example:** `js/scenes/Scene3_Tomb.js`
- **Complete guide:** `docs/GUIDE_NEW_SCENES.md`
- **Architecture overview:** `assets/README.md`

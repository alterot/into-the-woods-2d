# Into the Woods

A 2D point-and-click narrative adventure game for children ages 5-8. Follow two sisters exploring a Nordic forest, solving puzzles and collecting emotional "Memory Fragments" through environmental storytelling.

## Tech Stack

- **Phaser 3.80.1** - Game framework
- **EasyStar.js** - A* pathfinding
- **Vanilla JavaScript (ES6 modules)** - No build tools required

## Project Structure

The codebase follows a modular architecture with reusable systems:

```
js/
├── scenes/
│   ├── GameScene.js           # Base class with mask-based click detection & pathfinding
│   ├── Scene1_Meadow.js
│   ├── Scene2_Crossroads.js
│   └── Scene3_Tomb.js
├── systems/
│   ├── AudioManager.js        # Centralized audio handling
│   ├── DialogOverlay.js       # Full-screen portrait dialogues
│   ├── ConversationManager.js # Speech bubble conversations
│   ├── PuzzleManager.js       # Sequence-based puzzle logic
│   └── SceneStateManager.js   # State persistence
├── entities/
│   ├── Brazier.js            # Fires, torches, lights
│   ├── SpeechBubble.js       # Individual dialog bubbles
│   └── Wisp.js               # Floating guide entity
└── helpers/
    └── MaskHelper.js         # Mask pixel reading & grid generation

assets/
├── scenes/                   # Backgrounds + color-coded masks
├── dialogues/               # JSON dialog data
├── sprites/                 # Character sprites
├── portraits/               # Dialog portraits
└── sound/                   # Audio files
```

## Core Architecture

### Mask-Based Interaction System

Each scene uses two images:
- `background.png` - Visual content (1280x720)
- `mask.png` - Color-coded logic (1280x720)

Mask color codes:
- **Green (0,255,0)** - Walkable areas
- **Red (255,0,0)** - Interactive objects
- **Blue (0,0,255)** - Scene transitions
- **Black (0,0,0)** - No-click zones

### GameScene Base Class

All gameplay scenes extend `GameScene`, providing:
- Mask-based click detection
- A* pathfinding with EasyStar.js
- Player movement with bob animation
- Follower AI (non-player sister follows 50px behind)
- Depth sorting by Y-coordinate
- Distance-based footstep audio

### Reusable Systems

**DialogOverlay** - Full-screen portrait dialogues with typewriter effect
**ConversationManager** - Multi-step conversations with choice handling
**PuzzleManager** - Sequence-based puzzles (colors, symbols, patterns)
**SceneStateManager** - Global and scene-specific state persistence
**AudioManager** - Centralized audio with music and sound effects

## Getting Started

### Prerequisites

A local web server (Phaser requires server environment for asset loading)

### Running the Game

```bash
# Using http-server (recommended)
npx http-server .

# Or Python
python3 -m http.server

# Or VS Code Live Server extension
```

Open `http://localhost:8080` (or whichever port your server uses)

### Debug Mode

Jump directly to any scene using URL parameters:

```
http://localhost:8080/?scene=Scene1_Meadow
http://localhost:8080/?scene=Scene2_Crossroads
http://localhost:8080/?scene=Scene3_Tomb&puzzleCompleted=true
```

## Development

### Adding New Scenes

1. Create background image (1280x720 PNG)
2. Create mask image (1280x720 PNG, exact RGB colors, no anti-aliasing)
3. Create scene class extending `GameScene`
4. Implement required methods:
   - `createSceneContent()` - Add entities, dialogs, puzzles
   - `getSpawnPoint(entryTag)` - Return spawn position based on entry direction
   - `handleInteractiveClick(x, y)` - Handle red mask clicks
   - `handleTransitionClick(x, y)` - Handle blue mask clicks
5. Load assets in `LoadingScene.js`
6. Register scene in `js/main.js`

See `docs/GUIDE_NEW_SCENES.md` for complete documentation.

### Key Principles

**Modularity** - Prefer existing systems over one-off solutions
**KISS** - Keep implementations simple and maintainable
**Reusability** - Build generic systems that work across scenes

## Documentation

- `docs/GUIDE_NEW_SCENES.md` - Complete guide for creating new scenes
- `assets/README.md` - Architecture overview (Swedish)

## License

Private project - All rights reserved

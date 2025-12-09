
---

## Core Architecture

### 1. GameScene (bas-klass)

Alla spelbara scener ärver från `GameScene` och får:

- Mask-baserad klicktolkning  
  - **green** = gångbart  
  - **red** = interaktivt objekt  
  - **blue** = scenövergång  
  - **black** = ingen klickyta  
- A*-pathfinding (EasyStar.js)  
- Spelarens gång, bob-animation och sprite-flip  
- Follower AI (den andra systern följer 50px bakom)  
- Depth sorting efter Y-position  
- Footstep-ljud kopplat till rörelse  

Hook-metoder som scener implementerar:

- `createSceneContent()`  
- `handleInteractiveClick(x, y)`  
- `handleTransitionClick(x, y)`  
- `getSpawnPoint(entryTag)`  

---

## Mask System

Varje scen består av två bilder:

- **background.png** – visuellt innehåll  
- **mask.png** – färgkodad logik för klick, rörelse och transitioner  

Färgkoder:

| Färg  | Betydelse |
|-------|-----------|
| Grön  | Gångbart område |
| Röd   | Interaktivt objekt |
| Blå   | Scenövergång |
| Svart | Ingen klickyta |

Masken analyseras pixelvis i `getPixelColor()` och styr allt beteende vid klick.  
`createGridFromMask()` genererar ett pathfinding-grid baserat på gröna pixlar.

---

## Dialog Systems

### DialogOverlay
- Fullskärmsdialog med porträtt  
- Typwriter-effekt, porträttfokus och dimmad bakgrund  
- Används för narrativa scener och viktiga objekt  

### SpeechBubble
- Små dialogbubblor som följer karaktärer  
- Typwriter, autodestruction, valmöjligheter  
- Automatiskt sidbyte beroende på position  

### ConversationManager
- Kedjade dialoger med logiska steg  
- Valhantering med `action`-värden  
- Förhindrar klick från att läcka till spelet under dialog  

---

## InteractiveObject

Ett generiskt objekt med konfigurerbar:

- Klickinteraktion  
- Hover-effekter (sparkle, glow, pulse)  
- Automatisk gång till objektets närhet  
- Integration med DialogOverlay eller anpassade callbacks  

Används för fasta objekt som träd, stenar, altare m.m.

---

## Entities

### Wisp
- Hover-wobble, float och pulserande animationer  
- Kan trigga interaktion och starta dialogsekvenser  
- Minimal spel-logik, fungerar som guidande entitet

---

## Audio System

`AudioManager` hanterar:

- Fotsteg  
- Klickljud  
- Ambience  
- Musikloopar och AudioContext-initiering  

Integreras i scener genom `registry.get('audioManager')`.

---

## Loading Pipeline

`LoadingScene` ansvarar för:

- Progressbar  
- Manuell start av Phaser-loader  
- Preloading av alla assets  
- Fördröjd scenstart för att säkerställa att ljud är avkodade  

Sekvens:  
`LoadingScene → CharacterSelectScene → SceneX`

---

## Scene Lifecycle

1. Resources laddas i `LoadingScene`  
2. Spelaren väljer karaktär i `CharacterSelectScene`  
3. `SceneX` initieras:  
   - Bakgrund + mask  
   - Pathfinding-grid genereras  
   - Karaktärer positioneras via `getSpawnPoint()`  
   - Objekten läggs till i `createSceneContent()`  
4. Klick hanteras av mask-systemet  
5. Dialog startas med något av dialogsystemen  
6. Scenbyte sker via blå mask-zoner + fade-out

---

## Adding New Scenes

För en ny scen behövs:

1. Ny bakgrund (`assets/scenes/*.png`)  
2. Ny maskbild med korrekt färgkodning  
3. Ny scenklass som ärver från `GameScene`  
4. Implementation av `createSceneContent()`  
5. Spawn-points i `getSpawnPoint()`  
6. Registrering av assets i `LoadingScene`  
7. Scenregistrering i `main.js`  

En full guide finns i projektets `GUIDE_NEW_SCENES.md`.

---

## Running the Project

Starta projektet via en enkel webserver (Phaser kräver servermiljö):

```bash
npx http-server .
# eller
python3 -m http.server

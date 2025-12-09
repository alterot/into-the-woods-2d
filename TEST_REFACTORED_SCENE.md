# Test Plan för Refactored Scene1_Meadow

## 🧪 Test Checklist

### Pre-Test: Backup Original
```bash
# Skapa backup innan vi testar
cp js/scenes/Scene1_Meadow.js js/scenes/Scene1_Meadow_BACKUP.js
```

### Test 1: Runestone Interaction ✓
**Steg:**
1. Starta spelet
2. Hover över runestone (röda pixlar i mask)
3. Klicka på runestone

**Förväntat resultat:**
- ✓ Hover effect: sparkle trail följer musen
- ✓ Vid klick: DialogOverlay öppnas med rune-dialogue
- ✓ Systrar går till närmaste walkable spot
- ✓ Systrar vänder sig mot runestone under dialog
- ✓ Dialog kan clickas igenom
- ✓ Dialog stängs efter sista raden

### Test 2: Wisp Conversation (First Time) ✓
**Steg:**
1. Klicka på wisp (glowing sprite)

**Förväntat resultat:**
- ✓ Bubble #1 ("Vad är det som lyser...") visas på player medan de går
- ✓ Systrar går mot wisp
- ✓ När de kommer fram:
  - ✓ Bubble #1 försvinner
  - ✓ Bubble #2 ("Vad är det för något?") visas på follower
  - ✓ Click → Bubble #3 ("Ett Irrbloss...") visas på player
  - ✓ Click → Bubble #4 ("Vad ska vi göra...") visas på follower
  - ✓ Click → Choice bubble visas med 2 val

**Choice 1: "Vi följer efter!"**
- ✓ Fade out
- ✓ Scene2_Crossroads startar
- ✓ Entry tag = 'from_meadow'

**Choice 2: "Vi stannar kvar i gläntan."**
- ✓ Bubble försvinner
- ✓ Conversation avslutas
- ✓ Kan röra sig normalt igen

### Test 3: Wisp Conversation (Repeat) ✓
**Förväntat resultat efter första genomgången:**
1. Klicka på wisp igen
2. ✓ Ingen Bubble #1 (hoppar över)
3. ✓ Går till wisp
4. ✓ När de kommer fram: direkt choice bubble
5. ✓ Inga bubbles #2-4

### Test 4: Scene-wide Click Blocking ✓
**Under wisp conversation:**
- ✓ Clicks utanför conversations blockeras (ingen movement)
- ✓ Clicks avancerar current bubble
- ✓ Kan inte klicka på runestone under wisp conversation

### Test 5: Integration ✓
1. ✓ Audio fungerar (click sounds)
2. ✓ Pathfinding fungerar
3. ✓ Follower AI fungerar
4. ✓ Depth sorting fungerar
5. ✓ Spawn points fungerar

---

## 🚀 Kör Testerna

### Steg 1: Aktivera Refactored Version

**Öppna `js/main.js` och ändra:**

```javascript
// Före:
import Scene1_Meadow from './scenes/Scene1_Meadow.js';

// Efter:
import Scene1_Meadow from './scenes/Scene1_Meadow_REFACTORED.js';
```

### Steg 2: Starta Spelet
```bash
# Om du har en lokal server:
python -m http.server 8000
# eller
npx http-server -p 8000

# Öppna: http://localhost:8000
```

### Steg 3: Kör Igenom Testerna
- Följ checklistan ovan
- Markera varje test som ✓ eller ✗
- Notera eventuella buggar

---

## 🐛 Vanliga Problem & Fixes

### Problem 1: "ConversationManager is not defined"
**Fix:** Kontrollera att import finns i Scene1_Meadow_REFACTORED.js
```javascript
import ConversationManager from '../systems/ConversationManager.js';
```

### Problem 2: "InteractiveObject is not defined"
**Fix:** Kontrollera att import finns i Scene1_Meadow_REFACTORED.js
```javascript
import InteractiveObject from '../entities/InteractiveObject.js';
```

### Problem 3: Sparkle effect fungerar inte
**Möjlig orsak:** InteractiveObject kanske inte hittar rätt mask-färg
**Fix:** Verifiera att runestone position (800, 400) stämmer med röda pixlar i mask

### Problem 4: Conversation startar inte
**Debug:**
```javascript
// Lägg till console.log i handleWispClick:
console.log('[TEST] Wisp clicked, target:', target);
console.log('[TEST] Conversation completed?', this.wispConversationCompleted);
```

### Problem 5: Characters står still vid wisp
**Möjlig orsak:** Ingen walkable spot hittades
**Fix:** Öka search radius:
```javascript
const target = this.findNearestWalkable(this.wisp.sprite.x, this.wisp.sprite.y, 150);
```

---

## ✅ Acceptance Criteria

**Refactoring är godkänd om:**
- ✓ Alla Test 1-5 passerar
- ✓ Inga nya console errors
- ✓ Inga visuella buggar
- ✓ Ingen förlust av funktionalitet
- ✓ Kod är mer läsbar än original

**Om alla tester passerar:**
```bash
# Replace original med refactored
cp js/scenes/Scene1_Meadow_REFACTORED.js js/scenes/Scene1_Meadow.js

# Commit changes
git add .
git commit -m "Refactor Scene1_Meadow: Use ConversationManager and InteractiveObject

- Reduced from 432 to 170 lines (-61%)
- Replaced 366 lines of manual conversation chaining with 40 lines of config
- Extracted runestone logic to InteractiveObject
- Removed duplicate findNearestWalkable (now in GameScene)
- All functionality preserved, code much more maintainable"
```

**Om tester misslyckas:**
```bash
# Rollback till original
cp js/scenes/Scene1_Meadow_BACKUP.js js/scenes/Scene1_Meadow.js

# Debugga och fixa, sedan testa igen
```

---

## 📊 Success Metrics

Efter godkänd refactoring kan du förvänta dig:

**För Scene 3-5:**
- 60% mindre kod per scen
- 3x snabbare development
- Bättre maintainability
- Enklare att testa
- Färre bugs (mindre duplicerad kod)

**Nästa steg efter godkänt test:**
- Bygg Scene3 med nya systemen
- Validera att patterns funkar för nya use cases
- Justera ConversationManager/InteractiveObject om nödvändigt
- Fortsätt med Scene 4-5 (borde gå på rails)

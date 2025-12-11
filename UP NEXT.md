GENERELLT:
Move AudioManager to /systems and (oly imported by loading scene?)

SCEN 1 - Byt tet i bubblan (kan inte stå följer efter)

SCEN 2 - lägg på overlay här också, samt ta bort stigar!!

SCEN 3
BYT STENLJUD - ALLT ÄR PÅ PLATS OCH FUNLAR
UPPDATERA BUBBLES TILL SVENSKA
HITTA BRA STENLJUD

Se till att overlay är bakom det svarta!
Fixa att sister är rättänd i vänstra dialoger
Uppdatera player placering efter fade in/out
Se till att player avatar är vänd åt häger
Lägg till ljud fär eld (som blir högre när aktv)
ev. Öka styrka på aktiv halo i braziers
UPPDATERA OVERLAY (ska inkudea vägg + tomb)
Player ska gå fram till tarnsit area vid klick, inte bara transit direkt
rensa upp alla (debug( konsollogs))
Add full screen?

Övrigt från feedback: (GameScene)
En sak som är OK nu men kommer bli teknisk skuld
“Legacy variables” för sister1/sister2
Du har både player/follower och legacy (sister1/sister2, bobTime etc). 
Det är helt okej mitt i en refaktor, men målet bör vara:
en canonical representation (player/follower)
sister1/sister2 bara alias (eller tas bort)
Annars blir det lätt att en ny scen råkar använda “fel” och du får buggar som är svåra att förstå.

Lägg till ett standardiserat sätt att låsa input (via GameScene), så ConversationManager aldrig behöver veta om dialogActive-flaggan finns eller inte.

promptförslag för att refaktor:
I want a careful refactor focused on structure, clarity, and long-term maintainability.

Scope:
- GameScene.js
- Related helpers used by GameScene (mask handling, movement, input routing)
- Do NOT touch assets or scene-specific content logic.

Goals:
1. Reduce responsibility overload in GameScene:
   - Extract mask pixel reading into a small helper (e.g. MaskHelper or similar).
   - Avoid creating canvases repeatedly for pixel lookups; cache and reuse instead.
2. Clarify canonical character representation:
   - Treat player/follower as the single source of truth.
   - Keep legacy variables (sister1/sister2) only as aliases or adapters if needed.
3. Make GameScene easier to reason about for future scenes:
   - Clear separation between input handling, movement, pathfinding, feedback, and audio triggers.
   - Improve naming and grouping, but keep behavior identical.
4. Improve cleanup safety:
   - Ensure input listeners / timers / tweens are clearly scoped and safely cleaned up when scenes change.

Constraints:
- KEEP ALL FUNCTIONALITY EXACTLY AS IS.
- No gameplay, timing, visuals, audio, or logic changes.
- This is a refactor only: structure, readability, responsibility boundaries.
- Prefer small, well-named helpers over large classes.
- If unsure, preserve existing code paths.

Deliverable:
- Refactored code with identical runtime behavior.
- Brief inline comments explaining why something was extracted or renamed.

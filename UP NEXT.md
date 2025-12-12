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

Lägg till ett standardiserat sätt att låsa input (via GameScene), så ConversationManager aldrig behöver veta om dialogActive-flaggan finns eller inte.




ETT TILL: (dialoge ovelay)
Please refactor DialogOverlay.js for maintainability and future extensibility.

Scope:
- DialogOverlay.js primarily
- Minimal changes to related callers only if required (e.g. to keep API consistent)
- Do not touch assets or dialogue JSON formats unless absolutely necessary.

Goals:
1) Reduce “god object” complexity in DialogOverlay:
   - Extract clearly named internal helpers for: layout config, input binding/unbinding, typing/skip logic, and choice rendering.
   - Group related state and cleanup in a predictable lifecycle.

2) Centralize and standardize input locking:
   - Replace ad-hoc dialogActive / scene-level flags with a single, consistent API (e.g. scene.lockInput(reason) / scene.unlockInput(reason) or similar).
   - Ensure no click/space events leak through during overlay transitions, typing, or after completion.

3) Improve cleanup safety:
   - Ensure all scene input listeners, timers, tweens, and created objects are always cleaned up on:
     - overlay completion
     - overlay cancel/close
     - scene shutdown/destroy
   - Avoid double-destroy or dangling references.

Constraints:
- KEEP ALL FUNCTIONALITY EXACTLY

STEPS FOR OVERLAY:

  Phase 1: Input Locking (DO THIS FIRST) 🔴 Critical
  - Add lockInput(reason) / unlockInput(reason) to GameScene
  - Update DialogOverlay to use it
  - Update ConversationManager to use it
  - This fixes real bugs NOW

  Phase 2: Extract Creation Helpers 🟡 High Value
  - Extract createPortraits(), createTextboxes(), createChoiceButtons(), setupInputHandlers()
  - Makes createDialogUI() readable
  - Easier to maintain/extend

  Phase 3: Cleanup Safety 🟡 Important << -- STARTA DETTA EFTER LUNCH
  - Add destroy guards
  - Kill tweens explicitly
  - Hook scene shutdown
  - Prevents crashes

  Phase 4: Extract Layout Config 🟢 Nice to Have
  - Only if complexity still feels high
  - Could wait

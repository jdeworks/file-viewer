# Open Questions Before More Implementation

## Scope

1. Scope is intentionally large: full hidden anthology/metagame inside the file viewer.
2. Target stage length: roughly 40 minutes to 2 hours per stage.
3. Later crash-course / boss-only mode is a separate future extension after full stages exist.
4. Do you want prestige in every stage, or only in Stage 1 and replay-heavy stages?

## Canon

1. Is the recurring boss/process called The Defragmenter from Stage 1 onward?
2. Are The Overwriter / Overseer retired names, or aliases/files used by The Defragmenter?
3. Should the Defragmenter be knowingly antagonistic early, or just mechanically adversarial?
4. Is the Bell the entity's inner voice, the Defragmenter's messages, or both with distinct styling?

## Boss Locks

1. Should every boss be literally unbeatable without the viewer tool?
2. How much failure is acceptable before the game gives a direct hint?
3. Are full-stage replays acceptable after missing a prep mechanic, especially Stage 8?
4. Should unlock achievements fire on tool use, boss defeat, or both?
5. Should the file viewer action flags live in one canonical `appState.fileViewerActions` object,
   localStorage, custom events, or a hybrid?

## Stage 10

1. Is opening one gallery file enough to unlock Act 2, or should the player assemble several
   memories first?
2. Should the final required action be "use examples gallery" or "read the entity's autobiography"?
3. Should all endings loop to Stage 1, or should Rest remain a true pause state?
4. Should Understand open real Stage 1 source, simplified narrative source, or both?
5. What should Expand link to: documentation, developer note, changelog, project repo, or a custom
   "outside" page?

## Implementation Order

1. Finish/canonicalize Stage 1 boss lock before designing Stage 2 code.
2. Add a tiny file-viewer action flag system and prove it with Stage 1.
3. Decide whether Stage 2 should use the old current `stages.js` shared grind/boss system or a new
   bespoke renderer like Stage 1.
4. Decide whether all stages get their own renderer modules (`stage2.js`, `stage3.js`, etc.).
5. Decide asset limits. Several stages want generated images/audio/files; the file-viewer app may
   need an explicit asset manifest strategy.

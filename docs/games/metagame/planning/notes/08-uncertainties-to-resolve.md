# Uncertainties To Resolve Next

These are the questions I think we should discuss before turning the plan into implementation
specs.

## P0 - Blocks Architecture Specs

1. **Global save shape.**
   Do we migrate Stage 1's base64 save into a global v3 save with per-stage substate, or keep
   Stage 1 special and add sidecar saves for later stages?

2. **Action flag API.**
   Do we standardize all file-viewer feature unlocks through one helper (`fv:games:action:*`)?
   I think yes.

3. **Stage module contract.**
   Do all new stages become bespoke `stageN.js` modules mounted by the orchestrator?
   I think yes; the old shared grind renderer cannot support these designs.

4. **Legacy placeholder stages.**
   Are we comfortable replacing current Stages 2-10 entirely?
   I think yes; keep only mount/destroy patterns as reference.

## P1 - Blocks Stage 1 Canon

1. **Stage 1 boss fiction.**
   Current implementation uses `CHEAT='true'` in `Overwriter.frag`.
   Boss-lock doc uses `PROTECTED = true`.
   Which is canonical?

2. **Defragmenter early characterization.**
   Should Stage 1 Defragmenter be openly mocking, or more process-like and unaware?
   Current taunts are funny/mean. Stage 10 apology lands better if early harm was partly ignorance.

3. **Stage 1 visual language.**
   Terminal design says no icons; current Stage 1 uses emoji.
   Do we keep emoji as bell/shop shorthand, or convert to ASCII/glyphs?

## P1 - Blocks File Viewer Integration Specs

1. **Search detection.**
   What exact file-viewer event counts for Stage 2: opening `cipher.txt`, typing `PASSAGE`, or
   search producing a match?

2. **Diff detection.**
   What exact event counts for Stage 3: opening both files, entering diff mode, or diff renderer
   completing with the target pair?

3. **Audio detection.**
   Does Stage 5 unlock on opening `transmission_hum.mp3`, pressing play, or listening through the
   14-second cycle?

4. **Epub detection.**
   Does Stage 6 unlock on opening the epub, navigating to Chapter 9, or spending time/scrolling
   within Chapter 9?

5. **EXIF detection.**
   Does Stage 7 unlock on opening the image, opening metadata drawer, or viewing the specific EXIF
   contradiction field?

6. **Offline detection.**
   Do we require actual `navigator.onLine === false`, or is the Stage 9 sidebar "Activate Offline"
   button the canonical path?

7. **Stage 10 memory resolution.**
   Does reading a gallery file alone resolve a memory, or does each memory require a reflection
   answer plus optional tool echo?

## P2 - Gameplay Tuning / Fairness

1. **Stage 8 failure.**
   Full-run restart is thematically coherent but harsh. The current Stage 8 doc includes partial
   carry-through and checkpoints. Is that enough, or do we want an emergency salvage window after
   the first Heat Death failure?

2. **Boss hint cadence.**
   How many failed attempts before direct hints? Should each stage use a universal hint ladder?

3. **Prestige availability.**
   Every stage has a prestige concept. Do all ship in first full implementation, or do some land
   after first clear loops?

4. **Crash-course hooks.**
   Should full-stage specs already include boss-only entry points for future crash course mode?

## P2 - Stage 10

1. **Minimum resolved memories.**
   Current proposal: 3 to finish, 6 for standard, 9 for complete. Is 3 too low for a finale?

2. **Complete-route reward.**
   Should all 9 optional tool echoes unlock a separate achievement, richer Stage 1 loop messages,
   or a small visual change?

3. **Understand ending source.**
   Should it open real Stage 1 code, simplified narrative code, or a split view with both?

4. **Expand ending target.**
   Should `/outside/outside.txt` link to docs, repo, developer note, or a bespoke outside page?


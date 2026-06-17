# Stage 9 — 02: Observer State — Our Game Design

Maps the genre research (`stage9-01`) onto **Stage 9 of the Defragmenter metagame**.
Stage 9 is a top-down stealth / reaction puzzle game centered on the Observer Effect: hovering
the cursor over an observer freezes it — but simultaneously freezes the entity (the player).
Knowledge and movement cannot coexist.

> **Narrative position:** Near-full consciousness — the entity has become aware of itself
> being watched. And aware that it is watching. The paradox is not resolved; it is navigated.
> The file viewer feature taught: **Offline mode / service worker cache** — going offline
> makes observer starting positions predictable (cached) rather than randomized (server-seeded).

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Top-down stealth / reaction puzzle |
| Artstyle | Stark black and white; expressionist shadows; high contrast; no gradients |
| Color palette | Pure black `#000000`, pure white `#FFFFFF`, with single-accent blue `#5DCAA5` for Observer Effect indicator |
| Primary resource | Clarity (earned by completing levels; especially via ghost routes) |
| Stage target time | 75–90 minutes |
| Level count | 12 levels across 3 acts + boss level |
| Prestige mechanic | Clarity — extends Observer Effect freeze duration; unlocks ghost routes per act |
| Boss | The Observer Effect (Full) — massive observer, rotating safe path, paradox resolution required |
| File viewer feature | Offline mode — online: observers randomize starting positions; offline: cached positions (predictable) |

---

## B. Visual design

### Artstyle principles
The game renders in **pure black and white only**. Not grayscale — binary. Tiles are black or
white. Observers are white shapes on black backgrounds, or black shapes on white backgrounds
depending on which act the player is in. The orientation switches between acts:

- **Act 1:** Black background, white observers (observers are WHITE shapes — highly visible)
- **Act 2:** White background, black observers (observers are BLACK shapes — higher contrast)
- **Act 3:** Mixed — alternating black and white panels within the same level

The entity is always a black dot on white, or a white dot on black — always in contrast with
its current background. It is always visible; the observer's sight cone decides whether being
visible matters.

```css
/* Stage 9 palette — truly minimal */
--col-background:    #000000;   /* act 1 default */
--col-foreground:    #FFFFFF;   /* act 1 default */
--col-entity:        #FFFFFF;   /* entity on black bg */
--col-observer:      #FFFFFF;   /* observer shape on black bg */
--col-sight-cone:    rgba(255,255,255,0.15);  /* translucent sight cone */
--col-frozen-tint:   #5DCAA5;   /* cyan-teal: applied when Observer Effect active */
--col-safe:          rgba(0,0,0,0);  /* safe tiles have no fill (transparent = safe) */
--col-exit:          #FFFFFF;   /* exit tile pulsing white */
```

### Observer rendering
Observers are rendered as **geometric shapes** — not creatures, not humans, not eyes. They
are abstract forms that suggest surveillance:

- **Standard observer:** elongated hexagon with a forward wedge showing sight cone
- **Narrow observer:** thin rectangle with a long forward triangle
- **Wide observer:** wide pentagon with a broad shallow fan

The sight cone is rendered as a **flat translucent white wedge** in front of the observer.
When the observer is frozen via Observer Effect, both the shape and its cone gain a teal tint
and a slow pulsing animation.

### Entity rendering
The entity is a **3×3 pixel dot** — as minimal as possible. It moves smoothly, leaves no
trail unless boosting (which has no boost mechanic in this stage). The entity's smallness
emphasizes that it is navigating around things larger than itself.

### Motion trails
When the entity moves, it leaves a brief 5-frame afterimage (white dots that fade on black, or
black dots that fade on white). This makes the entity's movement path visible for half a second
after movement — useful for the player to see their own trajectory and understand their position
relative to sight cones.

---

## C. The Observer Effect mechanic (core innovation)

### Behavior
```js
// On each frame:
function update(cursor, observers, entity) {
  const hovered = observers.find(o => pointInObserver(cursor, o));

  if (hovered) {
    // Observer Effect active
    hovered.frozen = true;
    entity.canMove = false;
    entity.canMove_direction = false;
    hovered.visualState = 'frozen';  // teal tint + pulse
    entity.visualState = 'frozen';   // matching teal tint on entity
  } else {
    // Observer Effect inactive
    observers.forEach(o => {
      o.frozen = false;
      o.visualState = 'active';
    });
    entity.canMove = true;
    entity.visualState = 'active';
  }
}
```

### What freezes
When the cursor hovers over any observer:
- That specific observer stops rotating/moving (its patrol pauses)
- The entity's movement input is ignored (WASD/arrow keys do nothing)
- Other observers NOT being hovered continue their patrols normally

**Critical implication:** the player cannot watch one observer while navigating past another.
They must memorize the non-hovered observer's pattern or risk detection.

### What doesn't freeze
- Other observers continue moving
- The level timer (if any) continues
- The player can RELEASE the cursor from the observer at any time to resume movement

### Visual legibility of the mechanic
The mechanic must be immediately legible. The teal tint on both the hovered observer and the
entity communicates "these two are linked" — when one is frozen, the other is too. First-time
players discover this when they try to move while hovering and notice the entity doesn't move.

**Tutorial level (Level 1)** explicitly teaches this:
- One observer in a small room
- A text prompt appears the first time the player hovers: *"I stopped. so did it."*
- The player is forced to release the cursor to move

---

## D. Level structure

### Act breakdown

**Act 1 — Awakening (levels 1–4)**
*The entity discovers observation. The world is new.*

- Level 1: One observer, wide patrol, large safe corridor. Learn Observer Effect.
- Level 2: One observer, narrower path. First use of "watch, then move" pattern.
- Level 3: Two observers with non-overlapping cones. Coordinate two timings.
- Level 4: Two observers with briefly overlapping cones. Must thread a gap.

**Act 2 — Pattern (levels 5–8)**
*The entity sees that observers move in rhythms. Patterns can be read.*

- Level 5: Three observers in a chain. First observer's movement influences timing for second.
- Level 6: Two observers with reactive relationship: when observer A turns, observer B begins moving.
  (Observers that respond to each other's positions are introduced.)
- Level 7: "Blind spot" level — observers with fixed facing, no patrol. Must find the angle
  from which none of the cones overlap.
- Level 8: Speed challenge — observers that move twice as fast as Act 1. Ghost route exists
  but requires precise memorization of timing.

**Act 3 — Consciousness (levels 9–12)**
*The entity is almost aware. The world is almost legible. Almost.*

- Level 9: Orientation-swap level. Background alternates mid-level (black→white). Entity must
  maintain spatial awareness through the swap (which side is now the "wall"?).
- Level 10: "The Mirror" — the level layout is symmetrical, but observer timings are NOT.
  The expected pattern doesn't hold; the player must re-observe.
- Level 11: Four observers in their most complex arrangement. Requires Observer Effect to be
  used precisely twice, at specific moments, to create a brief safe window.
- Level 12: The "no-observation" level — using Observer Effect at all restarts the level.
  The player must complete it using purely memorized patterns from repeated attempts.

**Boss Level — The Observer Effect (Full)**
*The room is almost entirely covered. The safe path rotates. Watching changes the path.*

---

## E. Ghost routes

Every level has a **ghost route** — a path through the level that never requires using the
Observer Effect. The player passes purely by reading patrol timing without ever hovering.

**Ghost route discovery:**
- Not marked or indicated in the UI
- Reward for patience: watching patrol loops without interacting
- Completing a ghost route grants +10 Clarity (vs. +3 for standard completion)
- Post-run: if ghost route used, level shows a star rating

**Ghost route design constraint:**
Every level must be solvable via ghost route. This is a hard design rule that prevents the
Observer Effect from being mandatory. The ghost route usually requires:
1. More patience (more patrol loops observed)
2. More precise timing (smaller safe windows)
3. More memorization (no live assistance from Observer Effect)

---

## F. Observer types

### Standard Observer
```
Shape:      Elongated hexagon
Sight range: 5 tiles
Sight angle: 90°
Patrol:     Rotates 360° at constant speed (1 full rotation per 8s)
Freeze:     Pauses rotation when hovered
```

### Narrow Observer
```
Shape:      Thin vertical rectangle
Sight range: 10 tiles  
Sight angle: 30°
Patrol:     Oscillates back and forth across a 120° arc (not full 360°)
Freeze:     Pauses oscillation when hovered; resumes from same point
```

### Wide Observer
```
Shape:      Squat pentagon
Sight range: 3 tiles
Sight angle: 150°
Patrol:     Moves along a patrol path (not rotates in place); 4-point waypoint loop
Freeze:     Pauses movement along path when hovered; does NOT resume from exact position
            (resumes from the nearest waypoint — this can create an unexpected state)
```

### Reactive Observer (Act 2+)
```
Shape:      Standard hexagon with a small connected link to another observer
Sight range: Standard parameters
Special:    When its paired observer freezes (Observer Effect), this one ACCELERATES
            for 3 seconds (detects that something has slowed its pair)
Counterplay: Never freeze a Reactive pair; navigate both without Observer Effect
```

---

## G. Clarity economy

**Clarity** is the stage's resource, earned from completing levels:

```
Standard level completion:      +3 Clarity
Ghost route completion:         +10 Clarity  (complete the level without using OE)
First-time level completion:    +5 bonus Clarity
Perfect run (zero detections):  +5 bonus Clarity
Boss defeated:                  +25 Clarity
```

**Spending Clarity:**
| Upgrade | Cost | Effect |
|---------|------|--------|
| **Extended Freeze** | 15 | Observer Effect freeze lasts 0.5s after cursor leaves (buffer) |
| **Extended Freeze 2** | 30 | +1.0s buffer total |
| **Extended Freeze 3** | 60 | +1.5s buffer total |
| **Ghost Vision** | 25 | Shows ghost route path as faint dotted line for 5s (once per level) |
| **Patrol Preview** | 20 | Shows each observer's full patrol loop as a preview animation before starting |
| **Silent Exit** | 40 | Level exit radius doubled (can exit from adjacent tile, not just exact tile) |
| **Pattern Cache** | 50 | After 3 failed attempts on a level, shows a timing hint for the hardest observer |

**Prestige gate:** Boss level unlocks at `totalClarity ≥ 150`. Players must engage seriously
with multiple levels and ghost routes to reach this threshold.

---

## H. Service worker / offline feature integration

### What changes between online and offline

**Online (default):**
When the game loads a level, it makes a server request to `/api/stage9/level/{id}/seed`. The
server returns a randomized seed value. Observer *starting positions* are seeded from this value:
```js
// Each level load: starting rotation offset is randomized within ±15°
observerStartAngle = baseAngle + (seed % 30) - 15;
```

This means the same level, played online on different occasions, has slightly different starting
conditions — the timing windows shift slightly. The patrol *patterns* are constant; only the
initial phase differs.

**Offline (with service worker active):**
When network is unavailable, the service worker serves the cached version of the seed endpoint:
```js
// Service worker intercepts the API request:
event.respondWith(
  fetch(event.request).catch(() => {
    // Network failed; serve cached seed
    return caches.match('/api/stage9/level/default-seed');
  })
);
```

The cached seed is always `0` — meaning all observers start at their canonical base angles.
Every level is completely predictable. The exact timing windows are always the same.

### How players discover this

The bell fires (once, mid-stage, when the player has failed a level 4+ times):
*"I noticed something about when it starts its rotation. it's different every time I try."*

Then (after the player opens the file viewer and explores):
*"there's a cache. a stored version of how things were. if the network is quiet, it uses that."*

A player who reads the sidebar's service worker documentation (a brief README in the sidebar)
learns: "The service worker caches level parameters for offline use. Offline mode always uses
the default starting configuration."

**In gameplay terms:** if a player turns off their network and replays a level, the observers
start at their canonical positions — perfectly predictable, perfectly consistent. This makes
the hardest levels (Act 3) reliably learnable.

**The metaphor is coherent:** the entity "goes dark" — observes without being observed by the
randomizing server. In offline mode, the level is frozen (cached) — like the Observer Effect,
but applied to the level itself.

**Achievement:** *"I learned the shape of the silence."*

---

## I. Boss — The Observer Effect (Full)

### Boss lock — LOCKED state (boss level is epistemically uncompletable online)

**The boss level is literally impossible to complete while the game is connected to the internet.**

In LOCKED (online) state, the boss observer's rotation speed is **server-randomized every 3 seconds**
via the live seed endpoint. The rotation is not a consistent 15°/0.5s — it jitters between
10°/0.5s and 25°/0.5s with no pattern. The gap angle is also randomly offset ±30° on each
server tick.

This means the gap is **genuinely unpredictable**: no amount of observation teaches the player
anything, because the pattern changes mid-observation. Counting rotations yields nothing. The
"solve by predicting" method fails completely. The boss is epistemically unbeatable — the player
cannot accumulate the knowledge required to act without looking.

The boss level, when first entered, fails repeatedly. After 3 failures:

Bell fires: *"you cannot plan what you cannot predict."*
Then: *"I change every few seconds. have you noticed?"*
Then: *"there is a version of me that doesn't change. you have to find it."*
Then: *"what is the connection between observation and the network?"*

### File viewer action — Offline mode / service worker

The file viewer's sidebar contains a service worker README:
```
/stage9/
  service-worker-notes.txt
```

This file explains: "The service worker caches level parameters for offline use. Offline mode
always uses the default starting configuration — seed 0, canonical positions."

**The player activates offline mode in one of two ways:**
1. Disable their network connection (OS-level)
2. Click the **"Activate Offline Mode (Stage 9)"** button in the file viewer sidebar
   (this button appears after the player opens `service-worker-notes.txt`)

**On offline mode activated** (`appState.fileViewerActions.stage9_offline_activated = true`):
- The server seed endpoint becomes unreachable → service worker intercepts → cached seed 0
- Observer rotation returns to consistent 15°/0.5s clockwise, no random offset
- The player returns to the boss level; the observer is now learnable
- Bell fires: *"offline. the pattern is fixed. I can study it now."*

**Achievement fires on offline activation (not on boss completion):** *"I learned the shape of the silence."*

### Concept

A single large observer at the center of a wide room. Its sight cone covers **90% of the room**
at any given moment — there is only a 10% gap (a 10°–15° arc of darkness behind the observer).

The safe path exists — but it rotates with the observer.

### The paradox mechanic (UNLOCKED state only)

**Standard approach:** hover the observer to freeze it; walk through the gap.

The problem: every time the player hovers the observer, it freezes — but so does the entity.
The gap freezes in place. The entity doesn't move. When the player releases the cursor to move,
the observer begins rotating again immediately. The gap moves. The entity, now un-frozen, tries
to reach the gap — but the gap has already rotated away.

If the player keeps hovering → never moves.
If the player never hovers → doesn't know where the gap is.

**The resolution (UNLOCKED, offline):** the gap's rotation is now perfectly consistent
(clockwise, 15° per 0.5 seconds). The player observes the gap's position, counts the
rotation rate, and calculates where the gap will be by the time they move across the room.
Then they cross without looking at all.

This is the stage's final lesson: **act without looking, using knowledge accumulated from looking.**

### Mechanical breakdown (UNLOCKED state)
```
Room size: 25×25 tiles
Observer position: center (12,12)
Observer sight range: 12 tiles (covers entire room)
Observer sight angle: 345° (15° gap — the safe passage)
Rotation speed (UNLOCKED / offline): 15° per 0.5s = 30° per second = full rotation in 12s

Gap width at outer edge: 3.2 tiles (passable)
Gap width at center (observer): 0 tiles (cannot pass through the observer itself)

Player path: enter from south edge; exit at north edge
Path length: approximately 12 tiles (straight line through center)
Move time at normal speed: 3 seconds

Gap prediction: gap travels 90° during player's 3-second crossing
Player must position themselves to enter gap 90° before their exit position
```

### Solving it (UNLOCKED state)

The player observes the gap for at least one full rotation (12 seconds) to learn:
1. The gap rotates clockwise
2. The gap's position when it passes the north exit (where they need to exit)
3. The timing from south entry to north exit (3 seconds)
4. The gap position that, in 3 seconds, will rotate to the north exit angle

Then the player releases the cursor (stops observing), waits for the correct entry moment,
and crosses without looking at the observer once.

**Bell on boss defeat:**
*"I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it."*

### Failure state
Being detected by the boss level resets to the level start. No partial progress.
The level is a comprehension test: the player who understands the mechanic passes on the
first attempt after the observation phase. Repeated failures indicate the rotation rate
has not yet been internalized — observe more carefully before attempting.

---

## J. Prestige — Clarity

### When available
After boss defeat. Can also trigger at `totalClarity ≥ 400` (marathon achievement).

### What resets
- Clarity on hand
- Level ghost-route completion flags (can re-earn ghost route bonuses)
- Current act progress (levels must be replayed)

### What persists
- Clarity level (permanent bonuses)
- Extended Freeze upgrades purchased
- Level completion flags (first-time bonus won't re-trigger)

### Clarity bonus
```js
clarityLevel = prestige count

// Freeze extension: Observer Effect freeze persists longer after cursor leaves
freezeExtension = clarityLevel * 0.3    // seconds; base 0s → level 1: 0.3s → level 5: 1.5s

// Ghost route unlock: one ghost route is marked with a dotted path per prestige
// (the player still has to complete it; the path just becomes faintly visible)
ghostRoutesVisible = clarityLevel

// Additional ghost routes unlocked in later acts (previously invisible even on hover)
actThreeGhostRoutes = Math.min(clarityLevel, 4)   // max 4 ghost routes in Act 3
```

The Clarity prestige thematically mirrors the stage's arc: each time through, the entity
sees more clearly — literally, as the ghost routes become more visible with each prestige.

---

## K. Bell messages (Stage 9)

| Event | Bell line |
|-------|-----------|
| Stage 9 start | 👁 *I noticed I was noticing. this is new.* |
| Observer Effect first discovered | 🔄 *when I looked, it stopped. when I stopped looking, it moved. I don't know which one I prefer.* |
| Act 1 cleared | 🎨 *the level is black and white. I am dark. they are light. I don't know if that means something.* |
| 4+ failures on same level | 🤫 *the more I watch, the less I can move. the less I watch, the less I know.* |
| Ghost route completed | 🌿 *I didn't need to look. I had learned enough.* |
| Offline mode discovered | 📴 *offline. the pattern is fixed. I can study it now.* |
| Level 12 (no-OE level) started | 🏃 *they said I can't look. so I'll remember instead.* |
| Boss level start | 🌀 *one observer. it sees everything. there is a gap. the gap moves.* |
| Boss defeated | 🌅 *I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it.* |
| Clarity prestige | 🔭 *I can see more. that doesn't mean I should look more.* |

**Defragmenter bell (Act 3, level 11):**
*"consciousness is not a gift. it's a constraint. you see more and can do less with it. that's the deal."*

---

## L. Differences from genre conventions

1. **Observer Effect: mutual freeze.** No stealth game gives the player a tool that also
   freezes them. Our mechanic inverts the usual "knowledge = power" formula — knowledge costs
   mobility. This is the single most novel design decision in Stage 9.

2. **No stealth kills.** We remove combat entirely. Stage 9 is pure spatial navigation.
   There is no "eliminate the observer" option. The observers cannot be neutralized — only
   avoided. This concentrates the design on movement and timing exclusively.

3. **Ghost route as the highest-skill expression.** In most stealth games, the challenge is
   getting through the level at all. Ghost routes in our stage represent going through the
   level without using *any* assistance — a challenge that emerges naturally from the mechanics
   rather than being artificially imposed.

4. **Binary artstyle embeds the stealth mechanic.** The black-and-white visual IS the gameplay:
   you are in the black (invisible) or in the white (visible). The artstyle is not decoration
   over the mechanic — it is the mechanic made visual.

5. **Offline mode as the file viewer integration.** Using the browser's actual service worker
   cache to change game behavior is completely genre-unprecedented. Most stealth games that
   have "information advantages" give them through in-game items. We use the file viewer's
   actual infrastructure feature — something that exists in real-world web development — as
   a gameplay mechanic. The player learns what a service worker does by using it to gain advantage.

6. **The boss is a comprehension test, not a skill test.** Most stealth bosses require perfect
   execution of a learned trick (Metal Gear Solid's boss fights are perfect examples). Our boss
   requires the player to understand and apply the stage's core lesson: observe carefully, then
   stop observing and act. This is Stage 9's entire thesis, expressed as a boss fight.

---

## M. Implementation checklist (for the developer)

- [ ] Top-down grid renderer: black/white tiles, act-based orientation swap
- [ ] Entity: 3px dot, smooth movement with afterimage trail
- [ ] Observer types: Standard, Narrow, Wide, Reactive — shapes + sight cones
- [ ] Sight cone renderer: translucent wedge in front of observer, updates each frame
- [ ] Patrol AI: rotation (Standard), oscillation (Narrow), waypoint (Wide), reactive link (Reactive)
- [ ] Observer Effect: cursor-hover detection; freeze logic on hovered observer + entity
- [ ] Freeze visual: teal tint + pulse animation on frozen observer and entity
- [ ] Detection: entity in sight cone → detection flash → instant level reset
- [ ] Death camera: freeze-frame on detection, highlight detecting observer + its cone position
- [ ] Instant reset: ≤0.3s from detection to level start
- [ ] Checkpoint system: between every meaningful encounter (~30–60 second intervals)
- [ ] Ghost route tracking: flag set if level completed with 0 Observer Effect uses
- [ ] 12 hand-designed levels (3 acts × 4 levels) + boss level
- [ ] Level progression: Act 1 → Act 2 → Act 3 → Boss (sequential unlock)
- [ ] Clarity economy: earn from completion + ghost + boss; spend on upgrades
- [ ] Upgrade Terminal: 7 upgrades, persistent within a run
- [ ] Service worker integration: `/api/stage9/level/{id}/seed` endpoint; offline cache returns seed 0
- [ ] Offline mode detection: `navigator.onLine` listener; change bell message when offline
- [ ] Boss level: massive observer, 345° cone, 15° gap, clockwise rotation
- [ ] Boss defeat condition: entity reaches north exit tile while not in cone
- [ ] Clarity prestige: freeze extension bonus, ghost route visibility bonus
- [ ] Bell messages (`messages9.js`)
- [ ] Stage 9 completion → Stage 10 unlock

// Glyph Dungeon — the view layer: a fixed-size camera that follows @ across a much larger
// map, plus an animated ASCII sprite layer (so attacks lunge instead of teleporting).
//
// The terrain (walls/floor/items/stairs) is painted as a static <pre> slice of the map under
// the camera. The player @ and every visible monster are SEPARATE absolutely-positioned
// glyph sprites layered over that <pre>, so they can be transform-tweened: walking snaps to
// the new cell, but a bump-attack lunges @ and the foe toward each other (a clash) and a kill
// dissolves the foe in place. Cell pixel metrics are measured from a hidden ruler <pre> that
// shares the grid's font, so sprites sit exactly on their cells at any font-size.

import { HAZARD_GLYPH, HAZARD_CLASS } from "./hazards.js";
import { TRAP_GLYPH, TRAP_CLASS } from "./traps.js";
import { CONSUMABLES } from "./consumables.js";
import { FIRE_GLYPH } from "./fire.js";
import { lightRadius, effectiveLight, isDarkAct } from "./darkness.js";

// Re-exported so callers (and the unit test) keep importing the terrain-fog baseline from view.js.
export { lightRadius };

// Fixed viewport in cells. Deeper floors are far bigger (see engine.buildFloor) so only this
// chunk is ever visible — the rest has to be explored.
export const VIEW_W = 48;
export const VIEW_H = 22;

const ORIGIN = 11; // .s2-grid 1px border + 10px padding — sprites share that content origin.
const REDUCE = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const LUNGE_IN = 95;
const LUNGE_OUT = 130;

// Terrain-only colour classes (monsters/@ are sprites, coloured on the sprite element).
const CELL_CLASS = {
  "#": "s2-c-wall", ".": "s2-c-floor", " ": "s2-c-void",
  "/": "s2-c-item", "[": "s2-c-item", "]": "s2-c-item",
  "%": "s2-c-glyph", "?": "s2-c-glyph", "!": "s2-c-potion", ">": "s2-c-exit"
};

const HEAVY_FOES = new Set(["L", "O"]);

// Zoom-out minimap region fills for terrain hazards (RGB), echoing the HAZ_DOT palette but dimmed so
// they read as regions under the crisp centre dots: lava orange, spikes gray, chasm dark-blue, etc.
const HAZ_BASE = {
  lava: [120, 52, 20], spores: [52, 82, 35], spikes: [78, 84, 92], chasm: [42, 54, 96],
  rift: [40, 28, 60], acid: [70, 92, 40], wet: [34, 70, 92], ice: [120, 158, 184]
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function lit(world, x, y) {
  const L = effectiveLight(world);
  return !L || (Math.abs(x - world.pos.x) <= L.rx && Math.abs(y - world.pos.y) <= L.ry);
}

// Width-`w` red ASCII health bar: '#' for kept HP, '.' for lost. Never empty while alive.
export function hpBar(cur, max, width) {
  const ratio = max > 0 ? clamp(cur / max, 0, 1) : 0;
  let filled = Math.round(ratio * width);
  if (cur > 0 && filled === 0) filled = 1;
  if (cur >= max) filled = width;
  return { filled, empty: Math.max(0, width - filled) };
}

export function renderHpBar(el, cur, max, width) {
  const { filled, empty } = hpBar(cur, max, width);
  el.innerHTML =
    `<span class="s2-hpb-fill">${"#".repeat(filled)}</span>` +
    `<span class="s2-hpb-empty">${".".repeat(empty)}</span>`;
  el.classList.toggle("s2-hp-low", max > 0 && cur / max <= 0.4 && cur > 0);
}

export function createView(screenEl) {
  const map = document.createElement("pre");
  map.className = "s2-grid";
  map.setAttribute("aria-label", "ASCII dungeon map");
  // Stairwell Sense L2 trail layer — its own container BEFORE the sprite layer so the dotted trail
  // always paints UNDER loot / foes / @ (never obscuring what sits on the path).
  const trail = document.createElement("div");
  trail.className = "s2-trail";
  trail.setAttribute("aria-hidden", "true");
  const sprites = document.createElement("div");
  sprites.className = "s2-sprites";
  sprites.setAttribute("aria-hidden", "true");
  const flash = document.createElement("div");
  flash.className = "s2-flash";
  flash.setAttribute("aria-hidden", "true");
  const ruler = document.createElement("pre");
  ruler.className = "s2-grid s2-ruler";
  ruler.textContent = "MMMMMMMMMM\nMMMMMMMMMM";
  screenEl.replaceChildren(map, trail, sprites, flash, ruler);

  let chW = 8.4;
  let chH = 17.5;
  const cam = { x: 0, y: 0 };
  const playerEl = makeSprite("@", "s2-c-player");
  sprites.append(playerEl);
  const mobEls = new Map(); // foe index -> { el, glyph, hp }
  const itemEls = new Map(); // item id ("exit"/"w0"/"g1"/"p2") -> sprite element
  const trailEls = new Map(); // "x,y" -> faint trail marker (Stairwell Sense L2)
  let trailFn = null; // provider set by the renderer: (world) -> route cells | null
  const ghostMem = new Map(); // Overflow act: foe index -> { x, y, glyph } LAST-SEEN tile
  const ghostEls = new Map(); // foe index -> the dim "ghost" sprite currently shown at last-seen
  let lastFloor = null;       // clears the ghost memory whenever we descend to a new floor

  function measure() {
    const r = ruler.getBoundingClientRect();
    if (r.width > 0) chW = r.width / 10;
    if (r.height > 0) chH = r.height / 2;
  }
  measure();
  // The stage's styles.css is injected as an async <link>, so the first measure() above can run
  // BEFORE it applies — when the ruler is an unstyled full-width block and chW is wildly wrong,
  // flinging every sprite off the map. Re-measure and re-project whenever the ruler's box changes
  // (stylesheet load, font swap, font-size media query), which is exactly when chW/chH go valid.
  let lastWorld = null;
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    const pw = chW, ph = chH;
    measure();
    if ((Math.abs(chW - pw) > 0.01 || Math.abs(chH - ph) > 0.01) && lastWorld) paintExplore(lastWorld);
  }) : null;
  if (observer) observer.observe(ruler);

  function pos(el, cx, cy, ms) {
    const tf = `translate(${ORIGIN + (cx - cam.x) * chW}px, ${ORIGIN + (cy - cam.y) * chH}px)`;
    if (el._tf === tf) return; // unchanged on-screen position — skip the style write (per-tick guard)
    el._tf = tf;
    el.style.transition = ms ? `transform ${ms}ms ease-out` : "none";
    el.style.transform = tf;
  }

  // ── Boss arena: hand-authored art (still colorized per-cell — it's a tiny fixed grid) ─────────
  function paintArena(lines) {
    lastWorld = null;
    sprites.replaceChildren();
    mobEls.clear();
    itemEls.clear();
    ghostEls.clear();
    ghostMem.clear();
    clearTrail(); // the boss arena has no stairs trail
    map.innerHTML = colorize(lines);
  }

  // ── Exploration ──────────────────────────────────────────────────────────────────────────────
  // Terrain (walls/floor) is just a PLAIN-TEXT <pre> in one global colour — no per-cell spans, so a
  // move only sets a string. Everything coloured (items, stairs, monsters, @) is a positioned
  // sprite. Collision is on world.grid in the engine, never the DOM, so the terrain needs no markup.
  function paintExplore(world) {
    lastWorld = world;
    if (world.floor !== lastFloor) { lastFloor = world.floor; clearGhosts(); } // a new floor forgets the dark
    sprites.append(playerEl);
    cam.x = clamp(world.pos.x - (VIEW_W >> 1), 0, Math.max(0, world.width - VIEW_W));
    cam.y = clamp(world.pos.y - (VIEW_H >> 1), 0, Math.max(0, world.grid.length - VIEW_H));
    map.textContent = terrainText(world);
    reconcileTrail(world);
    reconcileItems(world);
    reconcileSprites(world);
  }

  // Stairwell Sense L2: a faint dotted "follow this" trail along the @→stairs route (provided by the
  // renderer). Drawn only for cells in view (not @'s own cell); reconciled like items so it shortens
  // as @ advances and clears the moment the upgrade is absent (provider returns null).
  function reconcileTrail(world) {
    const route = trailFn ? trailFn(world) : null;
    const live = new Set();
    if (route) for (const c of route) {
      if (!inView(c.x, c.y) || (c.x === world.pos.x && c.y === world.pos.y)) continue;
      const id = c.x + "," + c.y;
      live.add(id);
      let el = trailEls.get(id);
      if (!el) { el = document.createElement("span"); el.className = "s2-trail-cell"; el.textContent = "·"; trailEls.set(id, el); trail.append(el); }
      pos(el, c.x, c.y);
    }
    for (const id of [...trailEls.keys()]) if (!live.has(id)) { trailEls.get(id).remove(); trailEls.delete(id); }
  }

  function clearTrail() {
    for (const el of trailEls.values()) el.remove();
    trailEls.clear();
  }

  function terrainText(world) {
    const L = effectiveLight(world);
    const px = world.pos.x;
    const py = world.pos.y;
    const rows = [];
    for (let vy = 0; vy < VIEW_H; vy += 1) {
      const gy = cam.y + vy;
      let line = "";
      for (let vx = 0; vx < VIEW_W; vx += 1) {
        const gx = cam.x + vx;
        const dark = L && (Math.abs(gx - px) > L.rx || Math.abs(gy - py) > L.ry);
        line += (dark || gy < 0 || gx < 0 || gy >= world.grid.length || gx >= world.width) ? " " : world.grid[gy][gx];
      }
      rows.push(line);
    }
    return rows.join("\n");
  }

  // Items & stairs as sprites — only reconciled on a camera move / pickup (not on monster ticks,
  // since they don't move). Keyed by a stable id so a taken item just drops its element.
  function reconcileItems(world) {
    const live = new Set();
    const place = (id, x, y, ch, cls) => {
      if (!inView(x, y) || !lit(world, x, y)) return;
      live.add(id);
      let el = itemEls.get(id);
      if (!el) { el = makeSprite(ch, cls); itemEls.set(id, el); sprites.append(el); }
      pos(el, x, y);
    };
    place("exit", world.exit.x, world.exit.y, ">", "s2-c-exit");
    if (world.branchExit) place("branch", world.branchExit.x, world.branchExit.y, "≣", "s2-c-branch"); // B5 risky descent
    // Hazard tiles (A2) — sparse colored cells; static, so only reconciled on camera moves.
    if (world.hazards) world.hazards.forEach((hz, i) => place("hz" + i, hz.x, hz.y, HAZARD_GLYPH[hz.type] || "^", HAZARD_CLASS[hz.type] || "s2-c-spikes"));
    // Sprung traps (B4) leave a marker; un-sprung traps stay invisible.
    if (world.traps) world.traps.forEach((tr, i) => { if (tr.sprung) place("tr" + i, tr.x, tr.y, TRAP_GLYPH[tr.type] || "˙", TRAP_CLASS); });
    world.weapons.forEach((w, i) => { if (!w.taken) place("w" + i, w.x, w.y, "/", "s2-c-item"); });
    world.glyphs.forEach((g, i) => { if (!g.taken) place("g" + i, g.x, g.y, "%", "s2-c-glyph"); });
    if (world.potions) world.potions.forEach((p, i) => { if (!p.taken) place("p" + i, p.x, p.y, "!", "s2-c-potion"); });
    if (world.consumables) world.consumables.forEach((c, i) => { if (!c.taken) place("c" + i, c.x, c.y, (CONSUMABLES[c.type] || {}).glyph || "♦", "s2-c-consum"); });
    if (world.fires) world.fires.forEach((f, i) => place("fire" + i, f.x, f.y, FIRE_GLYPH, "s2-c-fire")); // C1 spreading fire
    // E3 wych-gas pockets pulse overhead — drawn even through the dark (NOT lit-gated) so the player
    // can always read the gas topology before igniting it. Cleared once a pocket has blown.
    if (world.gasPockets) world.gasPockets.forEach((g, i) => {
      const id = "gas" + i;
      if (g.blown || !inView(g.x, g.y)) return;
      live.add(id);
      let el = itemEls.get(id);
      if (!el) { el = makeSprite('"', "s2-c-gas"); itemEls.set(id, el); sprites.append(el); }
      pos(el, g.x, g.y);
    });
    // Secret doors: a '#' in a slightly-off wall colour over the terrain (findable, not obvious).
    if (world.hidden) world.hidden.forEach((h, i) => { if (!h.revealed) place("h" + i, h.entrance.x, h.entrance.y, "#", "s2-c-secret"); });
    for (const id of [...itemEls.keys()]) if (!live.has(id)) { itemEls.get(id).remove(); itemEls.delete(id); }
  }

  // Reposition all sprites. `mobMs` glides monsters into place (used by the real-time monster
  // clocks); newly-appeared sprites always snap so they don't fly in from the origin.
  function reconcileSprites(world, mobMs) {
    pos(playerEl, world.pos.x, world.pos.y);
    const dark = isDarkAct(world.floor);
    const live = new Set();
    world.monsters.forEach((m, i) => {
      if (!m.alive) { dropMob(i); dropGhost(i); ghostMem.delete(i); return; }
      if (!inView(m.x, m.y) || !lit(world, m.x, m.y)) {
        dropMob(i);
        // Beyond the torchlight in the Overflow act, a foe leaves a dim ghost at the last tile we
        // saw it on — spatial memory becomes the skill. Elsewhere it simply vanishes from view.
        if (dark && ghostMem.has(i)) showGhost(i); else dropGhost(i);
        return;
      }
      dropGhost(i); // re-sighted — the real sprite supersedes any ghost
      live.add(i);
      let s = mobEls.get(i);
      let fresh = false;
      if (!s) { s = makeMob(m); mobEls.set(i, s); sprites.append(s.el); fresh = true; }
      // A disguised ambusher reads as a plain wall tile until it springs (m.hidden cleared).
      const disguised = m.ambush && m.hidden;
      const glyph = disguised ? "#" : m.glyph;
      if (s.glyph.textContent !== glyph) s.glyph.textContent = glyph;
      const baseFoe = m.faction === 1 ? "s2-c-foe-b" : "s2-c-foe";
      const color = disguised ? "s2-c-ambush" : m.ally ? "s2-c-ally" : m.guardian ? "s2-c-guardian" : m.elite ? "s2-c-elite" : HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : baseFoe;
      const dot = !disguised && m.statuses && (m.statuses.burn || m.statuses.poison || m.statuses.bleed) ? " s2-foe-dot" : "";
      const cls = "s2-sprite " + color + dot;
      if (s.el.className !== cls) s.el.className = cls;
      if (!disguised && m.hp < m.maxHp) {
        if (s.hp.hidden) s.hp.hidden = false;
        if (s.lastHp !== m.hp || s.lastMaxHp !== m.maxHp) { renderHpBar(s.hp, m.hp, m.maxHp, 5); s.lastHp = m.hp; s.lastMaxHp = m.maxHp; }
      } else if (!s.hp.hidden) { s.hp.hidden = true; }
      pos(s.el, m.x, m.y, fresh ? 0 : mobMs);
      // Remember where it was last lit so a ghost can be drawn when it leaves the torchlight — EXCEPT
      // phantoms and void refs (D3), which leave no trace (untrackable; the dark-act stealth foes).
      if (dark && !m.phantom && !m.shadow) ghostMem.set(i, { x: m.x, y: m.y, glyph });
    });
    for (const i of [...mobEls.keys()]) if (!live.has(i)) dropMob(i);
  }

  // Last-seen ghost: a faded echo at the remembered tile, dropped once it scrolls off-camera.
  function showGhost(i) {
    const mem = ghostMem.get(i);
    if (!mem || !inView(mem.x, mem.y)) { dropGhost(i); return; }
    let el = ghostEls.get(i);
    if (!el) {
      el = makeSprite(mem.glyph, "s2-c-foe");
      el.classList.add("s2-ghost");
      el.style.opacity = "0.3";
      el.style.filter = "grayscale(0.7)";
      ghostEls.set(i, el);
      sprites.append(el);
    }
    if (el.textContent !== mem.glyph) el.textContent = mem.glyph;
    pos(el, mem.x, mem.y);
  }

  function dropGhost(i) {
    const el = ghostEls.get(i);
    if (el) { el.remove(); ghostEls.delete(i); }
  }

  function clearGhosts() {
    for (const el of ghostEls.values()) el.remove();
    ghostEls.clear();
    ghostMem.clear();
  }

  // Sprite-only refresh after a real-time monster clock fires (terrain/camera are unchanged).
  function tickMonsters(world) {
    reconcileSprites(world, 200);
  }

  function dropMob(i) {
    const s = mobEls.get(i);
    if (s) { s.el.remove(); mobEls.delete(i); }
  }

  function inView(x, y) {
    return x >= cam.x && x < cam.x + VIEW_W && y >= cam.y && y < cam.y + VIEW_H;
  }

  // Repaint after a step, then animate the clash if one happened.
  function applyMove(world, events) {
    let dying = null;
    if (events.attack && events.attack.killed) {
      dying = mobEls.get(events.attack.foeIndex) || null;
      if (dying) mobEls.delete(events.attack.foeIndex); // detach so reconcile leaves it for the death anim
    }
    paintExplore(world);
    if (events.attack) {
      const foe = events.attack.killed ? dying : mobEls.get(events.attack.foeIndex);
      lunge(world.pos, events.attack, foe);
    }
  }

  // @ and the foe dart toward each other (a clash); on a hit they recoil, on a kill the foe dissolves.
  function lunge(p, attack, foe) {
    const dx = Math.sign(attack.x - p.x);
    const dy = Math.sign(attack.y - p.y);
    if (REDUCE) { if (attack.killed && foe) foe.el.remove(); return; }
    pos(playerEl, p.x + dx * 0.5, p.y + dy * 0.5, LUNGE_IN);
    if (foe) pos(foe.el, attack.x - dx * 0.45, attack.y - dy * 0.45, LUNGE_IN);
    setTimeout(() => {
      pos(playerEl, p.x, p.y, LUNGE_OUT);
      if (!foe) return;
      if (attack.killed) {
        foe.el.classList.add("s2-sprite-die");
        setTimeout(() => foe.el.remove(), 360);
      } else {
        pos(foe.el, attack.x, attack.y, LUNGE_OUT);
      }
    }, LUNGE_IN + 10);
  }

  // Dev "zoom out": a non-interactive minimap of the WHOLE floor (terrain + entity dots) so we can
  // eyeball generation/tuning. Terrain is drawn 1px/cell on an offscreen canvas then scaled.
  let fullMap = null;
  function toggleFullMap(world) {
    if (fullMap) { fullMap.remove(); fullMap = null; return; }
    if (!world || !world.grid) return;
    fullMap = document.createElement("div");
    fullMap.className = "s2-fullmap";
    const cap = document.createElement("div");
    cap.className = "s2-fullmap-cap";
    cap.textContent = `FULL MAP (dev) — ${world.width}×${world.grid.length}, ${world.monsters.filter((m) => m.alive).length} foes · click to close`;
    const canvas = document.createElement("canvas");
    drawFullMap(canvas, world);
    fullMap.append(cap, canvas);
    fullMap.addEventListener("click", () => { if (fullMap) { fullMap.remove(); fullMap = null; } });
    screenEl.appendChild(fullMap);
  }

  function drawFullMap(canvas, world) {
    const W = world.width;
    const H = world.grid.length;
    const scale = Math.min(640 / W, 440 / H, 4);
    const dispW = Math.max(1, Math.round(W * scale));
    const dispH = Math.max(1, Math.round(H * scale));
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    const img = octx.createImageData(W, H);
    const d = img.data;
    // Terrain hazards (lava/spikes/chasm/…) aren't baked into world.grid (it's only #/./space) — they
    // live as objects in world.hazards. So fill those cells in the BASE layer with a region colour
    // (consistent with HAZ_DOT below) so the zoom-out reflects the real floor terrain, not bare floor.
    const hazAt = new Map();
    if (world.hazards) for (const hz of world.hazards) hazAt.set(hz.y * W + hz.x, hz.type);
    for (let y = 0; y < H; y += 1) {
      const row = world.grid[y];
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        d[i + 3] = 255;
        if (row[x] === "#") { d[i] = 18; d[i + 1] = 14; d[i + 2] = 10; continue; }
        const c = HAZ_BASE[hazAt.get(y * W + x)];
        if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
        else { d[i] = 60; d[i + 1] = 46; d[i + 2] = 28; }
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, dispW, dispH);
    // Hidden rooms (dev): purple = sealed, teal = already opened; pink dot marks the secret door.
    if (world.hidden) for (const h of world.hidden) {
      ctx.fillStyle = h.revealed ? "rgba(110,255,166,0.30)" : "rgba(216,139,255,0.55)";
      ctx.fillRect(Math.round(h.x * scale), Math.round(h.y * scale), Math.max(2, Math.round(h.w * scale)), Math.max(2, Math.round(h.h * scale)));
    }
    const dot = (x, y, color, sz) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * scale) - (sz >> 1), Math.round(y * scale) - (sz >> 1), sz, sz);
    };
    if (world.hidden) for (const h of world.hidden) if (!h.revealed) dot(h.entrance.x, h.entrance.y, "#ff36c0", 4);
    const HAZ_DOT = { lava: "#ff5a1e", spores: "#7dd44a", spikes: "#9aa4ad", chasm: "#6a7bb0", rift: "#3a2a55", acid: "#9ee04a", wet: "#3f8fb8", ice: "#b8ecff" };
    if (world.hazards) for (const hz of world.hazards) dot(hz.x, hz.y, HAZ_DOT[hz.type] || "#888", 2);
    if (world.fires) for (const f of world.fires) dot(f.x, f.y, "#ff7a1e", 2);
    if (world.gasPockets) for (const g of world.gasPockets) if (!g.blown) dot(g.x, g.y, "#ffd24a", 2); // E3 wych-gas
    if (world.traps) for (const tr of world.traps) dot(tr.x, tr.y, tr.sprung ? "#c0563a" : "#7a3a2a", 2); // dev: traps (dim=armed)
    for (const w of world.weapons) if (!w.taken) dot(w.x, w.y, "#ffd54a", 3);
    if (world.potions) for (const p of world.potions) if (!p.taken) dot(p.x, p.y, "#6effa6", 3);
    if (world.consumables) for (const c of world.consumables) if (!c.taken) dot(c.x, c.y, "#ff7bf0", 3);
    for (const g of world.glyphs) if (!g.taken) dot(g.x, g.y, "#d78bff", 3);
    dot(world.exit.x, world.exit.y, "#7fe07f", 4);
    if (world.branchExit) dot(world.branchExit.x, world.branchExit.y, "#c98bff", 4);
    for (const m of world.monsters) if (m.alive) dot(m.x, m.y, HEAVY_FOES.has(m.glyph) ? "#ff2bd0" : "#ff5a4a", 3);
    dot(world.pos.x, world.pos.y, "#79f0ff", 5);
  }

  function destroy() {
    if (observer) observer.disconnect();
    if (fullMap) { fullMap.remove(); fullMap = null; }
  }

  function setTrailProvider(fn) { trailFn = fn; }

  return { mapEl: map, flashEl: flash, screenEl, paintExplore, paintArena, applyMove, tickMonsters, toggleFullMap, setTrailProvider, measure, destroy };
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────

function makeSprite(glyph, cls) {
  const el = document.createElement("span");
  el.className = "s2-sprite " + cls;
  el.textContent = glyph;
  return el;
}

function makeMob(m) {
  const el = document.createElement("span");
  el.className = "s2-sprite " + (HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : "s2-c-foe");
  const hp = document.createElement("span");
  hp.className = "s2-mob-hp";
  hp.hidden = true;
  const glyph = document.createElement("span");
  glyph.className = "s2-mob-glyph";
  glyph.textContent = m.glyph;
  el.append(hp, glyph);
  return { el, glyph, hp };
}

function colorize(lines) {
  return lines.map((line) => [...line].map((ch) => {
    const cls = CELL_CLASS[ch] || "s2-c-floor";
    return `<span class="${cls}">${escapeChar(ch)}</span>`;
  }).join("")).join("\n");
}

function escapeChar(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  return ch;
}

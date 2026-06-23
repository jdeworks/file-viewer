// Glyph Dungeon — the view layer: a fixed-size camera that follows @ across a much larger
// map, plus an animated ASCII sprite layer (so attacks lunge instead of teleporting).
//
// The terrain (walls/floor/items/stairs) is painted as a static <pre> slice of the map under
// the camera. The player @ and every visible monster are SEPARATE absolutely-positioned
// glyph sprites layered over that <pre>, so they can be transform-tweened: walking snaps to
// the new cell, but a bump-attack lunges @ and the foe toward each other (a clash) and a kill
// dissolves the foe in place. Cell pixel metrics are measured from a hidden ruler <pre> that
// shares the grid's font, so sprites sit exactly on their cells at any font-size.

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
  "%": "s2-c-glyph", "?": "s2-c-glyph", ">": "s2-c-exit"
};

const HEAVY_FOES = new Set(["L", "O"]);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
  el.classList.toggle("s2-hp-low", max > 0 && cur / max <= 0.25 && cur > 0);
}

export function createView(screenEl) {
  const map = document.createElement("pre");
  map.className = "s2-grid";
  map.setAttribute("aria-label", "ASCII dungeon map");
  const sprites = document.createElement("div");
  sprites.className = "s2-sprites";
  sprites.setAttribute("aria-hidden", "true");
  const flash = document.createElement("div");
  flash.className = "s2-flash";
  flash.setAttribute("aria-hidden", "true");
  const ruler = document.createElement("pre");
  ruler.className = "s2-grid s2-ruler";
  ruler.textContent = "MMMMMMMMMM\nMMMMMMMMMM";
  screenEl.replaceChildren(map, sprites, flash, ruler);

  let chW = 8.4;
  let chH = 17.5;
  const cam = { x: 0, y: 0 };
  const playerEl = makeSprite("@", "s2-c-player");
  sprites.append(playerEl);
  const mobEls = new Map(); // foe index -> { el, glyph, hp }

  function measure() {
    const r = ruler.getBoundingClientRect();
    if (r.width > 0) chW = r.width / 10;
    if (r.height > 0) chH = r.height / 2;
  }
  measure();
  const onResize = () => { measure(); };
  window.addEventListener("resize", onResize);

  function pos(el, cx, cy, ms) {
    el.style.transition = ms ? `transform ${ms}ms ease-out` : "none";
    el.style.transform = `translate(${ORIGIN + (cx - cam.x) * chW}px, ${ORIGIN + (cy - cam.y) * chH}px)`;
  }

  // ── Boss arena: hand-authored art, no camera/sprites ──────────────────────────────────────
  function paintArena(lines) {
    sprites.replaceChildren();
    mobEls.clear();
    map.innerHTML = colorize(lines);
  }

  // ── Exploration: terrain slice + reconciled sprites ───────────────────────────────────────
  function paintExplore(world) {
    sprites.append(playerEl);
    cam.x = clamp(world.pos.x - (VIEW_W >> 1), 0, Math.max(0, world.width - VIEW_W));
    cam.y = clamp(world.pos.y - (VIEW_H >> 1), 0, Math.max(0, world.grid.length - VIEW_H));
    map.innerHTML = colorize(terrainSlice(world));
    reconcileSprites(world);
  }

  function terrainSlice(world) {
    const items = new Set();
    for (const g of world.glyphs) if (!g.taken) items.add(key(g.x, g.y) + ":%");
    for (const w of world.weapons) if (!w.taken) items.add(key(w.x, w.y) + ":/");
    const overlay = new Map();
    for (const it of items) { const [k, ch] = it.split(":"); overlay.set(k, ch); }
    overlay.set(key(world.exit.x, world.exit.y), ">");
    const rows = [];
    for (let vy = 0; vy < VIEW_H; vy += 1) {
      const gy = cam.y + vy;
      let line = "";
      for (let vx = 0; vx < VIEW_W; vx += 1) {
        const gx = cam.x + vx;
        if (gy < 0 || gx < 0 || gy >= world.grid.length || gx >= world.width) { line += " "; continue; }
        line += overlay.get(key(gx, gy)) || world.grid[gy][gx];
      }
      rows.push(line);
    }
    return rows;
  }

  function reconcileSprites(world) {
    pos(playerEl, world.pos.x, world.pos.y);
    const live = new Set();
    world.monsters.forEach((m, i) => {
      if (!m.alive || !inView(m.x, m.y)) { dropMob(i); return; }
      live.add(i);
      let s = mobEls.get(i);
      if (!s) { s = makeMob(m); mobEls.set(i, s); sprites.append(s.el); }
      s.glyph.textContent = m.glyph;
      s.el.className = "s2-sprite " + (HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : "s2-c-foe");
      if (m.hp < m.maxHp) { s.hp.hidden = false; renderHpBar(s.hp, m.hp, m.maxHp, 5); } else s.hp.hidden = true;
      pos(s.el, m.x, m.y);
    });
    for (const i of [...mobEls.keys()]) if (!live.has(i)) dropMob(i);
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

  function destroy() {
    window.removeEventListener("resize", onResize);
  }

  return { mapEl: map, flashEl: flash, screenEl, paintExplore, paintArena, applyMove, measure, destroy };
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────
function key(x, y) { return x + "," + y; }

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

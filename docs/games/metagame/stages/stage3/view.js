// Stage 3 DOM shell (the in-modal Memory Grid layout) — split out of renderer.js to keep that file
// focused on game logic. Pure markup: returns the root <section> with all data-field/data-action
// hooks the renderer wires up. No state, no listeners.
//
// UX audit 2026-07 layout: HUD shows ONE currency (registers — retained fragments moved to the boss
// chip as progress, M2); no standalone shop button (folded into the acquire draft, M1); the keybinding
// wall lives behind the ❓ toggle (M3/#5); and THE MEMORY LEAK boss is STAGED (#2) — a one-line chip
// early, its body at corruption ≥ 4, its restoration controls only at the corruption-8 gate. All the
// staged nodes are present in the DOM (the renderer toggles their visibility) so the boss-lock state is
// always queryable.

export function buildStage3Shell() {
  const root = document.createElement("section");
  root.className = "stage3-memory-grid";
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>SNAPSHOT <span data-field="snap"></span></span>
      <span class="s3-pressure" data-field="pressure"></span>
      <span class="s3-size" data-field="size"></span>
      <button type="button" class="s3-help-toggle" data-action="help" aria-expanded="false" aria-label="controls" title="controls">?</button>
    </header>
    <div class="s3-objective" data-field="objective"></div>
    <div class="s3-help" data-field="help" hidden>arrows / WASD move · space/1 fill A · 2 fill B (alt-click) · x mark · l lock volatile · click fills, right-click marks · on touch: pick a verb below then tap a cell.</div>
    <div class="s3-play">
      <div class="s3-grid-col">
        <div class="s3-grid-host"></div>
        <div class="s3-toolbar">
          <button type="button" data-action="draft" data-field="draftBtn" hidden></button>
          <button type="button" data-action="hint" data-field="hintBtn" hidden></button>
          <button type="button" data-action="check" data-field="checkBtn" hidden></button>
        </div>
      </div>
      <aside class="s3-side">
        <section class="s3-boss" data-field="bossPanel">
          <div class="s3-boss-chip" data-field="bossChip"></div>
          <div class="s3-boss-body" data-field="bossBody" hidden>
            <div class="s3-boss-title">THE MEMORY LEAK</div>
            <div data-field="bossStatus"></div>
            <div class="s3-hint" data-field="hint"></div>
          </div>
          <div class="s3-boss-gate" data-field="bossGate" hidden>
            <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
            <div class="s3-controls">
              <button type="button" data-action="v1">open memory_v1.log</button>
              <button type="button" data-action="v2">open memory_v2.log</button>
              <button type="button" data-action="v3">open memory_v3.log</button>
              <button type="button" data-action="restore">restore key</button>
              <button type="button" data-action="boss">solve leak</button>
              <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
            </div>
          </div>
        </section>
      </aside>
    </div>
    <ol class="s3-log"></ol>
  `;
  return root;
}

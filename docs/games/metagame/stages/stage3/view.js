// Stage 3 DOM shell (the in-modal Memory Grid layout) — split out of renderer.js to keep that file
// focused on game logic. Pure markup: returns the root <section> with all data-field/data-action
// hooks the renderer wires up. No state, no listeners.

export function buildStage3Shell() {
  const root = document.createElement("section");
  root.className = "stage3-memory-grid";
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>RETAINED <span data-field="retained"></span></span>
      <span>SNAPSHOT <span data-field="snap"></span></span>
      <span class="s3-pressure" data-field="pressure"></span>
      <span data-field="size"></span>
    </header>
    <div class="s3-objective" data-field="objective"></div>
    <div class="s3-play">
      <div class="s3-grid-col">
        <div class="s3-grid-host"></div>
        <div class="s3-toolbar">
          <button type="button" data-action="shop">defrag shop</button>
          <button type="button" data-action="draft" data-field="draftBtn" hidden></button>
          <button type="button" data-action="hint" data-field="hintBtn" hidden></button>
          <button type="button" data-action="check" data-field="checkBtn" hidden></button>
        </div>
      </div>
      <aside class="s3-side">
        <div class="s3-help">arrows / WASD move · space/1 fill A · 2 fill B (alt-click) · x mark · l lock volatile · click fills, right-click marks · on touch: pick a verb above then tap a cell</div>
        <section class="s3-boss">
          <div class="s3-boss-title">THE MEMORY LEAK</div>
          <div data-field="bossStatus"></div>
          <div class="s3-hint" data-field="hint"></div>
          <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
          <div class="s3-controls">
            <button type="button" data-action="v1">open memory_v1.log</button>
            <button type="button" data-action="v2">open memory_v2.log</button>
            <button type="button" data-action="v3">open memory_v3.log</button>
            <button type="button" data-action="restore">restore key</button>
            <button type="button" data-action="boss">solve leak</button>
            <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
          </div>
        </section>
      </aside>
    </div>
    <ol class="s3-log"></ol>
  `;
  return root;
}

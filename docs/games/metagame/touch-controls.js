// Shared metagame on-screen control component (generalises Stage 2's `.s2-dpad`). Renders tappable
// buttons that dispatch the SAME action a key press would, so real-time / keyboard-driven stages stay
// playable by touch. Two optional parts: a 4-way D-PAD and a labelled ACTION CLUSTER (which can act as
// a single-select verb TOGGLE). The root is `.mg-touch` — display:none on desktop, shown only on touch
// / small screens via the `@media (max-width:760px),(pointer:coarse)` rule in docs/assets/games.css.
//
//   const c = createTouchControls({
//     dpad: { left:'ArrowLeft', right:'ArrowRight', up:{id:'ArrowUp',label:'HI'}, down:{id:'ArrowDown',label:'LO'} },
//     buttons: [{ id:'mark', label:'Mark' }], toggle: true,
//     onAction: (id) => { ... },   // id === the tapped button's action id
//   });
//   host.append(c.el);             // c.setActive(id) / c.getActive() / c.setEnabled(id,on) / c.destroy()
//
// Stages drive visibility (e.g. only while a race is live) by toggling `c.el.hidden`; the CSS keys off
// `.mg-touch:not([hidden])` so `hidden=true` always wins and desktop stays hidden regardless.

const DPAD_DIRS = [
  ["up", "▲", "up"],
  ["left", "◀", "left"],
  ["down", "▼", "down"],
  ["right", "▶", "right"],
];

export function createTouchControls(opts = {}) {
  const { dpad = null, buttons = null, toggle = false, onAction, ariaLabel = "touch controls" } = opts;
  const root = document.createElement("div");
  root.className = "mg-touch" + (opts.className ? " " + opts.className : "");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", ariaLabel);

  if (dpad) {
    const pad = document.createElement("div");
    pad.className = "mg-touch-dpad";
    for (const [dir, glyph, name] of DPAD_DIRS) {
      const cfg = dpad[dir];
      if (!cfg) continue;
      const cfgObj = typeof cfg === "object" ? cfg : {};
      pad.append(mkBtn({
        id: typeof cfg === "string" ? cfg : cfgObj.id,
        label: cfgObj.label || glyph,
        ariaLabel: cfgObj.ariaLabel || name,
        cls: "mg-touch-" + dir,
      }));
    }
    root.append(pad);
  }

  const btnEls = new Map();
  let activeId = null;
  if (buttons && buttons.length) {
    const cluster = document.createElement("div");
    cluster.className = "mg-touch-actions";
    for (const def of buttons) {
      const b = mkBtn(def);
      cluster.append(b);
      btnEls.set(def.id, b);
    }
    root.append(cluster);
    if (toggle) setActive(buttons[0].id);
  }

  function setActive(id) {
    if (!toggle || !btnEls.has(id)) return;
    activeId = id;
    for (const [bid, el] of btnEls) el.classList.toggle("mg-touch-on", bid === id);
  }

  function setEnabled(id, on) {
    const el = btnEls.get(id);
    if (el) el.disabled = !on;
  }

  function onClick(e) {
    const btn = e.target.closest("button[data-touch]");
    if (!btn || !root.contains(btn) || btn.disabled) return;
    e.preventDefault();
    const id = btn.dataset.touch;
    if (toggle && btnEls.has(id)) setActive(id);
    onAction?.(id, btn);
  }
  root.addEventListener("click", onClick);

  return {
    el: root,
    setActive,
    getActive: () => activeId,
    setEnabled,
    destroy() { root.removeEventListener("click", onClick); root.remove(); },
  };
}

function mkBtn({ id, label, ariaLabel, cls }) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mg-touch-btn" + (cls ? " " + cls : "");
  b.dataset.touch = id;
  if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
  b.textContent = label;
  return b;
}

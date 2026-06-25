// Tabbed grouping for the image-editor toolbar. The flat control bar is split into
// labelled panels (Common / Draw / Text / Adjust / Size / Background) so only one
// tool's options show at a time — the rest live one click away instead of all in a
// wall of buttons. Undo/redo + the dirty indicator stay persistently visible.
//
// Styling is injected once from here (a lane-owned <style>) because the shared
// .imgv-* rules live in docs/assets/preview-chrome.css, which this lane doesn't own.

const STYLE_ID = 'imgv-tabs-css';
const CSS = `
.imgv-tabs{flex-basis:100%;display:flex;flex-wrap:wrap;gap:2px;align-items:center;border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:2px;}
.imgv-edit-tools .imgv-tab{font-size:12px;padding:3px 11px;border:1px solid transparent;border-bottom:none;background:transparent;color:var(--fg);opacity:.62;border-radius:6px 6px 0 0;cursor:pointer;}
.imgv-edit-tools .imgv-tab:hover{opacity:1;background:var(--bg);}
.imgv-edit-tools .imgv-tab.active{opacity:1;font-weight:600;color:var(--accent);border-color:var(--border);background:var(--bg);}
.imgv-tools-persist{margin-left:auto;display:inline-flex;gap:4px;align-items:center;}
.imgv-tabpanel{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.imgv-tabpanel[hidden]{display:none;}
.imgv-tab-hint{animation:imgv-tab-blink .7s ease-in-out 3;}
@keyframes imgv-tab-blink{0%,100%{background:transparent;color:var(--fg);}50%{background:var(--accent);color:var(--bg);}}
@media (prefers-reduced-motion: reduce){.imgv-tab-hint{animation:none;}}
/* Mode buttons stay together as one compact row; the edit toolbar drops to its
   own full-width row below so its changing length never nudges view controls. */
.imgv-mode-col{display:inline-flex;flex-direction:row;flex-wrap:nowrap;gap:4px;align-self:center;}
.imgv-mode-col button{white-space:nowrap;}
.imgv-edit-tools{flex-basis:100%;}
/* Checkerboard behind the image so transparent pixels read as transparent. */
.imgv-img.imgv-checker{background-image:linear-gradient(45deg,#b4b4b4 25%,transparent 25%),linear-gradient(-45deg,#b4b4b4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#b4b4b4 75%),linear-gradient(-45deg,transparent 75%,#b4b4b4 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

// Link a "proxy" control to its canonical sibling so the same action appears in
// both the Common tab and the tool's own tab. data-link="<canonical-class>".
// Buttons forward clicks and mirror the canonical's active state; inputs/selects
// two-way sync their value, so the field reads the same wherever the user edits it.
function linkProxy(host, proxy) {
  const target = host.querySelector('.' + proxy.dataset.link);
  if (!target) { proxy.hidden = true; return; }
  if (proxy.tagName === 'INPUT' || proxy.tagName === 'SELECT') {
    proxy.value = target.value;
    proxy.addEventListener('input', () => { target.value = proxy.value; target.dispatchEvent(new Event('input', { bubbles: true })); });
    target.addEventListener('input', () => { if (proxy.value !== target.value) proxy.value = target.value; });
  } else {
    proxy.addEventListener('click', (e) => { e.preventDefault(); target.click(); });
    // Mirror both active state and visibility so transient buttons (crop/BG
    // apply+cancel) show in the tab exactly when their canonical does.
    const sync = () => { proxy.classList.toggle('active', target.classList.contains('active')); proxy.hidden = target.hidden; };
    new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ['class', 'hidden'] });
    sync();
  }
}

// Wire the tab bar inside `host`: clicking a tab shows its panel and hides the rest.
// On mount the non-active tabs pulse a few times so the user notices the extra
// options; the hint clears the first time any tab is clicked.
export function mountTabs(host) {
  const tabs = [...host.querySelectorAll('.imgv-tab')];
  const panels = [...host.querySelectorAll('.imgv-tabpanel')];
  if (!tabs.length) return { showTab() {} };
  injectStyle();

  const showTab = (name) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    panels.forEach((p) => { p.hidden = p.dataset.tab !== name; });
  };
  const clearHint = () => host.querySelectorAll('.imgv-tab-hint').forEach((t) => t.classList.remove('imgv-tab-hint'));

  tabs.forEach((t) => t.addEventListener('click', () => { showTab(t.dataset.tab); clearHint(); }));
  // A control in Common whose fine-tuning lives in another tab (Filters/Resize/BG)
  // carries data-go-tab — clicking it also jumps to that tab so its options show.
  host.querySelectorAll('[data-go-tab]').forEach((el) => el.addEventListener('click', () => { showTab(el.dataset.goTab); clearHint(); }));
  // Linked proxy controls (each tool button appears in both Common and its own tab).
  host.querySelectorAll('[data-link]').forEach((el) => linkProxy(host, el));
  showTab(tabs[0].dataset.tab);           // Common first
  tabs.slice(1).forEach((t) => t.classList.add('imgv-tab-hint'));   // hint: there's more behind these
  return { showTab };
}

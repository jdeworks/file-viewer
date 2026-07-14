// Format toolbars (JSON / YAML / XML / TOML) for the raw editor: Format / Minify / Validate
// actions plus the inline validity indicator. Extracted from rawpane.js for modularity.
// The stateless toolbar geometry helper is shared with the bundled raw-pane controller.
import { state, $, toast } from './state.js';
import { loadGlobal, vendor } from './script-loader.js';
import { syncHasToolsClass } from './rawpane-shared.js';
import { getTrimMode, setTrimMode, lineTransformFor, b64encode, b64decode } from './text-utils.js';

// ── JSON toolbar ──────────────────────────────────────────────────────────────
export function setJsonToolsVisible(visible) {
  const el = $('jsonTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('jsonValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireJsonTools() {
  const el = $('jsonTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-json-action]')?.dataset.jsonAction;
    if (!action) return;
    runJsonAction(action);
  });
}

function updateJsonValidation(valid, errorMsg) {
  const indicator = $('jsonValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid' : ('✗ ' + (errorMsg || 'Invalid JSON'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

function runJsonAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  if (action === 'format') {
    // Try Monaco's built-in formatter first (honours per-language settings)
    const formatted = state.rawview.format?.();
    if (formatted && typeof formatted.then === 'function') {
      formatted.catch(() => {
        try {
          state.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
        } catch (err) {
          toast('Cannot format: ' + (err.message || 'invalid JSON'));
        }
      });
      return;
    }
    // Fallback: manual pretty-print
    try {
      state.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid JSON'));
    }
  } else if (action === 'minify') {
    try {
      state.rawview.setValue(JSON.stringify(JSON.parse(text)));
    } catch (err) {
      toast('Cannot minify: ' + (err.message || 'invalid JSON'));
    }
  } else if (action === 'validate') {
    try {
      JSON.parse(text);
      updateJsonValidation(true, null);
    } catch (err) {
      updateJsonValidation(false, err.message);
    }
  }
}

// ── YAML toolbar ──────────────────────────────────────────────────────────────
export function setYamlToolsVisible(visible) {
  const el = $('yamlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('yamlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireYamlTools() {
  const el = $('yamlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('yamlFormatBtn')?.addEventListener('click', () => runYamlAction('format'));
  $('yamlValidateBtn')?.addEventListener('click', () => runYamlAction('validate'));
}

function updateYamlValidation(valid, message) {
  const indicator = $('yamlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid YAML' : ('✗ ' + (message || 'Invalid YAML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

async function runYamlAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  let jsyaml;
  try {
    jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  } catch (err) {
    toast('Could not load js-yaml: ' + (err.message || err));
    return;
  }
  if (action === 'format') {
    try {
      const parsed = jsyaml.load(text);
      state.rawview.setValue(jsyaml.dump(parsed, { indent: 2 }));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid YAML'));
    }
  } else if (action === 'validate') {
    try {
      jsyaml.load(text);
      updateYamlValidation(true, null);
    } catch (err) {
      updateYamlValidation(false, (err.message || 'invalid YAML').slice(0, 80));
    }
  }
}

// ── XML toolbar ───────────────────────────────────────────────────────────────
export function setXmlToolsVisible(visible) {
  const el = $('xmlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('xmlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireXmlTools() {
  const el = $('xmlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('xmlFormatBtn')?.addEventListener('click', () => runXmlAction('format'));
  $('xmlValidateBtn')?.addEventListener('click', () => runXmlAction('validate'));
}

function updateXmlValidation(valid, message) {
  const indicator = $('xmlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid XML' : ('✗ ' + (message || 'Invalid XML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

function formatXml(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  const err = doc.querySelector('parseerror, parsererror');
  if (err) throw new Error(err.textContent.split('\n')[0].trim());
  const raw = new XMLSerializer().serializeToString(doc);
  let indent = 0;
  return raw
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => {
      if (line.match(/^<\/\w/)) indent--;
      const result = '  '.repeat(Math.max(0, indent)) + line.trim();
      if (line.match(/^<\w[^>]*[^/]>$/) && !line.match(/<.*<.*>/)) indent++;
      return result;
    })
    .join('\n');
}

function runXmlAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  if (action === 'format') {
    try {
      state.rawview.setValue(formatXml(text));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid XML'));
    }
  } else if (action === 'validate') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const err = doc.querySelector('parseerror, parsererror');
      if (err) throw new Error(err.textContent.split('\n')[0].trim());
      updateXmlValidation(true, null);
    } catch (err) {
      updateXmlValidation(false, (err.message || 'Invalid XML').slice(0, 80));
    }
  }
}

// ── TOML toolbar ──────────────────────────────────────────────────────────────
export function setTomlToolsVisible(visible) {
  const el = $('tomlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('tomlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireTomlTools() {
  const el = $('tomlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('tomlValidateBtn')?.addEventListener('click', async () => {
    if (!state.rawview) return;
    try {
      const { parseTOML } = await import('../types/text/toml/toml.js');
      parseTOML(state.rawview.getValue());
      updateTomlValidation(true, '');
    } catch (e) {
      updateTomlValidation(false, (e.message || 'Invalid TOML').slice(0, 80));
    }
  });
}

function updateTomlValidation(valid, message) {
  const indicator = $('tomlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid TOML' : ('✗ ' + (message || 'Invalid TOML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

// ── Text utilities toolbar ────────────────────────────────────────────────────
// Independent of the format toolbars above: uses its own has-textutils class, not
// syncHasToolsClass (it can co-exist as a second row with a type-specific toolbar).
export function setTextUtilsVisible(visible) {
  const el = $('textUtils');
  if (!el) return;
  el.hidden = !visible;
  $('rawPane')?.classList.toggle('has-textutils', visible);
}

export function wireTextUtils() {
  const el = $('textUtils');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    // The trim-mode split button opens its own dropdown, not a text-util action.
    if (e.target.closest('#trimModeBtn')) { toggleTrimModeMenu($('trimModeBtn')); return; }
    const btn = e.target.closest('[data-textutil]');
    if (!btn) return;
    applyTextUtil(btn.dataset.textutil);
  });
  updateTrimModeLabel();
}

// ── Trim mode (whitespace-only vs. also drop blank lines) ──
// Storage + transform logic live in text-utils.js (shared with the side-by-side pane toolbar);
// this module owns only the split-button label + dropdown UI around them.
function applyTrimMode(mode) {
  setTrimMode(mode);
  updateTrimModeLabel();
}
function updateTrimModeLabel() {
  const btn = $('trimModeBtn');
  if (!btn) return;
  const mode = getTrimMode();
  btn.textContent = (mode === 'ws+lines' ? 'Whitespace + lines' : 'Whitespace') + ' ▾';
  btn.dataset.mode = mode;
}

let _trimMenu = null;
function closeTrimMenu() {
  if (_trimMenu) { _trimMenu.remove(); _trimMenu = null; }
  document.removeEventListener('mousedown', onTrimMenuOutside, true);
}
function onTrimMenuOutside(e) {
  if (_trimMenu && !_trimMenu.contains(e.target) && e.target.id !== 'trimModeBtn') closeTrimMenu();
}
function toggleTrimModeMenu(btn) {
  if (!btn) return;
  if (_trimMenu) { closeTrimMenu(); return; }
  const menu = document.createElement('div');
  menu.className = 'tu-mode-menu';
  for (const [mode, label] of [['ws', 'Trim whitespace'], ['ws+lines', 'Trim whitespace + blank lines']]) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tu-mode-item' + (getTrimMode() === mode ? ' active' : '');
    item.textContent = label;
    item.addEventListener('click', () => { applyTrimMode(mode); closeTrimMenu(); });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  menu.style.left = Math.round(r.left) + 'px';
  menu.style.top = Math.round(r.bottom + 2) + 'px';
  _trimMenu = menu;
  setTimeout(() => document.addEventListener('mousedown', onTrimMenuOutside, true), 0);
}

function applyTextUtil(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  let result;

  // Line-based utilities: operate on the SELECTION when one exists (expanded to whole
  // lines), else the whole document — both via undoable Monaco edits so Ctrl+Z works.
  const lineFn = lineTransformFor(action);
  if (lineFn) {
    const fn = (t) => lineFn(t.split('\n')).join('\n');
    const range = state.rawview.selectionRange?.();
    if (range && !range.isEmpty?.()) {
      // Keep the (line-expanded) selection highlighted over the transformed block.
      state.rawview.transformSelection(fn, { expandToLines: true, selectInserted: true });
    } else {
      state.rawview.transformAll(fn);
    }
    return;
  }

  if (action === 'b64encode') {
    const sel = state.rawview.selectionText?.();
    const target = (sel && sel.trim()) ? sel : text;
    try {
      const encoded = b64encode(target);
      if (sel && sel.trim()) {
        state.rawview.replaceSelection(encoded);
        return;
      }
      result = encoded;
    } catch (e) { toast('Base64 encode failed: ' + e.message); return; }
  } else if (action === 'b64decode') {
    const sel = state.rawview.selectionText?.();
    const target = ((sel && sel.trim()) ? sel : text).trim();
    try {
      const decoded = b64decode(target);
      if (sel && sel.trim()) {
        state.rawview.replaceSelection(decoded);
        return;
      }
      result = decoded;
    } catch (e) { toast('Not valid Base64'); return; }
  }

  if (result !== undefined && result !== text) {
    // Undoable whole-document replace (preserves Ctrl+Z), not setValue().
    state.rawview.transformAll(() => result);
  }
}

// Settings system (WP03): model resolution, preset handling, persistence, migration,
// and descriptor-driven UI. Hidden fields never render. Presets are explicit per-type
// (declared in index.js settings.presets) — no directory listing needed.
import { descriptorsFor, applyMonacoOptions, GLOBAL_KEYS, CATEGORY_ORDER, CATEGORY_LABEL, CATEGORY_OPEN } from './settings-schema.js';

const SETTINGS_VERSION = 1;
const typeKey = (id) => 'fv:settings:type:' + id;
const GLOBAL_KEY = 'fv:settings:global';

function readSaved(key) {
  try {
    const o = JSON.parse(localStorage.getItem(key) || 'null');
    if (!o || typeof o.values !== 'object') return null;
    // Migration strategy: keep only keys that still exist (validated against descriptors
    // by the caller). Version retained for future explicit migrations.
    return o.values;
  } catch { return null; }
}

// Filter a value bag to only keys present in `descriptors` (drops removed settings).
function knownOnly(values, descriptors) {
  const keys = new Set(descriptors.map((d) => d.key));
  const out = {};
  for (const k of Object.keys(values || {})) if (keys.has(k)) out[k] = values[k];
  return out;
}

async function fetchPresets(type, descriptors) {
  const generated = await fetchPresetsFromGenerated(type, descriptors);
  if (generated) return generated;
  return fetchPresetsFromUrls(type, descriptors);
}

let generatedDefaultsPromise = null;
async function loadGeneratedDefaults() {
  if (!generatedDefaultsPromise) {
    generatedDefaultsPromise = fetch(new URL('./settings-defaults.generated.json', import.meta.url))
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null);
  }
  return generatedDefaultsPromise;
}

async function fetchPresetsFromGenerated(type, descriptors) {
  const generated = await loadGeneratedDefaults();
  const entry = generated?.types?.[type.id];
  if (!entry) return null;
  const descriptorDefaults = {};
  for (const d of descriptors) descriptorDefaults[d.key] = d.default;
  const defaults = { ...descriptorDefaults, ...knownOnly(entry.defaults, descriptors) };
  const presets = (entry.presets || []).map((p) => ({
    id: p.id,
    label: p.label || p.id,
    values: { ...defaults, ...knownOnly(p.values, descriptors) },
  }));
  return presets.length ? { defaults, presets } : null;
}

async function fetchPresetsFromUrls(type, descriptors) {
  const defaults = {};
  for (const d of descriptors) defaults[d.key] = d.default;
  const declared = type.settings?.presets || [{ id: 'default', label: 'Default', url: type.settingsUrl }];
  const presets = [];
  for (const p of declared) {
    try {
      const json = await (await fetch(p.url)).json();
      presets.push({ id: p.id, label: p.label || json.label || p.id, values: { ...defaults, ...knownOnly(json.values, descriptors) } });
    } catch {
      presets.push({ id: p.id, label: p.label || p.id, values: { ...defaults } });
    }
  }
  return { defaults, presets };
}

function matchPreset(values, presets, descriptors) {
  const keys = descriptors.map((d) => d.key);
  for (const p of presets) if (keys.every((k) => values[k] === p.values[k])) return p.id;
  return 'custom';
}

export async function buildModel(type) {
  const descriptors = descriptorsFor(type);
  const { defaults, presets } = await fetchPresets(type, descriptors);
  const base = presets.find((p) => p.id === 'default') || presets[0];
  const globalSaved = knownOnly(readSaved(GLOBAL_KEY), descriptors);
  const typeSaved = knownOnly(readSaved(typeKey(type.id)), descriptors);
  const values = { ...defaults, ...(base?.values || {}), ...globalSaved, ...typeSaved };
  const model = { type, descriptors, defaults, presets, values, selectedPresetId: 'custom' };
  model.selectedPresetId = matchPreset(values, presets, descriptors);
  return model;
}

// Built models are cached per type for the session: the defaults/presets are fetched
// once (small JSON, but no reason to re-fetch on every file click) and in-session tweaks
// persist when you switch between files of the same type. Use getModel(), not buildModel().
const modelCache = new Map();
export async function getModel(type) {
  let m = modelCache.get(type.id);
  if (!m) { m = await buildModel(type); modelCache.set(type.id, m); }
  return m;
}
// Warm every type's settings during idle so the first open of any type is instant.
export function preloadModels(types) {
  return Promise.allSettled(types.map((t) => getModel(t)));
}

export function monacoOptions(model) { return applyMonacoOptions(model.values); }

export function persist(model, scope) {
  const visible = model.descriptors.map((d) => d.key);
  if (scope === 'type') {
    const values = {};
    for (const k of visible) values[k] = model.values[k];
    localStorage.setItem(typeKey(model.type.id), JSON.stringify({ version: SETTINGS_VERSION, values }));
  } else if (scope === 'global') {
    // Global = editor options + general app prefs (viewer settings stay type-specific).
    const values = {};
    for (const k of visible) if (GLOBAL_KEYS.has(k)) values[k] = model.values[k];
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ version: SETTINGS_VERSION, values }));
  }
}

// Persist a single global key (merging into the existing global bag) without saving the
// whole editor config. Used for instant prefs like "show all file types".
export function persistGlobalKey(key, value) {
  if (!GLOBAL_KEYS.has(key)) return;
  const cur = readSaved(GLOBAL_KEY) || {};
  cur[key] = value;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify({ version: SETTINGS_VERSION, values: cur }));
}

// Persist a single key for a specific type (merging into that type's saved bag).
export function persistTypeKey(typeId, key, value) {
  const k = typeKey(typeId);
  const cur = readSaved(k) || {};
  cur[key] = value;
  localStorage.setItem(k, JSON.stringify({ version: SETTINGS_VERSION, values: cur }));
}

// Read a single global pref straight from storage (no model needed). Returns `fallback`
// if unset. Used at startup to apply prefs like "reduce motion" before any model loads.
export function readGlobalKey(key, fallback) {
  const cur = readSaved(GLOBAL_KEY);
  return cur && key in cur ? cur[key] : fallback;
}

// Recompute which preset (if any) the current values match. Call after mutating values
// outside the settings UI (e.g. dragging the split divider changes previewMaxWidth).
export function syncModelPreset(model) {
  model.selectedPresetId = matchPreset(model.values, model.presets, model.descriptors);
}

/* ─────────────────────────── UI ─────────────────────────── */

const groupOpenState = new Map();

// onChange(model) fires after any value/preset change so the app re-applies to editor+preview.
export function renderSettings(container, model, { onChange, toast }) {
  container.innerHTML = '';

  // Preset row
  const presetRow = document.createElement('div');
  presetRow.className = 'set-row';
  const presetLabel = document.createElement('label'); presetLabel.textContent = 'Preset';
  const presetSel = document.createElement('select');
  presetSel.className = 'set-preset';   // stable hook (other panels may inject their own <select>s)
  for (const p of model.presets) presetSel.add(new Option(p.label, p.id));
  presetSel.add(new Option('Custom', 'custom'));
  presetSel.value = model.selectedPresetId;
  presetSel.onchange = () => {
    const p = model.presets.find((x) => x.id === presetSel.value);
    if (p) { model.values = { ...p.values }; model.selectedPresetId = p.id; rebuild(); onChange(model); }
  };
  presetRow.append(presetLabel, presetSel);
  container.appendChild(presetRow);

  const groupsHost = document.createElement('div');
  container.appendChild(groupsHost);

  function syncPreset() {
    model.selectedPresetId = matchPreset(model.values, model.presets, model.descriptors);
    presetSel.value = model.selectedPresetId;
  }

  function control(d, id) {
    const v = model.values[d.key];
    let el;
    if (d.type === 'bool') {
      el = document.createElement('input'); el.type = 'checkbox'; el.checked = !!v;
      el.onchange = () => set(d.key, el.checked);
    } else if (d.type === 'number') {
      el = document.createElement('input'); el.type = 'number'; el.value = v;
      if (d.min != null) el.min = d.min; if (d.max != null) el.max = d.max;
      el.onchange = () => set(d.key, clampNum(Number(el.value), d));
    } else if (d.type === 'textarea') {
      el = document.createElement('textarea');
      el.rows = 4; el.spellcheck = false;
      el.style.fontFamily = 'monospace'; el.style.resize = 'vertical'; el.style.width = '100%';
      el.value = String(v ?? '');
      el.onchange = () => set(d.key, el.value);
    } else { // select
      el = document.createElement('select');
      for (const o of d.options) {
        const value = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : o;
        el.add(new Option(String(label), String(value)));
      }
      el.value = String(v);
      el.onchange = () => set(d.key, coerce(el.value, v));
    }
    if (id) el.id = id;
    return el;
  }

  function set(key, val) { model.values[key] = val; syncPreset(); onChange(model, key); }

  function rebuild() {
    groupsHost.innerHTML = '';
    for (const cat of CATEGORY_ORDER) {
      const items = model.descriptors.filter((d) => d.category === cat);
      if (!items.length) continue;
      const det = document.createElement('details');
      det.className = 'set-group';
      det.open = groupOpenState.has(cat) ? groupOpenState.get(cat) : CATEGORY_OPEN[cat] !== false;
      const sum = document.createElement('summary'); sum.textContent = CATEGORY_LABEL[cat] || cat;
      det.addEventListener('toggle', () => groupOpenState.set(cat, det.open));
      det.appendChild(sum);
      for (const d of items) {
        const row = document.createElement('div');
        row.className = d.type === 'textarea' ? 'set-row set-row--block' : 'set-row';
        const id = 'set-' + d.key;
        const info = document.createElement('div'); info.className = 'set-info';
        const l = document.createElement('label'); l.textContent = d.label; l.htmlFor = id;   // click label -> toggle/focus control
        info.appendChild(l);
        if (d.hint) { const h = document.createElement('div'); h.className = 'set-hint'; h.textContent = d.hint; info.appendChild(h); }
        row.append(info, control(d, id)); det.appendChild(row);
      }
      groupsHost.appendChild(det);
    }
    presetSel.value = model.selectedPresetId;
  }

  // Footer: save scopes + revert
  const footer = document.createElement('div'); footer.className = 'set-footer';
  const saveType = mkBtn('Save for this type', () => { persist(model, 'type'); toast?.('Saved for ' + model.type.label); });
  const saveAll = mkBtn('Save as global default', () => { persist(model, 'global'); toast?.('Saved as global default'); });
  const revert = mkBtn('Revert to preset', () => {
    const p = model.presets.find((x) => x.id === model.selectedPresetId) || model.presets[0];
    if (p) { model.values = { ...p.values }; rebuild(); syncPreset(); onChange(model); }
  });
  footer.append(saveType, saveAll, revert);

  rebuild();
  container.appendChild(footer);
}

function mkBtn(text, fn) { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = text; b.onclick = fn; return b; }
function clampNum(n, d) { if (Number.isNaN(n)) return d.default; if (d.min != null) n = Math.max(d.min, n); if (d.max != null) n = Math.min(d.max, n); return n; }
function coerce(str, prev) { return typeof prev === 'number' ? Number(str) : str; }

// Form editor for YAML files.
// Renders typed inputs for each value: checkbox for booleans, number for integers/floats,
// text/textarea for strings, datetime-local for ISO dates, comma-separated text for scalar
// arrays, read-only badge for complex values (nested objects / arrays of objects).
// Top-level object keys become collapsible sections; scalar top-level keys appear in "General".
// Uses the vendored js-yaml library (same load pattern as the YAML renderer and rawpane toolbar).
import { loadGlobal, vendor } from '../../../core/script-loader.js';

// ── Lazy js-yaml loader ───────────────────────────────────────────────────────

let _jsyaml = null;

async function getJsYaml() {
  if (_jsyaml) return _jsyaml;
  _jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  return _jsyaml;
}

// ── Classification helpers ────────────────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function isArrayOfObjects(v) {
  return Array.isArray(v) && v.length > 0 && v.some((item) => isPlainObject(item));
}

function isScalarArray(v) {
  return Array.isArray(v) && v.every((item) => !isPlainObject(item) && !Array.isArray(item));
}

// ISO 8601 datetime — must include both a date and a time component
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function looksLikeIsoDatetime(s) {
  return typeof s === 'string' && ISO_DATE_RE.test(s);
}

// Classify root parsed object into generals (scalars) and sections (objects)
// Returns { generals: { key -> value }, sections: [ { name, data } ], keyOrder: string[] }
function classify(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { generals: {}, sections: [], keyOrder: [] };
  }
  const generals = {};
  const sections = [];
  const keyOrder = Object.keys(parsed);
  for (const k of keyOrder) {
    const v = parsed[k];
    if (isPlainObject(v)) {
      sections.push({ name: k, data: v });
    } else {
      generals[k] = v;
    }
  }
  return { generals, sections, keyOrder };
}

// ── Serialization ─────────────────────────────────────────────────────────────

function serializeYaml(state, jsyaml) {
  // Reconstruct the object in original key order
  const out = {};
  for (const k of state.keyOrder) {
    const sec = state.sections.find((s) => s.name === k);
    if (sec) {
      out[k] = sec.data;
    } else if (Object.prototype.hasOwnProperty.call(state.generals, k)) {
      out[k] = state.generals[k];
    }
  }
  // Keys added during parse that may not be in keyOrder (shouldn't happen, but guard)
  for (const k of Object.keys(state.generals)) {
    if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = state.generals[k];
  }
  for (const sec of state.sections) {
    if (!Object.prototype.hasOwnProperty.call(out, sec.name)) out[sec.name] = sec.data;
  }
  try {
    return jsyaml.dump(out, { indent: 2, lineWidth: -1 });
  } catch {
    return '';
  }
}

// ── Field rendering ───────────────────────────────────────────────────────────

function renderField(container, key, value, onChange) {
  const row = document.createElement('div');
  row.className = 'ini-row toml-row';

  const keyEl = document.createElement('span');
  keyEl.className = 'ini-key toml-key';
  keyEl.textContent = key;

  const eq = document.createElement('span');
  eq.className = 'ini-eq';
  eq.textContent = ':';

  if (typeof value === 'boolean') {
    // Checkbox for booleans
    const label = document.createElement('label');
    label.className = 'toml-bool-label';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.className = 'toml-bool';
    input.addEventListener('change', () => onChange(key, input.checked));
    label.append(input);
    row.append(keyEl, eq, label);

  } else if (typeof value === 'number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = Number.isInteger(value) ? '1' : 'any';
    input.value = String(value);
    input.className = 'ini-val toml-num';
    input.spellcheck = false;
    input.addEventListener('input', () => {
      const n = input.step === '1' ? parseInt(input.value, 10) : parseFloat(input.value);
      if (!isNaN(n)) onChange(key, n);
    });
    row.append(keyEl, eq, input);

  } else if (value === null || value === undefined) {
    // Null badge with a "set value" button
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'null';
    const setBtn = document.createElement('button');
    setBtn.type = 'button';
    setBtn.className = 'ini-add-row';
    setBtn.style.marginLeft = '8px';
    setBtn.textContent = 'set value';
    setBtn.addEventListener('click', () => onChange(key, ''));
    row.append(keyEl, eq, badge, setBtn);

  } else if (looksLikeIsoDatetime(value)) {
    // datetime-local input for ISO 8601 strings
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'ini-val toml-str';
    // datetime-local expects YYYY-MM-DDTHH:MM (no seconds, no Z)
    input.value = value.slice(0, 16);
    input.spellcheck = false;
    input.addEventListener('input', () => {
      // Restore seconds + Z when serializing
      const v = input.value;
      onChange(key, v ? v + ':00Z' : value);
    });
    row.append(keyEl, eq, input);

  } else if (typeof value === 'string') {
    if (value.includes('\n')) {
      // Textarea for multiline strings
      const input = document.createElement('textarea');
      input.className = 'ini-val toml-textarea';
      input.value = value;
      input.rows = Math.min(6, value.split('\n').length + 1);
      input.spellcheck = false;
      input.addEventListener('input', () => onChange(key, input.value));
      row.classList.add('toml-row-multiline');
      row.append(keyEl, eq, input);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ini-val toml-str';
      input.value = value;
      input.spellcheck = false;
      input.addEventListener('input', () => onChange(key, input.value));
      row.append(keyEl, eq, input);
    }

  } else if (isScalarArray(value)) {
    // Comma-separated text input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ini-val toml-arr';
    input.value = value.map((v) => (typeof v === 'string' ? v : String(v))).join(', ');
    input.spellcheck = false;
    const note = document.createElement('span');
    note.className = 'toml-arr-note';
    note.textContent = '(comma-separated)';
    input.addEventListener('input', () => {
      const items = input.value.split(',').map((s) => s.trim()).filter((s) => s !== '');
      const coerced = items.map((s) => {
        if (s === 'true') return true;
        if (s === 'false') return false;
        const n = Number(s);
        return isNaN(n) ? s : n;
      });
      onChange(key, coerced);
    });
    row.append(keyEl, eq, input, note);

  } else if (isArrayOfObjects(value) || isPlainObject(value)) {
    // Complex value — read-only with raw YAML snippet
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    try {
      // Short inline preview (first 80 chars of JSON)
      const preview = JSON.stringify(value);
      code.textContent = preview.length > 80 ? preview.slice(0, 77) + '...' : preview;
    } catch {
      code.textContent = String(value);
    }
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'complex value — edit in source';
    row.append(keyEl, eq, code, badge);

  } else {
    // Fallback: unknown type as read-only
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    code.textContent = String(value);
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'read-only';
    row.append(keyEl, eq, code, badge);
  }

  container.append(row);
}

// ── Section rendering ─────────────────────────────────────────────────────────

function renderSection(body, title, pairs, collapsed, onToggle, onFieldChange) {
  const group = document.createElement('div');
  group.className = 'ini-section toml-section' + (collapsed ? ' ini-collapsed' : '');

  const header = document.createElement('div');
  header.className = 'ini-section-header';
  header.title = 'Click to collapse/expand';

  const arrow = document.createElement('span');
  arrow.className = 'ini-arrow';
  arrow.textContent = collapsed ? '▶' : '▼';

  const titleEl = document.createElement('span');
  titleEl.className = 'ini-section-title';
  titleEl.textContent = title;

  header.append(arrow, titleEl);
  header.addEventListener('click', () => onToggle());
  group.append(header);

  const pairList = document.createElement('div');
  pairList.className = 'ini-pairs';
  if (!collapsed) {
    for (const [k, v] of Object.entries(pairs)) {
      renderField(pairList, k, v, onFieldChange);
    }
  }
  group.append(pairList);
  body.append(group);
}

// ── YamlFormEditor class ──────────────────────────────────────────────────────

export class YamlFormEditor {
  constructor(container) {
    this._container = container;
    this._state = { generals: {}, sections: [], keyOrder: [] };
    this._collapsed = {};   // key -> boolean, tracks collapse state per section
    this._leadingComment = '';
    this._jsyaml = null;
    // Show a loading placeholder until setValue is called with a loaded jsyaml
    this._renderLoading();
  }

  async setValue(text) {
    // Extract leading comment lines to preserve on serialization
    const lines = (text || '').split('\n');
    const commentLines = [];
    for (const line of lines) {
      const t = line.trim();
      if (t === '' || t.startsWith('#')) { commentLines.push(line); } else break;
    }
    this._leadingComment = commentLines.some((l) => l.trim().startsWith('#'))
      ? commentLines.join('\n').trimEnd()
      : '';

    let jsyaml;
    try {
      jsyaml = await getJsYaml();
    } catch (e) {
      this._renderError('Could not load js-yaml: ' + (e.message || e));
      return;
    }
    this._jsyaml = jsyaml;

    let parsed;
    try {
      parsed = jsyaml.load(text || '');
    } catch (e) {
      this._renderError('YAML parse error: ' + (e.message || e));
      return;
    }

    this._state = classify(parsed);
    this._render();
  }

  getValue() {
    if (!this._jsyaml) return '';
    const body = serializeYaml(this._state, this._jsyaml);
    return this._leadingComment
      ? this._leadingComment + '\n' + body
      : body;
  }

  destroy() {
    this._container.innerHTML = '';
  }

  _renderLoading() {
    this._container.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'ini-form toml-form';
    msg.style.padding = '16px';
    msg.textContent = 'Loading…';
    this._container.append(msg);
  }

  _renderError(msg) {
    this._container.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'ini-form toml-form';
    el.style.cssText = 'padding:16px;color:var(--color-danger,#f85149)';
    el.textContent = msg;
    this._container.append(el);
  }

  _render() {
    this._container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ini-form toml-form';

    const body = document.createElement('div');
    body.className = 'ini-body';

    // ── General section (scalar top-level keys) ───────────────────────────────
    const generals = this._state.generals;
    if (Object.keys(generals).length > 0) {
      const colKey = '__general__';
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        'General',
        generals,
        collapsed,
        () => { this._collapsed[colKey] = !collapsed; this._render(); },
        (k, v) => { this._state.generals[k] = v; },
      );
    }

    // ── Object sections (top-level object keys) ───────────────────────────────
    for (const sec of this._state.sections) {
      const colKey = 'section:' + sec.name;
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        sec.name,
        sec.data,
        collapsed,
        () => { this._collapsed[colKey] = !collapsed; this._render(); },
        (k, v) => { sec.data[k] = v; },
      );
    }

    // Empty document notice
    if (Object.keys(generals).length === 0 && this._state.sections.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;opacity:0.6';
      empty.textContent = 'Empty or non-mapping YAML document — nothing to edit as a form.';
      body.append(empty);
    }

    wrapper.append(body);
    this._container.append(wrapper);
  }
}

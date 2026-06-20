// Form editor for TOML files.
// Renders typed inputs for each value: checkbox for booleans, number for integers/floats,
// text/textarea for strings, comma-separated text for scalar arrays, read-only for complex values.
// Sections collapse/expand on header click. Structure (keys) is fixed; only values are editable.
import { parseTOML } from './toml.js';

// ── Serialization ─────────────────────────────────────────────────────────────

function tomlValueString(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (!isFinite(val)) return val > 0 ? 'inf' : '-inf';
    if (isNaN(val)) return 'nan';
    return String(val);
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    if (val.includes('\n')) return '"""\n' + val + '\n"""';
    return '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  if (Array.isArray(val)) {
    // Scalar array
    if (val.every((v) => typeof v !== 'object' || v instanceof Date)) {
      return '[' + val.map(tomlValueString).join(', ') + ']';
    }
    return null; // array of objects — not inlined
  }
  return null; // complex object — not inlined
}

function serializeToml(data, leadingComment) {
  const parts = [];
  if (leadingComment) parts.push(leadingComment);

  // Globals first
  const globals = data.__globals__ || {};
  for (const [k, v] of Object.entries(globals)) {
    const s = tomlValueString(v);
    if (s !== null) parts.push(k + ' = ' + s);
  }

  // Sections (plain objects)
  const sections = data.__sections__ || {};
  for (const [name, pairs] of Object.entries(sections)) {
    if (parts.length) parts.push('');
    parts.push('[' + name + ']');
    for (const [k, v] of Object.entries(pairs)) {
      const s = tomlValueString(v);
      if (s !== null) parts.push(k + ' = ' + s);
    }
  }

  // Array-of-tables sections
  const aot = data.__aot__ || {};
  for (const [name, items] of Object.entries(aot)) {
    for (const item of items) {
      parts.push('');
      parts.push('[[' + name + ']]');
      for (const [k, v] of Object.entries(item)) {
        const s = tomlValueString(v);
        if (s !== null) parts.push(k + ' = ' + s);
      }
    }
  }

  return parts.join('\n');
}

// ── Classification helpers ────────────────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function isArrayOfObjects(v) {
  return Array.isArray(v) && v.length > 0 && v.every((item) => isPlainObject(item));
}

function isScalarArray(v) {
  return Array.isArray(v) && v.every((item) => !isPlainObject(item) && !Array.isArray(item));
}

// Classify the parsed TOML root into globals, sections, and array-of-tables
function classify(parsed) {
  const globals = {};
  const sections = {};
  const aot = {};

  for (const [k, v] of Object.entries(parsed)) {
    if (isPlainObject(v)) {
      sections[k] = v;
    } else if (isArrayOfObjects(v)) {
      aot[k] = v;
    } else {
      globals[k] = v;
    }
  }

  return { globals, sections, aot };
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
  eq.textContent = '=';

  let input;

  if (typeof value === 'boolean') {
    // Checkbox for booleans
    const label = document.createElement('label');
    label.className = 'toml-bool-label';
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.className = 'toml-bool';
    input.addEventListener('change', () => onChange(key, input.checked));
    label.append(input);
    row.append(keyEl, eq, label);
  } else if (typeof value === 'number') {
    input = document.createElement('input');
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
  } else if (typeof value === 'string') {
    if (value.includes('\n')) {
      // Textarea for multi-line strings
      input = document.createElement('textarea');
      input.className = 'ini-val toml-textarea';
      input.value = value;
      input.rows = Math.min(6, value.split('\n').length + 1);
      input.spellcheck = false;
      input.addEventListener('input', () => onChange(key, input.value));
      row.classList.add('toml-row-multiline');
      row.append(keyEl, eq, input);
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'ini-val toml-str';
      input.value = value;
      input.spellcheck = false;
      input.addEventListener('input', () => onChange(key, input.value));
      row.append(keyEl, eq, input);
    }
  } else if (isScalarArray(value)) {
    // Comma-separated text input
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'ini-val toml-arr';
    input.value = value.map((v) => (typeof v === 'string' ? v : String(v))).join(', ');
    input.spellcheck = false;
    const note = document.createElement('span');
    note.className = 'toml-arr-note';
    note.textContent = '(comma-separated)';
    input.addEventListener('input', () => {
      const items = input.value.split(',').map((s) => s.trim()).filter((s) => s !== '');
      // Attempt to coerce back to original element type
      const coerced = items.map((s) => {
        if (s === 'true') return true;
        if (s === 'false') return false;
        const n = Number(s);
        return isNaN(n) ? s : n;
      });
      onChange(key, coerced);
    });
    row.append(keyEl, eq, input, note);
  } else if (value instanceof Date) {
    // Show date as a readable string; read-only since TOML datetimes are complex
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    code.textContent = value.toISOString();
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'read-only (datetime)';
    row.append(keyEl, eq, code, badge);
  } else {
    // Complex / unknown: display as code, read-only
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    try { code.textContent = JSON.stringify(value); } catch { code.textContent = String(value); }
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

// ── TomlFormEditor class ──────────────────────────────────────────────────────

export class TomlFormEditor {
  constructor(container) {
    this._container = container;
    this._data = { __globals__: {}, __sections__: {}, __aot__: {} };
    this._collapsed = {};   // key -> boolean, tracks collapse state per section
    this._leadingComment = '';
    this._render();
  }

  setValue(text) {
    // Extract leading comment lines to preserve them on serialization
    const lines = (text || '').split('\n');
    const commentLines = [];
    for (const line of lines) {
      const t = line.trim();
      if (t === '' || t.startsWith('#')) { commentLines.push(line); } else break;
    }
    // Only keep if there were actual comment lines (not just blank lines)
    this._leadingComment = commentLines.some((l) => l.trim().startsWith('#'))
      ? commentLines.join('\n').trimEnd()
      : '';

    let parsed;
    try {
      parsed = parseTOML(text || '');
    } catch (e) {
      parsed = {};
    }

    const { globals, sections, aot } = classify(parsed);
    this._data = { __globals__: globals, __sections__: sections, __aot__: aot };
    this._render();
  }

  getValue() {
    return serializeToml(this._data, this._leadingComment);
  }

  destroy() {
    this._container.innerHTML = '';
  }

  _render() {
    this._container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ini-form toml-form';

    const body = document.createElement('div');
    body.className = 'ini-body';

    // ── Globals ───────────────────────────────────────────────────────────────
    const globals = this._data.__globals__;
    if (Object.keys(globals).length > 0) {
      const colKey = '__globals__';
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        '(global)',
        globals,
        collapsed,
        () => { this._collapsed[colKey] = !collapsed; this._render(); },
        (k, v) => { this._data.__globals__[k] = v; },
      );
    }

    // ── Plain sections ────────────────────────────────────────────────────────
    const sections = this._data.__sections__;
    for (const [name, pairs] of Object.entries(sections)) {
      const colKey = 'section:' + name;
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        '[' + name + ']',
        pairs,
        collapsed,
        () => { this._collapsed[colKey] = !collapsed; this._render(); },
        (k, v) => { this._data.__sections__[name][k] = v; },
      );
    }

    // ── Array-of-tables ───────────────────────────────────────────────────────
    const aot = this._data.__aot__;
    for (const [name, items] of Object.entries(aot)) {
      items.forEach((item, idx) => {
        const colKey = 'aot:' + name + ':' + idx;
        const collapsed = !!this._collapsed[colKey];
        renderSection(
          body,
          '[[' + name + ']] #' + (idx + 1),
          item,
          collapsed,
          () => { this._collapsed[colKey] = !collapsed; this._render(); },
          (k, v) => { this._data.__aot__[name][idx][k] = v; },
        );
      });
    }

    wrapper.append(body);
    this._container.append(wrapper);
  }
}

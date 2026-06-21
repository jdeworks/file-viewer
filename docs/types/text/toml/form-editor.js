// Form editor for TOML files.
// Renders typed inputs for each value: checkbox for booleans, number for integers/floats,
// text/textarea for strings, comma-separated text for scalar arrays, read-only for complex values.
// Sections collapse/expand on header click. Structure (keys) is fixed; only values are editable.
// Field/section rendering + value classification are shared via core/form-fields.js.
import { parseTOML } from './toml.js';
import { renderSection, isPlainObject, isArrayOfObjects } from '../../../core/form-fields.js';

const FIELD_OPTS = { sep: '=', dateObjects: true };

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

// ── Classification ────────────────────────────────────────────────────────────

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
        FIELD_OPTS,
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
        FIELD_OPTS,
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
          FIELD_OPTS,
        );
      });
    }

    wrapper.append(body);
    this._container.append(wrapper);
  }
}

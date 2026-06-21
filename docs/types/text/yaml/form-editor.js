// Form editor for YAML files.
// Renders typed inputs for each value: checkbox for booleans, number for integers/floats,
// text/textarea for strings, datetime-local for ISO dates, comma-separated text for scalar
// arrays, read-only badge for complex values (nested objects / arrays of objects).
// Top-level object keys become collapsible sections; scalar top-level keys appear in "General".
// Uses the vendored js-yaml library (same load pattern as the YAML renderer and rawpane toolbar).
// Field/section rendering + value classification are shared via core/form-fields.js.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { renderSection, isPlainObject } from '../../../core/form-fields.js';

const FIELD_OPTS = { sep: ':', isoDates: true, allowSetNull: true };

// ── Lazy js-yaml loader ───────────────────────────────────────────────────────

let _jsyaml = null;

async function getJsYaml() {
  if (_jsyaml) return _jsyaml;
  _jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  return _jsyaml;
}

// ── Classification ────────────────────────────────────────────────────────────

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
        FIELD_OPTS,
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
        FIELD_OPTS,
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

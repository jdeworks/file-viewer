// Shared field/section rendering for the structured form editors (toml, yaml, ini-object).
// Each editor parses its source into plain JS values; this module renders one editable row per
// value (typed input chosen by the value's JS type) and one collapsible section per group.
// The three editors differ only in cosmetic details (the key/value separator, how dates and
// null are handled), so those are passed in via `opts`.
//
// Value→input mapping:
//   boolean        → checkbox
//   number         → <input type=number>
//   null/undefined → "null" badge + a "set value" button (opts.allowSetNull)
//   ISO datetime   → <input type=datetime-local> (opts.isoDates: yaml string dates)
//   Date object    → read-only ISO string (opts.dateObjects: toml datetimes)
//   string         → text input (textarea when multi-line)
//   scalar array   → comma-separated text input (round-trips type coercion)
//   object / array-of-objects → read-only JSON preview (edit in source)
//
// onChange(key, newValue) is called with the *typed* new value; the editor owns the data model.

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

export function isArrayOfObjects(v) {
  return Array.isArray(v) && v.length > 0 && v.some((item) => isPlainObject(item));
}

export function isScalarArray(v) {
  return Array.isArray(v) && v.every((item) => !isPlainObject(item) && !Array.isArray(item));
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
export function looksLikeIsoDatetime(s) {
  return typeof s === 'string' && ISO_DATE_RE.test(s);
}

// Coerce comma-separated text back to scalars (numbers/booleans where unambiguous).
function coerceScalarList(raw) {
  return raw.split(',').map((s) => s.trim()).filter((s) => s !== '').map((s) => {
    if (s === 'true') return true;
    if (s === 'false') return false;
    const n = Number(s);
    return s !== '' && !isNaN(n) ? n : s;
  });
}

// Render a single key/value row into `container`.
// opts: { sep, isoDates, dateObjects, allowSetNull }
export function renderField(container, key, value, onChange, opts = {}) {
  const sep = opts.sep || '=';
  const row = document.createElement('div');
  row.className = 'ini-row toml-row';

  const keyEl = document.createElement('span');
  keyEl.className = 'ini-key toml-key';
  keyEl.textContent = key;

  const eq = document.createElement('span');
  eq.className = 'ini-eq';
  eq.textContent = sep;

  if (typeof value === 'boolean') {
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

  } else if ((value === null || value === undefined) && opts.allowSetNull) {
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

  } else if (value instanceof Date && opts.dateObjects) {
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    code.textContent = value.toISOString();
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'read-only (datetime)';
    row.append(keyEl, eq, code, badge);

  } else if (opts.isoDates && looksLikeIsoDatetime(value)) {
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'ini-val toml-str';
    input.value = value.slice(0, 16);   // YYYY-MM-DDTHH:MM
    input.spellcheck = false;
    input.addEventListener('input', () => {
      const v = input.value;
      onChange(key, v ? v + ':00Z' : value);   // restore seconds + Z
    });
    row.append(keyEl, eq, input);

  } else if (typeof value === 'string') {
    if (value.includes('\n')) {
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
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ini-val toml-arr';
    input.value = value.map((v) => (typeof v === 'string' ? v : String(v))).join(', ');
    input.spellcheck = false;
    const note = document.createElement('span');
    note.className = 'toml-arr-note';
    note.textContent = '(comma-separated)';
    input.addEventListener('input', () => onChange(key, coerceScalarList(input.value)));
    row.append(keyEl, eq, input, note);

  } else if (isArrayOfObjects(value) || isPlainObject(value)) {
    // Nested object / array-of-objects: read-only inline preview (edit nested rows in source).
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    try {
      const preview = JSON.stringify(value);
      code.textContent = preview.length > 80 ? preview.slice(0, 77) + '...' : preview;
    } catch { code.textContent = String(value); }
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'complex value — edit in source';
    row.append(keyEl, eq, code, badge);

  } else {
    // Fallback (e.g. a bare null when allowSetNull is off): read-only.
    const code = document.createElement('code');
    code.className = 'toml-readonly';
    try { code.textContent = value === null || value === undefined ? 'null' : JSON.stringify(value); }
    catch { code.textContent = String(value); }
    const badge = document.createElement('span');
    badge.className = 'toml-readonly-badge';
    badge.textContent = 'read-only';
    row.append(keyEl, eq, code, badge);
  }

  container.append(row);
  return row;
}

// Render a collapsible section. `pairs` is an object whose entries become rows.
// onToggle() flips collapse; onFieldChange(key, value) reports an edit.
export function renderSection(body, title, pairs, collapsed, onToggle, onFieldChange, opts = {}) {
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
    for (const [k, v] of Object.entries(pairs)) renderField(pairList, k, v, onFieldChange, opts);
  }
  group.append(pairList);
  body.append(group);
  return group;
}

// Missing-aware merge engine for key=value config files (env + ini). DOM-FREE, pure functions.
//
// SECURITY: this module handles the REAL (unmasked) values so it can produce a working combined
// file. Callers must NEVER render these values into the DOM directly — pass display strings through
// known-ui's maskedValue() instead. The only place a real secret leaves this module is the string
// returned by serializeMerge(), which the UI feeds straight into a download Blob (never the DOM).
import { secretReason } from './known-ui.js';

// Wider env key sensitivity, mirroring docs/types/text/env/form-editor.js SENSITIVE_RE so the merge
// view is "at least as protective" as the env form editor (KEY/API/SALT/… beyond secretReason's set).
const ENV_SENSITIVE_RE = /SECRET|PASSWORD|PASSWD|PWD|TOKEN|KEY|API|PRIVATE|AUTH|CREDENTIAL|SALT|SIGNING|MASTER|WEBHOOK/i;

export function isSecret(key, value, typeId) {
  if (secretReason(key, value)) return true;
  if (typeId === 'env' && ENV_SENSITIVE_RE.test(String(key || ''))) return true;
  return false;
}

// ── Parsing ──────────────────────────────────────────────────────────────────
// Both parsers return an ordered list of groups: { name, keys:[...], map:Map(key→value), dups:Set }.
// env → a single group (name:null). ini → one group per [section] plus a root group (name:null).

function newGroup(name) { return { name, keys: [], map: new Map(), dups: new Set() }; }

function addPair(group, key, value) {
  if (group.map.has(key)) group.dups.add(key);   // duplicate within a section → last-wins, but flagged
  else group.keys.push(key);
  group.map.set(key, value);
}

// env: flat key=value with `export ` prefix, single/double quotes (incl. multi-line), escapes.
function parseEnvGroups(text) {
  const group = newGroup(null);
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const stripped = trimmed.replace(/^export\s+/, '');
    const eq = stripped.indexOf('=');
    if (eq < 0) continue;
    const key = stripped.slice(0, eq).trim();
    let value = stripped.slice(eq + 1);
    if (value.startsWith('"') || value.startsWith("'")) {
      const q = value[0];
      let end = value.indexOf(q, 1);
      while (end > 0 && value[end - 1] === '\\') end = value.indexOf(q, end + 1);
      if (end >= 0) {
        value = value.slice(1, end);
      } else {
        let acc = value.slice(1);
        while (++i < lines.length) {
          const close = lines[i].indexOf(q);
          if (close >= 0) { acc += '\n' + lines[i].slice(0, close); break; }
          acc += '\n' + lines[i];
        }
        value = acc;
      }
    }
    value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    addPair(group, key, value);
  }
  return [group];
}

// ini: [section] headers with key=value or key:value; root pairs before the first header.
function parseIniGroups(text) {
  const groups = [newGroup(null)];
  let cur = groups[0];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#' || line[0] === ';') continue;
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) { cur = newGroup(sec[1].trim()); groups.push(cur); continue; }
    const m = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      addPair(cur, m[1].trim(), val);
    }
  }
  // Drop an empty root group so env-in-ini files without a leading section don't grow a blank group.
  return groups.filter((g) => g.keys.length || g.name);
}

export function parseKv(text, typeId) {
  return typeId === 'ini' ? parseIniGroups(text) : parseEnvGroups(text);
}

// ── Merge model ──────────────────────────────────────────────────────────────
// buildMergeModel → { typeId, groups:[{ section, status, present:{left,right}, rows:[...] }] }
// Groups ordered: left sections in left order, then right-only sections in right order.
// Rows within a group: left keys in order, then right-only keys in right order.

function rowStatus(leftHas, rightHas, leftVal, rightVal) {
  if (leftHas && rightHas) return leftVal === rightVal ? 'equal' : 'conflict';
  return leftHas ? 'only-left' : 'only-right';
}

export function buildMergeModel(leftText, rightText, typeId) {
  const leftGroups = parseKv(leftText, typeId);
  const rightGroups = parseKv(rightText, typeId);
  const byName = (arr) => new Map(arr.map((g) => [g.name, g]));
  const rMap = byName(rightGroups);
  const lMap = byName(leftGroups);

  const order = [];
  const seen = new Set();
  for (const g of leftGroups) { order.push(g.name); seen.add(g.name); }
  for (const g of rightGroups) if (!seen.has(g.name)) { order.push(g.name); seen.add(g.name); }

  let uid = 0;
  const groups = order.map((name) => {
    const lg = lMap.get(name);
    const rg = rMap.get(name);
    const present = { left: !!lg, right: !!rg };
    const status = present.left && present.right ? 'both' : present.left ? 'only-left' : 'only-right';

    const keys = [];
    const kseen = new Set();
    for (const k of lg ? lg.keys : []) if (!kseen.has(k)) { keys.push(k); kseen.add(k); }
    for (const k of rg ? rg.keys : []) if (!kseen.has(k)) { keys.push(k); kseen.add(k); }

    const rows = keys.map((key) => {
      const leftHas = !!lg && lg.map.has(key);
      const rightHas = !!rg && rg.map.has(key);
      const leftVal = leftHas ? lg.map.get(key) : null;
      const rightVal = rightHas ? rg.map.get(key) : null;
      const st = rowStatus(leftHas, rightHas, leftVal, rightVal);
      return {
        id: 'r' + (uid++),
        section: name,
        key,
        left: { present: leftHas, value: leftVal, empty: leftHas && leftVal === '' },
        right: { present: rightHas, value: rightVal, empty: rightHas && rightVal === '' },
        leftMasked: leftHas && isSecret(key, leftVal, typeId),
        rightMasked: rightHas && isSecret(key, rightVal, typeId),
        duplicate: (lg && lg.dups.has(key)) || (rg && rg.dups.has(key)) || false,
        status: st,
        // Defaults: equal/only-left keep left; conflict defaults to RIGHT (picked file wins);
        // only-right ("missing") starts EXCLUDED until the user transfers it.
        choice: st === 'only-right' || st === 'conflict' ? 'right' : 'left',
        include: st !== 'only-right',
      };
    });
    return { section: name, status, present, rows };
  });

  return { typeId, groups };
}

// The real value a row contributes to the combined file (per its current choice).
export function rowValue(row) {
  return row.choice === 'right' ? row.right.value : row.left.value;
}

// Bulk-set include on every row matching a predicate (used by "transfer all missing" and
// "transfer whole section"). Returns the number of rows changed.
export function chooseAll(model, predicate, include = true) {
  let n = 0;
  for (const g of model.groups) for (const r of g.rows) {
    if (predicate(r, g) && r.include !== include) { r.include = include; n++; }
  }
  return n;
}

// ── Serialization ────────────────────────────────────────────────────────────
function formatValue(v) {
  const s = String(v ?? '');
  if (s === '') return '';
  if (/[\n\t]/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
  }
  if (/\s/.test(s) || s.includes('#') || s.includes('"')) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

// Build the combined file text. Groups in order, then included rows; ini emits a [section] header
// once per non-root group that contributes ≥1 row. Reads REAL values — result is download-only.
export function serializeMerge(model, typeId) {
  const out = [];
  for (const g of model.groups) {
    const rows = g.rows.filter((r) => r.include && rowValue(r) !== null);
    if (!rows.length) continue;
    if (typeId === 'ini' && g.section) out.push(`[${g.section}]`);
    for (const r of rows) out.push(`${r.key}=${formatValue(rowValue(r))}`);
    if (typeId === 'ini') out.push('');   // blank line between sections for readability
  }
  return out.join('\n').replace(/\n+$/, '') + '\n';
}

// Small summary for the UI header (counts only — never values).
export function summarize(model) {
  let keys = 0, missing = 0, missingIncluded = 0, conflicts = 0, sectionsMissing = 0;
  for (const g of model.groups) {
    if (g.status !== 'both') sectionsMissing++;
    for (const r of g.rows) {
      keys++;
      if (r.status === 'only-right') { missing++; if (r.include) missingIncluded++; }
      if (r.status === 'conflict') conflicts++;
    }
  }
  return { keys, missing, missingIncluded, conflicts, sectionsMissing, groups: model.groups.length };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.erlsyscfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.erlsyscfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C0000;color:#fff;vertical-align:middle;margin-right:8px}
.erlsyscfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.erlsyscfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.erlsyscfg-summary{font-size:13px;color:var(--fg-2,#888);margin:0 0 14px}
.erlsyscfg-app{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin:0 0 8px;overflow:hidden}
.erlsyscfg-app-hdr{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#f6f8fa);font-weight:600;font-size:13px;cursor:default}
.erlsyscfg-app-name{font-family:ui-monospace,monospace;color:var(--accent,#0969da)}
.erlsyscfg-app-count{font-size:11px;font-weight:400;color:var(--fg-2,#888)}
.erlsyscfg-kv-table{width:100%;border-collapse:collapse}
.erlsyscfg-kv-table td{padding:4px 12px;font-size:13px;border-top:1px solid var(--border,#e0e0e0);vertical-align:top}
.erlsyscfg-kv-table td:first-child{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);width:40%;white-space:nowrap}
.erlsyscfg-kv-table td:last-child{font-family:ui-monospace,monospace;color:var(--fg-2,#555)}
.erlsyscfg-complex{color:var(--fg-2,#888);font-style:italic}
`;

/** Strip Erlang % comments from a line */
function stripComment(line) {
  // % outside a string starts a comment
  let inStr = false;
  let inBin = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (!inStr && !inBin && c === '"') { inStr = true; continue; }
    if (inStr && c === '"') { inStr = false; continue; }
    if (!inStr && !inBin && c === '<' && line[i + 1] === '<') { inBin = true; i++; continue; }
    if (inBin && c === '>' && line[i + 1] === '>') { inBin = false; i++; continue; }
    if (!inStr && !inBin && c === '%') return line.slice(0, i);
  }
  return line;
}

/** Remove all % comments and return clean text */
function stripComments(text) {
  return text.split('\n').map(stripComment).join('\n');
}

/** Use bracket counting to extract top-level {app, [...]} tuples from the outer list */
function extractAppTuples(text) {
  // Find the outer list content (between first [ and its matching ])
  const stripped = stripComments(text).trim();
  let start = stripped.indexOf('[');
  if (start === -1) return [];
  start++;
  const apps = [];
  let depth = 0;
  let tupleStart = -1;
  for (let i = start; i < stripped.length; i++) {
    const c = stripped[i];
    if (c === '{' || c === '[' || c === '(') {
      if (depth === 0 && c === '{') tupleStart = i;
      depth++;
    } else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0 && tupleStart !== -1) {
        apps.push(stripped.slice(tupleStart, i + 1));
        tupleStart = -1;
      }
      if (depth < 0) break; // end of outer list
    }
  }
  return apps;
}

/** Parse app name from {app_name, [...]} */
function parseAppName(tuple) {
  const m = /^\{\s*([a-z_][a-z0-9_@]*)\s*,/.exec(tuple);
  return m ? m[1] : null;
}

/** Extract the inner list content from {app_name, [...]}, using bracket counting */
function extractInnerList(tuple) {
  // Find the [ after the first comma at depth 0
  let depth = 0;
  let listStart = -1;
  let inApp = false;
  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i];
    if (c === '{') { depth++; inApp = true; continue; }
    if (c === '}') { depth--; continue; }
    if (inApp && depth === 1 && c === '[') { listStart = i + 1; break; }
  }
  if (listStart === -1) return '';
  // Now find the matching ]
  let d = 1;
  for (let i = listStart; i < tuple.length; i++) {
    const c = tuple[i];
    if (c === '[' || c === '{' || c === '(') d++;
    else if (c === ']' || c === '}' || c === ')') {
      d--;
      if (d === 0) return tuple.slice(listStart, i);
    }
  }
  return tuple.slice(listStart);
}

/** Parse a simple Erlang term value for display */
function formatValue(val) {
  val = val.trim();
  if (!val) return '';
  // Binary <<"...">>
  const binM = /^<<"(.*?)">>$/.exec(val);
  if (binM) return `<<"${esc(binM[1])}">>`;
  // String "..."
  const strM = /^"(.*?)"$/.exec(val);
  if (strM) return `"${esc(strM[1])}"`;
  // Integer
  if (/^-?\d+$/.test(val)) return esc(val);
  // Atom (true/false/undefined/etc)
  if (/^[a-z_][a-z0-9_@]*$/.test(val)) return esc(val);
  // Complex: list or tuple
  if (val.startsWith('[')) return `<span class="erlsyscfg-complex">[…]</span>`;
  if (val.startsWith('{')) return `<span class="erlsyscfg-complex">{…}</span>`;
  // Truncate anything long
  if (val.length > 60) return esc(val.slice(0, 57)) + '…';
  return esc(val);
}

/** Extract key-value pairs from an app's inner list */
function parseKVPairs(listContent) {
  const pairs = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < listContent.length; i++) {
    const c = listContent[i];
    if (c === '{' || c === '[' || c === '(' || (c === '<' && listContent[i + 1] === '<')) {
      if (c === '<') i++;
      depth++;
    } else if (c === '}' || c === ']' || c === ')' || (c === '>' && listContent[i + 1] === '>')) {
      if (c === '>') i++;
      depth--;
    } else if (depth === 0 && c === ',') {
      pairs.push(listContent.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = listContent.slice(start).trim();
  if (last) pairs.push(last);

  return pairs.map((pair) => {
    // Each pair should be a {key, value} tuple
    const m = /^\{\s*([a-z_][a-z0-9_@]*)\s*,\s*([\s\S]*)\s*\}$/.exec(pair.trim());
    if (!m) return null;
    return { key: m[1], value: m[2].trim() };
  }).filter(Boolean);
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  const appTuples = extractAppTuples(text);
  const apps = [];
  for (const tuple of appTuples) {
    const name = parseAppName(tuple);
    if (!name) continue;
    const innerList = extractInnerList(tuple);
    const kvPairs = parseKVPairs(innerList);
    apps.push({ name, kvPairs });
  }

  const host = document.createElement('div');
  host.className = 'erlsyscfg-doc';

  let html = `<style>${CSS}</style>
<div class="erlsyscfg-title"><span class="erlsyscfg-badge">Erlang</span>sys.config</div>
<div class="erlsyscfg-sub">Erlang/OTP runtime application configuration</div>
<div class="erlsyscfg-summary">${apps.length} application${apps.length !== 1 ? 's' : ''} configured</div>`;

  for (const app of apps) {
    const kvHtml = app.kvPairs.length
      ? `<table class="erlsyscfg-kv-table">${app.kvPairs.map((kv) => `<tr><td>${esc(kv.key)}</td><td>${formatValue(kv.value)}</td></tr>`).join('')}</table>`
      : '';
    html += `<div class="erlsyscfg-app">
<div class="erlsyscfg-app-hdr"><span class="erlsyscfg-app-name">${esc(app.name)}</span><span class="erlsyscfg-app-count">${app.kvPairs.length} key${app.kvPairs.length !== 1 ? 's' : ''}</span></div>
${kvHtml}</div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}

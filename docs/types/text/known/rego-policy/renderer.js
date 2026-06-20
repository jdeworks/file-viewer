const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rego-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.rego-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4d9de0;color:#fff;vertical-align:middle;margin-right:8px}
.rego-title{font-size:18px;font-weight:700;margin:0 0 4px;font-family:ui-monospace,monospace}
.rego-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rego-sec{margin:14px 0}
.rego-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.rego-row{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px}
.rego-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.rego-bool-true{color:#1a7f37;font-weight:700;font-family:ui-monospace,monospace}
.rego-bool-false{color:#b91c1c;font-weight:700;font-family:ui-monospace,monospace}
.rego-tag{display:inline-block;font-size:10px;padding:1px 7px;border-radius:8px;margin-left:6px;vertical-align:middle}
.rego-tag.set{background:#eaf4ff;color:#1a5c99;border:1px solid #a5c8f7}
.rego-tag.complete{background:#f0fdf4;color:#166534;border:1px solid #86efac}
.rego-tag.fn{background:#fdf4ff;color:#6b21a8;border:1px solid #d8b4fe}
.rego-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.rego-kw{color:#d73a49;font-weight:600}
.rego-pkg{color:#0550ae;font-weight:600}
.rego-comment{color:var(--fg-2,#6e7681);font-style:italic}
.rego-str{color:#0a3069}
.rego-bool-kw{color:#c0392b;font-weight:700}
`;

const REGO_KEYWORDS = ['package', 'import', 'default', 'if', 'else', 'contains', 'every', 'some', 'not', 'null', 'true', 'false', 'input', 'data', 'rego', 'future', 'with', 'as', 'set('];

function parse(text) {
  const lines = text.split('\n');

  // Package
  const pkgMatch = text.match(/^package\s+(\S+)/m);
  const packageName = pkgMatch ? pkgMatch[1] : '(unknown)';

  // Imports
  const imports = [];
  for (const line of lines) {
    const m = line.match(/^import\s+(.+?)(?:\s+as\s+\S+)?$/);
    if (m) imports.push(m[1].trim());
  }

  // Default rules: `default <name> := <value>` or `default <name> = <value>`
  const defaultRules = [];
  const defaultRe = /^default\s+(\w+)\s*(?::=|=)\s*(.+)$/gm;
  let dm;
  while ((dm = defaultRe.exec(text)) !== null) {
    defaultRules.push({ name: dm[1], value: dm[2].trim() });
  }

  // Named rules and functions (collect unique names by type)
  // Complete rules: `name := value` at top level  (not default)
  // Set rules: `name contains ...`
  // Functions: `name(args) := ...`
  const rules = new Map(); // name -> { isSet, isComplete, isFunction }
  const fnRe = /^([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?::=|if\s*\{)/gm;
  let fm;
  while ((fm = fnRe.exec(text)) !== null) {
    const name = fm[1];
    if (!['if', 'else', 'every', 'some', 'not'].includes(name)) {
      rules.set(name, { isFunction: true, isSet: false, isComplete: false });
    }
  }

  const setRe = /^([a-zA-Z_]\w*)\s+contains\b/gm;
  let sm;
  while ((sm = setRe.exec(text)) !== null) {
    const name = sm[1];
    if (!rules.has(name)) rules.set(name, { isFunction: false, isSet: true, isComplete: false });
  }

  const completeRe = /^([a-zA-Z_]\w*)\s*(?::=|=)\s+(?!false|true|null|\d)/gm;
  let cm;
  while ((cm = completeRe.exec(text)) !== null) {
    const name = cm[1];
    if (!rules.has(name) && !['default', 'package', 'import'].includes(name)) {
      rules.set(name, { isFunction: false, isSet: false, isComplete: true });
    }
  }

  // Also pick up rules declared with `if` block at top level
  const blockRe = /^([a-zA-Z_]\w*)\s*\{/gm;
  let bm;
  while ((bm = blockRe.exec(text)) !== null) {
    const name = bm[1];
    if (!rules.has(name) && !['if', 'else'].includes(name)) {
      rules.set(name, { isFunction: false, isSet: false, isComplete: false });
    }
  }

  return { packageName, imports, defaultRules, rules };
}

function highlightRego(text) {
  const lines = text.split('\n');
  return lines.map((line) => {
    // Comments
    if (/^\s*#/.test(line)) {
      return `<span class="rego-comment">${esc(line)}</span>`;
    }
    let out = esc(line);
    // Package/import lines special coloring
    if (/^package\s/.test(line)) {
      out = out.replace(/^(package)(\s+)(\S+)/, '<span class="rego-kw">package</span>$2<span class="rego-pkg">$3</span>');
      return out;
    }
    if (/^import\s/.test(line)) {
      out = out.replace(/^(import)/, '<span class="rego-kw">import</span>');
      return out;
    }
    // Boolean keyword highlights
    out = out.replace(/\b(true|false)\b/g, '<span class="rego-bool-kw">$1</span>');
    // String literals
    out = out.replace(/&quot;([^&]*)&quot;/g, '<span class="rego-str">&quot;$1&quot;</span>');
    // Keywords
    for (const kw of REGO_KEYWORDS) {
      if (['true', 'false', 'package', 'import'].includes(kw)) continue;
      const re = new RegExp(`\\b${kw.replace('(', '\\(')}\\b`, 'g');
      out = out.replace(re, `<span class="rego-kw">${kw}</span>`);
    }
    return out;
  }).join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { packageName, imports, defaultRules, rules } = parse(text);

  const host = document.createElement('div');
  host.className = 'rego-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'rego-badge';
  badge.textContent = 'OPA Rego';
  const title = document.createElement('span');
  title.className = 'rego-title';
  title.textContent = packageName;
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'rego-sub';
  sub.textContent = `Rego policy · package ${packageName}`;
  host.appendChild(sub);

  // Imports section
  if (imports.length) {
    const sec = document.createElement('div');
    sec.className = 'rego-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const chips = document.createElement('div');
    for (const imp of imports) {
      const chip = document.createElement('span');
      chip.className = 'rego-chip';
      chip.textContent = imp;
      chips.appendChild(chip);
    }
    sec.appendChild(chips);
    host.appendChild(sec);
  }

  // Default rules section
  if (defaultRules.length) {
    const sec = document.createElement('div');
    sec.className = 'rego-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Default Rules';
    sec.appendChild(h3);
    for (const { name, value } of defaultRules) {
      const row = document.createElement('div');
      row.className = 'rego-row';
      const nameChip = document.createElement('code');
      nameChip.style.cssText = 'font-size:13px;font-family:ui-monospace,monospace';
      nameChip.textContent = name;
      row.appendChild(nameChip);
      const eq = document.createTextNode(' := ');
      row.appendChild(eq);
      const val = document.createElement('span');
      if (value === 'true') {
        val.className = 'rego-bool-true';
        val.textContent = 'true';
      } else if (value === 'false') {
        val.className = 'rego-bool-false';
        val.textContent = 'false';
      } else {
        val.style.cssText = 'font-family:ui-monospace,monospace;font-size:13px';
        val.textContent = value;
      }
      row.appendChild(val);
      sec.appendChild(row);
    }
    host.appendChild(sec);
  }

  // Rules/Functions section
  if (rules.size) {
    const sec = document.createElement('div');
    sec.className = 'rego-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Rules & Functions';
    sec.appendChild(h3);
    const chips = document.createElement('div');
    for (const [name, { isSet, isComplete, isFunction }] of rules) {
      const wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-flex;align-items:center;margin:2px 6px 2px 0';
      const chip = document.createElement('span');
      chip.className = 'rego-chip';
      chip.textContent = isFunction ? `${name}(…)` : name;
      wrap.appendChild(chip);
      if (isSet) {
        const tag = document.createElement('span');
        tag.className = 'rego-tag set';
        tag.textContent = 'set';
        wrap.appendChild(tag);
      } else if (isFunction) {
        const tag = document.createElement('span');
        tag.className = 'rego-tag fn';
        tag.textContent = 'fn';
        wrap.appendChild(tag);
      } else if (isComplete) {
        const tag = document.createElement('span');
        tag.className = 'rego-tag complete';
        tag.textContent = 'complete';
        wrap.appendChild(tag);
      }
      chips.appendChild(wrap);
    }
    sec.appendChild(chips);
    host.appendChild(sec);
  }

  // Syntax-highlighted code
  const codeSec = document.createElement('div');
  codeSec.className = 'rego-sec';
  const codeH3 = document.createElement('h3');
  codeH3.textContent = 'Source';
  codeSec.appendChild(codeH3);
  const pre = document.createElement('pre');
  pre.className = 'rego-pre';
  pre.innerHTML = highlightRego(text);
  codeSec.appendChild(pre);
  host.appendChild(codeSec);

  return { parentNode: host };
}

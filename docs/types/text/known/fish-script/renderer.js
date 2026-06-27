const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fish-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fish-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.fish-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fish-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fish-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fish-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.fish-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fish-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fish-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fish-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fish-list{margin:0;padding:0;list-style:none;}
.fish-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fish-list li:last-child{border-bottom:none;}
.fish-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.fish-tag-fn{background:#ede9fe;color:#6d28d9;}
.fish-tag-alias{background:#dcfce7;color:#166534;}
.fish-tag-event{background:#fef3c7;color:#92400e;}
.fish-tag-abbr{background:#fce7f3;color:#9d174d;}
.fish-tag-cmpl{background:#e0f2fe;color:#0369a1;}
.fish-tag-global{background:#dcfce7;color:#166534;}
.fish-tag-local{background:#f1f5f9;color:#334155;}
.fish-tag-universal{background:#ede9fe;color:#6d28d9;}
.fish-tag-unscoped{background:#f8fafc;color:#64748b;}
.fish-tag-export{background:#fff7ed;color:#9a3412;}
.fish-name{font-weight:600;}
.fish-args{color:#0e7490;}
.fish-desc{color:var(--fg-2,#5a6678);font-style:italic;}
.fish-val{color:#9333ea;}
.fish-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
`;

// Shell-aware tokenizer: splits on whitespace but keeps quoted runs (quotes stripped) as one token.
function tokenize(line) {
  const tokens = [];
  let cur = '', q = null, has = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; else cur += c; }
    else if (c === '"' || c === "'") { q = c; has = true; }
    else if (/\s/.test(c)) { if (has || cur) { tokens.push(cur); cur = ''; has = false; } }
    else if (c === '#' && !has && cur === '') break; // inline/leading comment
    else cur += c;
  }
  if (has || cur) tokens.push(cur);
  return tokens;
}

// Expand `--key=value` tokens into `--key value` so flag parsing is uniform.
function expandEq(tokens) {
  const out = [];
  for (const t of tokens) {
    const m = t.match(/^(--[\w-]+)=(.*)$/);
    if (m) { out.push(m[1], m[2]); } else out.push(t);
  }
  return out;
}

// Flags that consume the following token as a value (across the commands we parse).
const VALUE_FLAGS = new Set([
  '-d', '--description', '-e', '--on-event', '-v', '--on-variable', '-s', '--on-signal',
  '-w', '--wraps', '-V', '--inherit-variable', '--on-job-exit', '--on-process-exit',
  '-p', '--position', '-r', '--regex', '-f', '--function', '-c', '--command',
  '-a', '--argument', '-l', '--long-option', '-o', '--old-option', '-n', '--condition', '-k',
]);

function parseFunction(tokens) {
  const name = tokens[1];
  if (!name || name.startsWith('-')) return null;
  const fn = { name, description: '', argNames: [], onEvent: null, onVariable: null, onSignal: null, wraps: null };
  for (let i = 2; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '-d' || t === '--description') fn.description = tokens[++i] || '';
    else if (t === '-e' || t === '--on-event') fn.onEvent = tokens[++i] || '';
    else if (t === '-v' || t === '--on-variable') fn.onVariable = tokens[++i] || '';
    else if (t === '-s' || t === '--on-signal') fn.onSignal = tokens[++i] || '';
    else if (t === '-w' || t === '--wraps') fn.wraps = tokens[++i] || '';
    else if (t === '-a' || t === '--argument-names') {
      while (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) fn.argNames.push(tokens[++i]);
    } else if (t === '--on-job-exit' || t === '--on-process-exit' || t === '-V' || t === '--inherit-variable') {
      i++; // value-taking flags we don't surface individually
    }
  }
  return fn;
}

function parseSet(tokens) {
  let i = 1, fl = '';
  for (; i < tokens.length; i++) { if (tokens[i].startsWith('-') && tokens[i] !== '--') fl += tokens[i]; else break; }
  if (tokens[i] === '--') i++;
  const name = tokens[i];
  if (!name) return null;
  const has = (sh, lo) => fl.includes(sh) || fl.includes(lo);
  let scope = 'unscoped';
  if (has('U', 'universal')) scope = 'universal';
  else if (has('g', 'global')) scope = 'global';
  else if (has('l', 'local')) scope = 'local';
  const exported = has('x', 'export');
  const erase = has('e', 'erase');
  return { name, scope, exported, erase };
}

function parseAlias(tokens) {
  // alias name "value"  |  alias name=value  |  alias name value...
  let rest = tokens.slice(1);
  if (!rest.length) return null;
  let name = rest[0], target;
  const eq = name.match(/^([^=]+)=(.*)$/);
  if (eq) { name = eq[1]; target = [eq[2], ...rest.slice(1)].filter(Boolean).join(' '); }
  else target = rest.slice(1).join(' ');
  return { name, target };
}

// abbr's value-taking flags (note: -a/--add takes NO value, unlike completion's -a).
const ABBR_VALUE_FLAGS = new Set(['-p', '--position', '-r', '--regex', '-f', '--function', '-c', '--command']);
function parseAbbr(tokens) {
  let i = 1, name = null;
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--') { i++; break; }
    if (ABBR_VALUE_FLAGS.has(t)) { i++; continue; }
    if (t.startsWith('-')) continue;
    name = t; break;
  }
  if (!name) return null;
  const expansion = tokens.slice(i + 1).join(' ');
  return { name, expansion };
}

function parseComplete(tokens) {
  const c = { command: '', short: '', long: '', description: '' };
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '-c' || t === '--command') c.command = tokens[++i] || '';
    else if (t === '-s' || t === '--short-option') c.short = tokens[++i] || '';
    else if (t === '-l' || t === '--long-option') c.long = tokens[++i] || '';
    else if (t === '-d' || t === '--description') c.description = tokens[++i] || '';
    else if (VALUE_FLAGS.has(t)) i++;
  }
  return c.command || c.short || c.long ? c : null;
}

// Parse a Fish script into structured facts. Pure (no DOM) so it is unit-testable.
export function analyzeFish(text) {
  const lines = String(text || '').split(/\r?\n/);
  const functions = [], variables = [], aliases = [], abbrs = [], completions = [], sources = [];
  let hasArgparse = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const tokens = expandEq(tokenize(trimmed));
    if (!tokens.length) continue;
    const cmd = tokens[0];

    if (cmd === 'function') { const f = parseFunction(tokens); if (f) functions.push(f); continue; }
    if (cmd === 'set') { const v = parseSet(tokens); if (v) variables.push(v); continue; }
    if (cmd === 'alias') { const a = parseAlias(tokens); if (a) aliases.push(a); continue; }
    if (cmd === 'abbr') { const a = parseAbbr(tokens); if (a) abbrs.push(a); continue; }
    if (cmd === 'complete') { const c = parseComplete(tokens); if (c) completions.push(c); continue; }
    if (cmd === 'source' || cmd === '.') { if (tokens[1]) sources.push(tokens[1]); continue; }
    if (tokens.includes('argparse')) hasArgparse = true;
  }

  return { functions, variables, aliases, abbrs, completions, sources, hasArgparse };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fish-section';
  const hd = document.createElement('div');
  hd.className = 'fish-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'fish-list';
  sec.appendChild(ul);
  return ul;
}

function row(ul, html) {
  const li = document.createElement('li');
  li.innerHTML = html;
  ul.appendChild(li);
}

const tag = (cls, t) => `<span class="fish-tag ${cls}">${esc(t)}</span>`;

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const isConfig = name.toLowerCase() === 'config.fish';
  const { functions, variables, aliases, abbrs, completions, sources, hasArgparse } = analyzeFish(text);
  const events = functions.filter((f) => f.onEvent || f.onSignal || f.onVariable);

  const host = document.createElement('div');
  host.className = 'fish-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fish-title';
  title.innerHTML = `<span class="fish-badge">${esc(isConfig ? 'Fish Config' : 'Fish Script')}</span>${esc(name)}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fish-sub';
  sub.textContent = [
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    variables.length && `${variables.length} variable${variables.length !== 1 ? 's' : ''}`,
    aliases.length && `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`,
    abbrs.length && `${abbrs.length} abbr${abbrs.length !== 1 ? 's' : ''}`,
    completions.length && `${completions.length} completion${completions.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fish-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: variables.length, label: 'Variables' },
    { value: aliases.length, label: 'Aliases' },
    { value: abbrs.length, label: 'Abbrevs' },
    { value: completions.length, label: 'Completions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fish-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      let html = tag('fish-tag-fn', 'function') + ` <span class="fish-name">${esc(f.name)}</span>`;
      if (f.argNames.length) html += `(<span class="fish-args">${esc(f.argNames.join(' '))}</span>)`;
      if (f.onEvent) html += ' ' + tag('fish-tag-event', `on-event ${f.onEvent}`);
      if (f.onSignal) html += ' ' + tag('fish-tag-event', `on-signal ${f.onSignal}`);
      if (f.onVariable) html += ' ' + tag('fish-tag-event', `on-variable ${f.onVariable}`);
      if (f.wraps) html += ` <span class="fish-desc">wraps ${esc(f.wraps)}</span>`;
      if (f.description) html += ` <span class="fish-desc">— ${esc(f.description)}</span>`;
      row(ul, html);
    }
  }

  if (variables.length) {
    const ul = makeList(makeSection(host, `Variables (${variables.length})`));
    for (const v of variables) {
      let html = tag('fish-tag-' + v.scope, v.scope);
      if (v.exported) html += ' ' + tag('fish-tag-export', 'exported');
      if (v.erase) html += ' ' + tag('fish-tag-unscoped', 'erase');
      html += ` <span class="fish-name">${esc(v.name)}</span>`;
      row(ul, html);
    }
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${aliases.length})`));
    for (const a of aliases) {
      row(ul, tag('fish-tag-alias', 'alias') + ` <span class="fish-name">${esc(a.name)}</span>`
        + (a.target ? ` = <span class="fish-val">${esc(a.target)}</span>` : ''));
    }
  }

  if (abbrs.length) {
    const ul = makeList(makeSection(host, `Abbreviations (${abbrs.length})`));
    for (const a of abbrs) {
      row(ul, tag('fish-tag-abbr', 'abbr') + ` <span class="fish-name">${esc(a.name)}</span>`
        + (a.expansion ? ` → <span class="fish-val">${esc(a.expansion)}</span>` : ''));
    }
  }

  if (events.length) {
    const ul = makeList(makeSection(host, `Event Handlers (${events.length})`));
    for (const f of events) {
      const ev = f.onEvent ? `event ${f.onEvent}` : f.onSignal ? `signal ${f.onSignal}` : `variable ${f.onVariable}`;
      row(ul, tag('fish-tag-event', ev) + ` <span class="fish-name">${esc(f.name)}</span>`);
    }
  }

  if (completions.length) {
    const ul = makeList(makeSection(host, `Completions (${completions.length})`));
    for (const c of completions) {
      let html = tag('fish-tag-cmpl', 'complete');
      if (c.command) html += ` <span class="fish-name">${esc(c.command)}</span>`;
      const opt = [c.short && '-' + c.short, c.long && '--' + c.long].filter(Boolean).join(' ');
      if (opt) html += ` <span class="fish-args">${esc(opt)}</span>`;
      if (c.description) html += ` <span class="fish-desc">— ${esc(c.description)}</span>`;
      row(ul, html);
    }
  }

  if (sources.length) {
    const ul = makeList(makeSection(host, `Source Inclusions (${sources.length})`));
    for (const s of sources) row(ul, `<span class="fish-val">${esc(s)}</span>`);
  }

  if (hasArgparse) {
    const sec = makeSection(host, 'Features');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    const pill = document.createElement('span');
    pill.className = 'fish-pill';
    pill.textContent = 'argparse';
    wrapper.appendChild(pill);
    sec.appendChild(wrapper);
  }

  return { parentNode: host };
}

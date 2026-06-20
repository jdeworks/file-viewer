const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gdbinit-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gdbinit-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2c2c2c;color:#e0c26f;vertical-align:middle;margin-right:8px;letter-spacing:.04em}
.gdbinit-title{font-size:18px;font-weight:700;margin:0 0 14px}
.gdbinit-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.gdbinit-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.gdbinit-chips{display:flex;flex-wrap:wrap;gap:5px;margin:0}
.gdbinit-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid transparent}
.gdbinit-chip-on{background:#d1fae5;color:#065f46;border-color:#a7f3d0}
.gdbinit-chip-off{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.gdbinit-chip-blue{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
.gdbinit-chip-gray{background:var(--bg-3,#f0f0f0);color:var(--fg-2,#555);border-color:var(--border,#d0d0d0)}
.gdbinit-chip-orange{background:#fef3c7;color:#92400e;border-color:#fcd34d}
.gdbinit-chip-purple{background:#ede9fe;color:#5b21b6;border-color:#c4b5fd}
.gdbinit-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px}
.gdbinit-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.gdbinit-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:35%}
.gdbinit-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.gdbinit-list{margin:0;padding-left:18px;font-size:13px}
.gdbinit-list li{margin:2px 0;font:13px/1.4 ui-monospace,monospace}
.gdbinit-ext-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:#1e40af;color:#fff;margin-right:5px;margin-bottom:4px}
`;

function parseLines(text) {
  return text.split(/\r?\n/);
}

function getSet(lines, key) {
  const re = new RegExp(`^\\s*set\\s+${key.replace(/\./g, '\\.')}\\s+(\\S+)`, 'i');
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

function chip(label, value, trueVal, falseVal) {
  if (value == null) return null;
  const isGood = value === trueVal;
  const isBad = value === falseVal;
  const cls = isGood ? 'gdbinit-chip-on' : (isBad ? 'gdbinit-chip-off' : 'gdbinit-chip-gray');
  return `<span class="gdbinit-chip ${cls}">${esc(label)}: ${esc(value)}</span>`;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const lines = parseLines(text);

  // --- Display settings ---
  const displayChips = [];

  const printPretty = getSet(lines, 'print pretty');
  if (printPretty) displayChips.push(chip('print pretty', printPretty, 'on', 'off'));

  const printArray = getSet(lines, 'print array');
  if (printArray) displayChips.push(chip('print array', printArray, 'on', 'off'));

  const printObject = getSet(lines, 'print object');
  if (printObject) displayChips.push(chip('print object', printObject, 'on', 'off'));

  const printStatic = getSet(lines, 'print static-members');
  if (printStatic) displayChips.push(chip('print static-members', printStatic, 'on', 'off'));

  const printVtbl = getSet(lines, 'print vtbl');
  if (printVtbl) displayChips.push(chip('print vtbl', printVtbl, 'on', 'off'));

  const threadEvents = getSet(lines, 'print thread-events');
  if (threadEvents) displayChips.push(chip('print thread-events', threadEvents, 'on', 'off'));

  const pagination = getSet(lines, 'pagination');
  if (pagination) {
    const cls = pagination === 'off' ? 'gdbinit-chip-on' : 'gdbinit-chip-off';
    displayChips.push(`<span class="gdbinit-chip ${cls}">pagination: ${esc(pagination)}</span>`);
  }

  const confirm = getSet(lines, 'confirm');
  if (confirm) {
    const cls = confirm === 'off' ? 'gdbinit-chip-on' : 'gdbinit-chip-off';
    displayChips.push(`<span class="gdbinit-chip ${cls}">confirm: ${esc(confirm)}</span>`);
  }

  // --- Breakpoint / execution settings ---
  const execChips = [];
  const execRows = [];

  const forkMode = getSet(lines, 'follow-fork-mode');
  if (forkMode) {
    const cls = forkMode === 'child' ? 'gdbinit-chip-blue' : 'gdbinit-chip-gray';
    execChips.push(`<span class="gdbinit-chip ${cls}">follow-fork-mode: ${esc(forkMode)}</span>`);
  }

  const detachFork = getSet(lines, 'detach-on-fork');
  if (detachFork) execChips.push(chip('detach-on-fork', detachFork, 'on', 'off'));

  const asmFlavor = getSet(lines, 'disassembly-flavor');
  if (asmFlavor) {
    const cls = asmFlavor === 'intel' ? 'gdbinit-chip-on' : 'gdbinit-chip-gray';
    execChips.push(`<span class="gdbinit-chip ${cls}">disassembly-flavor: ${esc(asmFlavor)}</span>`);
  }

  const histSave = getSet(lines, 'history save');
  if (histSave) execChips.push(chip('history save', histSave, 'on', 'off'));

  const histSize = getSet(lines, 'history size');
  if (histSize) execRows.push(['history size', histSize]);

  const histFile = (() => {
    for (const l of lines) {
      const m = l.match(/^\s*set\s+history\s+filename\s+(.+)/i);
      if (m) return m[1].trim();
    }
    return null;
  })();
  if (histFile) execRows.push(['history filename', histFile]);

  // --- Custom define blocks ---
  const customCommands = [];
  for (const l of lines) {
    const m = l.match(/^\s*define\s+(\S+)/i);
    if (m) customCommands.push(m[1]);
  }

  // --- Python blocks / imports ---
  const pythonImports = [];
  let inPython = false;
  for (const l of lines) {
    if (/^\s*python\s*$/.test(l)) { inPython = true; continue; }
    if (/^\s*end\s*$/.test(l)) { inPython = false; continue; }
    if (inPython) {
      const m = l.match(/^\s*import\s+(\S+)/);
      if (m) pythonImports.push(m[1]);
    }
    // single-line python import: python import foo
    const ml = l.match(/^\s*python\s+import\s+(\S+)/i);
    if (ml) pythonImports.push(ml[1]);
  }

  // --- source lines ---
  const sourceFiles = [];
  for (const l of lines) {
    const m = l.match(/^\s*source\s+(.+)/i);
    if (m) sourceFiles.push(m[1].trim());
  }

  // --- auto-load safe paths ---
  const autoloadPaths = [];
  for (const l of lines) {
    const m = l.match(/^\s*add-auto-load-safe-path\s+(.+)/i);
    if (m) autoloadPaths.push(m[1].trim());
  }

  // --- Known extensions (GEF, PWNDBG, PEDA) ---
  const extensions = [];
  const allText = text.toLowerCase();
  if (allText.includes('gef.py') || allText.includes('source ~/.gef')) extensions.push('GEF');
  if (allText.includes('pwndbg') || allText.includes('pwndbg/gdbinit.py')) extensions.push('PWNDBG');
  if (allText.includes('peda.py') || allText.includes('peda/peda.py')) extensions.push('PEDA');

  // Build HTML
  let html = '';

  if (displayChips.length) {
    html += `<div class="gdbinit-card"><h3>Display settings</h3><div class="gdbinit-chips">${displayChips.filter(Boolean).join('')}</div></div>`;
  }

  const execSection = [];
  if (execChips.length) execSection.push(`<div class="gdbinit-chips">${execChips.join('')}</div>`);
  if (execRows.length) {
    const rowsHtml = execRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    execSection.push(`<table class="gdbinit-table"><tbody>${rowsHtml}</tbody></table>`);
  }
  if (execSection.length) {
    html += `<div class="gdbinit-card"><h3>Execution &amp; history</h3>${execSection.join('')}</div>`;
  }

  if (extensions.length) {
    const extHtml = extensions.map((e) => `<span class="gdbinit-ext-chip">${esc(e)}</span>`).join('');
    html += `<div class="gdbinit-card"><h3>Extensions detected</h3><div>${extHtml}</div></div>`;
  }

  if (customCommands.length) {
    const items = customCommands.map((c) => `<li>${esc(c)}</li>`).join('');
    html += `<div class="gdbinit-card"><h3>Custom commands (${customCommands.length})</h3><ul class="gdbinit-list">${items}</ul></div>`;
  }

  if (pythonImports.length) {
    const items = pythonImports.map((m) => `<li>${esc(m)}</li>`).join('');
    html += `<div class="gdbinit-card"><h3>Python modules imported</h3><ul class="gdbinit-list">${items}</ul></div>`;
  }

  if (sourceFiles.length) {
    const items = sourceFiles.map((f) => `<li>${esc(f)}</li>`).join('');
    html += `<div class="gdbinit-card"><h3>Sourced files</h3><ul class="gdbinit-list">${items}</ul></div>`;
  }

  if (autoloadPaths.length) {
    const items = autoloadPaths.map((p) => `<li>${esc(p)}</li>`).join('');
    html += `<div class="gdbinit-card"><h3>Auto-load safe paths</h3><ul class="gdbinit-list">${items}</ul></div>`;
  }

  if (!html) {
    html = '<p style="color:var(--fg-2);font-size:13px">No recognized GDB init directives found.</p>';
  }

  const host = document.createElement('div');
  host.className = 'gdbinit-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gdbinit-title"><span class="gdbinit-badge">GDB</span>GDB Init</div>
${html}`;
  return { parentNode: host };
}

// GNU readline .inputrc renderer.
// Parses set variable value, key binding lines, and $if conditional sections.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.inputrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.inputrc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2b3a42;color:#fff;vertical-align:middle;margin-right:8px}
.inputrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.inputrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.inputrc-sec{margin:14px 0}
.inputrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.inputrc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.inputrc-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.inputrc-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.inputrc-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.inputrc-chip-orange{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.inputrc-chip-yellow{background:#fefce8;border-color:#fde047;color:#a16207}
.inputrc-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.inputrc-table{width:100%;border-collapse:collapse;font-size:13px}
.inputrc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.inputrc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.inputrc-table tr:last-child td{border-bottom:none}
.inputrc-key{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.inputrc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.inputrc-cond-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:#f3f4f6;border:1px solid #d1d5db;color:#4b5563;margin-right:4px}
`;

function parseInputrc(text) {
  const lines = text.split(/\r?\n/);
  const settings = new Map();
  const bindings = [];
  const conditionals = [];

  let currentCond = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // $if directive
    if (/^\$if\s+/i.test(line)) {
      currentCond = line.replace(/^\$if\s+/i, '').trim();
      if (!conditionals.find((c) => c.cond === currentCond)) {
        conditionals.push({ cond: currentCond });
      }
      continue;
    }
    if (/^\$endif$/i.test(line)) {
      currentCond = null;
      continue;
    }
    if (/^\$else$/i.test(line)) {
      continue;
    }

    // set variable value
    const setMatch = line.match(/^set\s+([\w-]+)\s+(.+)$/i);
    if (setMatch) {
      const key = setMatch[1].toLowerCase();
      const val = setMatch[2].trim().replace(/^"(.*)"$/, '$1');
      if (!settings.has(key)) {
        settings.set(key, val);
      }
      continue;
    }

    // "key-sequence": function-or-macro
    const bindMatch = line.match(/^"([^"]+)"\s*:\s*(.+)$/);
    if (bindMatch) {
      bindings.push({ seq: bindMatch[1], action: bindMatch[2].trim() });
      continue;
    }
  }

  return { settings, bindings, conditionals };
}

export function render(intake) {
  const text = intake.text || '';
  const { settings, bindings, conditionals } = parseInputrc(text);

  const parts = [];

  // Editing card
  const editChips = [];
  const mode = settings.get('editing-mode');
  if (mode) {
    const modeClass = mode === 'vi' ? 'inputrc-chip-orange' : mode === 'emacs' ? 'inputrc-chip-blue' : 'inputrc-chip-gray';
    editChips.push(`<span class="inputrc-chip ${modeClass}">editing-mode: ${esc(mode)}</span>`);
  }
  const keymap = settings.get('keymap');
  if (keymap) editChips.push(`<span class="inputrc-chip inputrc-chip-gray">keymap: ${esc(keymap)}</span>`);
  const bell = settings.get('bell-style');
  if (bell) {
    const bellClass = bell === 'none' ? 'inputrc-chip-green' : bell === 'visible' ? 'inputrc-chip-yellow' : 'inputrc-chip-gray';
    editChips.push(`<span class="inputrc-chip ${bellClass}">bell-style: ${esc(bell)}</span>`);
  }
  const viCmd = settings.get('vi-cmd-mode-string');
  if (viCmd) editChips.push(`<span class="inputrc-chip inputrc-chip-gray">vi-cmd-mode-string: ${esc(viCmd)}</span>`);
  const viIns = settings.get('vi-ins-mode-string');
  if (viIns) editChips.push(`<span class="inputrc-chip inputrc-chip-gray">vi-ins-mode-string: ${esc(viIns)}</span>`);

  if (editChips.length) {
    parts.push(`<div class="inputrc-sec"><h3>Editing</h3><div class="inputrc-chips">${editChips.join('')}</div></div>`);
  }

  // Completion card
  const compChips = [];
  const cic = settings.get('completion-ignore-case');
  if (cic) compChips.push(`<span class="inputrc-chip ${cic === 'on' ? 'inputrc-chip-green' : 'inputrc-chip-gray'}">completion-ignore-case: ${esc(cic)}</span>`);
  const cmc = settings.get('completion-map-case');
  if (cmc) compChips.push(`<span class="inputrc-chip inputrc-chip-gray">completion-map-case: ${esc(cmc)}</span>`);
  const saia = settings.get('show-all-if-ambiguous');
  if (saia) compChips.push(`<span class="inputrc-chip ${saia === 'on' ? 'inputrc-chip-green' : 'inputrc-chip-gray'}">show-all-if-ambiguous: ${esc(saia)}</span>`);
  const saiu = settings.get('show-all-if-unmodified');
  if (saiu) compChips.push(`<span class="inputrc-chip inputrc-chip-gray">show-all-if-unmodified: ${esc(saiu)}</span>`);
  const mcdp = settings.get('menu-complete-display-prefix');
  if (mcdp) compChips.push(`<span class="inputrc-chip inputrc-chip-gray">menu-complete-display-prefix: ${esc(mcdp)}</span>`);
  const ccp = settings.get('colored-completion-prefix');
  if (ccp) compChips.push(`<span class="inputrc-chip inputrc-chip-gray">colored-completion-prefix: ${esc(ccp)}</span>`);
  const cs = settings.get('colored-stats');
  if (cs) compChips.push(`<span class="inputrc-chip ${cs === 'on' ? 'inputrc-chip-green' : 'inputrc-chip-gray'}">colored-stats: ${esc(cs)}</span>`);

  if (compChips.length) {
    parts.push(`<div class="inputrc-sec"><h3>Completion</h3><div class="inputrc-chips">${compChips.join('')}</div></div>`);
  }

  // Display card
  const dispChips = [];
  const msd = settings.get('mark-symlinked-directories');
  if (msd) dispChips.push(`<span class="inputrc-chip inputrc-chip-gray">mark-symlinked-directories: ${esc(msd)}</span>`);
  const vs = settings.get('visible-stats');
  if (vs) dispChips.push(`<span class="inputrc-chip inputrc-chip-gray">visible-stats: ${esc(vs)}</span>`);
  const sct = settings.get('skip-completed-text');
  if (sct) dispChips.push(`<span class="inputrc-chip inputrc-chip-gray">skip-completed-text: ${esc(sct)}</span>`);
  const pc = settings.get('page-completions');
  if (pc) dispChips.push(`<span class="inputrc-chip inputrc-chip-gray">page-completions: ${esc(pc)}</span>`);

  if (dispChips.length) {
    parts.push(`<div class="inputrc-sec"><h3>Display</h3><div class="inputrc-chips">${dispChips.join('')}</div></div>`);
  }

  // Key bindings card
  if (bindings.length > 0) {
    const bindRows = bindings.slice(0, 8).map((b) => {
      const actionDisplay = b.action.startsWith('"') ? b.action.replace(/^"(.*)"$/, '$1') : b.action;
      return `<tr><td class="inputrc-key">${esc(b.seq)}</td><td><span class="inputrc-val">${esc(actionDisplay)}</span></td></tr>`;
    });
    const more = bindings.length > 8 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px;padding:5px 8px">…and ${bindings.length - 8} more binding${bindings.length - 8 === 1 ? '' : 's'}</td></tr>` : '';
    parts.push(`<div class="inputrc-sec"><h3>Key Bindings (${bindings.length} total)</h3><table class="inputrc-table"><thead><tr><th>Sequence</th><th>Action</th></tr></thead><tbody>${bindRows.join('')}${more}</tbody></table></div>`);
  }

  // Conditionals card
  if (conditionals.length > 0) {
    const condTags = conditionals.map((c) => `<span class="inputrc-cond-tag">$if ${esc(c.cond)}</span>`).join(' ');
    parts.push(`<div class="inputrc-sec"><h3>Conditional Sections</h3><div class="inputrc-chips" style="margin-top:6px">${condTags}</div></div>`);
  }

  // Build subtitle
  const subParts = [];
  if (mode) subParts.push(`${mode} mode`);
  if (bindings.length) subParts.push(`${bindings.length} binding${bindings.length === 1 ? '' : 's'}`);
  if (conditionals.length) subParts.push(`${conditionals.length} conditional section${conditionals.length === 1 ? '' : 's'}`);
  const sub = subParts.join(' · ') || 'GNU readline configuration';

  const host = document.createElement('div');
  host.className = 'inputrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="inputrc-title"><span class="inputrc-badge">readline</span>.inputrc</div>
<div class="inputrc-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}

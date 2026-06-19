// Enhanced aider.conf.yml viewer for the Aider AI pair programmer.
// Shows a green Aider badge, model settings, edit format, and key options.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.adr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-adr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#15803d;color:#fff;vertical-align:middle;margin-right:8px;}
.adr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.adr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.adr-sec{margin:12px 0;}
.adr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.adr-row{display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.adr-row:last-child{border-bottom:none;}
.adr-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.adr-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.adr-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534;margin:1px 3px 1px 0;}
.adr-chip.warn{background:#fef9c3;border-color:#fde047;color:#854d0e;}
.adr-chip.info{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
`;

const KEY_LABELS = {
  model: 'Main model',
  weak_model: 'Weak model',
  editor_model: 'Editor model',
  edit_format: 'Edit format',
  auto_commits: 'Auto-commits',
  auto_lint: 'Auto-lint',
  auto_test: 'Auto-test',
  stream: 'Stream output',
  pretty: 'Pretty output',
  git: 'Git integration',
  gitignore: 'Update .gitignore',
  dark_mode: 'Dark mode',
  light_mode: 'Light mode',
  verbose: 'Verbose',
  show_diffs: 'Show diffs',
  map_tokens: 'Repo map tokens',
  map_refresh: 'Map refresh',
  cache_prompts: 'Cache prompts',
  max_chat_history_tokens: 'Max chat history',
};

function boolChip(val) {
  const v = String(val).toLowerCase();
  if (v === 'true' || v === 'yes') return `<span class="adr-chip">${esc(String(val))}</span>`;
  if (v === 'false' || v === 'no') return `<span class="adr-chip warn">${esc(String(val))}</span>`;
  return `<span class="adr-chip info">${esc(String(val))}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const keys = Object.keys(cfg);
  const settingCount = keys.length;

  const highlights = ['model', 'weak_model', 'editor_model', 'edit_format', 'auto_commits', 'auto_lint', 'auto_test', 'git'];
  const highlightRows = highlights
    .filter((k) => k in cfg)
    .map((k) => {
      const val = cfg[k];
      const label = KEY_LABELS[k] || k;
      const display = typeof val === 'boolean' || val === 'true' || val === 'false'
        ? boolChip(val)
        : `<span class="adr-val">${esc(String(val))}</span>`;
      return `<div class="adr-row"><span class="adr-key">${esc(label)}</span>${display}</div>`;
    }).join('');

  const otherKeys = keys.filter((k) => !highlights.includes(k));
  const otherRows = otherKeys.slice(0, 12).map((k) => {
    const val = cfg[k];
    const label = KEY_LABELS[k] || k;
    const display = typeof val === 'boolean' || val === 'true' || val === 'false'
      ? boolChip(val)
      : `<span class="adr-val">${esc(String(val))}</span>`;
    return `<div class="adr-row"><span class="adr-key">${esc(label)}</span>${display}</div>`;
  }).join('');

  const model = cfg.model ? String(cfg.model) : null;
  const editFmt = cfg.edit_format ? String(cfg.edit_format) : null;

  const host = document.createElement('div');
  host.className = 'adr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="adr-title"><span class="badge-adr">Aider</span>aider.conf.yml</div>
<div class="adr-sub">${settingCount} setting${settingCount !== 1 ? 's' : ''}${model ? ` · ${esc(model)}` : ''}${editFmt ? ` · ${esc(editFmt)} format` : ''}</div>
${highlightRows ? `<div class="adr-sec"><h3>Key Settings</h3><div style="border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:4px 12px;">${highlightRows}</div></div>` : ''}
${otherRows ? `<div class="adr-sec"><h3>Other Settings</h3><div style="border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:4px 12px;">${otherRows}</div>${otherKeys.length > 12 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">…and ${otherKeys.length - 12} more setting${otherKeys.length - 12 !== 1 ? 's' : ''}</div>` : ''}</div>` : ''}
${!settingCount ? '<div style="color:var(--fg-2,#888);font-size:13px;">No settings found.</div>' : ''}`;

  return { parentNode: host };
}

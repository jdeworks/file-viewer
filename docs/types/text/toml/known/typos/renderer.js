import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.typ-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-typ{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a3c5a;color:#e2f0ff;vertical-align:middle;margin-right:8px;}
.typ-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.typ-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.typ-sec{margin:12px 0;}
.typ-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.typ-table{width:100%;border-collapse:collapse;font-size:13px;}
.typ-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.typ-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.typ-mono{font:12px/1.4 ui-monospace,monospace;}
.typ-flags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.typ-flag{font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--border,#e0e0e0);}
.typ-flag.on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.typ-flag.off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.typ-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const def = cfg.default || {};
  const files = cfg.files || {};
  const typeOverrides = cfg.type || {};

  // Collect all extend-words from [default] and [type.*]
  const defaultWords = def['extend-words'] || {};
  const defaultIdents = def['extend-identifiers'] || {};
  const typeWordEntries = [];
  for (const [typeName, typeCfg] of Object.entries(typeOverrides)) {
    const words = (typeCfg || {})['extend-words'] || {};
    for (const [typo, correct] of Object.entries(words)) {
      typeWordEntries.push({ type: typeName, typo, correct });
    }
  }

  const allDefaultWords = Object.entries(defaultWords);
  const allDefaultIdents = Object.entries(defaultIdents);

  const flag = (val, label) => val !== undefined
    ? `<span class="typ-flag ${val === false ? 'off' : 'on'}">${esc(label)}: ${val === false ? 'no' : 'yes'}</span>` : '';

  const flagsHtml = [
    flag(files['ignore-hidden'], 'ignore-hidden'),
    flag(files['ignore-files'], 'ignore-files'),
    flag(files['ignore-dot'], 'ignore-dot'),
    flag(def['check-filename'] ?? def['check-filenames'], 'check-filenames'),
    flag(def['check-file'] ?? def['check-files'], 'check-files'),
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'typ-doc';

  const wordCount = allDefaultWords.length + typeWordEntries.length;
  const identCount = allDefaultIdents.length;

  const defaultWordsHtml = allDefaultWords.length
    ? `<div class="typ-sec"><h3>Word overrides (${allDefaultWords.length})</h3><table class="typ-table"><thead><tr><th>Typo</th><th>Correction</th></tr></thead><tbody>${
        allDefaultWords.slice(0, 15).map(([typo, correct]) =>
          `<tr><td><span class="typ-mono">${esc(typo)}</span></td><td><span class="typ-mono">${esc(correct)}</span></td></tr>`
        ).join('')
      }${allDefaultWords.length > 15 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${allDefaultWords.length - 15} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  const defaultIdentsHtml = allDefaultIdents.length
    ? `<div class="typ-sec"><h3>Identifier overrides (${allDefaultIdents.length})</h3><table class="typ-table"><thead><tr><th>Pattern</th><th>Replacement</th></tr></thead><tbody>${
        allDefaultIdents.slice(0, 10).map(([k, v]) =>
          `<tr><td><span class="typ-mono">${esc(k)}</span></td><td><span class="typ-mono">${esc(v)}</span></td></tr>`
        ).join('')
      }</tbody></table></div>`
    : '';

  const typeWordsHtml = typeWordEntries.length
    ? `<div class="typ-sec"><h3>Per-type word overrides (${typeWordEntries.length})</h3><table class="typ-table"><thead><tr><th>Type</th><th>Typo</th><th>Correction</th></tr></thead><tbody>${
        typeWordEntries.slice(0, 10).map(({ type, typo, correct }) =>
          `<tr><td><span class="typ-pill">${esc(type)}</span></td><td><span class="typ-mono">${esc(typo)}</span></td><td><span class="typ-mono">${esc(correct)}</span></td></tr>`
        ).join('')
      }${typeWordEntries.length > 10 ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:12px">…and ${typeWordEntries.length - 10} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-typ">typos</span>
  <span class="typ-title">Spell checker config</span>
</div>
<div class="typ-sub">${wordCount} word override${wordCount !== 1 ? 's' : ''}${identCount ? ` · ${identCount} identifier override${identCount !== 1 ? 's' : ''}` : ''}</div>
${flagsHtml ? `<div class="typ-sec"><h3>File settings</h3><div class="typ-flags">${flagsHtml}</div></div>` : ''}
${defaultWordsHtml}
${defaultIdentsHtml}
${typeWordsHtml}`;

  return { parentNode: host };
}

// Enhanced PHPStan config view. NEON is a superset of YAML-like syntax but
// not standard YAML, so we parse it line-by-line with regex.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ps-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ps-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-ps{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;}
.ps-title{font-size:18px;font-weight:700;margin:0;}
.ps-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.ps-level{display:inline-block;padding:3px 14px;border-radius:20px;font-size:16px;font-weight:700;background:#eff6ff;border:2px solid #3b82f6;color:#1d4ed8;margin-bottom:12px;}
.ps-sec{margin-top:16px;}
.ps-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.ps-pills{display:flex;flex-wrap:wrap;gap:6px;}
.ps-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.ps-pill.path{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.ps-pill.ext{background:#f0fdf4;border-color:#86efac;color:#166534;}
.ps-pill.err{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.ps-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.ps-kv:last-child{border-bottom:none;}
.ps-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:140px;flex-shrink:0;}
.ps-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
`;

// Simple NEON line-by-line parser — extracts scalar values and list items
// under known top-level keys. Handles:
//   key: value
//   key:
//     - item
//     - item
//   parameters:
//     key: value
function parseNeon(text) {
  const lines = text.split('\n');
  const result = {};
  let currentKey = null;
  let inParameters = false;
  let paramKey = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trimEnd();
    if (!trimmed || trimmed.trimStart().startsWith('#')) continue;

    // Top-level section (no indent)
    const topSection = /^(\w[\w-]*):\s*$/.exec(trimmed);
    if (topSection) {
      currentKey = topSection[1];
      inParameters = currentKey === 'parameters';
      paramKey = null;
      if (!result[currentKey]) result[currentKey] = [];
      continue;
    }

    // Top-level key: value (no indent)
    const topKv = /^(\w[\w-]*):\s+(.+)/.exec(trimmed);
    if (topKv && !raw.startsWith(' ') && !raw.startsWith('\t')) {
      result[topKv[1]] = topKv[2].replace(/^["']|["']$/g, '').trim();
      currentKey = topKv[1];
      inParameters = false;
      paramKey = null;
      continue;
    }

    // Indented content
    if (raw.startsWith('\t') || raw.startsWith(' ')) {
      const inner = trimmed.trimStart();

      if (inParameters) {
        // parameters sub-key:
        const subKv = /^(\w[\w.-]*):\s+(.*)/.exec(inner);
        if (subKv) {
          if (!result.parameters) result.parameters = {};
          if (typeof result.parameters === 'array') result.parameters = {};
          result.parameters[subKv[1]] = subKv[2].replace(/^["']|["']$/g, '').trim();
          paramKey = subKv[1];
          continue;
        }
        const subKey = /^(\w[\w.-]*):\s*$/.exec(inner);
        if (subKey) { paramKey = subKey[1]; if (!result.parameters) result.parameters = {}; if (!result.parameters[paramKey]) result.parameters[paramKey] = []; continue; }
        // list item under paramKey
        const listItem = /^-\s+(.*)/.exec(inner);
        if (listItem && paramKey && result.parameters) {
          const val = listItem[1].replace(/^["']|["']$/g, '').trim();
          if (!Array.isArray(result.parameters[paramKey])) result.parameters[paramKey] = [];
          result.parameters[paramKey].push(val);
          continue;
        }
      }

      // List item under current top-level key
      const listItem = /^-\s+(.*)/.exec(inner);
      if (listItem && currentKey && Array.isArray(result[currentKey])) {
        result[currentKey].push(listItem[1].replace(/^["']|["']$/g, '').trim());
      }
    }
  }
  return result;
}

const LEVEL_DESCRIPTIONS = {
  0: 'basic checks', 1: 'possibly undefined vars', 2: 'unknown methods',
  3: 'return types', 4: 'dead code', 5: 'type-checking arguments',
  6: 'report missing types', 7: 'report partially wrong union types',
  8: 'report nullable passed to non-nullable', 9: 'max — be really strict', 10: 'max',
};

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'ps-doc';

  const parsed = parseNeon(text);
  const params = (typeof parsed.parameters === 'object' && !Array.isArray(parsed.parameters))
    ? parsed.parameters : {};

  // Level — can be at top or under parameters
  const levelRaw = params.level ?? parsed.level ?? null;
  const level = levelRaw != null ? String(levelRaw) : null;

  // Paths
  const paths = Array.isArray(params.paths) ? params.paths :
    (params.paths ? [params.paths] : (Array.isArray(parsed.paths) ? parsed.paths : []));

  // Includes at top level (phpstan.neon often has includes: [...])
  const includes = Array.isArray(parsed.includes) ? parsed.includes : [];

  // Ignored errors
  const ignoreErrors = Array.isArray(params.ignoreErrors) ? params.ignoreErrors : [];

  // Extensions
  const extensions = Array.isArray(params.extensions) ? params.extensions : [];

  // Extra params to show
  const extraKv = ['bootstrapFiles', 'checkMissingIterableValueType', 'reportUnmatchedIgnoredErrors', 'treatPhpDocTypesAsCertain']
    .filter((k) => params[k] != null)
    .map((k) => ({ k, v: String(params[k]) }));

  const levelDesc = level != null ? (LEVEL_DESCRIPTIONS[level] || '') : null;
  const subtitle = [
    level != null ? `Level ${level}` : '',
    paths.length ? `${paths.length} path${paths.length !== 1 ? 's' : ''}` : '',
    ignoreErrors.length ? `${ignoreErrors.length} ignored error${ignoreErrors.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'PHPStan static analysis config';

  const levelHtml = level != null ? `<div>
    <div class="ps-level">Level ${esc(level)}</div>
    ${levelDesc ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-bottom:8px;">${esc(levelDesc)}</div>` : ''}
  </div>` : '';

  const pathsHtml = paths.length ? `<div class="ps-sec"><h3>Analysed Paths (${paths.length})</h3><div class="ps-pills">
    ${paths.map((p) => `<span class="ps-pill path">${esc(p)}</span>`).join('')}
  </div></div>` : '';

  const includesHtml = includes.length ? `<div class="ps-sec"><h3>Includes (${includes.length})</h3><div class="ps-pills">
    ${includes.map((p) => `<span class="ps-pill">${esc(p)}</span>`).join('')}
  </div></div>` : '';

  const errHtml = ignoreErrors.length ? `<div class="ps-sec"><h3>Ignored Errors (${ignoreErrors.length})</h3><div class="ps-pills">
    ${ignoreErrors.slice(0, 10).map((e) => `<span class="ps-pill err">${esc(e.length > 60 ? e.slice(0, 57) + '…' : e)}</span>`).join('')}
    ${ignoreErrors.length > 10 ? `<span class="ps-pill" style="color:var(--fg-2,#888);">+${ignoreErrors.length - 10} more</span>` : ''}
  </div></div>` : '';

  const extHtml = extensions.length ? `<div class="ps-sec"><h3>Extensions (${extensions.length})</h3><div class="ps-pills">
    ${extensions.map((e) => `<span class="ps-pill ext">${esc(e.split('\\').pop())}</span>`).join('')}
  </div></div>` : '';

  const kvHtml = extraKv.length ? `<div class="ps-sec"><h3>Extra Settings</h3>
    ${extraKv.map((r) => `<div class="ps-kv"><span class="ps-kv-k">${esc(r.k)}</span><span class="ps-kv-v">${esc(r.v)}</span></div>`).join('')}
  </div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ps-head">
  <span class="badge-ps">PHPStan</span>
  <div>
    <div class="ps-title">phpstan.neon</div>
    <div class="ps-sub">${esc(subtitle)}</div>
  </div>
</div>
${levelHtml}${pathsHtml}${includesHtml}${errHtml}${extHtml}${kvHtml}`;

  return { parentNode: host };
}

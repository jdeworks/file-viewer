const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lhci-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lhci-doc .badge-lhci{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF6B00;color:#fff;vertical-align:middle;margin-right:8px;letter-spacing:.02em;}
.lhci-doc .lhci-title{font-size:18px;font-weight:700;margin:0 0 4px;display:flex;align-items:center;}
.lhci-doc .lhci-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lhci-doc .lhci-sec{margin:14px 0;}
.lhci-doc .lhci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lhci-doc .lhci-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:4px 0;}
.lhci-doc .lhci-key{color:var(--fg-2,#888);font-size:12px;}
.lhci-doc .lhci-val{font:12px ui-monospace,monospace;word-break:break-all;color:var(--fg,#24292f);}
.lhci-doc .lhci-preset{display:inline-block;font-size:12px;padding:2px 10px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-family:ui-monospace,monospace;margin:2px 0;}
.lhci-doc .lhci-chips{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0;}
.lhci-doc .lhci-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 9px;border-radius:10px;font-family:ui-monospace,monospace;}
.lhci-doc .lhci-chip.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}
.lhci-doc .lhci-chip.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;}
.lhci-doc .lhci-chip.generic{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.lhci-doc .lhci-table{width:100%;border-collapse:collapse;font-size:12px;}
.lhci-doc .lhci-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.lhci-doc .lhci-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;word-break:break-all;}
.lhci-doc .lhci-badge-upload{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-family:ui-monospace,monospace;}
`;

function flattenAssertions(assertObj) {
  // assertObj can be { 'categories:performance': ['error', {minScore: 0.9}], ... }
  const results = [];
  if (!assertObj || typeof assertObj !== 'object') return results;
  for (const [key, val] of Object.entries(assertObj)) {
    if (Array.isArray(val)) {
      const [level, opts] = val;
      results.push({ key, level: String(level || 'generic'), opts: opts || {} });
    } else if (typeof val === 'string') {
      results.push({ key, level: val, opts: {} });
    }
  }
  return results;
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();
  const ci = cfg.ci || {};

  // Collect section
  const collect = ci.collect || {};
  const urls = Array.isArray(collect.url) ? collect.url : (collect.url ? [collect.url] : []);
  const numberOfRuns = collect.numberOfRuns ?? null;
  const formFactor = collect.settings?.formFactor || null;
  const startServerCmd = collect.startServerCommand || null;
  const staticDistDir = collect.staticDistDir || null;

  // Assert section
  const assert = ci.assert || {};
  const preset = assert.preset || null;
  const assertions = flattenAssertions(assert.assertions);

  // Upload section
  const upload = ci.upload || {};
  const uploadTarget = upload.target || null;
  const serverBaseUrl = upload.serverBaseUrl || null;
  const outputDir = upload.outputDir || null;
  const reportFilenamePattern = upload.reportFilenamePattern || null;

  // Server section (optional, for LHCI server mode)
  const server = ci.server || null;
  const serverPort = server?.port || null;
  const storageMethod = server?.storage?.storageMethod || null;

  const host = document.createElement('div');
  host.className = 'lhci-doc';

  // Collect section HTML
  const collectLines = [
    urls.length ? `<span class="lhci-key">url${urls.length > 1 ? 's' : ''}</span><span class="lhci-val">${urls.slice(0, 3).map(esc).join(', ')}${urls.length > 3 ? ` +${urls.length - 3} more` : ''}</span>` : '',
    numberOfRuns != null ? `<span class="lhci-key">numberOfRuns</span><span class="lhci-val">${esc(numberOfRuns)}</span>` : '',
    formFactor ? `<span class="lhci-key">formFactor</span><span class="lhci-val">${esc(formFactor)}</span>` : '',
    staticDistDir ? `<span class="lhci-key">staticDistDir</span><span class="lhci-val">${esc(staticDistDir)}</span>` : '',
    startServerCmd ? `<span class="lhci-key">startServerCommand</span><span class="lhci-val">${esc(String(startServerCmd).slice(0, 60))}</span>` : '',
  ].filter(Boolean);

  const collectHtml = collectLines.length
    ? `<div class="lhci-sec"><h3>Collect</h3><div class="lhci-grid">${collectLines.join('')}</div></div>` : '';

  // Assert section HTML
  const presetHtml = preset
    ? `<div style="margin:4px 0"><span class="lhci-preset">${esc(preset)}</span></div>` : '';

  const assertionChips = assertions.slice(0, 20).map(({ key, level, opts }) => {
    const cls = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'generic';
    const threshold = opts.minScore != null ? ` ≥${opts.minScore}` : opts.maxNumericValue != null ? ` ≤${opts.maxNumericValue}` : opts.maxLength != null ? ` ≤${opts.maxLength}` : '';
    return `<span class="lhci-chip ${cls}">${esc(key)}${threshold ? `<small>${esc(threshold)}</small>` : ''}</span>`;
  }).join('');

  const moreAssertions = assertions.length > 20 ? `<span style="font-size:11px;color:var(--fg-2,#888);margin-left:4px">+${assertions.length - 20} more</span>` : '';

  const assertHtml = (preset || assertions.length)
    ? `<div class="lhci-sec"><h3>Assert</h3>${presetHtml}${assertions.length ? `<div class="lhci-chips">${assertionChips}${moreAssertions}</div>` : ''}</div>` : '';

  // Upload section HTML
  const uploadLines = [
    uploadTarget ? `<span class="lhci-key">target</span><span class="lhci-badge-upload">${esc(uploadTarget)}</span>` : '',
    serverBaseUrl ? `<span class="lhci-key">serverBaseUrl</span><span class="lhci-val">${esc(serverBaseUrl)}</span>` : '',
    outputDir ? `<span class="lhci-key">outputDir</span><span class="lhci-val">${esc(outputDir)}</span>` : '',
    reportFilenamePattern ? `<span class="lhci-key">reportFilenamePattern</span><span class="lhci-val">${esc(reportFilenamePattern)}</span>` : '',
  ].filter(Boolean);

  const uploadHtml = uploadLines.length
    ? `<div class="lhci-sec"><h3>Upload</h3><div class="lhci-grid">${uploadLines.join('')}</div></div>` : '';

  // Server section HTML
  const serverHtml = server
    ? `<div class="lhci-sec"><h3>Server</h3><div class="lhci-grid">${[
        serverPort ? `<span class="lhci-key">port</span><span class="lhci-val">${esc(serverPort)}</span>` : '',
        storageMethod ? `<span class="lhci-key">storageMethod</span><span class="lhci-val">${esc(storageMethod)}</span>` : '',
      ].filter(Boolean).join('')}</div></div>` : '';

  const subParts = [
    preset && `preset: ${preset}`,
    uploadTarget && `upload: ${uploadTarget}`,
    numberOfRuns != null && `${numberOfRuns} run${numberOfRuns !== 1 ? 's' : ''}`,
  ].filter(Boolean);

  host.innerHTML = `<style>${CSS}</style>
<div class="lhci-title"><span class="badge-lhci">Lighthouse CI</span></div>
<div class="lhci-sub">${subParts.length ? subParts.join(' · ') : 'LHCI configuration'}</div>
${collectHtml}
${assertHtml}
${uploadHtml}
${serverHtml}`;

  return { parentNode: host };
}

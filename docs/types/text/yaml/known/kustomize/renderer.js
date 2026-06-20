import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kustomize-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kustomize{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326ce5;color:#fff;vertical-align:middle;margin-right:8px;}
.kustomize-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.kustomize-sec{margin:12px 0;}
.kustomize-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kustomize-list{display:flex;flex-direction:column;gap:4px;}
.kustomize-item{font:12px ui-monospace,monospace;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.kustomize-item.patch{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.kustomize-item.gen{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.kustomize-item.image{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.kustomize-ns{display:inline-block;padding:2px 8px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:12px;margin-bottom:8px;margin-right:6px;}
.kustomize-meta{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:12px;margin:6px 0;}
.kustomize-meta-key{color:var(--fg-2,#888);}
.kustomize-meta-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
.kustomize-kv{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.kustomize-kv-pair{font:11px ui-monospace,monospace;padding:2px 8px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

function listHtml(items, cls) {
  if (!items.length) return '<span style="color:var(--fg-2,#888);font-size:12px">none</span>';
  return `<div class="kustomize-list">${items.map((i) => `<span class="kustomize-item ${cls || ''}">${esc(i)}</span>`).join('')}</div>`;
}

function kvHtml(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return '';
  return `<div class="kustomize-kv">${entries.map(([k, v]) => `<span class="kustomize-kv-pair">${esc(k)}: ${esc(v)}</span>`).join('')}</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const resources = Array.isArray(cfg.resources) ? cfg.resources.map(String) : [];
  const patches = Array.isArray(cfg.patchesStrategicMerge)
    ? cfg.patchesStrategicMerge.map((p) => (typeof p === 'string' ? p : (p.path || JSON.stringify(p))))
    : [];
  const patches2 = Array.isArray(cfg.patches)
    ? cfg.patches.map((p) => (typeof p === 'string' ? p : (p.path || p.target?.kind || JSON.stringify(p))))
    : [];
  const allPatches = [...patches, ...patches2];

  const images = Array.isArray(cfg.images)
    ? cfg.images.map((img) => {
        if (typeof img === 'string') return img;
        const parts = [img.name];
        if (img.newName) parts.push(`→ ${img.newName}`);
        if (img.newTag) parts.push(`:${img.newTag}`);
        return parts.join(' ');
      })
    : [];

  const cmGens = Array.isArray(cfg.configMapGenerator) ? cfg.configMapGenerator.map((g) => g.name || '?') : [];
  const secretGens = Array.isArray(cfg.secretGenerator) ? cfg.secretGenerator.map((g) => g.name || '?') : [];

  const commonLabels = cfg.commonLabels || {};
  const commonAnnotations = cfg.commonAnnotations || {};
  const ns = typeof cfg.namespace === 'string' ? cfg.namespace : '';
  const namePrefix = typeof cfg.namePrefix === 'string' ? cfg.namePrefix : '';
  const nameSuffix = typeof cfg.nameSuffix === 'string' ? cfg.nameSuffix : '';
  const apiVersion = cfg.apiVersion || '';
  const kind = cfg.kind || '';

  const host = document.createElement('div');
  host.className = 'kustomize-doc';

  const metaRows = [];
  if (apiVersion) metaRows.push(`<span class="kustomize-meta-key">apiVersion</span><span class="kustomize-meta-val">${esc(apiVersion)}</span>`);
  if (kind) metaRows.push(`<span class="kustomize-meta-key">kind</span><span class="kustomize-meta-val">${esc(kind)}</span>`);
  if (namePrefix) metaRows.push(`<span class="kustomize-meta-key">namePrefix</span><span class="kustomize-meta-val">${esc(namePrefix)}</span>`);
  if (nameSuffix) metaRows.push(`<span class="kustomize-meta-key">nameSuffix</span><span class="kustomize-meta-val">${esc(nameSuffix)}</span>`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-kustomize">Kustomize</span>
  <span class="kustomize-title">kustomization overlay</span>
</div>
${ns ? `<span class="kustomize-ns">namespace: ${esc(ns)}</span>` : ''}
${metaRows.length ? `<div class="kustomize-meta">${metaRows.join('')}</div>` : ''}
${resources.length ? `<div class="kustomize-sec"><h3>Resources (${resources.length})</h3>${listHtml(resources)}</div>` : ''}
${allPatches.length ? `<div class="kustomize-sec"><h3>Patches (${allPatches.length})</h3>${listHtml(allPatches, 'patch')}</div>` : ''}
${images.length ? `<div class="kustomize-sec"><h3>Image overrides (${images.length})</h3>${listHtml(images, 'image')}</div>` : ''}
${cmGens.length ? `<div class="kustomize-sec"><h3>ConfigMap generators (${cmGens.length})</h3>${listHtml(cmGens, 'gen')}</div>` : ''}
${secretGens.length ? `<div class="kustomize-sec"><h3>Secret generators (${secretGens.length})</h3>${listHtml(secretGens, 'gen')}</div>` : ''}
${Object.keys(commonLabels).length ? `<div class="kustomize-sec"><h3>Common labels</h3>${kvHtml(commonLabels)}</div>` : ''}
${Object.keys(commonAnnotations).length ? `<div class="kustomize-sec"><h3>Common annotations</h3>${kvHtml(commonAnnotations)}</div>` : ''}`;

  return { parentNode: host };
}

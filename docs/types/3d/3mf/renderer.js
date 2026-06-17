import { loadGlobal, vendor } from '../../../core/script-loader.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = (node) => (node?.textContent || '').trim();
const color = (s) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s || '') ? s : '#cccccc';

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function metadata(doc, name) {
  return [...doc.getElementsByTagName('metadata')].find((n) => (n.getAttribute('name') || '').toLowerCase() === name.toLowerCase());
}

export async function parse3mf(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const modelEntry = zip.file('3D/3dmodel.model');
  if (!modelEntry) throw new Error('Missing 3D/3dmodel.model');
  const xml = await modelEntry.async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid 3MF model XML');
  const root = doc.documentElement;
  const objects = [...doc.getElementsByTagName('object')].map((o) => ({
    id: o.getAttribute('id') || '',
    name: o.getAttribute('name') || '',
    type: o.getAttribute('type') || 'model',
  }));
  const materials = [...doc.getElementsByTagName('basematerials')].flatMap((set) => [...set.getElementsByTagName('base')].map((m) => ({
    name: m.getAttribute('name') || '',
    color: m.getAttribute('displaycolor') || '',
  })));
  const thumbName = Object.keys(zip.files).find((n) => /(^|\/)thumbnail\.png$/i.test(n) && !zip.files[n].dir);
  const thumbBytes = thumbName ? await zip.file(thumbName).async('uint8array') : null;
  return {
    title: text(metadata(doc, 'Title')),
    designer: text(metadata(doc, 'Designer')),
    unit: root.getAttribute('unit') || 'millimeter',
    objects,
    materials,
    thumbnail: thumbBytes ? 'data:image/png;base64,' + toBase64(thumbBytes) : '',
  };
}

export async function render(intake, _ctx) {
  let model;
  try { model = await parse3mf(intake); } catch (err) { return { bodyHtml: '<p class="mf3-doc">Preview failed: ' + esc(err.message) + '</p>', hadUnsafe: false }; }
  const objects = model.objects.map((o) => `<tr><td>${esc(o.id)}</td><td>${esc(o.name || 'Object ' + o.id)}</td><td>${esc(o.type)}</td></tr>`).join('');
  const mats = model.materials.map((m) => `<li><span class="mf3-swatch" style="background:${color(m.color)}"></span>${esc(m.name || 'Material')} <code>${esc(m.color || '')}</code></li>`).join('');
  return { hadUnsafe: false, bodyHtml: `<section class="mf3-doc"><style>.mf3-doc{max-width:920px;margin:0 auto;padding:18px;color:#172033;font-family:system-ui,sans-serif}.mf3-head{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:18px;align-items:start}.mf3-title{margin:0 0 6px;font-size:1.4rem}.mf3-meta{color:#5a6678}.mf3-thumb{max-width:180px;border:1px solid #d9e1ec;border-radius:8px;background:#f8fafc}.mf3-section{margin-top:18px}.mf3-table{width:100%;border-collapse:collapse;font-size:.92rem}.mf3-table th,.mf3-table td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}.mf3-mats{display:flex;gap:10px;flex-wrap:wrap;list-style:none;padding:0;margin:8px 0}.mf3-mats li{border:1px solid #d9e1ec;border-radius:8px;padding:7px 9px}.mf3-swatch{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid #94a3b8;margin-right:8px;vertical-align:middle}.fv-dark .mf3-doc{color:#e8edf7}.fv-dark .mf3-meta{color:#aab5c6}.fv-dark .mf3-thumb,.fv-dark .mf3-mats li{background:#111827;border-color:#304052}.fv-dark .mf3-table th,.fv-dark .mf3-table td{border-color:#304052}@media(max-width:560px){.mf3-head{grid-template-columns:1fr}.mf3-thumb{max-width:100%}}</style><div class="mf3-head"><div><h1 class="mf3-title">${esc(model.title || '3MF Model')}</h1><div class="mf3-meta">${model.designer ? 'Designer: ' + esc(model.designer) + ' · ' : ''}Unit: ${esc(model.unit)} · ${model.objects.length} object${model.objects.length === 1 ? '' : 's'} · ${model.materials.length} material${model.materials.length === 1 ? '' : 's'}</div></div>${model.thumbnail ? `<img class="mf3-thumb" alt="" src="${model.thumbnail}">` : ''}</div><div class="mf3-section"><h2>Objects</h2><table class="mf3-table"><thead><tr><th>ID</th><th>Name</th><th>Type</th></tr></thead><tbody>${objects}</tbody></table></div><div class="mf3-section"><h2>Materials</h2><ul class="mf3-mats">${mats || '<li>No base materials found</li>'}</ul></div></section>` };
}

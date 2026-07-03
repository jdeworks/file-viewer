import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// `url`/`repository-code` come straight from an untrusted CITATION.cff — only ever wire them up
// as a clickable link if they're http(s); otherwise render as inert (escaped) text so a
// "javascript:" URI can't execute in the page's origin when clicked.
const isSafeHref = (href) => /^https?:\/\//i.test(String(href || ''));

const CSS = `
.cff-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cff{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#D4A017;color:#fff;vertical-align:middle;margin-right:8px;}
.cff-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cff-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cff-sec{margin:12px 0;}
.cff-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cff-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:4px 0;}
.cff-kv dt{font-weight:600;white-space:nowrap;color:var(--fg,#24292f);}
.cff-kv dd{margin:0;color:var(--fg-2,#555);}
.cff-kv dd a{color:var(--link,#0969da);text-decoration:none;}
.cff-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cff-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.cff-author{font-size:12px;padding:5px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-bottom:4px;}
.cff-author-name{font-weight:600;}
.cff-author-orcid{color:var(--fg-2,#888);font-size:11px;margin-top:2px;}
.cff-type{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#fef9c3;border:1px solid #fde047;color:#713f12;}
`;

function formatAuthorName(author) {
  if (!author || typeof author !== 'object') return String(author || '');
  const parts = [];
  if (author['given-names']) parts.push(author['given-names']);
  if (author['name-particle']) parts.push(author['name-particle']);
  if (author['family-names']) parts.push(author['family-names']);
  if (parts.length) return parts.join(' ');
  if (author.name) return author.name;
  return '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const title = cfg.title || '';
  const type = cfg.type || '';
  const version = cfg.version != null ? String(cfg.version) : '';
  const doi = cfg.doi || '';
  const url = cfg.url || '';
  const repoCode = cfg['repository-code'] || '';
  const dateReleased = cfg['date-released'] ? String(cfg['date-released']) : '';
  const license = cfg.license || '';
  const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : [];
  const authors = Array.isArray(cfg.authors) ? cfg.authors : [];

  const subParts = [];
  if (type) subParts.push(type);
  if (version) subParts.push(`v${version}`);
  if (authors.length) subParts.push(`${authors.length} author${authors.length !== 1 ? 's' : ''}`);

  const metaHtml = (version || doi || url || repoCode || dateReleased || license)
    ? `<div class="cff-sec"><h3>Metadata</h3><dl class="cff-kv">
      ${version ? `<dt>Version</dt><dd>${esc(version)}</dd>` : ''}
      ${doi ? `<dt>DOI</dt><dd><a href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener">${esc(doi)}</a></dd>` : ''}
      ${url ? `<dt>URL</dt><dd>${isSafeHref(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>` : esc(url)}</dd>` : ''}
      ${repoCode ? `<dt>Repository</dt><dd>${isSafeHref(repoCode) ? `<a href="${esc(repoCode)}" target="_blank" rel="noopener">${esc(repoCode)}</a>` : esc(repoCode)}</dd>` : ''}
      ${dateReleased ? `<dt>Released</dt><dd>${esc(dateReleased)}</dd>` : ''}
      ${license ? `<dt>License</dt><dd>${esc(license)}</dd>` : ''}
    </dl></div>`
    : '';

  const shownAuthors = authors.slice(0, 3);
  const authorsHtml = shownAuthors.length
    ? `<div class="cff-sec"><h3>Authors${authors.length > 3 ? ` (showing 3 of ${authors.length})` : ''}</h3>${shownAuthors.map((a) => {
        const name = formatAuthorName(a);
        const orcid = a && a.orcid ? a.orcid : '';
        return `<div class="cff-author"><div class="cff-author-name">${esc(name)}</div>${orcid ? `<div class="cff-author-orcid">ORCID: ${esc(orcid)}</div>` : ''}</div>`;
      }).join('')}</div>`
    : '';

  const keywordsHtml = keywords.length
    ? `<div class="cff-sec"><h3>Keywords</h3><div class="cff-pills">${keywords.slice(0, 5).map((k) => `<span class="cff-pill">${esc(k)}</span>`).join('')}${keywords.length > 5 ? `<span class="cff-pill">+${keywords.length - 5} more</span>` : ''}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'cff-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cff-title"><span class="badge-cff">Citation</span>${title ? esc(title) : 'Software Citation'}</div>
<div class="cff-sub">${type ? `<span class="cff-type">${esc(type)}</span> ` : ''}${esc(subParts.filter((p) => p !== type).join(' · '))}</div>
${metaHtml}${authorsHtml}${keywordsHtml}`;
  return { parentNode: host };
}

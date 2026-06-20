import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-grl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00ACD7;color:#fff;vertical-align:middle;margin-right:8px;}
.grl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grl-sec{margin:12px 0;}
.grl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.grl-pills{display:flex;flex-wrap:wrap;gap:6px;}
.grl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.grl-build{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;background:var(--bg,#fff);}
.grl-build-id{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.grl-build-targets{font-size:12px;color:var(--fg-2,#666);margin-top:4px;}
.grl-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.grl-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:120px;}
.grl-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // --- Builds ---
  const builds = Array.isArray(cfg.builds) ? cfg.builds : [];
  const buildsHtml = builds.slice(0, 6).map((b) => {
    const id = b.id || b.binary || '(default)';
    const goos = Array.isArray(b.goos) ? b.goos.join(', ') : (b.goos || '');
    const goarch = Array.isArray(b.goarch) ? b.goarch.join(', ') : (b.goarch || '');
    const targets = [goos && `OS: ${goos}`, goarch && `arch: ${goarch}`].filter(Boolean).join(' · ');
    return `<div class="grl-build">
      <div class="grl-build-id">${esc(id)}</div>
      ${targets ? `<div class="grl-build-targets">${esc(targets)}</div>` : ''}
    </div>`;
  }).join('');

  // --- Archives ---
  const archives = Array.isArray(cfg.archives) ? cfg.archives : [];
  const archiveFormats = [...new Set(archives.map((a) => {
    if (typeof a.format === 'string') return a.format;
    if (Array.isArray(a.formats)) return a.formats;
    return null;
  }).flat().filter(Boolean))];

  // --- Release platform ---
  let releasePlatform = '';
  if (cfg.release) {
    if (cfg.release.github) releasePlatform = 'GitHub';
    else if (cfg.release.gitlab) releasePlatform = 'GitLab';
    else if (cfg.release.gitea) releasePlatform = 'Gitea';
    else releasePlatform = 'configured';
  }

  // --- Signing ---
  const signs = Array.isArray(cfg.signs) ? cfg.signs : [];
  const sbomSigns = Array.isArray(cfg.sboms) ? cfg.sboms : [];

  // --- Docker ---
  const dockers = Array.isArray(cfg.dockers) ? cfg.dockers : [];
  const dockerManifests = Array.isArray(cfg.docker_manifests) ? cfg.docker_manifests : [];

  // --- Homebrew ---
  const brews = Array.isArray(cfg.brews) ? cfg.brews : (cfg.brew ? [cfg.brew] : []);

  // --- Changelog ---
  const changelogSort = cfg.changelog?.sort;
  const changelogFilters = Array.isArray(cfg.changelog?.filters?.exclude) ? cfg.changelog.filters.exclude.length : 0;

  // --- Version / project name ---
  const projectName = cfg.project_name || '';
  const version = cfg.version !== undefined ? String(cfg.version) : '';

  // Build summary subtitle
  const parts = [];
  if (builds.length) parts.push(`${builds.length} build${builds.length !== 1 ? 's' : ''}`);
  if (archives.length) parts.push(`${archives.length} archive${archives.length !== 1 ? 's' : ''}`);
  if (dockers.length + dockerManifests.length > 0) parts.push(`${dockers.length + dockerManifests.length} docker`);

  const host = document.createElement('div');
  host.className = 'grl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="grl-title"><span class="badge-grl">GoReleaser</span>${projectName ? esc(projectName) : 'Release config'}</div>
<div class="grl-sub">${parts.join(' · ')}${version ? ` · v${esc(version)}` : ''}</div>

${builds.length ? `<div class="grl-sec"><h3>Builds</h3>${buildsHtml}${builds.length > 6 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${builds.length - 6} more</div>` : ''}</div>` : ''}

${archiveFormats.length ? `<div class="grl-sec"><h3>Archive Formats</h3><div class="grl-pills">${archiveFormats.map((f) => `<span class="grl-pill">${esc(f)}</span>`).join('')}</div></div>` : ''}

${releasePlatform ? `<div class="grl-sec"><h3>Release Target</h3><div class="grl-pills"><span class="grl-pill">${esc(releasePlatform)}</span></div></div>` : ''}

${signs.length > 0 || sbomSigns.length > 0 ? `<div class="grl-sec"><h3>Signing / SBOM</h3><div class="grl-pills">${signs.map((s) => `<span class="grl-pill">${esc(s.cmd || 'cosign')}</span>`).join('')}${sbomSigns.length ? `<span class="grl-pill">sbom ×${sbomSigns.length}</span>` : ''}</div></div>` : ''}

${dockers.length ? `<div class="grl-sec"><h3>Docker Images</h3><div class="grl-pills">${dockers.slice(0, 6).map((d) => `<span class="grl-pill">${esc(d.image_templates?.[0] || d.id || 'image')}</span>`).join('')}${dockers.length > 6 ? `<span class="grl-pill">+${dockers.length - 6}</span>` : ''}</div></div>` : ''}

${brews.length ? `<div class="grl-sec"><h3>Homebrew Tap</h3><div class="grl-pills">${brews.map((b) => `<span class="grl-pill">${esc(b.repository?.name || b.tap?.name || b.name || 'tap')}</span>`).join('')}</div></div>` : ''}

${changelogSort || changelogFilters ? `<div class="grl-sec"><h3>Changelog</h3><div class="grl-pills">${changelogSort ? `<span class="grl-pill">sort: ${esc(changelogSort)}</span>` : ''}${changelogFilters ? `<span class="grl-pill">${changelogFilters} exclude filters</span>` : ''}</div></div>` : ''}
`;
  return { parentNode: host };
}

import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /secret|password|token|key|api|private/i;

function maskVal(k, v) {
  if (SENSITIVE.test(String(k))) return '[configured]';
  return v;
}

const CSS = `
.bazarr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.bazarr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff9500;color:#fff;vertical-align:middle;margin-right:8px;}
.bazarr-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.bazarr-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.bazarr-sec{margin:14px 0;}
.bazarr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.bazarr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.bazarr-row{display:flex;align-items:baseline;gap:8px;margin:2px 0;font-size:13px;}
.bazarr-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.bazarr-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.bazarr-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.bazarr-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.bazarr-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.bazarr-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.bazarr-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
`;

function boolChip(val) {
  if (val === true || val === 'true') return `<span class="bazarr-chip bazarr-chip-on">enabled</span>`;
  if (val === false || val === 'false') return `<span class="bazarr-chip bazarr-chip-off">disabled</span>`;
  return `<span class="bazarr-chip">${esc(String(val))}</span>`;
}

function row(label, html) {
  if (html == null || html === '') return '';
  return `<div class="bazarr-row"><span class="bazarr-key">${esc(label)}</span><span class="bazarr-val">${html}</span></div>`;
}

function val(v, k) {
  if (v == null || v === '') return '';
  const mv = maskVal(k || '', v);
  if (mv === '[configured]') return `<span class="bazarr-masked">[configured]</span>`;
  return `<span class="bazarr-chip">${esc(String(mv))}</span>`;
}

function section(title, rows) {
  const inner = rows.filter(Boolean).join('');
  if (!inner) return '';
  return `<div class="bazarr-sec"><h3>${title}</h3><div class="bazarr-card">${inner}</div></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const gen = cfg.general || {};
  const sonarr = cfg.sonarr || {};
  const radarr = cfg.radarr || {};
  const subtitles = cfg.subtitles || {};
  const notifications = cfg.notifications || {};

  // ── General ──
  const generalRows = [
    row('IP', val(gen.ip)),
    row('Port', val(gen.port)),
    row('Base URL', val(gen.base_url)),
    row('Use Sonarr', boolChip(gen.use_sonarr)),
    row('Use Radarr', boolChip(gen.use_radarr)),
    row('Use Embedded Subs', boolChip(gen.use_embedded_subs)),
    gen.minimum_score != null ? row('Minimum Score', val(gen.minimum_score)) : '',
  ];

  // ── Sonarr ──
  const sonarrRows = gen.use_sonarr !== false && Object.keys(sonarr).length ? [
    row('IP', val(sonarr.ip)),
    row('Port', val(sonarr.port)),
    row('Base URL', val(sonarr.base_url)),
    row('SSL', boolChip(sonarr.ssl)),
    sonarr.apikey != null ? row('API Key', `<span class="bazarr-masked">[configured]</span>`) : '',
    sonarr.full_update ? row('Full Update', val(sonarr.full_update)) : '',
  ] : null;

  // ── Radarr ──
  const radarrRows = gen.use_radarr !== false && Object.keys(radarr).length ? [
    row('IP', val(radarr.ip)),
    row('Port', val(radarr.port)),
    row('Base URL', val(radarr.base_url)),
    row('SSL', boolChip(radarr.ssl)),
    radarr.apikey != null ? row('API Key', `<span class="bazarr-masked">[configured]</span>`) : '',
    radarr.full_update ? row('Full Update', val(radarr.full_update)) : '',
  ] : null;

  // ── Subtitles ──
  const langs = Array.isArray(gen.wanted_languages) ? gen.wanted_languages
    : Array.isArray(subtitles.wanted_languages) ? subtitles.wanted_languages : [];
  const langsHtml = langs.length
    ? `<div class="bazarr-chips">${langs.map((l) => `<span class="bazarr-chip">${esc(String(l))}</span>`).join('')}</div>`
    : '';
  const subtitleRows = [
    langs.length ? row('Languages', langsHtml) : '',
    subtitles.hearing_impaired != null ? row('Hearing Impaired', boolChip(subtitles.hearing_impaired)) : '',
    gen.hearing_impaired != null && subtitles.hearing_impaired == null ? row('Hearing Impaired', boolChip(gen.hearing_impaired)) : '',
    subtitles.forced_only != null ? row('Forced Only', boolChip(subtitles.forced_only)) : '',
    gen.forced_only != null && subtitles.forced_only == null ? row('Forced Only', boolChip(gen.forced_only)) : '',
  ];

  // ── Notifications ──
  let notifHtml = '';
  const providers = Array.isArray(notifications.providers) ? notifications.providers : [];
  if (providers.length) {
    notifHtml = `<div class="bazarr-chips">${providers.map((p) => `<span class="bazarr-chip bazarr-chip-on">${esc(String(p))}</span>`).join('')}</div>`;
  }

  let body = '';
  body += section('General', generalRows);
  if (sonarrRows) body += section('Sonarr', sonarrRows);
  if (radarrRows) body += section('Radarr', radarrRows);

  const subtitleInner = subtitleRows.filter(Boolean).join('');
  if (subtitleInner) body += `<div class="bazarr-sec"><h3>Subtitles</h3><div class="bazarr-card">${subtitleInner}</div></div>`;

  if (notifHtml) body += `<div class="bazarr-sec"><h3>Notifications</h3><div class="bazarr-card">${notifHtml}</div></div>`;

  const host = document.createElement('div');
  host.className = 'bazarr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="bazarr-badge">Bazarr</span><span class="bazarr-title">Bazarr Config</span></div>
<div class="bazarr-sub">Automatic subtitle downloader for Sonarr &amp; Radarr</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;
  return { parentNode: host };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /key|secret|pass|password|cipher/i;

const CSS = `
.pgbr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pgbr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#336791;color:#fff;vertical-align:middle;margin-right:8px;}
.pgbr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pgbr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pgbr-sec{margin:14px 0;}
.pgbr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pgbr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0;}
.pgbr-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.pgbr-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pgbr-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace;}
.pgbr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pgbr-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.pgbr-chip{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px;margin-right:6px;vertical-align:middle;}
.pgbr-chip-s3{background:#ff9900;color:#fff;}
.pgbr-chip-gcs{background:#4285f4;color:#fff;}
.pgbr-chip-azure{background:#0078d4;color:#fff;}
.pgbr-chip-posix{background:#2da44e;color:#fff;}
.pgbr-chip-other{background:#6e7781;color:#fff;}
`;

/**
 * Parse pgBackRest INI config into sections.
 * Handles [global], [global:sub-section], [stanza:NAME] sections.
 */
function parsePgBackRest(text) {
  const sections = {};
  let current = '__global__';
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sectionMatch = /^\[([^\]]+)\]/.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    const kvMatch = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      if (!sections[current]) sections[current] = {};
      sections[current][key] = value;
    }
  }
  return sections;
}

function kv(label, rawKey, value) {
  if (value == null || value === '') return '';
  const isMasked = SENSITIVE.test(rawKey);
  const display = isMasked
    ? `<span class="pgbr-masked">[configured]</span>`
    : `<span class="pgbr-kv-v">${esc(String(value))}</span>`;
  return `<div class="pgbr-kv"><span class="pgbr-kv-k">${esc(label)}</span>${display}</div>`;
}

function repoTypeChip(repoType) {
  if (!repoType) return '';
  const t = repoType.toLowerCase();
  let cls = 'pgbr-chip-other';
  if (t === 's3') cls = 'pgbr-chip-s3';
  else if (t === 'gcs') cls = 'pgbr-chip-gcs';
  else if (t === 'azure') cls = 'pgbr-chip-azure';
  else if (t === 'posix') cls = 'pgbr-chip-posix';
  return `<span class="pgbr-chip ${cls}">${esc(repoType.toUpperCase())}</span>`;
}

export function render(intake) {
  const sections = parsePgBackRest(intake.text || '');

  const global = sections['global'] || {};
  const archivePush = sections['global:archive-push'] || {};
  const globalBackup = sections['global:backup'] || {};

  // Collect stanza sections
  const stanzas = Object.keys(sections)
    .filter((k) => k.startsWith('stanza:'))
    .map((k) => ({ name: k.replace(/^stanza:/, ''), cfg: sections[k] }));

  const repoType = global['repo1-type'] || '';
  const repoPath = global['repo1-path'] || '';
  const s3Bucket = global['repo1-s3-bucket'] || '';
  const s3Region = global['repo1-s3-region'] || '';
  const processMax = global['process-max'] || '';
  const compressType = global['compress-type'] || '';
  const logLevelConsole = global['log-level-console'] || '';
  const logLevelFile = global['log-level-file'] || '';
  const logPath = global['log-path'] || '';

  // Global settings card
  const globalHtml = `<div class="pgbr-sec"><h3>Global Settings</h3><div class="pgbr-card">
${kv('process-max', 'process-max', processMax)}
${kv('compress-type', 'compress-type', compressType)}
${kv('log-level-console', 'log-level-console', logLevelConsole)}
${kv('log-level-file', 'log-level-file', logLevelFile)}
${kv('log-path', 'log-path', logPath)}
${archivePush['compress-level'] != null ? kv('archive-push compress-level', 'compress-level', archivePush['compress-level']) : ''}
</div></div>`;

  // Repository card
  const repoHtml = `<div class="pgbr-sec"><h3>Repository</h3><div class="pgbr-card">
<div style="margin-bottom:6px;">${repoTypeChip(repoType)}<span style="font-size:12px;color:var(--fg-2,#888)">repo1-type</span></div>
${kv('repo1-path', 'repo1-path', repoPath)}
${kv('repo1-s3-bucket', 'repo1-s3-bucket', s3Bucket)}
${kv('repo1-s3-endpoint', 'repo1-s3-endpoint', global['repo1-s3-endpoint'] || '')}
${kv('repo1-s3-region', 'repo1-s3-region', s3Region)}
${kv('repo1-s3-key', 'repo1-s3-key', global['repo1-s3-key'] || '')}
${kv('repo1-s3-key-secret', 'repo1-s3-key-secret', global['repo1-s3-key-secret'] || '')}
${kv('repo1-cipher-type', 'repo1-cipher-type', global['repo1-cipher-type'] || '')}
${kv('repo1-cipher-pass', 'repo1-cipher-pass', global['repo1-cipher-pass'] || '')}
${kv('repo1-retention-full', 'repo1-retention-full', global['repo1-retention-full'] || '')}
${kv('repo1-retention-diff', 'repo1-retention-diff', global['repo1-retention-diff'] || '')}
</div></div>`;

  // Stanza cards
  const stanzaHtml = stanzas.length ? `<div class="pgbr-sec"><h3>Stanzas (${stanzas.length})</h3>
${stanzas.map(({ name, cfg }) => `<div class="pgbr-card">
<div class="pgbr-card-name">${esc(name)}</div>
${kv('pg1-path', 'pg1-path', cfg['pg1-path'] || '')}
${kv('pg1-port', 'pg1-port', cfg['pg1-port'] || '')}
${kv('pg1-socket-path', 'pg1-socket-path', cfg['pg1-socket-path'] || '')}
</div>`).join('')}
</div>` : '';

  const subParts = [];
  if (repoType) subParts.push(`repo1-type: ${repoType}`);
  if (stanzas.length) subParts.push(`${stanzas.length} stanza${stanzas.length !== 1 ? 's' : ''}`);
  if (processMax) subParts.push(`process-max: ${processMax}`);

  const host = document.createElement('div');
  host.className = 'pgbr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pgbr">pgBackRest</span>
  <span class="pgbr-title">Backup Configuration</span>
</div>
<div class="pgbr-sub">${esc(subParts.join(' · '))}</div>
${globalHtml}${repoHtml}${stanzaHtml}`;

  return { parentNode: host };
}

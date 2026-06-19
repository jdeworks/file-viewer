const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gw-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02A84E;color:#fff;vertical-align:middle;margin-right:8px}
.gw-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gw-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.gw-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.gw-table{width:100%;border-collapse:collapse;font-size:13px}
.gw-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.gw-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:35%}
.gw-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.gw-ver{font-size:28px;font-weight:700;color:#02A84E;margin:0 0 4px}
.gw-dist{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#e0f2fe;color:#0369a1;margin-left:8px;vertical-align:middle}
`;

function parseProps(text) {
  const props = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    // Handle escaped colons / equals in values
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    props.set(key, val);
  }
  return props;
}

function extractGradleVersion(url) {
  // distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
  const m = /gradle-(\d[\d.]+)-(bin|all)\.zip/.exec(url);
  return m ? { version: m[1], distType: m[2] } : null;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);

  // Unescape backslash sequences in the distribution URL
  const rawUrl = props.get('distributionUrl') || '';
  const distUrl = rawUrl.replace(/\\\//g, '/').replace(/\\:/g, ':');

  const versionInfo = extractGradleVersion(distUrl);
  const gradleVersion = versionInfo ? versionInfo.version : null;
  const distType = versionInfo ? versionInfo.distType : null;

  const networkTimeout = props.get('networkTimeout');
  const validateDistributionUrl = props.get('validateDistributionUrl');
  const distributionSha256Sum = props.get('distributionSha256Sum');

  const rows = [];
  if (distUrl) rows.push(['Distribution URL', distUrl]);
  if (distType) rows.push(['Distribution type', distType === 'all' ? 'all (sources included)' : 'bin (binaries only)']);
  if (networkTimeout) rows.push(['Network timeout', networkTimeout + ' ms']);
  if (validateDistributionUrl != null) rows.push(['Validate URL', validateDistributionUrl]);
  if (distributionSha256Sum) rows.push(['SHA-256 checksum', distributionSha256Sum.slice(0, 16) + '…']);

  const tableHtml = rows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('');

  const host = document.createElement('div');
  host.className = 'gw-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gw-title"><span class="gw-badge">Gradle Wrapper</span>gradle-wrapper.properties</div>
${gradleVersion
  ? `<div class="gw-ver">Gradle ${esc(gradleVersion)}<span class="gw-dist">${esc(distType || 'bin')}</span></div>`
  : '<div style="color:var(--fg-2);font-size:13px">Gradle version not detected</div>'}
${tableHtml ? `<div class="gw-card"><table class="gw-table"><tbody>${tableHtml}</tbody></table></div>` : ''}`;
  return { parentNode: host };
}

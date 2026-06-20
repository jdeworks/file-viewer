import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.suricata-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.sur-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f44336;color:#fff;vertical-align:middle;margin-right:8px}
.sur-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sur-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.sur-sec{margin:12px 0}
.sur-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.sur-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.sur-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.sur-row:last-child{border-bottom:none}
.sur-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.sur-val{font-family:ui-monospace,monospace;word-break:break-all}
.sur-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.sur-pill.on{background:#fce4e4;border-color:#f48fb1;color:#880e4f}
.sur-pill.off{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}
.sur-pill.iface{background:#fff3e0;border-color:#ffcc02;color:#e65100}
.sur-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;margin-left:6px;background:#fce4e4;border:1px solid #f48fb1;color:#880e4f}
`;

const row = (k, v) => v != null && v !== '' ? `<div class="sur-row"><span class="sur-key">${esc(k)}</span><span class="sur-val">${esc(String(v))}</span></div>` : '';

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Network variables
  const vars = cfg.vars || {};
  const addressGroups = vars['address-groups'] || vars.address_groups || {};
  const homeNet = addressGroups['HOME_NET'] || addressGroups['home_net'] || addressGroups['Home_NET'] || '';
  const externalNet = addressGroups['EXTERNAL_NET'] || addressGroups['external_net'] || '';
  const netVarsHtml = (homeNet || externalNet) ? `
<div class="sur-sec"><h3>Network Variables</h3>
<div class="sur-card">
${homeNet ? row('HOME_NET', homeNet) : ''}
${externalNet ? row('EXTERNAL_NET', externalNet) : ''}
</div></div>` : '';

  // AF-Packet interfaces
  const afPacket = Array.isArray(cfg['af-packet']) ? cfg['af-packet']
    : (cfg['af-packet'] ? [cfg['af-packet']] : []);
  const pcap = Array.isArray(cfg.pcap) ? cfg.pcap
    : (cfg.pcap ? [cfg.pcap] : []);
  const allIfaces = [
    ...afPacket.map((i) => ({ name: i.interface || i.iface || '', mode: 'af-packet', threads: i.threads || '', clusterid: i['cluster-id'] || '' })),
    ...pcap.map((i) => ({ name: i.interface || i.iface || '', mode: 'pcap', threads: '', clusterid: '' })),
  ].filter((i) => i.name);

  const captureMode = cfg.runmode || (afPacket.length ? 'af-packet' : pcap.length ? 'pcap' : '');

  const ifacesHtml = allIfaces.length ? `
<div class="sur-sec"><h3>Capture Interfaces (${allIfaces.length})</h3>
${allIfaces.map((i) => `<div class="sur-card">
${row('interface', i.name)}
${row('mode', i.mode)}
${i.threads ? row('threads', i.threads) : ''}
${i.clusterid ? row('cluster-id', i.clusterid) : ''}
</div>`).join('')}
</div>` : '';

  // Rule files
  const ruleFiles = Array.isArray(cfg['rule-files']) ? cfg['rule-files']
    : Array.isArray(cfg.rule_files) ? cfg.rule_files : [];
  const ruleFilesHtml = ruleFiles.length ? `
<div class="sur-sec"><h3>Rule Files (${ruleFiles.length})</h3>
<div class="sur-card">${ruleFiles.map((f) => `<span class="sur-pill">${esc(f)}</span>`).join('')}</div>
</div>` : '';

  // Outputs
  const outputs = Array.isArray(cfg.outputs) ? cfg.outputs : [];
  // Each output item is an object with one key (the output name) mapped to its config
  const outputEntries = outputs.flatMap((o) => {
    if (typeof o !== 'object' || o === null) return [];
    return Object.entries(o).map(([name, conf]) => {
      const enabled = conf && typeof conf === 'object' ? conf.enabled : undefined;
      const communityId = conf && typeof conf === 'object' ? (conf['community-id'] ?? conf.community_id) : undefined;
      return { name, enabled, communityId };
    });
  });

  const outputsHtml = outputEntries.length ? `
<div class="sur-sec"><h3>Outputs (${outputEntries.length})</h3>
<div class="sur-card">${outputEntries.map((o) => {
    const stateHtml = o.enabled != null
      ? `<span class="sur-pill ${o.enabled ? 'on' : 'off'}" style="margin-left:6px">${o.enabled ? 'enabled' : 'disabled'}</span>`
      : '';
    const cidHtml = o.communityId != null
      ? `<span style="font-size:11px;color:var(--fg-2,#888);margin-left:4px">community-id: ${o.communityId}</span>`
      : '';
    return `<div class="sur-row"><span class="sur-key">${esc(o.name)}</span><span class="sur-val">${stateHtml}${cidHtml}</span></div>`;
  }).join('')}</div>
</div>` : '';

  // General settings
  const defaultLogDir = cfg['default-log-dir'] || cfg.default_log_dir || '';
  const runmode = cfg.runmode || '';
  const statsEnabled = cfg.stats?.enabled;
  const settingsRows = [
    row('runmode', runmode),
    row('default-log-dir', defaultLogDir),
    statsEnabled != null ? row('stats', statsEnabled ? 'enabled' : 'disabled') : '',
  ].filter(Boolean).join('');
  const settingsHtml = settingsRows ? `
<div class="sur-sec"><h3>Settings</h3>
<div class="sur-card">${settingsRows}</div>
</div>` : '';

  const subParts = [
    allIfaces.length ? `${allIfaces.length} interface${allIfaces.length !== 1 ? 's' : ''}` : '',
    ruleFiles.length ? `${ruleFiles.length} rule file${ruleFiles.length !== 1 ? 's' : ''}` : '',
    captureMode ? captureMode : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'suricata-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="sur-badge">Suricata</span>
  <span class="sur-title">IDS/IPS Configuration</span>
  ${ruleFiles.length ? `<span class="sur-tag">${ruleFiles.length} rule file${ruleFiles.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="sur-sub">${esc(subParts.join(' · '))}</div>
${netVarsHtml}${ifacesHtml}${ruleFilesHtml}${outputsHtml}${settingsHtml}`;
  return { parentNode: host };
}

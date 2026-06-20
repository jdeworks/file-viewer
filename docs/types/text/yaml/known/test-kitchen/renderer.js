import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.testkitchen-doc { padding: 16px 18px; max-width: 860px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.testkitchen-doc .tk-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #E87722; color: #fff; vertical-align: middle; margin-right: 8px; }
.testkitchen-doc .tk-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.testkitchen-doc .tk-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 14px; }
.testkitchen-doc .tk-sec { margin: 14px 0; }
.testkitchen-doc .tk-sec h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2, #888); margin: 0 0 6px; }
.testkitchen-doc .tk-card { border: 1px solid var(--border, #e0e0e0); border-radius: 8px; padding: 10px 14px; margin: 6px 0; background: var(--bg, #fff); }
.testkitchen-doc .tk-chip { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 10px; background: #fff3eb; border: 1px solid #f7c59f; color: #b85000; margin-bottom: 6px; }
.testkitchen-doc .tk-chip-verifier { background: #f3e8ff; border-color: #d8b4fe; color: #6b21a8; }
.testkitchen-doc .tk-chip-provisioner { background: #dcfce7; border-color: #86efac; color: #166534; }
.testkitchen-doc .tk-chip-transport { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.testkitchen-doc .tk-kv { display: flex; gap: 8px; align-items: baseline; margin: 2px 0; font-size: 13px; }
.testkitchen-doc .tk-kv-k { color: var(--fg-2, #888); min-width: 130px; flex-shrink: 0; }
.testkitchen-doc .tk-kv-v { font-family: ui-monospace, monospace; word-break: break-all; }
.testkitchen-doc .tk-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.testkitchen-doc .tk-table th { text-align: left; padding: 5px 10px; border-bottom: 2px solid var(--border, #e0e0e0); font-weight: 600; color: var(--fg-2, #666); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.testkitchen-doc .tk-table td { padding: 6px 10px; border-bottom: 1px solid var(--border, #e8e8e8); vertical-align: top; font-family: ui-monospace, monospace; font-size: 12px; }
.testkitchen-doc .tk-table tr:last-child td { border-bottom: none; }
.testkitchen-doc .tk-suite-name { font-weight: 600; font-family: ui-monospace, monospace; font-size: 13px; }
.testkitchen-doc .tk-suite-meta { font-size: 12px; color: var(--fg-2, #888); margin-top: 2px; }
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="tk-kv"><span class="tk-kv-k">${esc(label)}</span><span class="tk-kv-v">${esc(value)}</span></div>`;
}

function extractName(obj) {
  if (!obj || typeof obj !== 'object') return typeof obj === 'string' ? obj : '';
  return obj.name || '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.kitchen.yml';

  // ── Driver ──
  const driver = cfg.driver && typeof cfg.driver === 'object' ? cfg.driver : {};
  const driverName = driver.name || (typeof cfg.driver === 'string' ? cfg.driver : '');
  let driverHtml = '';
  if (driverName) {
    const driverDetails = [
      kv('box / image', driver.box || driver.image || driver.ami || driver.vm_hostname || ''),
      kv('cpus', driver.cpus != null ? String(driver.cpus) : ''),
      kv('memory', driver.memory != null ? String(driver.memory) : ''),
      kv('network', driver.network || ''),
      kv('socket', driver.socket || ''),
    ].filter(Boolean).join('');
    driverHtml = `<div class="tk-sec"><h3>Driver</h3><div class="tk-card">
<span class="tk-chip">${esc(driverName)}</span>
${driverDetails}
</div></div>`;
  }

  // ── Provisioner ──
  const provisioner = cfg.provisioner && typeof cfg.provisioner === 'object' ? cfg.provisioner : {};
  const provisionerName = provisioner.name || (typeof cfg.provisioner === 'string' ? cfg.provisioner : '');
  let provisionerHtml = '';
  if (provisionerName) {
    const provDetails = [
      kv('cookbook_path', Array.isArray(provisioner.cookbook_path) ? provisioner.cookbook_path.join(', ') : (provisioner.cookbook_path || '')),
      kv('data_bags_path', provisioner.data_bags_path || ''),
      kv('environments_path', provisioner.environments_path || ''),
      kv('roles_path', provisioner.roles_path || ''),
      kv('require_chef_omnibus', provisioner.require_chef_omnibus != null ? String(provisioner.require_chef_omnibus) : ''),
      kv('playbook', provisioner.playbook || ''),
      kv('script', provisioner.script || ''),
    ].filter(Boolean).join('');
    provisionerHtml = `<div class="tk-sec"><h3>Provisioner</h3><div class="tk-card">
<span class="tk-chip tk-chip-provisioner">${esc(provisionerName)}</span>
${provDetails}
</div></div>`;
  }

  // ── Verifier ──
  const verifier = cfg.verifier && typeof cfg.verifier === 'object' ? cfg.verifier : {};
  const verifierName = verifier.name || (typeof cfg.verifier === 'string' ? cfg.verifier : '');
  let verifierHtml = '';
  if (verifierName) {
    const verDetails = [
      kv('inspec_tests', Array.isArray(verifier.inspec_tests) ? verifier.inspec_tests.join(', ') : ''),
      kv('reporter', Array.isArray(verifier.reporter) ? verifier.reporter.join(', ') : (verifier.reporter || '')),
    ].filter(Boolean).join('');
    verifierHtml = `<div class="tk-sec"><h3>Verifier</h3><div class="tk-card">
<span class="tk-chip tk-chip-verifier">${esc(verifierName)}</span>
${verDetails}
</div></div>`;
  }

  // ── Transport ──
  const transport = cfg.transport && typeof cfg.transport === 'object' ? cfg.transport : null;
  const transportName = transport ? (transport.name || Object.keys(transport)[0] || '') : '';
  const transportHtml = transportName ? `<div class="tk-sec"><h3>Transport</h3><div class="tk-card">
<span class="tk-chip tk-chip-transport">${esc(transportName)}</span>
${kv('port', transport.port != null ? String(transport.port) : '')}
${kv('username', transport.username || '')}
</div></div>` : '';

  // ── Platforms ──
  const platforms = Array.isArray(cfg.platforms) ? cfg.platforms : [];
  let platformsHtml = '';
  if (platforms.length) {
    const rows = platforms.slice(0, 12).map((p) => {
      const name = p.name || p.alias || '';
      const box = p.driver_config?.box || p.driver_config?.image || p.driver_config?.ami || p.box || p.image || '';
      const driverOverride = extractName(p.driver) || '';
      return `<tr><td>${esc(name)}</td><td>${esc(box)}</td><td>${driverOverride ? `<span style="font-size:11px;color:var(--fg-2,#888)">${esc(driverOverride)}</span>` : ''}</td></tr>`;
    }).join('');
    const moreRow = platforms.length > 12
      ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:12px">+${platforms.length - 12} more</td></tr>` : '';
    platformsHtml = `<div class="tk-sec"><h3>Platforms (${platforms.length})</h3>
<table class="tk-table"><thead><tr><th>Name</th><th>Box / Image</th><th>Driver</th></tr></thead>
<tbody>${rows}${moreRow}</tbody></table></div>`;
  }

  // ── Suites ──
  const suites = Array.isArray(cfg.suites) ? cfg.suites : [];
  let suitesHtml = '';
  if (suites.length) {
    const items = suites.slice(0, 20).map((s) => {
      const name = s.name || '(unnamed)';
      const runList = Array.isArray(s.run_list) ? s.run_list : (s.run_list ? [s.run_list] : []);
      const attrCount = s.attributes && typeof s.attributes === 'object' ? Object.keys(s.attributes).length : 0;
      const includes = Array.isArray(s.includes) ? s.includes : [];
      const excludes = Array.isArray(s.excludes) ? s.excludes : [];
      const meta = [
        runList.length ? `run_list: ${runList.join(', ')}` : '',
        attrCount ? `${attrCount} attribute${attrCount !== 1 ? 's' : ''}` : '',
        includes.length ? `includes: ${includes.join(', ')}` : '',
        excludes.length ? `excludes: ${excludes.join(', ')}` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="tk-card" style="margin:6px 0;">
<div class="tk-suite-name">${esc(name)}</div>
${meta ? `<div class="tk-suite-meta">${esc(meta)}</div>` : ''}
</div>`;
    }).join('');
    suitesHtml = `<div class="tk-sec"><h3>Suites (${suites.length})</h3>${items}</div>`;
  }

  // Summary
  const parts = [];
  if (driverName) parts.push(`driver: ${driverName}`);
  if (provisionerName) parts.push(`provisioner: ${provisionerName}`);
  if (platforms.length) parts.push(`${platforms.length} platform${platforms.length !== 1 ? 's' : ''}`);
  if (suites.length) parts.push(`${suites.length} suite${suites.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'testkitchen-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tk-title"><span class="tk-badge">Test Kitchen</span>${esc(filename)}</div>
<div class="tk-sub">${esc(parts.join(' · ') || 'Test Kitchen infrastructure test configuration')}</div>
${driverHtml}
${provisionerHtml}
${verifierHtml}
${transportHtml}
${platformsHtml}
${suitesHtml}`;

  return { parentNode: host };
}

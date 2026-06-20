import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.moleculeyml-doc { padding: 16px 18px; max-width: 860px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.moleculeyml-doc .mol-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #009639; color: #fff; vertical-align: middle; margin-right: 8px; }
.moleculeyml-doc .mol-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.moleculeyml-doc .mol-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 14px; }
.moleculeyml-doc .mol-sec { margin: 12px 0; }
.moleculeyml-doc .mol-sec h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2, #888); margin: 0 0 6px; }
.moleculeyml-doc .mol-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.moleculeyml-doc .mol-pill { display: inline-flex; align-items: center; font-size: 12px; padding: 3px 10px; border-radius: 12px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); font-family: ui-monospace, monospace; }
.moleculeyml-doc .mol-pill-driver { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; font-weight: 600; }
.moleculeyml-doc .mol-pill-verifier { background: #f3e8ff; border-color: #d8b4fe; color: #6b21a8; font-weight: 600; }
.moleculeyml-doc .mol-pill-provisioner { background: #dcfce7; border-color: #86efac; color: #166534; font-weight: 600; }
.moleculeyml-doc .mol-pill-step { background: var(--bg-2, #f6f8fa); border-color: var(--border, #e0e0e0); color: var(--fg, #24292f); }
.moleculeyml-doc .mol-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.moleculeyml-doc .mol-table th { text-align: left; padding: 5px 10px; border-bottom: 2px solid var(--border, #e0e0e0); font-weight: 600; color: var(--fg-2, #666); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.moleculeyml-doc .mol-table td { padding: 6px 10px; border-bottom: 1px solid var(--border, #e8e8e8); vertical-align: top; font-family: ui-monospace, monospace; font-size: 12px; }
.moleculeyml-doc .mol-table tr:last-child td { border-bottom: none; }
.moleculeyml-doc .mol-kv { display: flex; gap: 8px; align-items: baseline; margin: 2px 0; }
.moleculeyml-doc .mol-kv-k { font-size: 12px; color: var(--fg-2, #888); min-width: 120px; }
.moleculeyml-doc .mol-kv-v { font-size: 13px; font-family: ui-monospace, monospace; }
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'molecule.yml';

  // Driver
  const driver = cfg.driver && typeof cfg.driver === 'object' ? cfg.driver : {};
  const driverName = driver.name || (typeof cfg.driver === 'string' ? cfg.driver : '');

  // Platforms
  const platforms = Array.isArray(cfg.platforms) ? cfg.platforms : [];

  // Provisioner
  const provisioner = cfg.provisioner && typeof cfg.provisioner === 'object' ? cfg.provisioner : {};
  const provisionerName = provisioner.name || (typeof cfg.provisioner === 'string' ? cfg.provisioner : '');
  const playbooks = provisioner.playbooks && typeof provisioner.playbooks === 'object' ? provisioner.playbooks : {};

  // Verifier
  const verifier = cfg.verifier && typeof cfg.verifier === 'object' ? cfg.verifier : {};
  const verifierName = verifier.name || (typeof cfg.verifier === 'string' ? cfg.verifier : '');

  // Scenario
  const scenario = cfg.scenario && typeof cfg.scenario === 'object' ? cfg.scenario : {};
  const scenarioName = scenario.name || '';
  const testSequence = Array.isArray(scenario.test_sequence) ? scenario.test_sequence : [];

  // Lint
  const lint = cfg.lint;

  // Summary
  const parts = [];
  if (driverName) parts.push(`driver: ${driverName}`);
  if (platforms.length) parts.push(`${platforms.length} platform${platforms.length !== 1 ? 's' : ''}`);
  if (verifierName) parts.push(`verifier: ${verifierName}`);
  if (scenarioName) parts.push(`scenario: ${scenarioName}`);

  // Driver chip
  const driverHtml = driverName
    ? `<div class="mol-sec"><h3>Driver</h3><div class="mol-pills"><span class="mol-pill mol-pill-driver">${esc(driverName)}</span></div></div>`
    : '';

  // Platforms table
  let platformsHtml = '';
  if (platforms.length) {
    const rows = platforms.slice(0, 8).map((p) => {
      const name = p.name || p.alias || '';
      const image = p.image || p.box || p.ami || '';
      const extra = p.pre_build_image !== undefined ? (p.pre_build_image ? 'pre-built' : '') : '';
      return `<tr><td>${esc(name)}</td><td>${esc(image)}</td><td>${extra ? `<span style="font-size:11px;color:var(--fg-2,#888)">${esc(extra)}</span>` : ''}</td></tr>`;
    }).join('');
    const moreRow = platforms.length > 8
      ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:12px">+${platforms.length - 8} more platforms</td></tr>`
      : '';
    platformsHtml = `<div class="mol-sec"><h3>Platforms</h3><table class="mol-table"><thead><tr><th>Name</th><th>Image / Box</th><th></th></tr></thead><tbody>${rows}${moreRow}</tbody></table></div>`;
  }

  // Provisioner
  let provisionerHtml = '';
  if (provisionerName) {
    const playbookEntries = [];
    for (const key of ['converge', 'verify', 'prepare', 'cleanup', 'side_effect']) {
      if (playbooks[key]) playbookEntries.push(`<div class="mol-kv"><span class="mol-kv-k">${esc(key)}</span><span class="mol-kv-v">${esc(playbooks[key])}</span></div>`);
    }
    provisionerHtml = `<div class="mol-sec"><h3>Provisioner</h3><div class="mol-pills" style="margin-bottom:${playbookEntries.length ? '8px' : '0'}"><span class="mol-pill mol-pill-provisioner">${esc(provisionerName)}</span></div>${playbookEntries.join('')}</div>`;
  }

  // Verifier
  const verifierHtml = verifierName
    ? `<div class="mol-sec"><h3>Verifier</h3><div class="mol-pills"><span class="mol-pill mol-pill-verifier">${esc(verifierName)}</span></div></div>`
    : '';

  // Scenario name + test sequence
  let scenarioHtml = '';
  if (scenarioName || testSequence.length) {
    const nameRow = scenarioName
      ? `<div class="mol-kv"><span class="mol-kv-k">Name</span><span class="mol-kv-v">${esc(scenarioName)}</span></div>`
      : '';
    const stepsHtml = testSequence.length
      ? `<div class="mol-pills" style="margin-top:6px">${testSequence.map((s) => `<span class="mol-pill mol-pill-step">${esc(s)}</span>`).join('')}</div>`
      : '';
    scenarioHtml = `<div class="mol-sec"><h3>Scenario</h3>${nameRow}${stepsHtml}</div>`;
  }

  // Lint
  let lintHtml = '';
  if (lint && typeof lint === 'object') {
    const lintItems = [];
    if (lint.name) lintItems.push(`<div class="mol-kv"><span class="mol-kv-k">Name</span><span class="mol-kv-v">${esc(lint.name)}</span></div>`);
    if (lint.enabled !== undefined) lintItems.push(`<div class="mol-kv"><span class="mol-kv-k">Enabled</span><span class="mol-kv-v">${lint.enabled ? 'yes' : 'no'}</span></div>`);
    if (lintItems.length) lintHtml = `<div class="mol-sec"><h3>Lint</h3>${lintItems.join('')}</div>`;
  } else if (typeof lint === 'string' && lint.trim()) {
    lintHtml = `<div class="mol-sec"><h3>Lint</h3><div class="mol-kv"><span class="mol-kv-v">${esc(lint)}</span></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'moleculeyml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mol-title"><span class="mol-badge">Molecule</span>${esc(filename)}</div>
<div class="mol-sub">${parts.join(' · ') || 'Molecule Ansible testing configuration'}</div>
${driverHtml}
${platformsHtml}
${provisionerHtml}
${verifierHtml}
${scenarioHtml}
${lintHtml}`;

  return { parentNode: host };
}

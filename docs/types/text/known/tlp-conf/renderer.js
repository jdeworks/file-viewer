const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tlpcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tlpcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a472a;color:#fff;vertical-align:middle;margin-right:8px;}
.tlpcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tlpcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.tlpcfg-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600;border:1px solid;margin:2px 3px 2px 0;vertical-align:middle;}
.tlpcfg-chip-enabled{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.tlpcfg-chip-disabled{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.tlpcfg-chip-perf{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.tlpcfg-chip-save{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.tlpcfg-chip-cons{background:#dce8f5;color:#1a4a80;border-color:#b0cce8;}
.tlpcfg-chip-sched{background:#e2d9f3;color:#4a235a;border-color:#c9b8e8;}
.tlpcfg-chip-neutral{background:#e9ecef;color:#495057;border-color:#ced4da;}
.tlpcfg-chip-warn{background:#fff3cd;color:#856404;border-color:#ffc107;}
.tlpcfg-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;}
@media(max-width:640px){.tlpcfg-columns{grid-template-columns:1fr;}}
.tlpcfg-col-hd{font-size:13px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--border,#e0e0e0);}
.tlpcfg-col-ac .tlpcfg-col-hd{color:#1a4a80;}
.tlpcfg-col-bat .tlpcfg-col-hd{color:#4a235a;}
.tlpcfg-section{margin-bottom:14px;}
.tlpcfg-section-hd{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin-bottom:5px;}
.tlpcfg-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);gap:8px;flex-wrap:wrap;}
.tlpcfg-row:last-child{border-bottom:none;}
.tlpcfg-row-key{color:var(--fg-2,#666);font-family:ui-monospace,monospace;flex-shrink:0;}
.tlpcfg-row-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);text-align:right;word-break:break-all;}
.tlpcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.tlpcfg-global{margin-bottom:16px;}
`;

function parseTlp(text) {
  const cfg = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    cfg[key] = val;
  }
  return cfg;
}

function governorChip(val) {
  if (!val) return '';
  const v = val.toLowerCase();
  let cls = 'tlpcfg-chip-neutral';
  if (v === 'powersave') cls = 'tlpcfg-chip-save';
  else if (v === 'performance') cls = 'tlpcfg-chip-perf';
  else if (v === 'conservative') cls = 'tlpcfg-chip-cons';
  else if (v === 'schedutil' || v === 'ondemand') cls = 'tlpcfg-chip-sched';
  return `<span class="tlpcfg-chip ${cls}">${esc(val)}</span>`;
}

function boolChip(val, trueLabel, falseLabel) {
  const v = String(val).toLowerCase();
  const isOn = v === '1' || v === 'y' || v === 'yes' || v === 'true' || v === 'on';
  const label = isOn ? (trueLabel || 'ON') : (falseLabel || 'OFF');
  const cls = isOn ? 'tlpcfg-chip-enabled' : 'tlpcfg-chip-disabled';
  return `<span class="tlpcfg-chip ${cls}">${esc(label)}</span>`;
}

function neutralChip(val) {
  if (val == null || val === '') return '';
  return `<span class="tlpcfg-chip tlpcfg-chip-neutral">${esc(val)}</span>`;
}

function row(key, valHtml) {
  if (!valHtml) return '';
  return `<div class="tlpcfg-row"><span class="tlpcfg-row-key">${esc(key)}</span><span>${valHtml}</span></div>`;
}

function colSection(title, rows) {
  const content = rows.filter(Boolean).join('');
  if (!content) return '';
  return `<div class="tlpcfg-section">
  <div class="tlpcfg-section-hd">${esc(title)}</div>
  ${content}
</div>`;
}

export function render(intake) {
  const cfg = parseTlp(intake.text || '');

  // Global status chips
  const enableVal = cfg['TLP_ENABLE'];
  const enableChip = enableVal != null
    ? boolChip(enableVal, 'Enabled', 'Disabled')
    : '';

  const modeChip = cfg['TLP_DEFAULT_MODE']
    ? neutralChip('Mode: ' + cfg['TLP_DEFAULT_MODE'])
    : '';

  // Build AC column
  function acCpu() {
    const govChip = governorChip(cfg['CPU_SCALING_GOVERNOR_ON_AC']);
    const policyChip = cfg['CPU_ENERGY_PERF_POLICY_ON_AC'] ? neutralChip(cfg['CPU_ENERGY_PERF_POLICY_ON_AC']) : '';
    const minPerf = cfg['CPU_MIN_PERF_ON_AC'];
    const maxPerf = cfg['CPU_MAX_PERF_ON_AC'];
    const perfRange = (minPerf != null || maxPerf != null)
      ? `<span class="tlpcfg-row-val">${esc(minPerf ?? '?')}%–${esc(maxPerf ?? '?')}%</span>`
      : '';
    const boostChip = cfg['CPU_BOOST_ON_AC'] != null
      ? boolChip(cfg['CPU_BOOST_ON_AC'], 'Boost ON', 'Boost OFF')
      : '';

    return colSection('CPU', [
      govChip ? row('Governor', govChip) : '',
      policyChip ? row('Energy/Perf', policyChip) : '',
      perfRange ? `<div class="tlpcfg-row"><span class="tlpcfg-row-key">Perf range</span>${perfRange}</div>` : '',
      boostChip ? row('Turbo Boost', boostChip) : '',
    ]);
  }

  function acDisk() {
    const devices = cfg['DISK_DEVICES'];
    const apm = cfg['DISK_APM_LEVEL_ON_AC'];
    const spindown = cfg['DISK_SPINDOWN_TIMEOUT_ON_AC'];
    const sata = cfg['SATA_LINKPWR_ON_AC'];
    return colSection('Disk', [
      devices ? row('Devices', `<span class="tlpcfg-row-val">${esc(devices)}</span>`) : '',
      apm ? row('APM Level', neutralChip(apm)) : '',
      spindown ? row('Spindown', `<span class="tlpcfg-row-val">${esc(spindown)}</span>`) : '',
      sata ? row('SATA Power', neutralChip(sata)) : '',
    ]);
  }

  function acPci() {
    const pcie = cfg['PCIE_ASPM_ON_AC'];
    const rtpm = cfg['RUNTIME_PM_ON_AC'];
    return colSection('PCI/Runtime', [
      pcie ? row('PCIe ASPM', neutralChip(pcie)) : '',
      rtpm ? row('Runtime PM', neutralChip(rtpm)) : '',
    ]);
  }

  // Build Battery column
  function batCpu() {
    const govChip = governorChip(cfg['CPU_SCALING_GOVERNOR_ON_BAT']);
    const policyChip = cfg['CPU_ENERGY_PERF_POLICY_ON_BAT'] ? neutralChip(cfg['CPU_ENERGY_PERF_POLICY_ON_BAT']) : '';
    const minPerf = cfg['CPU_MIN_PERF_ON_BAT'];
    const maxPerf = cfg['CPU_MAX_PERF_ON_BAT'];
    const perfRange = (minPerf != null || maxPerf != null)
      ? `<span class="tlpcfg-row-val">${esc(minPerf ?? '?')}%–${esc(maxPerf ?? '?')}%</span>`
      : '';
    const boostChip = cfg['CPU_BOOST_ON_BAT'] != null
      ? boolChip(cfg['CPU_BOOST_ON_BAT'], 'Boost ON', 'Boost OFF')
      : '';

    return colSection('CPU', [
      govChip ? row('Governor', govChip) : '',
      policyChip ? row('Energy/Perf', policyChip) : '',
      perfRange ? `<div class="tlpcfg-row"><span class="tlpcfg-row-key">Perf range</span>${perfRange}</div>` : '',
      boostChip ? row('Turbo Boost', boostChip) : '',
    ]);
  }

  function batBattery() {
    const start0 = cfg['START_CHARGE_THRESH_BAT0'];
    const stop0 = cfg['STOP_CHARGE_THRESH_BAT0'];
    const start1 = cfg['START_CHARGE_THRESH_BAT1'];
    const stop1 = cfg['STOP_CHARGE_THRESH_BAT1'];
    const vendor = cfg['BATTERY_CARE_VENDOR'];
    const threshHtml0 = (start0 != null && stop0 != null)
      ? `<span class="tlpcfg-row-val">${esc(start0)}% → ${esc(stop0)}%</span>`
      : (start0 || stop0
        ? `<span class="tlpcfg-row-val">${esc(start0 ?? '?')}% → ${esc(stop0 ?? '?')}%</span>`
        : '');
    const threshHtml1 = (start1 != null && stop1 != null)
      ? `<span class="tlpcfg-row-val">${esc(start1)}% → ${esc(stop1)}%</span>`
      : '';

    return colSection('Battery', [
      threshHtml0 ? `<div class="tlpcfg-row"><span class="tlpcfg-row-key">BAT0 charge</span>${threshHtml0}</div>` : '',
      threshHtml1 ? `<div class="tlpcfg-row"><span class="tlpcfg-row-key">BAT1 charge</span>${threshHtml1}</div>` : '',
      vendor ? row('Vendor', neutralChip(vendor)) : '',
    ]);
  }

  function batDisk() {
    const apm = cfg['DISK_APM_LEVEL_ON_BAT'];
    const spindown = cfg['DISK_SPINDOWN_TIMEOUT_ON_BAT'];
    const sata = cfg['SATA_LINKPWR_ON_BAT'];
    return colSection('Disk', [
      apm ? row('APM Level', neutralChip(apm)) : '',
      spindown ? row('Spindown', `<span class="tlpcfg-row-val">${esc(spindown)}</span>`) : '',
      sata ? row('SATA Power', neutralChip(sata)) : '',
    ]);
  }

  function batPci() {
    const pcie = cfg['PCIE_ASPM_ON_BAT'];
    const usbSuspend = cfg['USB_AUTOSUSPEND'];
    const wol = cfg['WOL_DISABLE'];
    const rtpm = cfg['RUNTIME_PM_ON_BAT'];
    return colSection('PCI/USB/WOL', [
      pcie ? row('PCIe ASPM', neutralChip(pcie)) : '',
      usbSuspend != null ? row('USB Autosuspend', boolChip(usbSuspend, 'Enabled', 'Disabled')) : '',
      wol != null ? row('WOL Disable', boolChip(wol, 'WOL Disabled', 'WOL Active')) : '',
      rtpm ? row('Runtime PM', neutralChip(rtpm)) : '',
    ]);
  }

  const acHtml = [acCpu(), acDisk(), acPci()].filter(Boolean).join('');
  const batHtml = [batCpu(), batBattery(), batDisk(), batPci()].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'tlpcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tlpcfg-title"><span class="tlpcfg-badge">TLP</span>TLP Power Config</div>
<div class="tlpcfg-sub">
  ${enableChip}${modeChip}
</div>
<div class="tlpcfg-columns">
  <div class="tlpcfg-col tlpcfg-col-ac">
    <div class="tlpcfg-col-hd">AC (Plugged In)</div>
    ${acHtml || '<p style="color:var(--fg-2,#888);font-size:13px;">No AC settings found.</p>'}
  </div>
  <div class="tlpcfg-col tlpcfg-col-bat">
    <div class="tlpcfg-col-hd">Battery</div>
    ${batHtml || '<p style="color:var(--fg-2,#888);font-size:13px;">No battery settings found.</p>'}
  </div>
</div>`;

  return { parentNode: host };
}

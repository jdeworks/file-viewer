const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.xorgcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.xorgcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a3a;color:#fff;vertical-align:middle;margin-right:8px;}
.xorgcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xorgcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.xorgcfg-sec{margin:12px 0;}
.xorgcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.xorgcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.xorgcfg-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;}
.xorgcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.xorgcfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.xorgcfg-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.xorgcfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.xorgcfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.xorgcfg-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.xorgcfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.xorgcfg-key{color:var(--fg-2,#888);font-size:12px;min-width:160px;flex-shrink:0;}
.xorgcfg-val{font-family:ui-monospace,monospace;font-size:12px;}
`;

/**
 * Parse Xorg config format.
 * Returns array of { name, entries: [{key, value}], options: {name: value}, sub: [{name, entries}] }
 */
function parseXorgConf(text) {
  const sections = [];
  const lines = text.split('\n');
  let current = null;
  let currentSub = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const sectionStart = line.match(/^Section\s+"(\w+)"/i);
    if (sectionStart) {
      current = { name: sectionStart[1], entries: [], options: {}, sub: [] };
      currentSub = null;
      continue;
    }
    if (/^EndSection$/i.test(line)) {
      if (current) sections.push(current);
      current = null;
      currentSub = null;
      continue;
    }
    if (/^SubSection\s+"(\w+)"/i.test(line)) {
      const m = line.match(/^SubSection\s+"(\w+)"/i);
      if (current) {
        currentSub = { name: m[1], entries: [] };
        current.sub.push(currentSub);
      }
      continue;
    }
    if (/^EndSubSection$/i.test(line)) {
      currentSub = null;
      continue;
    }

    if (!current) continue;

    // Option "name" "value" or Option "name"
    const optMatch = line.match(/^Option\s+"([^"]+)"(?:\s+"([^"]*)")?/i);
    if (optMatch) {
      const optName = optMatch[1];
      const optVal = optMatch[2] != null ? optMatch[2] : 'true';
      current.options[optName] = optVal;
      if (currentSub) currentSub.entries.push({ key: 'Option', value: `"${optName}" "${optVal}"` });
      continue;
    }

    // Key Value (possibly quoted)
    const kvMatch = line.match(/^(\w+)\s+(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].replace(/^"(.*)"$/, '$1').trim();
      if (currentSub) {
        currentSub.entries.push({ key, value: val });
      } else {
        current.entries.push({ key, value: val });
      }
    }
  }
  return sections;
}

function get(entries, key) {
  const e = entries.find((x) => x.key.toLowerCase() === key.toLowerCase());
  return e ? e.value : null;
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="xorgcfg-chip${cls ? ' xorgcfg-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="xorgcfg-row"><span class="xorgcfg-key">${esc(label)}</span><span class="xorgcfg-val">${html}</span></div>`;
}

function driverChip(driver) {
  if (!driver) return '';
  const d = driver.toLowerCase();
  const cls = d === 'nvidia' ? 'green' : d === 'amdgpu' || d === 'radeon' ? 'red' : d === 'intel' || d === 'i915' ? 'blue' : d === 'modesetting' ? 'gray' : '';
  return chip(driver, cls);
}

function boolChip(val, onLabel, offLabel, onCls = 'green', offCls = 'gray') {
  if (!val) return '';
  const on = /^(true|yes|1|on)$/i.test(val);
  return chip(on ? (onLabel || 'enabled') : (offLabel || 'disabled'), on ? onCls : offCls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'xorgcfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const sections = parseXorgConf(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="xorgcfg-badge">Xorg</span>
      <span class="xorgcfg-title">Xorg Config</span>
    </div>
    <p class="xorgcfg-sub">X11 server configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Section summary chip row
  const sectionNames = sections.map((s) => s.name);
  if (sectionNames.length > 0) {
    body += `<div style="margin-bottom:12px;">`;
    body += sectionNames.map((n) => chip(n)).join('');
    body += `</div>`;
  }

  // ServerLayout section
  const layout = sections.find((s) => s.name === 'ServerLayout');
  if (layout) {
    const screens = layout.entries.filter((e) => e.key === 'Screen').map((e) => e.value.replace(/^\d+\s+/, '').replace(/"([^"]+)".*/, '$1').trim());
    const inputs = layout.entries.filter((e) => e.key === 'InputDevice').map((e) => e.value.replace(/"([^"]+)".*/, '$1').trim());
    const identifier = get(layout.entries, 'Identifier');
    body += `<div class="xorgcfg-sec"><h3>Server Layout</h3><div class="xorgcfg-card">`;
    if (identifier) body += row('Identifier', chip(identifier));
    if (screens.length) body += row('Screens', screens.map((s) => chip(s)).join(' '));
    if (inputs.length) body += row('Input Devices', inputs.map((s) => chip(s)).join(' '));
    body += `</div></div>`;
  }

  // Device sections (GPU)
  const devices = sections.filter((s) => s.name === 'Device');
  if (devices.length > 0) {
    body += `<div class="xorgcfg-sec"><h3>GPU / Device</h3>`;
    for (const dev of devices) {
      const identifier = get(dev.entries, 'Identifier') || '';
      const driver = get(dev.entries, 'Driver') || '';
      const busId = get(dev.entries, 'BusID') || '';
      body += `<div class="xorgcfg-card">`;
      if (identifier) body += `<div class="xorgcfg-card-label">${esc(identifier)}</div>`;
      if (driver) body += row('Driver', driverChip(driver));
      if (busId) body += row('BusID', chip(busId));
      // Notable options
      const notableOpts = ['TearFree', 'AccelMethod', 'DRI', 'VariableRefresh', 'FreeSync', 'TripleBuffer', 'TearFree'];
      for (const opt of notableOpts) {
        const v = dev.options[opt];
        if (v != null) {
          const isFlag = /^(true|false|yes|no|on|off)$/i.test(v);
          body += row(opt, isFlag ? boolChip(v) : chip(v));
        }
      }
      body += `</div>`;
    }
    body += `</div>`;
  }

  // Screen sections
  const screens = sections.filter((s) => s.name === 'Screen');
  if (screens.length > 0) {
    body += `<div class="xorgcfg-sec"><h3>Screen</h3>`;
    for (const scr of screens) {
      const identifier = get(scr.entries, 'Identifier') || '';
      const defaultDepth = get(scr.entries, 'DefaultDepth') || '';
      // Modes from SubSection "Display"
      const displaySub = scr.sub.find((s) => s.name === 'Display');
      const modesEntry = displaySub ? displaySub.entries.find((e) => e.key === 'Modes') : null;
      const virtual = displaySub ? get(displaySub.entries, 'Virtual') : null;

      body += `<div class="xorgcfg-card">`;
      if (identifier) body += `<div class="xorgcfg-card-label">${esc(identifier)}</div>`;
      if (defaultDepth) body += row('DefaultDepth', chip(defaultDepth + '-bit', 'blue'));
      if (modesEntry) body += row('Modes', modesEntry.value.match(/"[^"]+"/g)?.map((m) => chip(m.replace(/"/g, ''))).join(' ') || chip(modesEntry.value));
      if (virtual) body += row('Virtual', chip(virtual));
      body += `</div>`;
    }
    body += `</div>`;
  }

  // Monitor sections
  const monitors = sections.filter((s) => s.name === 'Monitor');
  if (monitors.length > 0) {
    body += `<div class="xorgcfg-sec"><h3>Monitor</h3>`;
    for (const mon of monitors) {
      const identifier = get(mon.entries, 'Identifier') || '';
      const vendor = get(mon.entries, 'VendorName') || '';
      const model = get(mon.entries, 'ModelName') || '';
      const modelines = mon.entries.filter((e) => e.key === 'Modeline').length;
      const dpms = mon.options['DPMS'];
      body += `<div class="xorgcfg-card">`;
      if (identifier) body += `<div class="xorgcfg-card-label">${esc(identifier)}</div>`;
      if (vendor || model) body += row('Model', chip([vendor, model].filter(Boolean).join(' ')));
      if (modelines > 0) body += row('Modelines', chip(modelines + ' modeline' + (modelines > 1 ? 's' : '')));
      if (dpms != null) body += row('DPMS', chip('enabled', 'green'));
      body += `</div>`;
    }
    body += `</div>`;
  }

  // InputClass sections
  const inputClasses = sections.filter((s) => s.name === 'InputClass');
  if (inputClasses.length > 0) {
    body += `<div class="xorgcfg-sec"><h3>Input Classes</h3>`;
    for (const ic of inputClasses) {
      const identifier = get(ic.entries, 'Identifier') || '';
      const driver = get(ic.entries, 'Driver') || '';
      body += `<div class="xorgcfg-card">`;
      if (identifier) body += `<div class="xorgcfg-card-label">${esc(identifier)}</div>`;
      if (driver) body += row('Driver', chip(driver));
      // Device type chips
      const typeChips = [];
      if (ic.entries.some((e) => e.key === 'MatchIsPointer' && /on|true|yes/i.test(e.value))) typeChips.push(chip('pointer'));
      if (ic.entries.some((e) => e.key === 'MatchIsKeyboard' && /on|true|yes/i.test(e.value))) typeChips.push(chip('keyboard'));
      if (ic.entries.some((e) => e.key === 'MatchIsTouchpad' && /on|true|yes/i.test(e.value))) typeChips.push(chip('touchpad', 'blue'));
      if (typeChips.length) body += row('Type', typeChips.join(' '));
      // Touchpad options
      const touchpadOpts = ['Tapping', 'NaturalScrolling', 'AccelSpeed', 'TappingButtonMap', 'DisableWhileTyping', 'ClickMethod'];
      for (const opt of touchpadOpts) {
        const v = ic.options[opt];
        if (v != null) {
          const isFlag = /^(true|false|yes|no|on|off)$/i.test(v);
          body += row(opt, isFlag ? boolChip(v) : chip(v));
        }
      }
      body += `</div>`;
    }
    body += `</div>`;
  }

  // InputDevice sections (if no InputClass sections shown or worth showing)
  const inputDevices = sections.filter((s) => s.name === 'InputDevice');
  if (inputDevices.length > 0 && inputClasses.length === 0) {
    body += `<div class="xorgcfg-sec"><h3>Input Devices</h3>`;
    for (const id of inputDevices) {
      const identifier = get(id.entries, 'Identifier') || '';
      const driver = get(id.entries, 'Driver') || '';
      body += `<div class="xorgcfg-card">`;
      if (identifier) body += `<div class="xorgcfg-card-label">${esc(identifier)}</div>`;
      if (driver) body += row('Driver', chip(driver));
      body += `</div>`;
    }
    body += `</div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}

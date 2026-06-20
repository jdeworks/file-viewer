const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pulsecfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pulsecfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b0000;color:#fff;vertical-align:middle;margin-right:8px;}
.pulsecfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pulsecfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pulsecfg-sec{margin:12px 0;}
.pulsecfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pulsecfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.pulsecfg-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;}
.pulsecfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.pulsecfg-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.pulsecfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.pulsecfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.pulsecfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.pulsecfg-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.pulsecfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.pulsecfg-module-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px;}
.pulsecfg-module-list li{font-family:ui-monospace,monospace;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;}
`;

/** Parse key = value style (daemon.conf) */
function parseDaemonConf(text) {
  const settings = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const m = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/\s*#.*$/, '');
    if (!(key in settings)) settings[key] = val;
  }
  return settings;
}

/** Parse default.pa style (load-module lines) */
function parseDefaultPa(text) {
  const modules = [];
  let defaultSink = null;
  let defaultSource = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const modMatch = /^load-module\s+(\S+)(.*)/.exec(line);
    if (modMatch) {
      modules.push({ name: modMatch[1], args: modMatch[2].trim() });
      continue;
    }
    const sinkMatch = /^set-default-sink\s+(\S+)/.exec(line);
    if (sinkMatch) { defaultSink = sinkMatch[1]; continue; }
    const srcMatch = /^set-default-source\s+(\S+)/.exec(line);
    if (srcMatch) { defaultSource = srcMatch[1]; }
  }
  return { modules, defaultSink, defaultSource };
}

function isDaemonStyle(text) {
  return /^\s*[a-zA-Z0-9_-]+\s*=\s*\S/m.test(text) && !text.includes('load-module ');
}

function fmtChip(val, key) {
  if (!val) return '';
  if (key === 'default-sample-format') {
    const cls = val === 's16le' ? 'pulsecfg-chip-orange' : val === 's24le' ? 'pulsecfg-chip-blue' : val.includes('float') ? 'pulsecfg-chip-green' : '';
    return `<span class="pulsecfg-chip ${cls}">${esc(val)}</span>`;
  }
  if (key === 'realtime-scheduling') {
    return `<span class="pulsecfg-chip ${val === 'yes' ? 'pulsecfg-chip-green' : ''}">${esc(val)}</span>`;
  }
  return `<span class="pulsecfg-chip">${esc(val)}</span>`;
}

function row(label, html) {
  return `<div class="pulsecfg-row"><span class="pulsecfg-key">${esc(label)}</span><span class="pulsecfg-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'pulsecfg-doc';

  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();

  let title = 'PulseAudio Config';
  if (filename === 'daemon.conf') title = 'PulseAudio Daemon Config';
  else if (filename === 'default.pa') title = 'PulseAudio Startup Script';

  let bodyHtml = '';

  if (isDaemonStyle(text)) {
    const s = parseDaemonConf(text);

    // Audio quality card
    const audioRows = [
      s['default-sample-format'] ? row('default-sample-format', fmtChip(s['default-sample-format'], 'default-sample-format')) : '',
      s['default-sample-rate'] ? row('default-sample-rate', fmtChip(s['default-sample-rate'] + ' Hz', 'rate')) : '',
      s['default-sample-channels'] ? row('default-sample-channels', fmtChip(s['default-sample-channels'], 'channels')) : '',
      s['alternate-sample-rate'] ? row('alternate-sample-rate', fmtChip(s['alternate-sample-rate'] + ' Hz', 'rate')) : '',
      s['resample-method'] ? row('resample-method', fmtChip(s['resample-method'], 'resample')) : '',
    ].filter(Boolean).join('');

    if (audioRows) {
      bodyHtml += `<div class="pulsecfg-sec"><h3>Audio Quality</h3><div class="pulsecfg-card">${audioRows}</div></div>`;
    }

    // System card
    const sysRows = [
      s['daemon-binary'] ? row('daemon-binary', `<span class="pulsecfg-val">${esc(s['daemon-binary'])}</span>`) : '',
      s['realtime-scheduling'] ? row('realtime-scheduling', fmtChip(s['realtime-scheduling'], 'realtime-scheduling')) : '',
      s['realtime-priority'] ? row('realtime-priority', fmtChip(s['realtime-priority'], 'prio')) : '',
      s['high-priority'] ? row('high-priority', fmtChip(s['high-priority'], 'bool')) : '',
      s['avoid-resampling'] ? row('avoid-resampling', fmtChip(s['avoid-resampling'], 'bool')) : '',
    ].filter(Boolean).join('');

    if (sysRows) {
      bodyHtml += `<div class="pulsecfg-sec"><h3>System</h3><div class="pulsecfg-card">${sysRows}</div></div>`;
    }

    // Network: check for TCP in raw text (since it's a daemon.conf-style check)
    if (text.includes('module-native-protocol-tcp')) {
      bodyHtml += `<div class="pulsecfg-sec"><h3>Network</h3><div class="pulsecfg-card"><span class="pulsecfg-chip pulsecfg-chip-blue">TCP socket</span></div></div>`;
    }

  } else {
    // default.pa style
    const { modules, defaultSink, defaultSource } = parseDefaultPa(text);

    const playback = modules.filter((m) => /module-alsa-sink|module-null-sink/.test(m.name));
    const bluetooth = modules.filter((m) => /module-bluetooth/.test(m.name));
    const network = modules.filter((m) => /module-native-protocol-tcp|module-zeroconf/.test(m.name));
    const routing = modules.filter((m) => /module-default-device-restore|module-stream-restore/.test(m.name));
    const other = modules.filter((m) =>
      !playback.includes(m) && !bluetooth.includes(m) && !network.includes(m) && !routing.includes(m)
    );

    bodyHtml += `<div class="pulsecfg-sec"><h3>Overview</h3><div class="pulsecfg-card">
      <div class="pulsecfg-row"><span class="pulsecfg-key">Modules loaded</span><span class="pulsecfg-chip">${esc(String(modules.length))}</span></div>
      ${defaultSink ? `<div class="pulsecfg-row"><span class="pulsecfg-key">Default sink</span><span class="pulsecfg-val">${esc(defaultSink)}</span></div>` : ''}
      ${defaultSource ? `<div class="pulsecfg-row"><span class="pulsecfg-key">Default source</span><span class="pulsecfg-val">${esc(defaultSource)}</span></div>` : ''}
    </div></div>`;

    function moduleGroup(label, items) {
      if (!items.length) return '';
      return `<div class="pulsecfg-sec"><h3>${esc(label)}</h3><div class="pulsecfg-card">
        <ul class="pulsecfg-module-list">${items.map((m) => `<li>${esc(m.name)}</li>`).join('')}</ul>
      </div></div>`;
    }

    bodyHtml += moduleGroup('Playback', playback);
    bodyHtml += moduleGroup('Bluetooth', bluetooth);
    bodyHtml += moduleGroup('Network', network);
    bodyHtml += moduleGroup('Routing', routing);
    if (other.length) bodyHtml += moduleGroup('Other', other);
  }

  host.innerHTML = `<style>${CSS}</style>
<div class="pulsecfg-title"><span class="pulsecfg-badge">PulseAudio</span>${esc(title)}</div>
<div class="pulsecfg-sub">${esc(filename || 'PulseAudio configuration')}</div>
${bodyHtml}`;

  return { parentNode: host };
}

import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.frigate-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.frigate-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00C7B7;color:#fff;vertical-align:middle;margin-right:8px;}
.frigate-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.frigate-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.frigate-sec{margin:14px 0;}
.frigate-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.frigate-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.frigate-row{display:flex;align-items:baseline;gap:8px;margin:2px 0;font-size:13px;}
.frigate-key{color:var(--fg-2,#888);font-size:12px;min-width:160px;flex-shrink:0;}
.frigate-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.frigate-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.frigate-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.frigate-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.frigate-chip-off{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.frigate-chip-cpu{background:#f1f5f9;border-color:#cbd5e1;color:#475569;}
.frigate-chip-coral{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.frigate-chip-gpu{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
.frigate-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}
.frigate-table{width:100%;border-collapse:collapse;font-size:12px;font-family:ui-monospace,monospace;}
.frigate-table th{text-align:left;font-weight:600;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.frigate-table td{padding:4px 8px 4px 0;vertical-align:top;}
.frigate-cam-name{font-weight:700;font-size:13px;color:var(--fg,#24292f);font-family:system-ui,sans-serif;}
.frigate-cam-url{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#888);word-break:break-all;}
.frigate-cam-roles{margin-top:3px;}
.frigate-more{font-size:12px;color:var(--fg-2,#888);font-style:italic;margin-top:6px;}
`;

function row(label, html) {
  if (html == null || html === '') return '';
  return `<div class="frigate-row"><span class="frigate-key">${esc(label)}</span><span class="frigate-val">${html}</span></div>`;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const c = cls ? ` frigate-chip-${cls}` : '';
  return `<span class="frigate-chip${c}">${esc(String(val))}</span>`;
}

function boolChip(val, labelOn, labelOff) {
  const on = labelOn || 'enabled';
  const off = labelOff || 'disabled';
  if (val === true || val === 'true' || val === 1) return `<span class="frigate-chip frigate-chip-on">${esc(on)}</span>`;
  return `<span class="frigate-chip frigate-chip-off">${esc(off)}</span>`;
}

function masked() {
  return '<span class="frigate-masked">[configured]</span>';
}

function section(title, inner) {
  if (!inner) return '';
  return `<div class="frigate-sec"><h3>${esc(title)}</h3><div class="frigate-card">${inner}</div></div>`;
}

/** Mask RTSP credentials: rtsp://user:pass@host → rtsp://[credentials]@host */
function maskRtsp(url) {
  if (!url) return '';
  return String(url).replace(/^(rtsp:\/\/)[^@]+@/, '$1[credentials]@');
}

/** Detector type → chip class */
function detectorChipClass(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'edgetpu' || t === 'coral') return 'coral';
  if (t === 'cpu') return 'cpu';
  return 'gpu'; // rocm, openvino, tensorrt
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // ── Detectors ──
  const detectors = cfg.detectors || {};
  const detectorEntries = Object.entries(detectors);
  const detectorCount = detectorEntries.length;
  const detectorCountChip = detectorCount
    ? `<span class="frigate-chip">${detectorCount} detector${detectorCount !== 1 ? 's' : ''}</span>`
    : '';

  let detectorsHtml = '';
  if (detectorEntries.length) {
    const rows = detectorEntries.map(([name, det]) => {
      const type = det && det.type ? String(det.type) : 'cpu';
      const device = det && det.device != null ? String(det.device) : '';
      const cls = detectorChipClass(type);
      return `<tr>
        <td>${esc(name)}</td>
        <td>${chip(type, cls)}</td>
        <td>${device ? esc(device) : '<span style="color:var(--fg-2,#888)">—</span>'}</td>
      </tr>`;
    }).join('');
    detectorsHtml = `<table class="frigate-table">
      <thead><tr><th>Name</th><th>Type</th><th>Device</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── MQTT ──
  const mqtt = cfg.mqtt || null;
  let mqttHtml = '';
  if (mqtt) {
    const mqttRows = [
      row('Host', mqtt.host ? chip(mqtt.host) : ''),
      row('Port', mqtt.port != null ? chip(mqtt.port) : ''),
      mqtt.user ? row('User', chip(mqtt.user)) : '',
      mqtt.password != null ? row('Password', masked()) : '',
    ].filter(Boolean).join('');
    mqttHtml = mqttRows;
  }

  // ── Cameras ──
  const cameras = cfg.cameras || {};
  const cameraEntries = Object.entries(cameras);
  const MAX_CAMS = 8;
  const displayedCams = cameraEntries.slice(0, MAX_CAMS);
  const extraCams = cameraEntries.length - MAX_CAMS;

  let camerasHtml = '';
  if (displayedCams.length) {
    const camItems = displayedCams.map(([name, camCfg]) => {
      // Extract RTSP URL from ffmpeg.inputs
      let rtspUrl = '';
      try {
        const inputs = (camCfg.ffmpeg || {}).inputs || [];
        if (Array.isArray(inputs) && inputs.length && inputs[0].path) {
          rtspUrl = maskRtsp(inputs[0].path);
        }
      } catch { /* ignore */ }

      // Collect roles from all inputs
      const roles = new Set();
      try {
        const inputs = (camCfg.ffmpeg || {}).inputs || [];
        for (const inp of inputs) {
          if (Array.isArray(inp.roles)) inp.roles.forEach((r) => roles.add(String(r)));
        }
      } catch { /* ignore */ }

      const rolesHtml = roles.size
        ? `<div class="frigate-cam-roles">${[...roles].map((r) => chip(r)).join('')}</div>`
        : '';

      return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border,#e0e0e0);">
        <div class="frigate-cam-name">${esc(name)}</div>
        ${rtspUrl ? `<div class="frigate-cam-url">${esc(rtspUrl)}</div>` : ''}
        ${rolesHtml}
      </div>`;
    }).join('');
    const more = extraCams > 0 ? `<div class="frigate-more">…and ${extraCams} more camera${extraCams !== 1 ? 's' : ''}</div>` : '';
    camerasHtml = `${camItems}${more}`;
  }

  // ── Recording ──
  const record = cfg.record || null;
  let recordHtml = '';
  if (record) {
    const enabled = record.enabled !== false;
    const retainDays = record.retain && record.retain.days != null ? record.retain.days : null;
    recordHtml = [
      row('Recording', boolChip(enabled)),
      retainDays != null ? row('Retain (days)', chip(retainDays)) : '',
    ].filter(Boolean).join('');
  }

  // ── Snapshots ──
  const snapshots = cfg.snapshots || null;
  let snapshotsHtml = '';
  if (snapshots) {
    const enabled = snapshots.enabled !== false;
    const retainDays = snapshots.retain && snapshots.retain.default != null ? snapshots.retain.default : null;
    snapshotsHtml = [
      row('Snapshots', boolChip(enabled)),
      retainDays != null ? row('Retain (days)', chip(retainDays)) : '',
    ].filter(Boolean).join('');
  }

  // ── Objects ──
  const objects = cfg.objects || null;
  let objectsHtml = '';
  if (objects && Array.isArray(objects.track) && objects.track.length) {
    objectsHtml = `<div class="frigate-chips">${objects.track.map((o) => chip(o)).join('')}</div>`;
  }

  // ── Build HTML ──
  const host = document.createElement('div');
  host.className = 'frigate-doc';

  const bodyParts = [];
  if (detectorsHtml) bodyParts.push(section('Detectors', detectorsHtml));
  if (mqttHtml) bodyParts.push(section('MQTT', mqttHtml));
  if (camerasHtml) bodyParts.push(section(`${cameraEntries.length} Camera${cameraEntries.length !== 1 ? 's' : ''}`, camerasHtml));
  if (recordHtml) bodyParts.push(section('Recording', recordHtml));
  if (snapshotsHtml) bodyParts.push(section('Snapshots', snapshotsHtml));
  if (objectsHtml) bodyParts.push(section('Object Tracking', objectsHtml));

  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="frigate-badge">Frigate</span><span class="frigate-title">Frigate NVR Config</span>${detectorCountChip ? '&nbsp;&nbsp;' + detectorCountChip : ''}
</div>
<div class="frigate-sub">Open-source AI-powered network video recorder</div>
${bodyParts.join('') || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}

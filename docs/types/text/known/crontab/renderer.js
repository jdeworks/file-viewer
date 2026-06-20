const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crntab-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.crntab-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2E7D32;color:#fff;vertical-align:middle;margin-right:8px;}
.crntab-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.crntab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.crntab-env-block{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.crntab-env-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.crntab-env-table{width:100%;border-collapse:collapse;font-size:12px;}
.crntab-env-table td{padding:3px 8px 3px 0;font-family:ui-monospace,monospace;vertical-align:top;}
.crntab-env-table td:first-child{color:var(--fg-2,#666);width:30%;white-space:nowrap;}
.crntab-table{width:100%;border-collapse:collapse;font-size:13px;}
.crntab-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:5px 8px;border-bottom:2px solid var(--border,#e0e0e0);}
.crntab-table td{padding:7px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.crntab-table tr:last-child td{border-bottom:none;}
.crntab-sched{font-family:ui-monospace,monospace;font-size:12px;color:#2E7D32;white-space:nowrap;}
.crntab-cmd{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-all;}
.crntab-human{font-size:12px;color:var(--fg-2,#555);font-style:italic;}
.crntab-empty{color:var(--fg-2,#888);font-size:13px;}
`;

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function describeCronField(val, type) {
  if (val === '*') return null; // "every" — handled at higher level
  if (val.startsWith('*/')) {
    const n = val.slice(2);
    const unit = { min: 'minute', hour: 'hour', dom: 'day', month: 'month', dow: 'day-of-week' }[type];
    return `every ${n} ${unit}${n === '1' ? '' : 's'}`;
  }
  if (type === 'dow') {
    return val.split(',').map(v => {
      if (v.includes('-')) {
        const [a, b] = v.split('-');
        return `${DOW_NAMES[+a] || a}–${DOW_NAMES[+b] || b}`;
      }
      return DOW_NAMES[+v] || v;
    }).join(', ');
  }
  if (type === 'month') {
    return val.split(',').map(v => MONTH_NAMES[+v - 1] || v).join(', ');
  }
  return val;
}

function humanizeCron(min, hour, dom, month, dow) {
  // All wildcards
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'every minute';

  const parts = [];

  // Time part
  if (min !== '*' && hour !== '*' && !min.includes('/') && !hour.includes('/')) {
    // Specific time
    const h = hour.padStart(2, '0');
    const m = min.padStart(2, '0');
    parts.push(`at ${h}:${m}`);
  } else if (min === '0' && hour !== '*') {
    const h = hour.padStart(2, '0');
    parts.push(`at ${h}:00`);
  } else if (min.startsWith('*/')) {
    parts.push(`every ${min.slice(2)} minutes`);
  } else if (hour.startsWith('*/')) {
    parts.push(`every ${hour.slice(2)} hours`);
    if (min !== '*') parts.push(`at minute ${min}`);
  } else if (min === '0' && hour === '*') {
    parts.push('every hour');
  } else {
    if (min !== '*') parts.push(`minute ${min}`);
    if (hour !== '*') parts.push(`hour ${hour}`);
  }

  // Date part
  if (dow !== '*' && dom === '*' && month === '*') {
    parts.push('on ' + describeCronField(dow, 'dow'));
  } else if (dom !== '*' && month === '*' && dow === '*') {
    parts.push(`on day ${dom}`);
  } else if (month !== '*' && dow === '*' && dom === '*') {
    parts.push('in ' + describeCronField(month, 'month'));
  } else if (dom !== '*' || month !== '*' || dow !== '*') {
    const d = [];
    if (dom !== '*') d.push(`day-of-month ${dom}`);
    if (month !== '*') d.push('month ' + describeCronField(month, 'month'));
    if (dow !== '*') d.push(describeCronField(dow, 'dow'));
    parts.push('on ' + d.join(', '));
  } else {
    // All date fields wildcard
    if (parts.length === 0) parts.push('every minute');
    else if (!parts[0].startsWith('every')) parts.unshift('daily');
  }

  return parts.join(' ') || 'every minute';
}

function parseCrontab(text) {
  const envVars = [];
  const entries = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // @shorthand
    if (line.startsWith('@')) {
      const sp = line.indexOf(' ');
      if (sp > 0) {
        const shorthand = line.slice(0, sp);
        const cmd = line.slice(sp + 1).trim();
        const humanMap = {
          '@reboot': 'at system reboot',
          '@yearly': 'yearly (Jan 1 at 00:00)',
          '@annually': 'yearly (Jan 1 at 00:00)',
          '@monthly': 'monthly (1st at 00:00)',
          '@weekly': 'weekly (Sun at 00:00)',
          '@daily': 'daily at 00:00',
          '@midnight': 'daily at 00:00',
          '@hourly': 'every hour at :00',
        };
        entries.push({ schedule: shorthand, cmd, human: humanMap[shorthand] || shorthand });
        continue;
      }
    }

    // Environment variable assignment
    const envMatch = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (envMatch) {
      envVars.push([envMatch[1], envMatch[2]]);
      continue;
    }

    // Standard 5-field cron
    const parts = line.split(/\s+/);
    if (parts.length >= 6 && /^[\d\*\/,\-]+$/.test(parts[0])) {
      const [min, hour, dom, month, dow] = parts;
      const cmd = parts.slice(5).join(' ');
      entries.push({
        schedule: `${min} ${hour} ${dom} ${month} ${dow}`,
        cmd,
        human: humanizeCron(min, hour, dom, month, dow),
      });
    }
  }

  return { envVars, entries };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const { envVars, entries } = parseCrontab(text);

  const envHtml = envVars.length
    ? `<div class="crntab-env-block">
<div class="crntab-env-hd">Environment</div>
<table class="crntab-env-table"><tbody>
${envVars.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
</tbody></table>
</div>`
    : '';

  const tableHtml = entries.length
    ? `<table class="crntab-table">
<thead><tr><th>Schedule</th><th>Command</th><th>Human description</th></tr></thead>
<tbody>
${entries.map(e => `<tr>
  <td><span class="crntab-sched">${esc(e.schedule)}</span></td>
  <td><span class="crntab-cmd">${esc(e.cmd)}</span></td>
  <td><span class="crntab-human">${esc(e.human)}</span></td>
</tr>`).join('')}
</tbody>
</table>`
    : '<p class="crntab-empty">No cron entries found.</p>';

  const host = document.createElement('div');
  host.className = 'crntab-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="crntab-title"><span class="crntab-badge">cron</span>Crontab Schedule</div>
<div class="crntab-sub">${entries.length} job${entries.length !== 1 ? 's' : ''}${envVars.length ? `, ${envVars.length} env var${envVars.length !== 1 ? 's' : ''}` : ''}</div>
${envHtml}
${tableHtml}`;

  return { parentNode: host };
}

// Apple crash log renderer (.crash classic text, .ips JSON from iOS 15+).
// Returns { bodyHtml, hadUnsafe: false } per the iframe contract.
// Pure text parsing — zero off-origin dependencies.

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:#1a1a1e;color:#d4d4d8;padding:12px;line-height:1.5}
.card{background:#27272a;border:1px solid #3f3f46;border-radius:8px;margin-bottom:12px;overflow:hidden}
.card-head{padding:10px 14px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;background:#232326;border-bottom:1px solid #3f3f46;color:#a1a1aa}
.card-body{padding:14px}
/* Hero card */
.hero{background:linear-gradient(135deg,#1e1e2e 0%,#27272a 100%);border:1px solid #52525b}
.hero-exception{font-size:18px;font-weight:700;color:#f87171;margin-bottom:6px;word-break:break-all}
.hero-code{font-family:'SF Mono',Consolas,monospace;font-size:12px;color:#fb923c;margin-bottom:10px}
.hero-meta{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:12px}
.hero-key{color:#71717a}
.hero-val{color:#e4e4e7;font-family:'SF Mono',Consolas,monospace;font-size:11px}
/* Exception card */
.exc-card{border-color:#7f1d1d;background:#1c0a0a}
.exc-card .card-head{background:#450a0a;color:#fca5a5}
.exc-type{font-size:15px;font-weight:700;color:#ef4444;margin-bottom:4px}
.exc-code{font-family:'SF Mono',Consolas,monospace;font-size:12px;color:#fbbf24;margin-bottom:4px}
.exc-note{font-size:12px;color:#a16207}
/* Thread section */
.thread-crashed .card-head{background:#431407;border-color:#9a3412;color:#fdba74}
.thread-crashed{border-color:#9a3412}
.backtrace{font-family:'SF Mono',Consolas,monospace;font-size:11px;overflow-x:auto;white-space:nowrap}
.frame{display:flex;gap:8px;padding:2px 0;align-items:baseline}
.frame:hover{background:#333}
.frame-no{color:#52525b;min-width:28px;text-align:right;flex-shrink:0}
.frame-lib{min-width:220px;flex-shrink:0;color:#94a3b8;overflow:hidden;text-overflow:ellipsis}
.frame-lib.app-frame{color:#67e8f9;font-weight:600}
.frame-addr{color:#4b5563;min-width:140px;flex-shrink:0;font-size:10px}
.frame-sym{color:#d4d4d8}
.frame-sym .sym-name{color:#c084fc}
.frame-sym .sym-offset{color:#6b7280;font-size:10px}
/* Registers */
.regs{font-family:'SF Mono',Consolas,monospace;font-size:11px;display:flex;flex-wrap:wrap;gap:4px 0}
.reg{min-width:300px;color:#a1a1aa}
.reg-name{color:#6b7280;min-width:40px;display:inline-block}
.reg-val{color:#86efac}
/* Details (collapsed sections) */
details{margin-bottom:6px}
details>summary{cursor:pointer;list-style:none;padding:8px 14px;background:#232326;border:1px solid #3f3f46;border-radius:6px;font-size:12px;font-weight:600;color:#a1a1aa;letter-spacing:.04em;text-transform:uppercase;user-select:none}
details>summary::-webkit-details-marker{display:none}
details>summary::before{content:'▶ ';font-size:10px;color:#52525b}
details[open]>summary{border-radius:6px 6px 0 0;border-bottom:none}
details[open]>summary::before{content:'▼ ';color:#52525b}
details>.detail-body{border:1px solid #3f3f46;border-top:none;border-radius:0 0 6px 6px;padding:10px 14px;background:#27272a}
/* Binary images */
.bimg{font-family:'SF Mono',Consolas,monospace;font-size:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:baseline;padding:2px 0;color:#52525b}
.bimg-range{color:#374151;min-width:320px}
.bimg-name{color:#6b7280}
.bimg-ver{color:#4b5563}
.bimg-uuid{color:#374151;font-size:9px}
.bimg-path{color:#374151}
/* Misc */
.kv-table{width:100%;border-collapse:collapse;font-size:12px}
.kv-table td{padding:3px 8px;vertical-align:top}
.kv-table td:first-child{color:#71717a;white-space:nowrap;width:1%;padding-right:16px}
.kv-table td:last-child{font-family:'SF Mono',Consolas,monospace;color:#d4d4d8;word-break:break-all}
.kv-table tr:hover td{background:#333}
.vm-section{font-family:'SF Mono',Consolas,monospace;font-size:11px;white-space:pre;overflow-x:auto;color:#52525b}
`;

// ── Parsing helpers ───────────────────────────────────────────────────────────

function getField(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'm'));
  return m?.[1]?.trim() ?? '';
}

// Parse a classic stack frame line:
//   0   libsystem_kernel.dylib   0x000000019e4c5b68 __pthread_kill + 8
function parseFrame(line) {
  const m = line.match(/^\s*(\d+)\s+(\S.*?)\s{2,}(0x[0-9a-fA-F]+)\s+(.*?)\s*$/);
  if (!m) return null;
  const [, no, lib, addr, sym] = m;
  // Split symbol from offset: "foo + 42"
  const symM = sym.match(/^(.*?)\s*\+\s*(\d+)$/);
  return { no: parseInt(no, 10), lib: lib.trim(), addr, symName: symM ? symM[1].trim() : sym.trim(), symOffset: symM ? symM[2] : '' };
}

// ── Classic (.crash) parser ───────────────────────────────────────────────────

function parseClassic(text) {
  const lines = text.split(/\r?\n/);
  const result = {
    header: {},
    exception: {},
    vmInfo: [],
    threads: [],
    registers: {},
    crashedThread: -1,
    binaryImages: [],
    rawSections: {},
  };

  // Collect header key/value pairs
  const HEADER_KEYS = ['Incident Identifier','CrashReporter Key','Hardware Model','Process','Path',
    'Identifier','Version','Code Type','Parent Process','Responsible','User ID',
    'Date/Time','OS Version','Report Version','Anonymous UUID','Sleep/Wake UUID',
    'Time Awake Since Boot','Time Since Wake','System Integrity Protection'];
  for (const k of HEADER_KEYS) {
    const v = getField(text, k);
    if (v) result.header[k] = v;
  }

  const EXCEPTION_KEYS = ['Exception Type','Exception Codes','Exception Note',
    'Exception Subtype','Termination Signal','Termination Reason','Terminating Process'];
  for (const k of EXCEPTION_KEYS) {
    const v = getField(text, k);
    if (v) result.exception[k] = v;
  }

  // Crashed thread from header
  const crashedM = text.match(/^Crashed Thread:\s*(\d+)/m);
  if (crashedM) result.crashedThread = parseInt(crashedM[1], 10);

  // Parse thread backtraces
  let i = 0;
  const threadRe = /^Thread (\d+)([^:]*):?(.*)?$/;
  const frameRe = /^\s*\d+\s+\S/;
  while (i < lines.length) {
    const line = lines[i];
    const tm = line.match(threadRe);
    if (tm && !line.startsWith('Thread') === false) {
      const threadNo = parseInt(tm[1], 10);
      const qualifier = tm[2]?.trim() || '';
      const label = tm[3]?.trim() || '';
      const isCrashed = /crashed/i.test(qualifier) || /crashed/i.test(label) || threadNo === result.crashedThread;
      const thread = { no: threadNo, label: label || qualifier || '', isCrashed, frames: [] };
      i++;
      while (i < lines.length) {
        const fl = lines[i];
        if (!fl.trim() && (lines[i + 1] || '').trim() === '') { i++; break; }
        if (!fl.trim()) { i++; continue; }
        if (threadRe.test(fl) || fl.startsWith('Binary Images') || fl.startsWith('Thread') && fl.includes(' crashed with')) break;
        if (frameRe.test(fl)) {
          const f = parseFrame(fl);
          if (f) thread.frames.push(f);
        }
        i++;
      }
      if (thread.frames.length) result.threads.push(thread);
      continue;
    }
    // Register state: "Thread N crashed with ARM Thread State..."
    if (/^Thread \d+ crashed with/.test(line)) {
      i++;
      while (i < lines.length && lines[i].trim() && !/^(Thread|Binary Images)/.test(lines[i])) {
        const rl = lines[i].trim();
        // Registers are separated by spaces: "x0: 0x... x1: 0x..."
        const pairs = rl.matchAll(/(\w+):\s*(0x[0-9a-fA-F]+|-?\d+)/g);
        for (const [, name, val] of pairs) result.registers[name] = val;
        i++;
      }
      continue;
    }
    // Binary images
    if (line.startsWith('Binary Images:')) {
      i++;
      while (i < lines.length) {
        const bl = lines[i];
        if (!bl.trim()) { i++; break; }
        // "   0x100000000 -  0x100123fff +com.example.myapp (2.3.1 - 42) <UUID> /path"
        const bm = bl.match(/^\s*(0x[0-9a-fA-F]+)\s*-\s*(0x[0-9a-fA-F]+)\s*\+?(\S+)\s+\(([^)]*)\)\s*<([^>]*)>\s*(.*)/);
        if (bm) {
          result.binaryImages.push({ start: bm[1], end: bm[2], name: bm[3], version: bm[4], uuid: bm[5], path: bm[6].trim() });
        }
        i++;
      }
      continue;
    }
    // VM Region info — keep for display
    if (line.startsWith('VM Region Info:') || line.startsWith('      REGION TYPE')) {
      result.vmInfo.push(line);
    }
    i++;
  }

  // If crashedThread wasn't explicitly marked in header, mark by checking thread labels
  if (result.crashedThread === -1) {
    for (const t of result.threads) {
      if (t.isCrashed) { result.crashedThread = t.no; break; }
    }
  }
  // Mark the crashed thread
  for (const t of result.threads) {
    if (t.no === result.crashedThread) t.isCrashed = true;
  }

  return result;
}

// ── IPS (JSON) parser ─────────────────────────────────────────────────────────

function parseIps(obj) {
  const result = {
    header: {},
    exception: {},
    vmInfo: [],
    threads: [],
    registers: {},
    crashedThread: -1,
    binaryImages: [],
    rawSections: {},
  };

  const ci = obj.crashInfo || {};
  const exc = ci.exception || {};

  result.header['Process'] = obj.procName || obj.processName || '';
  result.header['Version'] = obj.bundleVersion || obj.appVersion || '';
  result.header['Hardware Model'] = obj.modelCode || obj.model || '';
  result.header['OS Version'] = obj.osVersion || '';
  result.header['Date/Time'] = obj.captureTime || '';
  result.header['Identifier'] = obj.bundleID || '';
  result.header['Code Type'] = obj.cpuType || '';

  result.exception['Exception Type'] = exc.type || ci.exceptionType || '';
  result.exception['Exception Codes'] = exc.codes || ci.exceptionCodes || '';
  result.exception['Exception Note'] = ci.exceptionNote || '';
  result.exception['Termination Reason'] = ci.terminationReason || '';

  result.crashedThread = obj.faultingThread ?? ci.faultingThread ?? -1;

  // Parse threads
  const rawThreads = obj.threads || [];
  for (let ti = 0; ti < rawThreads.length; ti++) {
    const rt = rawThreads[ti];
    const isCrashed = rt.triggered || ti === result.crashedThread;
    const thread = { no: ti, label: rt.name || rt.queue || '', isCrashed, frames: [] };
    for (let fi = 0; fi < (rt.frames || []).length; fi++) {
      const rf = rt.frames[fi];
      // IPS frames reference binary images by index
      const img = (obj.usedImages || [])[rf.imageIndex];
      thread.frames.push({
        no: fi,
        lib: img?.name || img?.path?.split('/').pop() || `image[${rf.imageIndex}]`,
        addr: '0x' + ((BigInt(img?.base || 0) + BigInt(rf.imageOffset || 0)).toString(16)),
        symName: rf.symbol || rf.symbolName || '',
        symOffset: String(rf.symbolLocation || rf.symbolOffset || ''),
      });
    }
    result.threads.push(thread);
  }

  // Binary images
  for (const img of obj.usedImages || []) {
    result.binaryImages.push({
      start: '0x' + BigInt(img.base || 0).toString(16),
      end: '',
      name: img.name || img.path?.split('/').pop() || '',
      version: img.version || img.bundleVersion || '',
      uuid: img.uuid || '',
      path: img.path || '',
    });
  }

  return result;
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function buildHeroCard(parsed) {
  const h = parsed.header;
  const e = parsed.exception;
  const excType = e['Exception Type'] || '';
  const excCode = e['Exception Codes'] || '';
  const process = h['Process'] || '';
  const version = h['Version'] || '';
  const hw = h['Hardware Model'] || '';
  const os = h['OS Version'] || '';
  const date = h['Date/Time'] || '';
  const crashed = parsed.crashedThread >= 0 ? `Thread ${parsed.crashedThread}` : '';

  return `<div class="card hero">
  <div class="card-body">
    <div class="hero-exception">${esc(excType)}</div>
    ${excCode ? `<div class="hero-code">${esc(excCode)}</div>` : ''}
    <div class="hero-meta">
      ${process ? `<span class="hero-key">Process</span><span class="hero-val">${esc(process)}</span>` : ''}
      ${version ? `<span class="hero-key">Version</span><span class="hero-val">${esc(version)}</span>` : ''}
      ${crashed ? `<span class="hero-key">Crashed Thread</span><span class="hero-val">${esc(crashed)}</span>` : ''}
      ${hw ? `<span class="hero-key">Device</span><span class="hero-val">${esc(hw)}</span>` : ''}
      ${os ? `<span class="hero-key">OS</span><span class="hero-val">${esc(os)}</span>` : ''}
      ${date ? `<span class="hero-key">Date</span><span class="hero-val">${esc(date)}</span>` : ''}
    </div>
  </div>
</div>`;
}

function buildExceptionCard(exc) {
  const excType = exc['Exception Type'] || '';
  const excCode = exc['Exception Codes'] || '';
  const excNote = exc['Exception Note'] || '';
  const termSig = exc['Termination Signal'] || '';
  const termReason = exc['Termination Reason'] || '';
  const termProc = exc['Terminating Process'] || '';

  const rows = [
    ['Exception Type', excType],
    ['Exception Codes', excCode],
    ['Exception Note', excNote],
    ['Termination Signal', termSig],
    ['Termination Reason', termReason],
    ['Terminating Process', termProc],
  ].filter(([, v]) => v);

  if (!rows.length) return '';

  return `<div class="card exc-card">
  <div class="card-head">Exception</div>
  <div class="card-body">
    <div class="exc-type">${esc(excType)}</div>
    ${excCode ? `<div class="exc-code">${esc(excCode)}</div>` : ''}
    ${excNote ? `<div class="exc-note">${esc(excNote)}</div>` : ''}
    ${(termSig || termReason || termProc) ? `<table class="kv-table" style="margin-top:8px">
      ${rows.filter(([k]) => !['Exception Type','Exception Codes','Exception Note'].includes(k))
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
    </table>` : ''}
  </div>
</div>`;
}

function buildFrame(frame, processName) {
  const appName = (processName || '').replace(/\s*\[\d+\]$/, '').trim();
  const isApp = appName && (frame.lib === appName || frame.lib.startsWith(appName));
  const libCls = 'frame-lib' + (isApp ? ' app-frame' : '');
  return `<div class="frame">
  <span class="frame-no">${frame.no}</span>
  <span class="${libCls}" title="${esc(frame.lib)}">${esc(frame.lib.length > 30 ? frame.lib.slice(0, 28) + '..' : frame.lib)}</span>
  <span class="frame-addr">${esc(frame.addr)}</span>
  <span class="frame-sym"><span class="sym-name">${esc(frame.symName)}</span>${frame.symOffset ? ` <span class="sym-offset">+ ${esc(frame.symOffset)}</span>` : ''}</span>
</div>`;
}

function buildThreadCard(thread, processName, collapsed) {
  const label = thread.label ? ` — ${thread.label}` : '';
  const crashLabel = thread.isCrashed ? ' Crashed' : '';
  const headTitle = `Thread ${thread.no}${crashLabel}${label}`;
  const frames = thread.frames.map((f) => buildFrame(f, processName)).join('');
  const backtrace = `<div class="backtrace">${frames}</div>`;

  if (!collapsed) {
    // Expanded (crashed thread)
    return `<div class="card${thread.isCrashed ? ' thread-crashed' : ''}">
  <div class="card-head">${esc(headTitle)}</div>
  <div class="card-body">${backtrace}</div>
</div>`;
  }

  // Collapsed (other threads)
  return `<details>
  <summary>${esc(headTitle)}</summary>
  <div class="detail-body">${backtrace}</div>
</details>`;
}

function buildRegistersCard(registers) {
  const entries = Object.entries(registers);
  if (!entries.length) return '';
  const regs = entries.map(([k, v]) => `<span class="reg"><span class="reg-name">${esc(k)}:</span> <span class="reg-val">${esc(v)}</span></span>`).join('  ');
  return `<details>
  <summary>CPU Registers</summary>
  <div class="detail-body"><div class="regs">${regs}</div></div>
</details>`;
}

function buildHeaderCard(header) {
  const skip = new Set(['Process','Version','Hardware Model','OS Version','Date/Time',
    'Exception Type','Exception Codes','Exception Note','Termination Signal',
    'Termination Reason','Terminating Process','Incident Identifier']);
  const rows = Object.entries(header)
    .filter(([k]) => !skip.has(k) && k !== 'Crashed Thread')
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  if (!rows) return '';
  return `<details>
  <summary>Report Details</summary>
  <div class="detail-body"><table class="kv-table">${rows}</table></div>
</details>`;
}

function buildBinaryImages(images) {
  if (!images.length) return '';
  const rows = images.map((img) =>
    `<div class="bimg">
      <span class="bimg-range">${esc(img.start)}${img.end ? ' – ' + esc(img.end) : ''}</span>
      <span class="bimg-name">${esc(img.name)}</span>
      <span class="bimg-ver">${img.version ? '(' + esc(img.version) + ')' : ''}</span>
      <span class="bimg-uuid">${img.uuid ? '&lt;' + esc(img.uuid) + '&gt;' : ''}</span>
      <span class="bimg-path">${esc(img.path)}</span>
    </div>`
  ).join('');
  return `<details>
  <summary>Binary Images (${images.length})</summary>
  <div class="detail-body">${rows}</div>
</details>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const filename = (intake.filename || '').toLowerCase();

  let parsed;

  // Try JSON (.ips) first
  if (filename.endsWith('.ips') || (text.trimStart().startsWith('{') && text.includes('"crashInfo"'))) {
    try {
      const obj = JSON.parse(text);
      if (obj.crashInfo || obj.threads) {
        parsed = parseIps(obj);
      }
    } catch { /* fall through to classic */ }
  }

  if (!parsed) {
    parsed = parseClassic(text);
  }

  const processName = parsed.header['Process'] || '';

  // Find crashed thread
  const crashedThread = parsed.threads.find((t) => t.isCrashed) || parsed.threads[0];
  const otherThreads = parsed.threads.filter((t) => t !== crashedThread);

  const parts = [
    buildHeroCard(parsed),
    buildExceptionCard(parsed.exception),
    crashedThread ? buildThreadCard(crashedThread, processName, false) : '',
    ...otherThreads.map((t) => buildThreadCard(t, processName, true)),
    buildRegistersCard(parsed.registers),
    buildHeaderCard(parsed.header),
    buildBinaryImages(parsed.binaryImages),
  ];

  const bodyHtml = `<style>${CSS}</style>${parts.join('\n')}`;
  return { bodyHtml, hadUnsafe: false };
}

// .msg Outlook email renderer
// Uses the parentNode contract because we embed an srcdoc iframe for HTML email bodies.
// Returns { parentNode: HTMLElement, revoke() {} }

function vendor(filename) {
  return new URL(`../../../vendor/${filename}`, import.meta.url).href;
}

let cfbLoadPromise = null;
async function loadCFB() {
  if (cfbLoadPromise) return cfbLoadPromise;
  cfbLoadPromise = new Promise((resolve, reject) => {
    const url = vendor('cfb.min.js');
    if (document.querySelector(`script[src="${url}"]`)) {
      // Already injected — wait briefly for it to execute
      setTimeout(resolve, 50);
      return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load cfb.min.js'));
    document.head.appendChild(s);
  });
  return cfbLoadPromise;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function findProp(cfb, tag) {
  const suffixes = ['001F', '001E', '0102', '0000'];
  for (const suf of suffixes) {
    const entry = CFB.find(cfb, `/__substg1.0_${tag}${suf}`);
    if (entry?.content?.length) return { content: entry.content, suffix: suf };
  }
  return null;
}

function bytes(content) {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return Uint8Array.from(content || []);
}

function decodeString(content, suffix) {
  if (!content?.length) return '';
  const data = bytes(content);
  if (suffix === '001F') {
    return new TextDecoder('utf-16le').decode(data).replace(/\0+$/, '');
  }
  return Array.from(data).map(b => String.fromCharCode(b)).join('').replace(/\0+$/, '');
}

function getProp(cfb, tag) {
  const found = findProp(cfb, tag);
  if (!found) return '';
  return decodeString(found.content, found.suffix);
}

// Minimal HTML sanitizer: strip script/style tags and on* event attributes
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

function findAttachments(cfb) {
  const attachments = [];
  const seen = new Set();
  for (const path of (cfb.FullPaths || [])) {
    // Match paths like /__attach_#XXXXXXXX
    const m = path.match(/\/__attach_#([0-9A-Fa-f]+)\//);
    if (!m) continue;
    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);

    const prefix = `/__attach_#${key}`;
    // Try to get filename: PR_ATTACH_FILENAME (3704) or PR_ATTACH_LONG_FILENAME (3707)
    let filename = getProp(cfb, '3707');  // long filename first
    if (!filename) filename = getProp(cfb, '3704');
    // Fallback: check within the subfolder
    if (!filename) {
      const suffixes = ['001F', '001E', '0000'];
      for (const suf of suffixes) {
        const e = CFB.find(cfb, `${prefix}/__substg1.0_3707${suf}`);
        if (e?.content?.length) { filename = decodeString(e.content, suf); break; }
      }
    }
    if (!filename) {
      for (const suf of ['001F', '001E', '0000']) {
        const e = CFB.find(cfb, `${prefix}/__substg1.0_3704${suf}`);
        if (e?.content?.length) { filename = decodeString(e.content, suf); break; }
      }
    }
    attachments.push({ filename: filename || `attachment-${key}` });
  }
  return attachments;
}

const STYLE = `
  *{box-sizing:border-box}
  body{margin:0;padding:16px;font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#fff)}
  .msg-header{background:var(--bg2,#f5f5f5);border:1px solid var(--border,#ddd);border-radius:6px;padding:14px 16px;margin-bottom:14px}
  .msg-subject{font-size:16px;font-weight:700;color:var(--fg,#1a1a1a);margin:0 0 10px 0;line-height:1.3}
  .msg-meta{display:grid;grid-template-columns:60px 1fr;gap:4px 10px;font-size:12px}
  .msg-label{color:var(--fg2,#666);font-weight:500;padding-top:1px}
  .msg-value{color:var(--fg,#1a1a1a);word-break:break-word}
  .msg-banner{background:#fff8e1;border:1px solid #f9c440;border-radius:4px;padding:8px 12px;font-size:12px;color:#7a5c00;margin-bottom:12px}
  .msg-body-section{margin-bottom:14px}
  .msg-body-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#888);border-bottom:1px solid var(--border,#ddd);padding-bottom:4px;margin-bottom:8px}
  .msg-body-pre{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,monospace;font-size:12px;background:var(--bg2,#f9f9f9);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:12px;margin:0;max-height:600px;overflow:auto}
  .msg-body-iframe{width:100%;min-height:300px;border:1px solid var(--border,#ddd);border-radius:4px}
  .msg-attach{list-style:none;margin:0;padding:0}
  .msg-attach li{padding:5px 0;font-size:13px;border-bottom:1px solid var(--border,#eee)}
  .msg-attach li:last-child{border-bottom:none}
  .msg-err{background:#fdf2f2;border:1px solid #e8b4b4;color:#c0392b;border-radius:4px;padding:12px;font-size:12px;white-space:pre-wrap}
  .msg-badge{display:inline-block;background:var(--accent,#4a90d9);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:12px;letter-spacing:.04em}
`;

export async function render(intake) {
  await loadCFB();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:0;height:100%;overflow:auto';

  // Inline styles (no shadow DOM needed — this mounts directly in previewHost)
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  wrap.appendChild(styleEl);

  const inner = document.createElement('div');
  inner.style.cssText = 'padding:16px;font-family:system-ui,sans-serif;font-size:13px';
  wrap.appendChild(inner);

  const badge = document.createElement('div');
  badge.className = 'msg-badge';
  badge.textContent = 'Outlook Email (.msg)';
  inner.appendChild(badge);

  let cfb;
  try {
    cfb = CFB.read(intake.bytes, { type: 'array' });
  } catch (e) {
    const errDiv = document.createElement('div');
    errDiv.className = 'msg-err';
    errDiv.textContent = 'Failed to parse .msg file: ' + e.message;
    inner.appendChild(errDiv);
    return { parentNode: wrap, revoke() {} };
  }

  // Extract fields
  const subject    = getProp(cfb, '0037');
  const senderName = getProp(cfb, '0042');
  const senderMail = getProp(cfb, '0C1F');
  const displayTo  = getProp(cfb, '0E04');
  const displayCc  = getProp(cfb, '0E03');
  const htmlBody   = getProp(cfb, '1013');
  const plainBody  = getProp(cfb, '1000');

  // Header card
  const header = document.createElement('div');
  header.className = 'msg-header';

  if (subject) {
    const subj = document.createElement('div');
    subj.className = 'msg-subject';
    subj.textContent = subject;
    header.appendChild(subj);
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  function addRow(label, value) {
    if (!value) return;
    const lEl = document.createElement('div');
    lEl.className = 'msg-label';
    lEl.textContent = label;
    meta.appendChild(lEl);
    const vEl = document.createElement('div');
    vEl.className = 'msg-value';
    vEl.textContent = value;
    meta.appendChild(vEl);
  }

  const fromStr = [senderName, senderMail ? `<${senderMail}>` : ''].filter(Boolean).join(' ');
  addRow('From', fromStr || senderMail || senderName);
  addRow('To', displayTo);
  addRow('CC', displayCc);

  header.appendChild(meta);
  inner.appendChild(header);

  // Attachment-content banner
  const attachments = findAttachments(cfb);
  if (attachments.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'msg-banner';
    banner.textContent = 'Attachment content not extracted — attachment names are listed below.';
    inner.appendChild(banner);
  }

  // Body
  if (htmlBody) {
    const bodySection = document.createElement('div');
    bodySection.className = 'msg-body-section';
    const bodyLabel = document.createElement('div');
    bodyLabel.className = 'msg-body-label';
    bodyLabel.textContent = 'Message';
    bodySection.appendChild(bodyLabel);

    const safe = sanitizeHtml(htmlBody);
    const iframe = document.createElement('iframe');
    iframe.className = 'msg-body-iframe';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.srcdoc = safe;
    iframe.onload = function() {
      try {
        const h = iframe.contentDocument?.body?.scrollHeight;
        if (h) iframe.style.height = Math.min(h + 20, 800) + 'px';
      } catch (_) {}
    };
    bodySection.appendChild(iframe);
    inner.appendChild(bodySection);
  } else if (plainBody) {
    const bodySection = document.createElement('div');
    bodySection.className = 'msg-body-section';
    const bodyLabel = document.createElement('div');
    bodyLabel.className = 'msg-body-label';
    bodyLabel.textContent = 'Message';
    bodySection.appendChild(bodyLabel);

    const pre = document.createElement('pre');
    pre.className = 'msg-body-pre';
    pre.textContent = plainBody;
    bodySection.appendChild(pre);
    inner.appendChild(bodySection);
  }

  // Attachments list
  if (attachments.length > 0) {
    const attSection = document.createElement('div');
    attSection.className = 'msg-body-section';
    const attLabel = document.createElement('div');
    attLabel.className = 'msg-body-label';
    attLabel.textContent = `Attachments (${attachments.length})`;
    attSection.appendChild(attLabel);

    const ul = document.createElement('ul');
    ul.className = 'msg-attach';
    for (const att of attachments) {
      const li = document.createElement('li');
      li.textContent = '📎 ' + att.filename;
      ul.appendChild(li);
    }
    attSection.appendChild(ul);
    inner.appendChild(attSection);
  }

  return { parentNode: wrap, revoke() {} };
}

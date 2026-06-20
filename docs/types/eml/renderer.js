// Email (.eml) preview — parentNode contract.
// Header panel + body (HTML in sandboxed srcdoc iframe, plain text as <pre>) + attachments list.
// No external deps: uses the shared mime.js MIME parser and inline DOM construction.
// CSS lives in docs/assets/preview.css (.eml-* classes).
import { extractMessage } from './mime.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Strip external resource references from HTML for safety (cid: is fine to leave; it just won't load).
// External http/https src/href attributes on img/link/script tags are blanked.
function stripExternalResources(html) {
  return html
    .replace(/(<(?:img|source|video|audio|track|iframe|embed|object)[^>]*\s)src\s*=\s*(?:"https?:[^"]*"|'https?:[^']*'|https?:\S+)/gi,
      '$1src=""')
    .replace(/(<link[^>]*\s)href\s*=\s*(?:"https?:[^"]*"|'https?:[^']*'|https?:\S+)/gi,
      '$1href=""');
}

// Minimal sanitizer: strip <script> blocks and on* event handlers.
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'eml-wrap';

  const msg = extractMessage(intake.text || '');

  // ── Header panel ──────────────────────────────────────────────────────────
  const headTable = document.createElement('table');
  headTable.className = 'eml-head';

  const headerFields = [
    ['From',       msg.from],
    ['To',         msg.to],
    ['Cc',         msg.cc],
    ['Bcc',        msg.bcc],
    ['Subject',    msg.subject],
    ['Date',       msg.date],
    ['Message-ID', msg.messageId],
  ];
  for (const [label, value] of headerFields) {
    if (!value) continue;
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = value;
    tr.appendChild(th);
    tr.appendChild(td);
    headTable.appendChild(tr);
  }
  wrap.appendChild(headTable);

  // ── Attachments badge (below headers) ─────────────────────────────────────
  if (msg.attachments.length > 0) {
    const attRow = document.createElement('div');
    attRow.className = 'eml-att';
    const count = msg.attachments.length;
    attRow.textContent = '📎 ' + count + ' attachment' + (count > 1 ? 's' : '')
      + ': ' + msg.attachments.map((a) => a.filename).join(', ');
    wrap.appendChild(attRow);
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  const sep = document.createElement('hr');
  sep.className = 'eml-sep';
  wrap.appendChild(sep);

  // ── Body ──────────────────────────────────────────────────────────────────
  if (msg.html != null) {
    // HTML body in a nested sandboxed iframe (no allow-scripts)
    const notice = document.createElement('div');
    notice.className = 'eml-sandbox-notice';
    notice.textContent = 'HTML content sandboxed — scripts and external resources blocked.';
    wrap.appendChild(notice);

    const safe = stripExternalResources(sanitizeHtml(msg.html));
    const iframe = document.createElement('iframe');
    iframe.className = 'eml-body-iframe';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.srcdoc = safe;
    iframe.onload = function () {
      try {
        const h = iframe.contentDocument?.documentElement?.scrollHeight
          || iframe.contentDocument?.body?.scrollHeight;
        if (h) iframe.style.height = Math.min(h + 24, 800) + 'px';
      } catch (_) {}
    };
    const htmlWrap = document.createElement('div');
    htmlWrap.className = 'eml-html';
    htmlWrap.appendChild(iframe);
    wrap.appendChild(htmlWrap);
  } else {
    const pre = document.createElement('pre');
    pre.className = 'eml-plain';
    pre.textContent = msg.plain || '(no text body)';
    wrap.appendChild(pre);
  }

  // ── Attachments list ──────────────────────────────────────────────────────
  if (msg.attachments.length > 0) {
    const attSep = document.createElement('hr');
    attSep.className = 'eml-sep';
    wrap.appendChild(attSep);

    const attHead = document.createElement('div');
    attHead.className = 'eml-att-heading';
    attHead.textContent = 'Attachments (' + msg.attachments.length + ')';
    wrap.appendChild(attHead);

    const ul = document.createElement('ul');
    ul.className = 'eml-att-list';
    for (const att of msg.attachments) {
      const li = document.createElement('li');
      li.className = 'eml-att-item';
      const name = document.createElement('span');
      name.className = 'eml-att-name';
      name.textContent = '📎 ' + att.filename;
      li.appendChild(name);
      const meta = document.createElement('span');
      meta.className = 'eml-att-meta';
      const parts = [];
      if (att.type) parts.push(att.type);
      if (att.size) parts.push(fmtBytes(att.size));
      meta.textContent = parts.join(' · ');
      li.appendChild(meta);
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
  }

  return { parentNode: wrap };
}

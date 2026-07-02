// Email (.eml) preview — parentNode contract.
// Header panel + body (HTML in sandboxed srcdoc iframe, plain text as <pre>) + attachments list.
// Uses the shared mime.js MIME parser, inline DOM construction, and the vendored DOMPurify for
// HTML-body sanitization (mail HTML is fully untrusted — this is a common phishing vector).
// CSS lives in docs/assets/preview.css (.eml-* classes).
import { extractMessage } from './mime.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';

// Sanitize an untrusted HTML mail body for display in the sandboxed srcdoc iframe. The iframe's
// `sandbox="allow-same-origin"` (no allow-scripts) already blocks script execution, but resource
// loading (images, CSS backgrounds, etc.) happens regardless of sandboxing — so external requests
// (classic email tracking pixels) must be blocked here, not relied on the sandbox for.
//  - FORBID_TAGS/FORBID_ATTR cover every DOMPurify-default-allowed vector that can trigger an
//    eager off-origin fetch we don't control: <style>/style="" (CSS url()), background=/poster=
//    (legacy + <video> poster), <link>/<meta>/<base> (a <base href> would turn even a *relative*
//    <img src> into an off-origin request), and <iframe>/<video>/<audio>/<source>/<track>/
//    <object>/<embed>/<form> (all DOMPurify-allowed by default, all capable of an eager
//    off-origin request or off-origin form POST).
//  - The only fetch-capable element DOMPurify still allows by default is <img src> (we don't
//    resolve cid: attachment references to blob URLs, so there's no legitimate reason for an
//    external image to load) — any absolute http(s) src is blanked afterward.
async function sanitizeMailHtml(html) {
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
  });
  return clean.replace(
    /(<img[^>]*\s)src\s*=\s*(?:"https?:[^"]*"|'https?:[^']*'|https?:\S+)/gi,
    '$1src=""',
  );
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

    const safe = await sanitizeMailHtml(msg.html);
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

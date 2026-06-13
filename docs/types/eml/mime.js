// Minimal RFC 822 / MIME parser for .eml messages. Pure client-side, no dependency:
// header unfolding, encoded-words (=?charset?B/Q?...?=), transfer decodings (base64,
// quoted-printable), and multipart bodies. Good enough to display real mail; not a full
// RFC implementation.

function splitHeaderBody(text) {
  const m = text.match(/\r?\n\r?\n/);
  if (!m) return { head: text, body: '' };
  return { head: text.slice(0, m.index), body: text.slice(m.index + m[0].length) };
}

function parseHeaders(head) {
  const unfolded = head.replace(/\r?\n[ \t]+/g, ' ');     // RFC 822 folding
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    headers[name] = headers[name] === undefined ? val : headers[name] + ', ' + val;
  }
  return headers;
}

function parseContentType(v) {
  if (!v) return { type: 'text/plain', params: {} };
  const [type, ...rest] = v.split(';');
  const params = {};
  for (const p of rest) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    params[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  return { type: type.trim().toLowerCase(), params };
}

function bytesFromQP(s, keepUnderscore) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /[0-9A-Fa-f]{2}/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else if (!keepUnderscore && s[i] === '_') bytes.push(0x20);
    else bytes.push(s.charCodeAt(i) & 0xff);
  }
  return Uint8Array.from(bytes);
}

function decodeBytes(bytes, charset) {
  try { return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(bytes); }
  catch { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); }
}

function decodeTransfer(body, encoding, charset) {
  encoding = (encoding || '').toLowerCase();
  if (encoding === 'base64') {
    try { return decodeBytes(Uint8Array.from(atob(body.replace(/\s+/g, '')), (c) => c.charCodeAt(0)), charset); }
    catch { return body; }
  }
  if (encoding === 'quoted-printable') return decodeBytes(bytesFromQP(body.replace(/=\r?\n/g, ''), true), charset);
  return body;
}

// Decode MIME encoded-words in a header value.
export function decodeWords(s) {
  if (!s) return s;
  return s.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (whole, charset, enc, data) => {
    try {
      const bytes = enc.toUpperCase() === 'B'
        ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
        : bytesFromQP(data, false);
      return decodeBytes(bytes, charset);
    } catch { return whole; }
  });
}

function splitMultipart(body, boundary) {
  const parts = [];
  const delim = '--' + boundary;
  let cur = null;
  for (const line of body.split(/\r?\n/)) {
    if (line === delim || line === delim + '--') {
      if (cur !== null) parts.push(cur.join('\n'));
      cur = line === delim + '--' ? null : [];
    } else if (cur !== null) cur.push(line);
  }
  return parts;
}

function parsePart(text) {
  const { head, body } = splitHeaderBody(text);
  const headers = parseHeaders(head);
  const ct = parseContentType(headers['content-type']);
  const part = { headers, contentType: ct.type, params: ct.params };
  if (ct.type.startsWith('multipart/') && ct.params.boundary) {
    part.parts = splitMultipart(body, ct.params.boundary).map(parsePart);
  } else {
    part.content = decodeTransfer(body, headers['content-transfer-encoding'], ct.params.charset);
    const disp = headers['content-disposition'] || '';
    const fname = ct.params.name || (disp.match(/filename="?([^";]+)"?/) || [])[1];
    if (/^attachment/i.test(disp) || (fname && !ct.type.startsWith('text/'))) {
      part.attachment = { filename: fname || '(unnamed)', type: ct.type, size: body.replace(/\s+/g, '').length };
    }
  }
  return part;
}

// Flatten a parsed message to a displayable body + header summary + attachments.
export function extractMessage(text) {
  const root = parsePart(text);
  let html = null, plain = null;
  const attachments = [];
  (function walk(p) {
    if (p.attachment) { attachments.push(p.attachment); return; }
    if (p.parts) { p.parts.forEach(walk); return; }
    if (p.contentType === 'text/html' && html === null) html = p.content;
    else if (p.contentType === 'text/plain' && plain === null) plain = p.content;
  })(root);
  const h = root.headers;
  return {
    from: decodeWords(h.from || ''), to: decodeWords(h.to || ''), cc: decodeWords(h.cc || ''),
    subject: decodeWords(h.subject || ''), date: h.date || '',
    html, plain, attachments,
  };
}

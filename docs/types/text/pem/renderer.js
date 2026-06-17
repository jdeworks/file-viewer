// PEM / DER certificate / key renderer
import { fmtDate, parseCertificate, parsePemFile, rdnToString } from './asn1.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── HTML rendering helpers ────────────────────────────────────────────────────
const STYLES = `
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.5 system-ui, sans-serif; padding: 16px; max-width: 720px; margin: 0 auto; color: #1e293b; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; margin-right:4px; }
  .badge-cert { background:#dbeafe; color:#1e40af; }
  .badge-key { background:#fef3c7; color:#92400e; }
  .badge-csr { background:#f3e8ff; color:#7e22ce; }
  .badge-pkcs7 { background:#e0f2fe; color:#0369a1; }
  .badge-other { background:#f1f5f9; color:#475569; }
  .badge-expired { background:#fee2e2; color:#991b1b; }
  .badge-valid { background:#dcfce7; color:#166534; }
  .badge-expiring { background:#fef9c3; color:#854d0e; }
  .badge-ca { background:#ede9fe; color:#5b21b6; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 16px; }
  .card + .card { margin-top: 12px; }
  .card-title { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  h2 { margin: 0; font-size: 15px; }
  .section { margin: 12px 0; }
  .section h3 { font-size:11px; text-transform:uppercase; color:#6b7280; letter-spacing:.06em; margin:0 0 6px; }
  .row { display:flex; gap:8px; margin:3px 0; font-size:13px; }
  .row .k { color:#6b7280; min-width:90px; flex-shrink:0; }
  .row .v { word-break:break-all; }
  .sans { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
  .san-tag { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:3px; padding:1px 6px; font-size:12px; font-family:monospace; }
  .mono { font-family:monospace; font-size:11px; color:#64748b; word-break:break-all; }
  .err { background:#fff1f2; border:1px solid #fecaca; border-radius:6px; padding:12px; color:#b91c1c; font-size:13px; }
  .raw-pem { font-family:monospace; font-size:11px; white-space:pre-wrap; word-break:break-all; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:10px; margin-top:8px; color:#475569; max-height:300px; overflow:auto; }
  .multi-info { color:#6b7280; font-size:12px; margin-bottom:8px; }
</style>
`;

function badgeForType(pemType) {
  const t = pemType.toUpperCase();
  if (t.includes('CERTIFICATE REQUEST') || t.includes('NEW CERTIFICATE REQUEST')) return ['badge-csr', 'CSR'];
  if (t.includes('CERTIFICATE')) return ['badge-cert', 'Certificate'];
  if (t.includes('PRIVATE KEY')) return ['badge-key', 'Private Key'];
  if (t.includes('PUBLIC KEY')) return ['badge-key', 'Public Key'];
  if (t.includes('PKCS7') || t.includes('PKCS #7') || t === 'CMS') return ['badge-pkcs7', 'PKCS#7'];
  return ['badge-other', pemType];
}

function renderCertBlock(block) {
  const { type, bytes, error } = block;
  const [badgeClass, badgeLabel] = badgeForType(type);

  if (error || !bytes) {
    return `<div class="card">
  <div class="card-title"><span class="badge ${badgeClass}">${esc(badgeLabel)}</span><h2>${esc(type)}</h2></div>
  <div class="err">Could not parse: ${esc(error || 'Unknown error')}</div>
</div>`;
  }

  // Try to parse as certificate
  const isCert = type.includes('CERTIFICATE') && !type.includes('REQUEST');
  const isCSR = type.includes('CERTIFICATE REQUEST') || type.includes('NEW CERTIFICATE REQUEST');
  const isKey = type.includes('KEY');

  if (isKey) {
    return renderKeyBlock(block, badgeClass, badgeLabel);
  }

  if (!isCert && !isCSR) {
    return renderRawBlock(block, badgeClass, badgeLabel);
  }

  try {
    const cert = parseCertificate(bytes);
    return renderCertInfo(cert, type, block, badgeClass, badgeLabel, isCSR);
  } catch (e) {
    return `<div class="card">
  <div class="card-title"><span class="badge ${badgeClass}">${esc(badgeLabel)}</span><h2>${esc(type)}</h2></div>
  <div class="err">Could not parse certificate structure: ${esc(e.message)}</div>
  <div class="raw-pem">${esc(formatPemForDisplay(type, bytes))}</div>
</div>`;
  }
}

function formatPemForDisplay(type, bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

function renderCertInfo(cert, type, block, badgeClass, badgeLabel, isCSR) {
  const now = Date.now();
  const expiredMs = cert.notAfter ? cert.notAfter.getTime() : null;
  const expiringSoonMs = expiredMs ? expiredMs - 30 * 24 * 60 * 60 * 1000 : null;

  let validityBadge = '';
  if (!isCSR && expiredMs !== null) {
    if (now > expiredMs) {
      validityBadge = '<span class="badge badge-expired">EXPIRED</span>';
    } else if (expiringSoonMs !== null && now > expiringSoonMs) {
      validityBadge = '<span class="badge badge-expiring">EXPIRING SOON</span>';
    } else {
      validityBadge = '<span class="badge badge-valid">Valid</span>';
    }
  }

  const caBadge = cert.exts.isCA === true ? '<span class="badge badge-ca">CA</span>' : '';

  const subjectStr = rdnToString(cert.subject);
  const issuerStr = rdnToString(cert.issuer);
  const isSelfSigned = subjectStr === issuerStr;

  let keyStr = '';
  if (cert.keyInfo) {
    if (cert.keyInfo.type === 'RSA' && cert.keyInfo.bits) {
      keyStr = `RSA ${cert.keyInfo.bits}-bit`;
    } else if (cert.keyInfo.type === 'EC') {
      keyStr = `EC${cert.keyInfo.curve ? ' (' + cert.keyInfo.curve + ')' : ''}${cert.keyInfo.bits ? ' ' + cert.keyInfo.bits + '-bit' : ''}`;
    } else {
      keyStr = cert.keyInfo.type || 'Unknown';
    }
  }

  const sans = cert.exts.sans;
  const sansHtml = sans.length > 0
    ? `<div class="section">
  <h3>Subject Alternative Names (${sans.length})</h3>
  <div class="sans">${sans.map((s) => `<span class="san-tag">${esc(s)}</span>`).join('')}</div>
</div>`
    : '';

  const ekusHtml = cert.exts.ekus.length > 0
    ? `<div class="row"><span class="k">Key Usage</span><span class="v">${esc(cert.exts.ekus.join(', '))}</span></div>`
    : '';

  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    ${caBadge}${validityBadge}
    <h2>${esc(cert.subject.CN || subjectStr || type)}</h2>
  </div>
  <div class="section">
    <h3>Subject</h3>
    <div class="row"><span class="k">Common Name</span><span class="v">${esc(cert.subject.CN || '—')}</span></div>
    ${cert.subject.O ? `<div class="row"><span class="k">Organization</span><span class="v">${esc(cert.subject.O)}</span></div>` : ''}
    ${cert.subject.C ? `<div class="row"><span class="k">Country</span><span class="v">${esc(cert.subject.C)}</span></div>` : ''}
    ${Object.entries(cert.subject).filter(([k]) => !['CN','O','C','OU','L','ST'].includes(k)).map(([k,v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
  </div>
  ${!isCSR ? `<div class="section">
    <h3>Issuer</h3>
    <div class="row"><span class="k">Common Name</span><span class="v">${esc(cert.issuer.CN || rdnToString(cert.issuer) || '—')}</span></div>
    ${cert.issuer.O ? `<div class="row"><span class="k">Organization</span><span class="v">${esc(cert.issuer.O)}</span></div>` : ''}
    ${isSelfSigned ? '<div class="row"><span class="k"></span><span class="v" style="color:#6b7280;font-style:italic">Self-signed</span></div>' : ''}
  </div>` : ''}
  ${!isCSR ? `<div class="section">
    <h3>Validity</h3>
    <div class="row"><span class="k">Not Before</span><span class="v">${esc(fmtDate(cert.notBefore))}</span></div>
    <div class="row"><span class="k">Not After</span><span class="v">${esc(fmtDate(cert.notAfter))}</span></div>
  </div>` : ''}
  <div class="section">
    <h3>Details</h3>
    ${keyStr ? `<div class="row"><span class="k">Public Key</span><span class="v">${esc(keyStr)}</span></div>` : ''}
    ${cert.sigAlgName ? `<div class="row"><span class="k">Algorithm</span><span class="v">${esc(cert.sigAlgName)}</span></div>` : ''}
    ${!isCSR && cert.serial ? `<div class="row"><span class="k">Serial</span><span class="v mono">${esc(cert.serial)}</span></div>` : ''}
    ${!isCSR ? `<div class="row"><span class="k">Version</span><span class="v">v${cert.version}</span></div>` : ''}
    ${ekusHtml}
  </div>
  ${sansHtml}
</div>`;
}

function renderKeyBlock(block, badgeClass, badgeLabel) {
  const { type } = block;
  // Determine key type from header
  let keyTypeDesc = type;
  if (type.includes('RSA')) keyTypeDesc = 'RSA Private Key';
  else if (type.includes('EC')) keyTypeDesc = 'EC Private Key';
  else if (type === 'PRIVATE KEY') keyTypeDesc = 'Private Key (PKCS#8)';
  else if (type === 'PUBLIC KEY') keyTypeDesc = 'Public Key (PKCS#8)';
  else if (type === 'ENCRYPTED PRIVATE KEY') keyTypeDesc = 'Encrypted Private Key';

  const sizeInfo = block.bytes ? `${block.bytes.length} bytes DER` : '';

  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    <h2>${esc(keyTypeDesc)}</h2>
  </div>
  <div class="section">
    <div class="row"><span class="k">Type</span><span class="v">${esc(type)}</span></div>
    ${sizeInfo ? `<div class="row"><span class="k">Size</span><span class="v">${esc(sizeInfo)}</span></div>` : ''}
  </div>
  <p style="color:#6b7280;font-size:12px;margin:8px 0 0">Raw key material is not displayed for security.</p>
</div>`;
}

function renderRawBlock(block, badgeClass, badgeLabel) {
  const { type } = block;
  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    <h2>${esc(type)}</h2>
  </div>
  <div class="section">
    <div class="row"><span class="k">Type</span><span class="v">${esc(type)}</span></div>
    ${block.bytes ? `<div class="row"><span class="k">Size</span><span class="v">${block.bytes.length} bytes</span></div>` : ''}
  </div>
</div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export async function render(intake) {
  const text = intake.text || '';
  const bytes = intake.bytes;

  try {
    // Check if it's PEM text
    const hasPemHeader = text.includes('-----BEGIN ');

    if (!hasPemHeader && bytes && bytes[0] === 0x30) {
      // Raw DER input — treat as single certificate
      const block = { type: 'CERTIFICATE', bytes };
      const cardsHtml = renderCertBlock(block);
      return { bodyHtml: STYLES + cardsHtml, hadUnsafe: false };
    }

    if (!hasPemHeader) {
      return {
        bodyHtml: STYLES + `<div class="err">Not a recognized PEM or DER file. No PEM headers found and data does not start with ASN.1 SEQUENCE.</div>`,
        hadUnsafe: false,
      };
    }

    const blocks = parsePemFile(text);
    if (blocks.length === 0) {
      return {
        bodyHtml: STYLES + `<div class="err">No PEM blocks found in file.</div>`,
        hadUnsafe: false,
      };
    }

    const multiInfo = blocks.length > 1
      ? `<div class="multi-info">${blocks.length} PEM blocks in this file</div>`
      : '';

    const cardsHtml = blocks.map(renderCertBlock).join('');
    return { bodyHtml: STYLES + multiInfo + cardsHtml, hadUnsafe: false };
  } catch (e) {
    return {
      bodyHtml: STYLES + `<div class="err">Render error: ${esc(e.message)}</div>`,
      hadUnsafe: false,
    };
  }
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gpgcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gpgcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0093DD;color:#fff;vertical-align:middle;margin-right:8px}
.gpgcfg-title{font-size:18px;font-weight:700;margin:0 0 10px;display:flex;align-items:center;gap:6px}
.gpgcfg-key-chip{display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#e8f0fe;color:#1a3f9e;border:1px solid #b3c8f9;font-family:ui-monospace,monospace;margin:0 0 14px}
.gpgcfg-sec{margin:14px 0}
.gpgcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.gpgcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.gpgcfg-row{display:flex;align-items:baseline;gap:10px;padding:3px 0;font-size:13px}
.gpgcfg-row:not(:last-child){border-bottom:1px solid var(--border,#e0e0e0)}
.gpgcfg-key{min-width:180px;color:var(--fg-2,#888);font-size:12px}
.gpgcfg-val{font:13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f)}
.gpgcfg-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.gpgcfg-pill{font:11px ui-monospace,monospace;padding:2px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.gpgcfg-pill-green{background:#dafbe1;border-color:#a3f0b5;color:#1a7f37}
.gpgcfg-pill-blue{background:#e8f4fd;border-color:#90cef4;color:#0969da}
.gpgcfg-pill-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
`;

function parseGpgConf(text) {
  const result = {
    defaultKey: null,
    defaultRecipientSelf: false,
    useAgent: false,
    keyserver: null,
    keyserverOptions: [],
    certDigestAlgo: null,
    digestAlgo: null,
    cipherAlgo: null,
    compressAlgo: null,
    keyidFormat: null,
    noEmitVersion: false,
    noComments: false,
    fixedListMode: false,
    armor: false,
    personalCipherPrefs: null,
    personalDigestPrefs: null,
    defaultPrefList: null,
    withFingerprint: false,
    requireCrossCertification: false,
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;

    if (/^default-key\s+/i.test(line)) {
      result.defaultKey = line.replace(/^default-key\s+/i, '').trim();
    } else if (/^default-recipient-self\s*$/i.test(line)) {
      result.defaultRecipientSelf = true;
    } else if (/^use-agent\s*$/i.test(line)) {
      result.useAgent = true;
    } else if (/^keyserver\s+/i.test(line)) {
      result.keyserver = line.replace(/^keyserver\s+/i, '').trim();
    } else if (/^keyserver-options\s+/i.test(line)) {
      const opt = line.replace(/^keyserver-options\s+/i, '').trim();
      if (opt) result.keyserverOptions.push(opt);
    } else if (/^cert-digest-algo\s+/i.test(line)) {
      result.certDigestAlgo = line.replace(/^cert-digest-algo\s+/i, '').trim();
    } else if (/^digest-algo\s+/i.test(line)) {
      result.digestAlgo = line.replace(/^digest-algo\s+/i, '').trim();
    } else if (/^cipher-algo\s+/i.test(line)) {
      result.cipherAlgo = line.replace(/^cipher-algo\s+/i, '').trim();
    } else if (/^compress-algo\s+/i.test(line)) {
      result.compressAlgo = line.replace(/^compress-algo\s+/i, '').trim();
    } else if (/^keyid-format\s+/i.test(line)) {
      result.keyidFormat = line.replace(/^keyid-format\s+/i, '').trim();
    } else if (/^no-emit-version\s*$/i.test(line)) {
      result.noEmitVersion = true;
    } else if (/^no-comments\s*$/i.test(line)) {
      result.noComments = true;
    } else if (/^fixed-list-mode\s*$/i.test(line)) {
      result.fixedListMode = true;
    } else if (/^armor\s*$/i.test(line)) {
      result.armor = true;
    } else if (/^personal-cipher-preferences\s+/i.test(line)) {
      result.personalCipherPrefs = line.replace(/^personal-cipher-preferences\s+/i, '').trim();
    } else if (/^personal-digest-preferences\s+/i.test(line)) {
      result.personalDigestPrefs = line.replace(/^personal-digest-preferences\s+/i, '').trim();
    } else if (/^default-preference-list\s+/i.test(line)) {
      result.defaultPrefList = line.replace(/^default-preference-list\s+/i, '').trim();
    } else if (/^with-fingerprint\s*$/i.test(line)) {
      result.withFingerprint = true;
    } else if (/^require-cross-certification\s*$/i.test(line)) {
      result.requireCrossCertification = true;
    }
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = parseGpgConf(text);

  const host = document.createElement('div');
  host.className = 'gpgcfg-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="gpgcfg-title"><span class="gpgcfg-badge">GnuPG</span>gpg.conf</div>`;

  // Default key chip
  if (cfg.defaultKey) {
    const truncated = cfg.defaultKey.length > 8 ? '…' + cfg.defaultKey.slice(-8) : cfg.defaultKey;
    html += `<div><span class="gpgcfg-key-chip">Default key: ${esc(truncated)}</span></div>`;
  }

  // Keyserver
  if (cfg.keyserver) {
    html += `<div class="gpgcfg-sec"><h3>Key Server</h3><div class="gpgcfg-card">`;
    html += `<div class="gpgcfg-row"><span class="gpgcfg-key">URL</span><span class="gpgcfg-val">${esc(cfg.keyserver)}</span></div>`;
    html += `</div></div>`;
  }

  // Algorithm settings
  {
    const algoRows = [];
    if (cfg.cipherAlgo) algoRows.push(['Cipher', cfg.cipherAlgo]);
    if (cfg.digestAlgo) algoRows.push(['Digest', cfg.digestAlgo]);
    if (cfg.certDigestAlgo) algoRows.push(['Cert digest', cfg.certDigestAlgo]);
    if (cfg.compressAlgo) algoRows.push(['Compression', cfg.compressAlgo]);
    if (cfg.keyidFormat) algoRows.push(['Key ID format', cfg.keyidFormat]);

    if (algoRows.length) {
      html += `<div class="gpgcfg-sec"><h3>Algorithm Settings</h3><div class="gpgcfg-card">`;
      for (const [label, val] of algoRows) {
        html += `<div class="gpgcfg-row"><span class="gpgcfg-key">${esc(label)}</span><span class="gpgcfg-val">${esc(val)}</span></div>`;
      }
      html += `</div></div>`;
    }
  }

  // Personal preferences
  if (cfg.personalCipherPrefs || cfg.personalDigestPrefs) {
    html += `<div class="gpgcfg-sec"><h3>Personal Preferences</h3><div class="gpgcfg-card">`;
    if (cfg.personalCipherPrefs) {
      const prefs = cfg.personalCipherPrefs.split(/\s+/).filter(Boolean);
      html += `<div class="gpgcfg-row"><span class="gpgcfg-key">Cipher prefs</span><span><div class="gpgcfg-pills">`;
      for (const p of prefs) html += `<span class="gpgcfg-pill">${esc(p)}</span>`;
      html += `</div></span></div>`;
    }
    if (cfg.personalDigestPrefs) {
      const prefs = cfg.personalDigestPrefs.split(/\s+/).filter(Boolean);
      html += `<div class="gpgcfg-row"><span class="gpgcfg-key">Digest prefs</span><span><div class="gpgcfg-pills">`;
      for (const p of prefs) html += `<span class="gpgcfg-pill">${esc(p)}</span>`;
      html += `</div></span></div>`;
    }
    html += `</div></div>`;
  }

  // Behavioral flags
  {
    const flags = [];
    if (cfg.useAgent) flags.push({ label: 'use-agent', cls: 'gpgcfg-pill-green' });
    if (cfg.armor) flags.push({ label: 'armor', cls: 'gpgcfg-pill-blue' });
    if (cfg.defaultRecipientSelf) flags.push({ label: 'default-recipient-self', cls: 'gpgcfg-pill-blue' });
    if (cfg.withFingerprint) flags.push({ label: 'with-fingerprint', cls: 'gpgcfg-pill-blue' });
    if (cfg.requireCrossCertification) flags.push({ label: 'require-cross-certification', cls: 'gpgcfg-pill-green' });
    if (cfg.fixedListMode) flags.push({ label: 'fixed-list-mode', cls: 'gpgcfg-pill-gray' });
    if (cfg.noEmitVersion) flags.push({ label: 'no-emit-version', cls: 'gpgcfg-pill-gray' });
    if (cfg.noComments) flags.push({ label: 'no-comments', cls: 'gpgcfg-pill-gray' });

    if (flags.length) {
      html += `<div class="gpgcfg-sec"><h3>Behavioral Flags</h3>`;
      html += `<div class="gpgcfg-pills">`;
      for (const { label, cls } of flags) {
        html += `<span class="gpgcfg-pill ${cls}">${esc(label)}</span>`;
      }
      html += `</div></div>`;
    }
  }

  // Keyserver options
  if (cfg.keyserverOptions.length) {
    html += `<div class="gpgcfg-sec"><h3>Keyserver Options</h3>`;
    html += `<div class="gpgcfg-pills">`;
    for (const opt of cfg.keyserverOptions) {
      html += `<span class="gpgcfg-pill">${esc(opt)}</span>`;
    }
    html += `</div></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}

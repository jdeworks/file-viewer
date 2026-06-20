import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rusttoolchain-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rusttoolchain-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:2px;}
.rusttoolchain-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b7410e;color:#fff;vertical-align:middle;margin-right:4px;}
.rusttoolchain-title{font-size:18px;font-weight:700;}
.rusttoolchain-subtitle{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.rusttoolchain-sec{margin:12px 0;}
.rusttoolchain-sec h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 7px;}
.rusttoolchain-chips{display:flex;flex-wrap:wrap;gap:6px;}
.rusttoolchain-chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rusttoolchain-chip.nightly{background:#f3e8ff;border-color:#c084fc;color:#581c87;}
.rusttoolchain-chip.stable{background:#dcfce7;border-color:#86efac;color:#14532d;}
.rusttoolchain-chip.beta{background:#fff7ed;border-color:#fdba74;color:#7c2d12;}
.rusttoolchain-chip.version{background:#eff6ff;border-color:#93c5fd;color:#1e3a5f;}
.rusttoolchain-chip.profile{background:#fefce8;border-color:#fde047;color:#713f12;}
`;

function channelClass(channel) {
  if (!channel) return '';
  const c = String(channel).toLowerCase();
  if (c.startsWith('nightly')) return 'nightly';
  if (c === 'stable') return 'stable';
  if (c === 'beta') return 'beta';
  return 'version';
}

function shortenTarget(t) {
  // Shorten common target triples for display
  const map = {
    'x86_64-unknown-linux-gnu': 'x86_64-linux',
    'x86_64-unknown-linux-musl': 'x86_64-linux-musl',
    'aarch64-unknown-linux-gnu': 'aarch64-linux',
    'x86_64-apple-darwin': 'x86_64-darwin',
    'aarch64-apple-darwin': 'aarch64-darwin',
    'x86_64-pc-windows-msvc': 'x86_64-windows',
    'wasm32-unknown-unknown': 'wasm32',
    'wasm32-wasi': 'wasm32-wasi',
    'thumbv7em-none-eabihf': 'thumbv7em-eabihf',
  };
  return map[t] || t;
}

export function render(intake) {
  const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isPlainFormat = n === 'rust-toolchain';

  let channel = null;
  let components = [];
  let targets = [];
  let profile = null;

  if (isPlainFormat) {
    // Plain text format: just a channel string like "nightly-2024-01-15" or "stable"
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    channel = text.trim().split('\n')[0].trim();
  } else {
    // TOML format: parse intake.text
    let parsed = {};
    try {
      if (intake.parsed && typeof intake.parsed === 'object') {
        parsed = intake.parsed;
      } else {
        parsed = parseTOML(intake.text || '') || {};
      }
    } catch { parsed = {}; }
    const toolchain = parsed.toolchain || {};
    channel = toolchain.channel || null;
    profile = toolchain.profile || null;
    components = Array.isArray(toolchain.components) ? toolchain.components : [];
    targets = Array.isArray(toolchain.targets) ? toolchain.targets : [];
  }

  const cls = channelClass(channel);

  const channelSection = channel
    ? `<div class="rusttoolchain-sec"><h3>Channel</h3><div class="rusttoolchain-chips">
        <span class="rusttoolchain-chip ${cls}">${esc(channel)}</span>
        ${profile ? `<span class="rusttoolchain-chip profile">profile: ${esc(profile)}</span>` : ''}
      </div></div>`
    : '';

  const componentsSection = components.length
    ? `<div class="rusttoolchain-sec"><h3>Components</h3><div class="rusttoolchain-chips">
        ${components.map((c) => `<span class="rusttoolchain-chip">${esc(c)}</span>`).join('')}
      </div></div>`
    : '';

  const targetsSection = targets.length
    ? `<div class="rusttoolchain-sec"><h3>Targets</h3><div class="rusttoolchain-chips">
        ${targets.map((t) => `<span class="rusttoolchain-chip" title="${esc(t)}">${esc(shortenTarget(t))}</span>`).join('')}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rusttoolchain-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rusttoolchain-header">
  <span class="rusttoolchain-badge">rust-toolchain</span>
  <span class="rusttoolchain-title">${isPlainFormat ? 'rust-toolchain' : 'rust-toolchain.toml'}</span>
</div>
<div class="rusttoolchain-subtitle">Rust toolchain pinning</div>
${channelSection}
${componentsSection}
${targetsSection}`;

  return { parentNode: host };
}

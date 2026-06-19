const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lic-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lic-badge{display:inline-block;padding:6px 18px;border-radius:14px;font-size:22px;font-weight:800;letter-spacing:.01em;margin-bottom:10px;}
.lic-badge.mit{background:#dbeafe;color:#1d4ed8;border:2px solid #93c5fd;}
.lic-badge.apache{background:#fef3c7;color:#92400e;border:2px solid #fcd34d;}
.lic-badge.gpl{background:#dcfce7;color:#166534;border:2px solid #86efac;}
.lic-badge.lgpl{background:#f0fdf4;color:#166534;border:2px solid #86efac;}
.lic-badge.bsd{background:#ede9fe;color:#5b21b6;border:2px solid #c4b5fd;}
.lic-badge.isc{background:#fff7ed;color:#9a3412;border:2px solid #fdba74;}
.lic-badge.mpl{background:#fdf4ff;color:#7e22ce;border:2px solid #e879f9;}
.lic-badge.cc0{background:#f0f9ff;color:#075985;border:2px solid #7dd3fc;}
.lic-badge.unlicense{background:#f8fafc;color:#334155;border:2px solid #94a3b8;}
.lic-badge.unknown{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:2px solid var(--border,#e0e0e0);}
.lic-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lic-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lic-meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;}
.lic-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.lic-label{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;font-family:normal;}
.lic-text{margin:0;padding:12px 14px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;max-height:400px;overflow-y:auto;color:var(--fg,#24292f);}
`;

const LICENSES = [
  { id: 'MIT', label: 'MIT', spdx: 'MIT', cls: 'mit', test: (t) => /MIT License|Permission is hereby granted, free of charge/i.test(t) },
  { id: 'Apache-2.0', label: 'Apache 2.0', spdx: 'Apache-2.0', cls: 'apache', test: (t) => /Apache License/i.test(t) && /Version 2\.0/i.test(t) },
  { id: 'GPL-3.0', label: 'GPL v3', spdx: 'GPL-3.0', cls: 'gpl', test: (t) => /GNU GENERAL PUBLIC LICENSE/i.test(t) && /Version 3/i.test(t) },
  { id: 'GPL-2.0', label: 'GPL v2', spdx: 'GPL-2.0', cls: 'gpl', test: (t) => /GNU GENERAL PUBLIC LICENSE/i.test(t) && /Version 2/i.test(t) },
  { id: 'LGPL', label: 'LGPL', spdx: 'LGPL-2.1', cls: 'lgpl', test: (t) => /GNU LESSER GENERAL PUBLIC/i.test(t) },
  { id: 'BSD-3-Clause', label: 'BSD 3-Clause', spdx: 'BSD-3-Clause', cls: 'bsd', test: (t) => /3-Clause/i.test(t) || /Neither the name of/i.test(t) },
  { id: 'BSD-2-Clause', label: 'BSD 2-Clause', spdx: 'BSD-2-Clause', cls: 'bsd', test: (t) => /2-Clause/i.test(t) || /FreeBSD/i.test(t) || (/Redistribution and use in source and binary forms/i.test(t) && !/Neither the name of/i.test(t) && !/3-Clause/i.test(t)) },
  { id: 'ISC', label: 'ISC', spdx: 'ISC', cls: 'isc', test: (t) => /ISC License/i.test(t) || /Permission to use, copy, modify/i.test(t) },
  { id: 'MPL-2.0', label: 'MPL 2.0', spdx: 'MPL-2.0', cls: 'mpl', test: (t) => /Mozilla Public License/i.test(t) },
  { id: 'CC0-1.0', label: 'CC0', spdx: 'CC0-1.0', cls: 'cc0', test: (t) => /CC0|Creative Commons Zero/i.test(t) },
  { id: 'Unlicense', label: 'The Unlicense', spdx: 'Unlicense', cls: 'unlicense', test: (t) => /This is free and unencumbered software/i.test(t) },
];

function detectLicense(text) {
  for (const lic of LICENSES) {
    if (lic.test(text)) return lic;
  }
  return { id: 'Unknown', label: 'Unknown License', spdx: null, cls: 'unknown' };
}

function extractCopyright(text) {
  const m = text.match(/Copyright\s*(?:\(c\)|©)?\s*(\d{4}(?:\s*[-–]\s*\d{4})?)\s+(.+)/i);
  if (!m) return null;
  return { year: m[1].trim(), holder: m[2].trim().replace(/\s*All rights reserved\.?$/i, '').trim() };
}

export function render(intake) {
  const text = intake.text || '';
  const lic = detectLicense(text);
  const copyright = extractCopyright(text);

  const metaChips = [];
  if (lic.spdx) metaChips.push(`<span class="lic-chip"><span class="lic-label">SPDX</span>${esc(lic.spdx)}</span>`);
  if (copyright) {
    metaChips.push(`<span class="lic-chip"><span class="lic-label">Year</span>${esc(copyright.year)}</span>`);
    metaChips.push(`<span class="lic-chip"><span class="lic-label">Copyright</span>${esc(copyright.holder)}</span>`);
  }

  const host = document.createElement('div');
  host.className = 'lic-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lic-badge ${esc(lic.cls)}">${esc(lic.label)}</div>
<div class="lic-sub">${lic.id !== 'Unknown' ? 'Identified license' : 'License type could not be identified'}</div>
${metaChips.length ? `<div class="lic-meta">${metaChips.join('')}</div>` : ''}
<pre class="lic-text">${esc(text)}</pre>`;
  return { parentNode: host };
}

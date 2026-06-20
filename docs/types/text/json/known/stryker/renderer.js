const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.stryker-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-stryker{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9b1c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.stryker-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.stryker-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.stryker-sec{margin:14px 0;}
.stryker-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.stryker-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.stryker-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.stryker-kv-k{color:var(--fg-2,#888);min-width:160px;font:12px/1.6 ui-monospace,monospace;}
.stryker-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.stryker-chips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.stryker-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.stryker-chip.reporter{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.stryker-chip.mutator{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6;}
.stryker-threshold{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-family:ui-monospace,monospace;}
.stryker-bar{height:8px;width:80px;border-radius:4px;background:var(--bg-2,#e5e7eb);overflow:hidden;display:inline-block;vertical-align:middle;}
.stryker-bar-fill{height:100%;border-radius:4px;}
.stryker-thr-row{display:flex;align-items:center;gap:10px;margin:4px 0;font-size:13px;}
.stryker-thr-lbl{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);min-width:80px;}
`;

function bar(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  const color = n >= 80 ? '#16a34a' : n >= 60 ? '#ca8a04' : '#dc2626';
  return `<span class="stryker-bar"><span class="stryker-bar-fill" style="width:${n}%;background:${color};"></span></span> <span>${n}%</span>`;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="stryker-kv"><span class="stryker-kv-k">${esc(label)}</span><span class="stryker-kv-v">${esc(value)}</span></div>`;
}

function chips(items, cls) {
  if (!items || !items.length) return '';
  return `<div class="stryker-chips">${items.map((i) => `<span class="stryker-chip ${cls || ''}">${esc(String(i))}</span>`).join('')}</div>`;
}

export function render(intake) {
  let cfg;
  try {
    cfg = intake.parsed ?? JSON.parse(intake.text || '{}');
  } catch {
    const host = document.createElement('div');
    host.className = 'stryker-doc';
    host.innerHTML = `<style>${CSS}</style><div class="stryker-title"><span class="badge-stryker">Stryker</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  // Test runner
  const testRunner = cfg.testRunner || '';
  const nodeArgs = Array.isArray(cfg.testRunnerNodeArgs) ? cfg.testRunnerNodeArgs : [];
  const coverageAnalysis = cfg.coverageAnalysis || '';

  // Mutate / files
  const mutate = Array.isArray(cfg.mutate) ? cfg.mutate : (typeof cfg.mutate === 'string' ? [cfg.mutate] : []);
  const files = Array.isArray(cfg.files) ? cfg.files : [];

  // Included mutations / plugins
  const includedMutations = (() => {
    if (Array.isArray(cfg.mutator?.includedMutations)) return cfg.mutator.includedMutations;
    if (Array.isArray(cfg.mutator?.plugins)) return cfg.mutator.plugins;
    if (Array.isArray(cfg.plugins)) return cfg.plugins;
    return [];
  })();

  // Reporters
  const reporters = Array.isArray(cfg.reporters) ? cfg.reporters : [];

  // Thresholds
  const thr = cfg.thresholds || {};
  const thrHigh = thr.high != null ? thr.high : null;
  const thrLow = thr.low != null ? thr.low : null;
  const thrBreak = thr.break != null ? thr.break : null;

  // Timeouts
  const timeoutMS = cfg.timeoutMS != null ? cfg.timeoutMS : null;
  const timeoutFactor = cfg.timeoutFactor != null ? cfg.timeoutFactor : null;
  const disableTypeChecks = cfg.disableTypeChecks != null ? String(cfg.disableTypeChecks) : null;

  // Ignore patterns
  const ignorePatterns = Array.isArray(cfg.ignorePatterns) ? cfg.ignorePatterns : [];
  const ignoreStatic = Array.isArray(cfg.ignoreStatic) ? cfg.ignoreStatic : [];

  // Sub-summary
  const subParts = [];
  if (testRunner) subParts.push(`runner: ${testRunner}`);
  if (reporters.length) subParts.push(`reporters: ${reporters.join(', ')}`);
  if (thrHigh != null) subParts.push(`threshold: ${thrHigh}%`);

  const runnerHtml = (testRunner || coverageAnalysis || nodeArgs.length) ? `
<div class="stryker-sec"><h3>Test runner</h3><div class="stryker-card">
${kv('testRunner', testRunner)}
${kv('coverageAnalysis', coverageAnalysis)}
${nodeArgs.length ? kv('testRunnerNodeArgs', nodeArgs.join(' ')) : ''}
</div></div>` : '';

  const mutateHtml = mutate.length ? `
<div class="stryker-sec"><h3>Mutate patterns (${mutate.length})</h3>
${chips(mutate, '')}
</div>` : '';

  const filesHtml = files.length ? `
<div class="stryker-sec"><h3>Files (${files.length})</h3>
${chips(files, '')}
</div>` : '';

  const mutatorHtml = includedMutations.length ? `
<div class="stryker-sec"><h3>Included mutators (${includedMutations.length})</h3>
${chips(includedMutations, 'mutator')}
</div>` : '';

  const reportersHtml = reporters.length ? `
<div class="stryker-sec"><h3>Reporters</h3>
${chips(reporters, 'reporter')}
</div>` : '';

  const thrHtml = (thrHigh != null || thrLow != null || thrBreak != null) ? `
<div class="stryker-sec"><h3>Thresholds</h3><div class="stryker-card">
${thrHigh != null ? `<div class="stryker-thr-row"><span class="stryker-thr-lbl">high</span>${bar(thrHigh)}</div>` : ''}
${thrLow != null ? `<div class="stryker-thr-row"><span class="stryker-thr-lbl">low</span>${bar(thrLow)}</div>` : ''}
${thrBreak != null ? `<div class="stryker-thr-row"><span class="stryker-thr-lbl">break</span><span style="font-size:12px;font-family:ui-monospace,monospace;">${esc(thrBreak)}</span></div>` : ''}
</div></div>` : '';

  const timeoutHtml = (timeoutMS != null || timeoutFactor != null || disableTypeChecks != null) ? `
<div class="stryker-sec"><h3>Timeouts &amp; misc</h3><div class="stryker-card">
${timeoutMS != null ? kv('timeoutMS', timeoutMS + ' ms') : ''}
${timeoutFactor != null ? kv('timeoutFactor', timeoutFactor) : ''}
${disableTypeChecks != null ? kv('disableTypeChecks', disableTypeChecks) : ''}
</div></div>` : '';

  const ignoreHtml = (ignorePatterns.length || ignoreStatic.length) ? `
<div class="stryker-sec"><h3>Ignore</h3>
${ignorePatterns.length ? chips(ignorePatterns, '') : ''}
${ignoreStatic.length ? chips(ignoreStatic, '') : ''}
</div>` : '';

  const host = document.createElement('div');
  host.className = 'stryker-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-stryker">Stryker</span>
  <span class="stryker-title">Stryker mutation testing</span>
</div>
<div class="stryker-sub">${esc(subParts.join(' · ') || 'Mutation testing configuration')}</div>
${runnerHtml}${mutateHtml}${filesHtml}${mutatorHtml}${reportersHtml}${thrHtml}${timeoutHtml}${ignoreHtml}`;

  return { parentNode: host };
}

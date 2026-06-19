function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(intake) {
  const src = (intake.text || intake.textSample || '').trim();
  const lines = src.split(/\r?\n/);

  const stages = [];
  const ports = new Set();
  const envVars = [];
  const runCommands = [];
  const labels = {};
  let currentStage = null;
  const securityWarnings = [];
  let continuation = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();
    // Handle line continuations
    while (line.endsWith('\\') && i + 1 < lines.length) {
      line = line.slice(0, -1) + ' ' + lines[++i].trimStart();
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('FROM ')) {
      const rest = trimmed.slice(5).trim();
      const asMatch = rest.match(/^(.+?)\s+AS\s+(\S+)$/i);
      if (asMatch) {
        currentStage = { image: asMatch[1].trim(), alias: asMatch[2].trim(), instrs: 0 };
      } else {
        currentStage = { image: rest, alias: null, instrs: 0 };
      }
      stages.push(currentStage);
    } else if (upper.startsWith('EXPOSE ')) {
      const portStr = trimmed.slice(7).trim();
      portStr.split(/\s+/).forEach(p => ports.add(p));
    } else if (upper.startsWith('ENV ')) {
      const rest = trimmed.slice(4).trim();
      // ENV KEY=VALUE or ENV KEY VALUE
      const eqMatch = rest.match(/^(\w+)=(.*)$/);
      if (eqMatch) {
        envVars.push({ key: eqMatch[1], val: eqMatch[2] });
      } else {
        const spMatch = rest.match(/^(\w+)\s+(.*)$/);
        if (spMatch) envVars.push({ key: spMatch[1], val: spMatch[2] });
      }
    } else if (upper.startsWith('LABEL ')) {
      const rest = trimmed.slice(6).trim();
      const pairs = rest.matchAll(/(\w[\w.-]*)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+)/g);
      for (const [, k, v] of pairs) {
        labels[k] = v.replace(/^["']|["']$/g, '');
      }
    } else if (upper.startsWith('RUN ')) {
      const cmd = trimmed.slice(4).trim();
      if (runCommands.length < 8) runCommands.push(cmd.slice(0, 80) + (cmd.length > 80 ? '…' : ''));
    } else if (upper.startsWith('USER ')) {
      const user = trimmed.slice(5).trim().split(/[:@]/)[0];
      if (user === 'root' || user === '0') {
        securityWarnings.push('Container runs as <strong>root</strong> (USER root)');
      }
    }
    if (currentStage) currentStage.instrs++;
  }

  const isMultiStage = stages.length > 1;
  const stageHtml = stages.map((s, i) => {
    const alias = s.alias ? ` <span style="color:#388e3c;font-size:0.85rem">AS ${esc(s.alias)}</span>` : '';
    return `<div class="df-stage"><span class="df-stage-num">Stage ${i + 1}</span> <code>${esc(s.image)}</code>${alias}</div>`;
  }).join('');

  const portHtml = [...ports].length
    ? [...ports].map(p => `<span class="df-port">${esc(p)}</span>`).join(' ')
    : '<em style="color:#90a4ae">none</em>';

  const envHtml = envVars.length
    ? envVars.slice(0, 10).map(e => `<div class="meta-row"><span class="meta-key">${esc(e.key)}</span><span class="meta-val">${esc(e.val)}</span></div>`).join('')
    : '';

  const labelHtml = Object.entries(labels).length
    ? Object.entries(labels).slice(0, 8).map(([k, v]) =>
        `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
      ).join('')
    : '';

  const runHtml = runCommands.length
    ? runCommands.map(c => `<div class="df-run"><code>${esc(c)}</code></div>`).join('')
    : '';

  const warnHtml = securityWarnings.length
    ? `<div class="df-warn-box">${securityWarnings.map(w => `<div class="df-warn">⚠ ${w}</div>`).join('')}</div>`
    : '';

  const metaRows = [
    ['Stages', `${stages.length}${isMultiStage ? ' (multi-stage)' : ''}`],
    stages[0] ? ['Base image', stages[0].image] : null,
    ['Exposed ports', null],
  ].filter(Boolean);

  const overviewHtml = `
    <div class="meta-row"><span class="meta-key">Stages</span><span class="meta-val">${stages.length}${isMultiStage ? ' <span style="color:#607d8b;font-size:0.85rem">(multi-stage)</span>' : ''}</span></div>
    ${stages[0] ? `<div class="meta-row"><span class="meta-key">Base image</span><span class="meta-val"><code>${esc(stages[0].image)}</code></span></div>` : ''}
    <div class="meta-row"><span class="meta-key">Exposed ports</span><span class="meta-val">${portHtml}</span></div>
  `;

  return {
    bodyHtml: `
      <style>
        .badge-dockerfile { background: #1565c0; color: #fff; }
        .df-stage { margin: 4px 0; padding: 4px 8px; background: #e3f2fd; border-radius: 4px; font-size: 0.9rem; }
        .df-stage-num { font-weight: bold; color: #1565c0; margin-right: 6px; }
        .df-port { display:inline-block; background:#e8f5e9; color:#2e7d32; border-radius:3px; padding:1px 6px; margin:2px; font-family:monospace; font-size:0.85rem; }
        .df-run { margin:3px 0; font-size:0.8rem; background:#f5f5f5; border-left:3px solid #90a4ae; padding:3px 8px; border-radius:2px; }
        .df-warn-box { margin:8px 0; }
        .df-warn { background:#fff3e0; border-left:4px solid #f57c00; color:#e65100; padding:6px 10px; margin:4px 0; border-radius:3px; font-size:0.85rem; }
      </style>
      <div class="badge-row"><span class="badge badge-dockerfile">Dockerfile</span>${isMultiStage ? '<span class="badge" style="background:#37474f;color:#fff;margin-left:4px">multi-stage</span>' : ''}</div>
      ${warnHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${overviewHtml}
      </div>
      ${stages.length > 1 ? `<div class="meta-section"><h4 class="meta-section-title">Stages</h4>${stageHtml}</div>` : ''}
      ${envHtml ? `<div class="meta-section"><h4 class="meta-section-title">Environment Variables</h4>${envHtml}</div>` : ''}
      ${labelHtml ? `<div class="meta-section"><h4 class="meta-section-title">Labels</h4>${labelHtml}</div>` : ''}
      ${runHtml ? `<div class="meta-section"><h4 class="meta-section-title">RUN Commands (first 8)</h4>${runHtml}</div>` : ''}
    `,
    hadUnsafe: false,
  };
}

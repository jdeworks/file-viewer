function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const FEATURE_COLORS = {
  gene: '#1565c0', mRNA: '#2e7d32', exon: '#e65100', CDS: '#c62828',
  transcript: '#6a1b9a', UTR: '#00838f', intron: '#546e7a',
  region: '#37474f', chromosome: '#37474f',
};

function getColor(type) {
  return FEATURE_COLORS[type] || '#607d8b';
}

export function render(intake) {
  const { text, textSample } = intake;
  const src = text || textSample || '';

  const lines = src.split(/\r?\n/);
  const features = [];
  const seqnames = new Set();
  const featureTypes = {};
  let version = '?';
  const directives = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith('##')) {
      const d = line.slice(2).trim();
      if (d.startsWith('gff-version')) version = d.replace(/^gff-version\s*/i, '').trim();
      else if (d.startsWith('sequence-region')) directives.push(d);
      continue;
    }
    if (line.startsWith('#')) continue;

    const cols = line.split('\t');
    if (cols.length < 9) continue;

    const [seqname, source, type, start, end, score, strand, phase, attrs] = cols;
    seqnames.add(seqname);
    featureTypes[type] = (featureTypes[type] || 0) + 1;
    if (features.length < 1000) {
      features.push({ seqname, source, type, start: parseInt(start) || 0, end: parseInt(end) || 0, strand, attrs });
    }
  }

  const totalFeatures = Object.values(featureTypes).reduce((a, b) => a + b, 0);
  const sortedTypes = Object.entries(featureTypes).sort((a, b) => b[1] - a[1]);

  const rows = [
    ['Format', `GFF${version}`],
    ['Sequences', seqnames.size.toLocaleString()],
    ['Total features', totalFeatures.toLocaleString()],
    directives.length ? ['Sequence regions', directives.length.toString()] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const typeRows = sortedTypes.slice(0, 15).map(([type, count]) => {
    const pct = ((count / totalFeatures) * 100).toFixed(1);
    const color = getColor(type);
    return `<tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:6px"></span>${esc(type)}</td>
      <td style="text-align:right">${count.toLocaleString()}</td>
      <td style="text-align:right">${pct}%</td>
    </tr>`;
  }).join('');

  const seqList = [...seqnames].slice(0, 20).map(s =>
    `<span style="display:inline-block;background:#e3f2fd;border-radius:3px;padding:1px 6px;margin:2px;font-size:0.8rem">${esc(s)}</span>`
  ).join('');

  return {
    bodyHtml: `
      <style>.badge-gff { background: #1b5e20; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-gff">GFF${version}</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${rows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">Feature Types</h4>
        <table class="meta-table">
          <thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead>
          <tbody>${typeRows}</tbody>
        </table>
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">Sequences / Chromosomes</h4>
        <div style="margin:4px 0">${seqList}</div>
      </div>`,
    hadUnsafe: false,
  };
}

const MAX_SEQS = 2000;
const MAX_CHARS = 60;

function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ── Format sniffer ──────────────────────────────────────────────────────────

function sniffFormat(text, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['fq', 'fastq'].includes(ext)) return 'fastq';
  if (['bcf'].includes(ext)) return 'vcf';
  if (['gff', 'gff3', 'gtf'].includes(ext)) return 'gff';
  if (['bed'].includes(ext)) return 'bed';
  const head = text.slice(0, 400);
  if (/^##fileformat=VCF/i.test(head)) return 'vcf';
  if (/^##gff-version/i.test(head)) return 'gff';
  if (/^@/.test(head) && /^\+/m.test(head)) return 'fastq';
  if (/^>/.test(head)) return 'fasta';
  return 'fasta';
}

// ── Parsers ─────────────────────────────────────────────────────────────────

export function parseFasta(text) {
  const seqs = [];
  let header = null, seq = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t[0] === '>') {
      if (header !== null) seqs.push({ header: header.slice(1), seq: seq.join('') });
      header = t; seq = [];
      if (seqs.length >= MAX_SEQS) break;
    } else if (header !== null) {
      seq.push(t);
    }
  }
  if (header !== null && seqs.length < MAX_SEQS) seqs.push({ header: header.slice(1), seq: seq.join('') });
  const totalLen = seqs.reduce((a, s) => a + s.seq.length, 0);
  const gcContent = (() => {
    const all = seqs.map((s) => s.seq).join('').toUpperCase();
    const gc = (all.match(/[GC]/g) || []).length;
    const atgc = (all.match(/[ATGC]/g) || []).length;
    return atgc ? Math.round((gc / atgc) * 100) : null;
  })();
  return { format: 'fasta', seqs, totalLen, gcContent };
}

export function parseFastq(text) {
  const records = [];
  const lines = text.split('\n').filter((l) => l.trim());
  for (let i = 0; i + 3 < lines.length; i += 4) {
    if (!lines[i].startsWith('@')) break;
    records.push({ header: lines[i].slice(1), seq: lines[i + 1], qual: lines[i + 3] });
    if (records.length >= MAX_SEQS) break;
  }
  const totalLen = records.reduce((a, r) => a + r.seq.length, 0);
  const avgQual = (() => {
    let sum = 0, count = 0;
    for (const r of records) { for (const ch of r.qual) { sum += ch.charCodeAt(0) - 33; count++; } }
    return count ? (sum / count).toFixed(1) : null;
  })();
  return { format: 'fastq', records, totalLen, avgQual };
}

export function parseVcf(text) {
  const meta = [], variants = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('##')) { meta.push(line); continue; }
    if (line.startsWith('#') || !line.trim()) continue;
    const cols = line.split('\t');
    variants.push({ chrom: cols[0], pos: cols[1], ref: cols[3] || '', alt: cols[4] || '', filter: cols[6] || '' });
    if (variants.length >= MAX_SEQS) break;
  }
  const contigs = [...new Set(variants.map((v) => v.chrom))];
  const fileformat = (meta.find((l) => /fileformat/i.test(l)) || '').replace(/.*=/, '');
  return { format: 'vcf', variants, contigs, fileformat };
}

function parseGff(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const c = line.split('\t');
    rows.push({ seqname: c[0], feature: c[2] || '', start: c[3] || '', end: c[4] || '', strand: c[6] || '' });
    if (rows.length >= MAX_SEQS) break;
  }
  return { rows, features: [...new Set(rows.map((r) => r.feature).filter(Boolean))] };
}

function parseBed(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || /^(#|track|browser)/.test(line)) continue;
    const c = line.split('\t');
    if (c.length < 3) continue;
    rows.push({ chrom: c[0], start: c[1], end: c[2], name: c[3] || '', strand: c[5] || '' });
    if (rows.length >= MAX_SEQS) break;
  }
  return { rows, chroms: [...new Set(rows.map((r) => r.chrom))] };
}

// ── Mini bar chart (inline SVG, no deps) ───────────────────────────────────

function barChart(labels, values, colors) {
  const max = Math.max(...values, 1);
  const barW = 36, barH = 80, gap = 8, total = labels.length;
  const w = total * (barW + gap), h = barH + 28;
  const bars = labels.map((l, i) => {
    const bh = Math.round((values[i] / max) * barH);
    const x = i * (barW + gap);
    const y = barH - bh;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${colors[i] || '#2563eb'}" rx="2"/>`
         + `<text x="${x + barW / 2}" y="${h - 6}" text-anchor="middle" font-size="11" fill="currentColor">${esc(l)}</text>`
         + (values[i] ? `<text x="${x + barW / 2}" y="${Math.max(y - 4, 10)}" text-anchor="middle" font-size="10" fill="currentColor">${values[i].toLocaleString()}</text>` : '');
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:${Math.min(w, 400)}px;max-width:100%;height:auto;overflow:visible">${bars}</svg>`;
}

// ── HTML builders ───────────────────────────────────────────────────────────

function header(badge, stats) {
  return `<div class="bio-header"><span class="bio-badge">${badge}</span>${stats.map((s) => `<span class="bio-stat">${esc(s)}</span>`).join('')}</div>`;
}

function section(label, content) {
  return `<div class="bio-section"><div class="bio-label">${esc(label)}</div>${content}</div>`;
}

function table(cols, rows) {
  return `<table class="bio-table"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function chips(items) {
  return `<div class="bio-chips">${items.map((c) => `<span class="bio-chip">${esc(c)}</span>`).join('')}</div>`;
}

// ── Render ──────────────────────────────────────────────────────────────────

export function render(intake, _ctx) {
  const text = intake.text || '';
  const fmt = sniffFormat(text, intake.filename || '');

  if (fmt === 'fastq') {
    const { records, totalLen, avgQual } = parseFastq(text);
    const qualBuckets = Array(10).fill(0);
    for (const r of records) { for (const ch of r.qual) { const q = Math.min(9, Math.floor((ch.charCodeAt(0) - 33) / 4)); qualBuckets[q]++; } }
    const colors = qualBuckets.map((_, i) => i < 5 ? '#dc2626' : i < 7 ? '#f59e0b' : '#16a34a');
    const bodyHtml = '<div class="bio-preview">'
      + header('FASTQ', [`${records.length.toLocaleString()} reads`, `${totalLen.toLocaleString()} total bp`, ...(avgQual ? [`Avg Q${avgQual}`] : [])])
      + section('First reads', records.slice(0, 6).map((r) =>
          `<div class="bio-seq-row"><div class="bio-seq-name">${esc(r.header.slice(0, MAX_CHARS))}</div>`
        + `<div class="bio-seq-bases">${esc(r.seq.slice(0, MAX_CHARS))}${r.seq.length > MAX_CHARS ? '…' : ''}</div></div>`).join(''))
      + section('Quality distribution', barChart(qualBuckets.map((_, i) => `Q${i * 4}`), qualBuckets, colors))
      + '</div>';
    return { bodyHtml };
  }

  if (fmt === 'vcf') {
    const { variants, contigs, fileformat } = parseVcf(text);
    const varTypes = { SNP: 0, INDEL: 0, OTHER: 0 };
    for (const v of variants) {
      if (v.ref.length === 1 && v.alt.length === 1) varTypes.SNP++;
      else if (v.ref.length !== v.alt.length) varTypes.INDEL++;
      else varTypes.OTHER++;
    }
    const bodyHtml = '<div class="bio-preview">'
      + header('VCF', [fileformat && esc(fileformat), `${variants.length.toLocaleString()} variants`, `${contigs.length} contigs`].filter(Boolean))
      + (contigs.length ? section('Contigs', chips(contigs.slice(0, 20)) + (contigs.length > 20 ? `<span class="bio-chip bio-chip-more">+${contigs.length - 20} more</span>` : '')) : '')
      + section(`Variants (first ${Math.min(variants.length, 8)})`,
          table(['CHROM', 'POS', 'REF', 'ALT', 'FILTER'],
            variants.slice(0, 8).map((v) => `<tr><td>${esc(v.chrom)}</td><td>${esc(v.pos)}</td><td class="bio-ref">${esc(v.ref.slice(0, 10))}</td><td class="bio-alt">${esc(v.alt.slice(0, 10))}</td><td>${esc(v.filter)}</td></tr>`).join('')))
      + (Object.values(varTypes).some(Boolean) ? section('Variant types', barChart(Object.keys(varTypes), Object.values(varTypes), ['#16a34a', '#2563eb', '#9ca3af'])) : '')
      + '</div>';
    return { bodyHtml };
  }

  if (fmt === 'gff') {
    const { rows, features } = parseGff(text);
    const bodyHtml = '<div class="bio-preview">'
      + header('GFF/GTF', [`${rows.length.toLocaleString()} features`])
      + (features.length ? section('Feature types', chips(features.slice(0, 20))) : '')
      + section('First features', table(['Seq', 'Feature', 'Start', 'End', 'Strand'],
          rows.slice(0, 8).map((r) => `<tr><td>${esc(r.seqname)}</td><td>${esc(r.feature)}</td><td>${esc(r.start)}</td><td>${esc(r.end)}</td><td>${esc(r.strand)}</td></tr>`).join('')))
      + '</div>';
    return { bodyHtml };
  }

  if (fmt === 'bed') {
    const { rows, chroms } = parseBed(text);
    const bodyHtml = '<div class="bio-preview">'
      + header('BED', [`${rows.length.toLocaleString()} intervals`, `${chroms.length} chroms`])
      + section('Regions (first 8)', table(['CHROM', 'START', 'END', 'NAME', 'STRAND'],
          rows.slice(0, 8).map((r) => `<tr><td>${esc(r.chrom)}</td><td>${esc(r.start)}</td><td>${esc(r.end)}</td><td>${esc(r.name)}</td><td>${esc(r.strand)}</td></tr>`).join('')))
      + '</div>';
    return { bodyHtml };
  }

  // FASTA
  const { seqs, totalLen, gcContent } = parseFasta(text);
  const isNucl = seqs.length && /^[ATGCNRYWSKMBDHV-]+$/i.test((seqs[0]?.seq || '').slice(0, 100));
  const bases = { A: 0, T: 0, G: 0, C: 0, N: 0 };
  if (isNucl) {
    const all = seqs.map((s) => s.seq).join('').toUpperCase();
    for (const ch of all) { if (ch in bases) bases[ch]++; }
  }
  const baseColors = { A: '#16a34a', T: '#dc2626', G: '#2563eb', C: '#f59e0b', N: '#9ca3af' };
  const bodyHtml = '<div class="bio-preview">'
    + header('FASTA', [`${seqs.length.toLocaleString()} sequence${seqs.length !== 1 ? 's' : ''}`, `${totalLen.toLocaleString()} total residues`, ...(gcContent !== null ? [`${gcContent}% GC`] : [])])
    + section(`Sequences (first ${Math.min(seqs.length, 8)})`,
        seqs.slice(0, 8).map((s) => `<div class="bio-seq-row"><div class="bio-seq-name">${esc(s.header.slice(0, MAX_CHARS))}${s.header.length > MAX_CHARS ? '…' : ''}</div><div class="bio-seq-bases">${esc(s.seq.slice(0, MAX_CHARS))}${s.seq.length > MAX_CHARS ? '…' : ''}</div><div class="bio-seq-len">${s.seq.length.toLocaleString()} bp</div></div>`).join(''))
    + (isNucl && Object.values(bases).some(Boolean)
        ? section('Nucleotide composition', barChart(Object.keys(bases), Object.values(bases), Object.keys(bases).map((k) => baseColors[k])))
        : '')
    + '</div>';
  return { bodyHtml };
}

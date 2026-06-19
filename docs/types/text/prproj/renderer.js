// Adobe Premiere Pro project viewer (.prproj)
// Format: gzip-compressed XML. We decompress with DecompressionStream, then parse key metadata.

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function getAttr(text, tag, attr) { const m = text.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')); return m?.[1] || null; }
function countTag(text, tag) { return (text.match(new RegExp(`<${tag}[\\s>/]`, 'gi')) || []).length; }
function innerText(text, tag) { return text.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'))?.[1]?.trim() || null; }

function parsePrProject(xml) {
  // Sequences (timeline tracks)
  const sequences = (xml.match(/<Sequence\b[^>]*>/g) || []).length;
  // Video clips
  const clips = countTag(xml, 'ClipProjectItem');
  // Media files
  const media = countTag(xml, 'MediaSource');
  // Frame rate (from first Sequence)
  const timebaseNum = xml.match(/<timebase>\s*<value>(\d+)<\/value>/)?.[1] || null;
  // Project name
  const name = innerText(xml, 'Project') || null;
  // Creation date
  const created = getAttr(xml, 'PremiereData', 'Created') || null;
  // Version
  const version = getAttr(xml, 'PremiereData', 'Version') || null;

  return { sequences, clips, media, timebaseNum, name, created, version };
}

async function decompressGzip(bytes) {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  let done, value;
  while ({ done, value } = await reader.read(), !done) chunks.push(value);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

export async function render(intake) {
  let xml;
  try {
    if (intake.isBinary && intake.bytes) {
      xml = await decompressGzip(intake.bytes);
    } else {
      xml = intake.text || '';
    }
  } catch {
    return { bodyHtml: '<div class="prproj-preview"><p class="prproj-note">Could not decompress .prproj (gzip). Try opening the raw view.</p></div>' };
  }

  if (!xml || !xml.trim()) {
    return { bodyHtml: '<div class="prproj-preview"><p class="prproj-note">Empty project file.</p></div>' };
  }

  const { sequences, clips, media, timebaseNum, name, created, version } = parsePrProject(xml);

  const statsHtml = `<div class="prproj-stats">
    ${sequences ? `<div class="prproj-stat"><div class="prproj-stat-value">${sequences}</div><div class="prproj-stat-label">Sequences</div></div>` : ''}
    ${clips ? `<div class="prproj-stat"><div class="prproj-stat-value">${clips}</div><div class="prproj-stat-label">Clips</div></div>` : ''}
    ${media ? `<div class="prproj-stat"><div class="prproj-stat-value">${media}</div><div class="prproj-stat-label">Media</div></div>` : ''}
    ${timebaseNum ? `<div class="prproj-stat"><div class="prproj-stat-value">${timebaseNum} fps</div><div class="prproj-stat-label">Frame Rate</div></div>` : ''}
  </div>`;

  const infoRows = [
    name ? `<tr><td class="prproj-key">Project</td><td>${esc(name)}</td></tr>` : '',
    version ? `<tr><td class="prproj-key">Version</td><td>${esc(version)}</td></tr>` : '',
    created ? `<tr><td class="prproj-key">Created</td><td>${esc(created)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const bodyHtml = `<div class="prproj-preview">
  <div class="prproj-header"><span class="prproj-badge">Premiere</span>${name ? `<span class="prproj-title">${esc(name)}</span>` : ''}</div>
  ${statsHtml}
  ${infoRows ? `<table class="prproj-table">${infoRows}</table>` : ''}
  <p class="prproj-note">Adobe Premiere Pro project — compressed XML. Contains bin/sequence/clip/effect references.</p>
</div>`;

  return { bodyHtml };
}

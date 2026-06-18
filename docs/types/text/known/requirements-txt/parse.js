export function parseRequirementsText(text) {
  const entries = [];
  for (const raw of (text || '').split(/\r?\n/)) {
    const body = stripInlineComment(raw).trim();
    if (!body) continue;
    entries.push(parseLine(body));
  }
  return entries;
}

export function summarizeRequirements(entries) {
  const requirements = entries.filter((entry) => entry.kind === 'requirement');
  const directRefs = requirements.filter((entry) => entry.directRef).length;
  return {
    requirements,
    packages: requirements.length,
    pinned: requirements.filter((entry) => entry.pinKind === 'pinned').length,
    constrained: requirements.filter((entry) => entry.pinKind === 'constrained').length,
    unpinned: requirements.filter((entry) => entry.pinKind === 'unpinned').length,
    directRefs,
    extras: requirements.filter((entry) => entry.extras.length).length,
    markers: requirements.filter((entry) => entry.marker).length,
    editable: entries.filter((entry) => entry.kind === 'editable').length,
    includes: entries.filter((entry) => entry.kind === 'include').length,
    constraints: entries.filter((entry) => entry.kind === 'constraint').length,
    indexes: entries.filter((entry) => entry.kind === 'index').length,
    findLinks: entries.filter((entry) => entry.kind === 'findLinks').length,
    hashes: entries.filter((entry) => entry.kind === 'hash').length,
    options: entries.filter((entry) => !['requirement', 'editable', 'include', 'constraint', 'index', 'findLinks', 'hash'].includes(entry.kind)).length,
  };
}

function parseLine(body) {
  if (/^(-r|--requirement)\b/.test(body)) return { kind: 'include', raw: body };
  if (/^(-c|--constraint)\b/.test(body)) return { kind: 'constraint', raw: body };
  if (/^(-e|--editable)\b/.test(body)) return { kind: 'editable', raw: body, target: body.replace(/^(-e|--editable)\s+/, '').trim() };
  if (/^(--index-url|--extra-index-url|-i)\b/.test(body)) return { kind: 'index', raw: body };
  if (/^(--find-links|-f)\b/.test(body)) return { kind: 'findLinks', raw: body };
  if (/^--hash\b/.test(body)) return { kind: 'hash', raw: body };
  if (/^-/.test(body)) return { kind: 'option', raw: body };
  return parseRequirement(body);
}

function parseRequirement(body) {
  const [withoutMarker, marker = ''] = splitOnce(body, ';');
  const [namePart, directRef = ''] = splitDirectRef(withoutMarker.trim());
  const m = namePart.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(\[[^\]]*\])?\s*(.*)$/);
  if (!m) return { kind: 'unknown', raw: body };
  const specifier = m[3].trim();
  return {
    kind: 'requirement',
    raw: body,
    name: m[1],
    extras: parseExtras(m[2]),
    specifier,
    marker: marker.trim(),
    directRef: directRef.trim(),
    pinKind: pinKind(specifier, directRef),
  };
}

function stripInlineComment(line) {
  const idx = line.search(/\s#/);
  return idx < 0 ? line : line.slice(0, idx);
}

function splitOnce(text, sep) {
  const idx = text.indexOf(sep);
  return idx < 0 ? [text] : [text.slice(0, idx), text.slice(idx + sep.length)];
}

function splitDirectRef(text) {
  const m = text.match(/^(.+?)\s+@\s+(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [text, ''];
}

function parseExtras(raw) {
  if (!raw) return [];
  return raw.replace(/[[\]]/g, '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function pinKind(specifier, directRef) {
  if (directRef) return 'direct';
  if (!specifier) return 'unpinned';
  if (/^===?[^=]/.test(specifier)) return 'pinned';
  return /[<>=~!]=?/.test(specifier) ? 'constrained' : 'unpinned';
}

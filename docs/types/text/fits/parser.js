export function parseFitsCard(record) {
  const rec = String(record || '').padEnd(80, ' ');
  const keyword = rec.slice(0, 8).trim();
  if (!keyword || keyword === 'END') return keyword === 'END' ? null : undefined;

  // COMMENT/HISTORY and other commentary cards have no value marker; their free text starts in
  // column 9. Treating them like value cards drops the first two characters.
  if (rec.slice(8, 10) !== '= ') {
    return { kw: keyword, value: rec.slice(8).trim(), comment: '' };
  }

  const field = rec.slice(10).trimEnd();
  let slash = -1;
  let quoted = false;
  for (let index = 0; index < field.length; index++) {
    if (field[index] === "'") {
      // FITS escapes an apostrophe inside a quoted string as two consecutive apostrophes.
      if (quoted && field[index + 1] === "'") { index++; continue; }
      quoted = !quoted;
    } else if (field[index] === '/' && !quoted) {
      slash = index;
      break;
    }
  }

  let value = (slash >= 0 ? field.slice(0, slash) : field).trim();
  const comment = slash >= 0 ? field.slice(slash + 1).trim() : '';
  if (value.startsWith('=')) value = value.slice(1).trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).replace(/''/g, "'").trimEnd();
  }
  return { kw: keyword, value, comment };
}

export function parseFitsHeader(intake) {
  const cards = [];
  if (intake.isBinary && intake.bytes) {
    const text = String.fromCharCode(...intake.bytes.slice(0, 46080));
    for (let offset = 0; offset < text.length; offset += 80) {
      const result = parseFitsCard(text.slice(offset, offset + 80));
      if (result === null) break;
      if (result) cards.push(result);
    }
  } else {
    const lines = (intake.text || '').split('\n').slice(0, 600);
    for (const line of lines) {
      const result = parseFitsCard(line);
      if (result === null) break;
      if (result) cards.push(result);
    }
  }
  return cards;
}

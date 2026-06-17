// SAUCE record parser + ASCII art metadata extractor.

function parseSauce(text, bytes) {
  // SAUCE00 magic at the start of the last 128 bytes
  let sauceText = null;
  const idx = text ? text.lastIndexOf('SAUCE00') : -1;
  if (idx !== -1 && idx > text.length - 200) {
    sauceText = text.slice(idx);
  } else if (bytes && bytes.length >= 128) {
    const tail = bytes.slice(bytes.length - 128);
    const magic = String.fromCharCode(...tail.slice(0, 5));
    if (magic === 'SAUCE') sauceText = String.fromCharCode(...tail);
  }
  if (!sauceText) return null;

  // SAUCE00 record layout (fixed-width fields)
  const title = sauceText.slice(7, 42).replace(/\0|\s+$/g, '').trim();
  const author = sauceText.slice(42, 62).replace(/\0|\s+$/g, '').trim();
  const group = sauceText.slice(62, 82).replace(/\0|\s+$/g, '').trim();
  const date = sauceText.slice(82, 90).replace(/\0|\s+$/g, '').trim();
  return { title, author, group, date };
}

export function extract(intake) {
  const text = intake.text || '';
  const rows = [];

  // Dimensions: max line length × line count
  const lines = text.split(/\r?\n/);
  const maxWidth = Math.max(0, ...lines.map((l) => l.replace(/\x1b\[[^m]*m/g, '').length));
  const lineCount = lines.length;
  rows.push({ label: 'Dimensions', value: `${maxWidth} cols × ${lineCount} rows` });

  // ANSI colors
  const ansiCount = (text.match(/\x1b\[/g) || []).length;
  rows.push({ label: 'ANSI sequences', value: ansiCount > 0 ? `yes (${ansiCount})` : 'no' });

  // File encoding (simple heuristic)
  const hasHighBytes = intake.bytes && [...intake.bytes].some((b) => b > 127);
  const encoding = hasHighBytes ? 'Latin-1 / CP437' : 'UTF-8 / ASCII';
  rows.push({ label: 'Encoding', value: encoding });

  // Character density
  const printable = (text.match(/[^\x00-\x1f\x7f]/g) || []).length;
  const space = (text.match(/[ \t]/g) || []).length;
  const density = printable + space > 0 ? Math.round((printable / (printable + space)) * 100) : 0;
  rows.push({ label: 'Char density', value: `${density}% printable` });

  // SAUCE record
  const sauce = parseSauce(text, intake.bytes);
  if (sauce) {
    if (sauce.title) rows.push({ label: 'SAUCE title', value: sauce.title });
    if (sauce.author) rows.push({ label: 'SAUCE author', value: sauce.author });
    if (sauce.group) rows.push({ label: 'SAUCE group', value: sauce.group });
    if (sauce.date) rows.push({ label: 'SAUCE date', value: sauce.date });
  }

  return rows;
}

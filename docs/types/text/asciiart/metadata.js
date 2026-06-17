// SAUCE record parser + ASCII art metadata extractor.

function parseSauce(text, bytes) {
  let sauceText = null;
  const idx = text ? text.lastIndexOf('SAUCE00') : -1;
  if (idx !== -1 && idx > text.length - 200) {
    sauceText = text.slice(idx);
  } else if (bytes && bytes.length >= 128) {
    const tail = bytes.slice(bytes.length - 128);
    const magic = String.fromCharCode(...tail.slice(0, 7));
    if (magic === 'SAUCE00') sauceText = String.fromCharCode(...tail);
  }
  if (!sauceText) return null;

  const clean = (s) => s.replace(/\0/g, '').trim();
  const word = (off) => {
    if (sauceText[off] === ' ' && sauceText[off + 1] === ' ') return 0;
    return sauceText.charCodeAt(off) | (sauceText.charCodeAt(off + 1) << 8);
  };
  return {
    title: clean(sauceText.slice(7, 42)),
    author: clean(sauceText.slice(42, 62)),
    group: clean(sauceText.slice(62, 82)),
    date: clean(sauceText.slice(82, 90)),
    width: word(96),
    height: word(98),
  };
}

export async function extractMetadata(intake) {
  const text = intake.text || '';
  const fields = [];

  const lines = text.split(/\r?\n/);
  const maxWidth = Math.max(0, ...lines.map((l) => l.replace(/\x1b\[[^m]*m/g, '').length));
  const lineCount = lines.length;
  fields.push({ label: 'Dimensions', value: `${maxWidth} cols × ${lineCount} rows` });

  const ansiCount = (text.match(/\x1b\[/g) || []).length;
  fields.push({ label: 'ANSI color sequences', value: ansiCount > 0 ? `yes (${ansiCount})` : 'no' });
  fields.push({ label: 'Line count', value: lineCount });
  fields.push({ label: 'Character count', value: text.length });

  const hasHighBytes = intake.bytes && [...intake.bytes].some((b) => b > 127);
  const encoding = hasHighBytes ? 'Latin-1 / CP437' : 'UTF-8 / ASCII';
  fields.push({ label: 'Encoding', value: encoding });

  const printable = (text.match(/[^\x00-\x1f\x7f]/g) || []).length;
  const space = (text.match(/[ \t]/g) || []).length;
  const density = printable + space > 0 ? Math.round((printable / (printable + space)) * 100) : 0;
  fields.push({ label: 'Char density', value: `${density}% printable` });

  const sauce = parseSauce(text, intake.bytes);
  if (sauce) {
    if (sauce.title) fields.push({ label: 'SAUCE title', value: sauce.title });
    if (sauce.author) fields.push({ label: 'SAUCE author', value: sauce.author });
    if (sauce.group) fields.push({ label: 'SAUCE group', value: sauce.group });
    if (sauce.date) fields.push({ label: 'SAUCE date', value: sauce.date });
    if (sauce.width || sauce.height) fields.push({ label: 'SAUCE size', value: `${sauce.width || '?'} × ${sauce.height || '?'}` });
  }

  return { fields };
}

export async function extract(intake) {
  return (await extractMetadata(intake)).fields;
}

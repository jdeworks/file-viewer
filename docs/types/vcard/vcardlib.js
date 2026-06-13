// Minimal vCard (RFC 6350 / 2.1 / 3.0 / 4.0) parser — pure client-side, no dependency. Unfolds
// folded lines, parses properties with params (incl. 2.1 flag-style TYPE=…), decodes TEXT escapes
// and basic QUOTED-PRINTABLE, and extracts one contact per BEGIN:VCARD…END:VCARD.

const unescapeText = (v) => v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

function decodeQP(v) {
  return v.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function parseLine(line) {
  const c = line.indexOf(':');
  if (c < 0) return null;
  const left = line.slice(0, c);
  let value = line.slice(c + 1);
  const [name, ...paramParts] = left.split(';');
  const params = { TYPE: [] };
  for (const p of paramParts) {
    const i = p.indexOf('=');
    if (i < 0) { if (p) params.TYPE.push(p.toUpperCase()); continue; }      // 2.1 flag form (e.g. ;HOME;VOICE)
    const key = p.slice(0, i).toUpperCase();
    const val = p.slice(i + 1).replace(/^"|"$/g, '');
    if (key === 'TYPE') params.TYPE.push(...val.split(',').map((s) => s.replace(/^"|"$/g, '').toUpperCase()));
    else params[key] = val;
  }
  if ((params.ENCODING || '').toUpperCase().includes('QUOTED-PRINTABLE')) value = decodeQP(value);
  return { name: name.split('.').pop().toUpperCase(), params, value };   // strip vCard4 group prefix (item1.TEL)
}

// Unfold folded continuation lines (next line starts with space or tab; 2.1 also uses '=' soft breaks).
function unfold(text) {
  return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function typeLabel(params) {
  const t = (params.TYPE || []).filter((x) => !['VOICE', 'INTERNET', 'PREF'].includes(x));
  return t.length ? t.join('/').toLowerCase() : '';
}

export function parseVCards(text) {
  const lines = unfold(text).split('\n');
  const cards = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const pl = parseLine(line);
    if (!pl) continue;
    if (pl.name === 'BEGIN' && /vcard/i.test(pl.value)) { cur = { emails: [], tels: [], urls: [], adrs: [], fn: '', org: '', title: '', note: '', bday: '', hasPhoto: false }; continue; }
    if (pl.name === 'END') { if (cur && (cur.fn || cur.emails.length || cur.tels.length)) cards.push(cur); cur = null; continue; }
    if (!cur) continue;
    const v = unescapeText(pl.value);
    switch (pl.name) {
      case 'FN': cur.fn = v; break;
      case 'N': if (!cur.fn) { const p = v.split(';'); cur.fn = [p[3], p[1], p[2], p[0], p[4]].filter(Boolean).join(' ').trim(); } break;
      case 'ORG': cur.org = v.split(';').filter(Boolean).join(' · '); break;
      case 'TITLE': cur.title = v; break;
      case 'EMAIL': if (v) cur.emails.push({ type: typeLabel(pl.params), value: v }); break;
      case 'TEL': if (v) cur.tels.push({ type: typeLabel(pl.params), value: v }); break;
      case 'URL': if (v) cur.urls.push(v); break;
      case 'ADR': { const a = v.split(';').slice(2).filter(Boolean).join(', '); if (a) cur.adrs.push({ type: typeLabel(pl.params), value: a }); break; }
      case 'NOTE': cur.note = v; break;
      case 'BDAY': cur.bday = v; break;
      case 'PHOTO': cur.hasPhoto = true; break;
      default: break;
    }
  }
  return cards;
}

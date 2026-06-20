const FIFTHS_MAP = {
  '-7': 'Cb major', '-6': 'Gb major', '-5': 'Db major', '-4': 'Ab major',
  '-3': 'Eb major', '-2': 'Bb major', '-1': 'F major',
  '0': 'C major',
  '1': 'G major', '2': 'D major', '3': 'A major', '4': 'E major',
  '5': 'B major', '6': 'F# major', '7': 'C# major',
};

function getText(doc, tag) {
  const el = doc.querySelector(tag);
  return el ? el.textContent.trim() : '';
}

export function parseMusicXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) return null;
  const root = doc.documentElement;
  if (root.tagName !== 'score-partwise' && root.tagName !== 'score-timewise') return null;

  const title = getText(doc, 'movement-title') || getText(doc, 'work-title') || '';
  const composer = (() => {
    for (const c of doc.querySelectorAll('creator')) {
      if ((c.getAttribute('type') || '').toLowerCase() === 'composer') return c.textContent.trim();
    }
    return '';
  })();
  const lyricist = (() => {
    for (const c of doc.querySelectorAll('creator')) {
      if ((c.getAttribute('type') || '').toLowerCase() === 'lyricist') return c.textContent.trim();
    }
    return '';
  })();
  const copyright = getText(doc, 'rights');

  const partEls = doc.querySelectorAll('score-part');
  const parts = Array.from(partEls).map((p) => {
    const name = p.querySelector('part-name');
    return name ? name.textContent.trim() : (p.getAttribute('id') || '?');
  });

  const firstPart = doc.querySelector('part');
  const measures = firstPart ? firstPart.querySelectorAll('measure').length : 0;

  const timeEl = doc.querySelector('time');
  const beats = timeEl ? getText(timeEl, 'beats') : '';
  const beatType = timeEl ? getText(timeEl, 'beat-type') : '';
  const timeSig = beats && beatType ? `${beats}/${beatType}` : '';

  const keyEl = doc.querySelector('key');
  const fifths = keyEl ? getText(keyEl, 'fifths') : '';
  const key = FIFTHS_MAP[fifths] || (fifths !== '' ? `${fifths} fifths` : '');

  let tempo = '';
  const soundEl = doc.querySelector('sound[tempo]');
  if (soundEl) {
    tempo = soundEl.getAttribute('tempo') + ' BPM';
  } else {
    const perMin = getText(doc, 'per-minute');
    if (perMin) tempo = perMin + ' BPM';
  }

  const version = root.getAttribute('version') || '';

  return { title, composer, lyricist, copyright, parts, measures, timeSig, key, tempo, version };
}

async function getMxlXml(intake) {
  try {
    const { default: JSZip } = await import('../../../vendor/jszip/jszip.min.js');
    const zip = await JSZip.loadAsync(intake.bytes);
    let xmlFile = null;
    const container = zip.file('META-INF/container.xml');
    if (container) {
      const cText = await container.async('text');
      const m = cText.match(/full-path="([^"]+\.xml)"/i);
      if (m) xmlFile = zip.file(m[1]);
    }
    if (!xmlFile) {
      for (const name of Object.keys(zip.files)) {
        if (name.endsWith('.xml') && !name.includes('/')) { xmlFile = zip.files[name]; break; }
      }
    }
    if (!xmlFile) return null;
    return await xmlFile.async('text');
  } catch {
    return null;
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function span(className, text) {
  return el('span', className, text);
}

// ── Metadata card (DOM) ──────────────────────────────────────────────────────

function buildMetadataCard(info) {
  const header = el('div', 'mxml-header');

  if (info.title) header.appendChild(el('div', 'mxml-title', info.title));
  if (info.composer) header.appendChild(el('div', 'mxml-composer', info.composer));
  if (info.lyricist) {
    const d = el('div', 'mxml-lyricist');
    d.textContent = 'Lyrics: ' + info.lyricist;
    header.appendChild(d);
  }
  if (info.copyright) header.appendChild(el('div', 'mxml-copyright', info.copyright));
  if (!info.title && !info.composer) header.appendChild(el('div', 'mxml-untitled', 'Untitled Score'));

  // Stats chips
  const stats = [];
  if (info.measures) stats.push({ label: 'Measures', value: info.measures });
  if (info.parts.length) stats.push({ label: 'Parts', value: info.parts.length });
  if (info.timeSig) stats.push({ label: 'Time', value: info.timeSig });
  if (info.key) stats.push({ label: 'Key', value: info.key });
  if (info.tempo) stats.push({ label: 'Tempo', value: info.tempo });
  if (info.version) stats.push({ label: 'MusicXML', value: 'v' + info.version });

  if (stats.length) {
    const statsDiv = el('div', 'mxml-stats');
    for (const s of stats) {
      const chip = el('div', 'mxml-stat');
      chip.appendChild(el('div', 'mxml-stat-value', String(s.value)));
      chip.appendChild(el('div', 'mxml-stat-label', s.label));
      statsDiv.appendChild(chip);
    }
    header.appendChild(statsDiv);
  }

  return header;
}

// ── Score outline tree (DOM) ─────────────────────────────────────────────────

function makeTreeNode(indent, tagLabel, valueText) {
  const row = el('div', 'mxml-tree-node');
  row.style.paddingLeft = (indent * 16) + 'px';

  const tagSpan = span('mxml-tag-name', '<' + tagLabel + '>');
  row.appendChild(tagSpan);

  if (valueText) {
    row.appendChild(document.createTextNode(' '));
    row.appendChild(span('mxml-node-label', valueText));
  }

  return row;
}

function buildScoreTree(xmlDoc) {
  const container = el('div', 'mxml-tree');
  const root = xmlDoc.documentElement;

  // Root node
  container.appendChild(makeTreeNode(0, root.tagName));

  // identification block
  const ident = root.querySelector('identification');
  if (ident) {
    container.appendChild(makeTreeNode(1, 'identification'));
    const creators = ident.querySelectorAll('creator');
    for (const c of creators) {
      const type = c.getAttribute('type') || '';
      const name = c.textContent.trim();
      const label = type ? `${name} (${type})` : name;
      container.appendChild(makeTreeNode(2, 'creator', label));
    }
  }

  // part-list
  const partList = root.querySelector('part-list');
  if (partList) {
    container.appendChild(makeTreeNode(1, 'part-list'));
    const scoreParts = partList.querySelectorAll('score-part');
    for (const sp of scoreParts) {
      const id = sp.getAttribute('id') || '';
      const nameEl = sp.querySelector('part-name');
      const partName = nameEl ? nameEl.textContent.trim() : id;
      const label = partName && partName !== id ? `${partName} (${id})` : id;
      container.appendChild(makeTreeNode(2, 'score-part', label));
    }
  }

  // parts — first 1–2 parts
  const parts = Array.from(root.querySelectorAll('part'));
  const showParts = parts.slice(0, 2);
  for (const part of showParts) {
    const partId = part.getAttribute('id') || 'unknown';
    container.appendChild(makeTreeNode(1, 'part', `id="${partId}"`));

    const measureEls = part.querySelectorAll('measure');
    const showMeasures = Array.from(measureEls).slice(0, 3);
    for (const mEl of showMeasures) {
      const num = mEl.getAttribute('number') || '?';

      // Count notes, chords, rests
      const noteEls = mEl.querySelectorAll('note');
      let noteCount = 0, chordCount = 0, restCount = 0;
      for (const n of noteEls) {
        if (n.querySelector('rest')) {
          restCount++;
        } else if (n.querySelector('chord')) {
          chordCount++;
        } else {
          noteCount++;
        }
      }

      const parts2 = [];
      if (noteCount) parts2.push(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
      if (chordCount) parts2.push(`${chordCount} chord${chordCount !== 1 ? 's' : ''}`);
      if (restCount) parts2.push(`${restCount} rest${restCount !== 1 ? 's' : ''}`);
      const summary = parts2.length ? parts2.join(', ') : 'empty';

      container.appendChild(makeTreeNode(2, 'measure', `${num} — ${summary}`));
    }

    if (measureEls.length > 3) {
      const moreRow = el('div', 'mxml-tree-node mxml-tree-more');
      moreRow.style.paddingLeft = (2 * 16) + 'px';
      moreRow.textContent = `… ${measureEls.length - 3} more measure${measureEls.length - 3 !== 1 ? 's' : ''}`;
      container.appendChild(moreRow);
    }
  }

  if (parts.length > 2) {
    const moreRow = el('div', 'mxml-tree-node mxml-tree-more');
    moreRow.style.paddingLeft = (1 * 16) + 'px';
    moreRow.textContent = `… ${parts.length - 2} more part${parts.length - 2 !== 1 ? 's' : ''}`;
    container.appendChild(moreRow);
  }

  return container;
}

// ── Raw XML highlighter (DOM, no innerHTML with user content) ─────────────────

/**
 * Tokenise a snippet of XML and return an array of DOM nodes with syntax
 * highlighting. We never call innerHTML with untrusted content — every piece
 * of user-derived text is set via textContent.
 */
function highlightXml(xmlText) {
  const frag = document.createDocumentFragment();

  // Simple state-machine tokeniser for XML.
  // Tokens: tag-open (<tag attrs>), tag-close (</tag>), self-close (<tag ... />),
  // comment (<!-- … -->), text.
  const re = /(<\/[^>]+>|<!--[\s\S]*?-->|<[^>]+>|[^<]+)/g;
  let m;
  while ((m = re.exec(xmlText)) !== null) {
    const tok = m[0];
    if (tok.startsWith('<!--')) {
      // Comment
      frag.appendChild(span('mxml-comment', tok));
    } else if (tok.startsWith('</')) {
      // Closing tag
      const inner = tok.slice(2, -1).trim();
      const open = span('mxml-punctuation', '</');
      const name = span('mxml-tag-name', inner);
      const close = span('mxml-punctuation', '>');
      frag.appendChild(open);
      frag.appendChild(name);
      frag.appendChild(close);
    } else if (tok.startsWith('<')) {
      // Opening or self-closing tag — parse tag name + attributes
      const selfClose = tok.endsWith('/>');
      const inner = selfClose ? tok.slice(1, -2) : tok.slice(1, -1);

      frag.appendChild(span('mxml-punctuation', '<'));

      // Split on first whitespace to get tag name
      const wsIdx = inner.search(/\s/);
      const tagName = wsIdx === -1 ? inner : inner.slice(0, wsIdx);
      frag.appendChild(span('mxml-tag-name', tagName));

      if (wsIdx !== -1) {
        const attrStr = inner.slice(wsIdx);
        // Tokenise attributes: name="value" or name='value' or bare name
        const attrRe = /(\s+)([^\s=/>]+)(=)("([^"]*)")|(\s+)([^\s=/>]+)(=)('([^']*)')|(\s+)([^\s=/>]+)/g;
        let am;
        let lastIdx = 0;
        while ((am = attrRe.exec(attrStr)) !== null) {
          // Append any gap text
          if (am.index > lastIdx) {
            frag.appendChild(document.createTextNode(attrStr.slice(lastIdx, am.index)));
          }
          if (am[2] !== undefined) {
            // name="value"
            frag.appendChild(document.createTextNode(am[1]));
            frag.appendChild(span('mxml-attr-name', am[2]));
            frag.appendChild(span('mxml-punctuation', '='));
            frag.appendChild(span('mxml-punctuation', '"'));
            frag.appendChild(span('mxml-attr-value', am[5]));
            frag.appendChild(span('mxml-punctuation', '"'));
          } else if (am[7] !== undefined) {
            // name='value'
            frag.appendChild(document.createTextNode(am[6]));
            frag.appendChild(span('mxml-attr-name', am[7]));
            frag.appendChild(span('mxml-punctuation', '='));
            frag.appendChild(span('mxml-punctuation', "'"));
            frag.appendChild(span('mxml-attr-value', am[10]));
            frag.appendChild(span('mxml-punctuation', "'"));
          } else {
            // bare name
            frag.appendChild(document.createTextNode(am[11]));
            frag.appendChild(span('mxml-attr-name', am[12]));
          }
          lastIdx = am.index + am[0].length;
        }
        if (lastIdx < attrStr.length) {
          frag.appendChild(document.createTextNode(attrStr.slice(lastIdx)));
        }
      }

      if (selfClose) {
        frag.appendChild(span('mxml-punctuation', '/>'));
      } else {
        frag.appendChild(span('mxml-punctuation', '>'));
      }
    } else {
      // Text node — plain text
      frag.appendChild(document.createTextNode(tok));
    }
  }

  return frag;
}

function buildRawXmlPreview(xmlDoc) {
  // Serialize first measure element
  const firstMeasure = xmlDoc.querySelector('measure');
  if (!firstMeasure) return null;

  const serializer = new XMLSerializer();
  let raw = serializer.serializeToString(firstMeasure);

  const truncated = raw.length > 2000;
  if (truncated) raw = raw.slice(0, 2000);

  const details = document.createElement('details');
  details.className = 'mxml-raw-details';

  const summary = document.createElement('summary');
  summary.className = 'mxml-raw-summary';
  summary.textContent = 'First measure (raw XML)';
  details.appendChild(summary);

  const pre = el('pre', 'mxml-raw-xml');
  pre.appendChild(highlightXml(raw));

  if (truncated) {
    const note = el('div', 'mxml-raw-truncated', '… truncated at 2000 characters');
    details.appendChild(pre);
    details.appendChild(note);
  } else {
    details.appendChild(pre);
  }

  return details;
}

// ── Main render ──────────────────────────────────────────────────────────────

export async function render(intake, _ctx) {
  let xmlText = intake.text || '';
  const isMxl = (intake.filename || '').toLowerCase().endsWith('.mxl') ||
    (intake.bytes && intake.bytes[0] === 0x50 && intake.bytes[1] === 0x4b);

  if (isMxl) {
    const extracted = await getMxlXml(intake);
    if (!extracted) {
      const host = document.createElement('div');
      host.className = 'mxml-preview';
      const hdr = el('div', 'mxml-header');
      hdr.appendChild(el('p', null, 'Compressed MusicXML (.mxl) — could not extract XML content. View raw to inspect.'));
      host.appendChild(hdr);
      return { parentNode: host };
    }
    xmlText = extracted;
  }

  const info = parseMusicXml(xmlText);
  if (!info) {
    const host = document.createElement('div');
    host.className = 'mxml-preview';
    const hdr = el('div', 'mxml-header');
    hdr.appendChild(el('p', 'mxml-error', 'Not a valid MusicXML file — no <score-partwise> or <score-timewise> root found.'));
    host.appendChild(hdr);
    return { parentNode: host };
  }

  const host = document.createElement('div');
  host.className = 'mxml-preview';

  // 1. Metadata card
  host.appendChild(buildMetadataCard(info));

  // 2. Score outline tree
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = xmlDoc.querySelector('parsererror');

  if (!parseErr) {
    const treeSection = el('div', 'mxml-section');
    treeSection.appendChild(el('div', 'mxml-label', 'Score Structure'));
    treeSection.appendChild(buildScoreTree(xmlDoc));
    host.appendChild(treeSection);

    // 3. First measure raw XML preview
    const rawPreview = buildRawXmlPreview(xmlDoc);
    if (rawPreview) {
      host.appendChild(rawPreview);
    }
  }

  return { parentNode: host };
}

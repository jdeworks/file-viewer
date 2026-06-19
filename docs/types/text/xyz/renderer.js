// XYZ molecular structure viewer — parses XYZ format (Xmol/MOPAC convention).

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const ELEMENT_NAME = {
  H:'Hydrogen', He:'Helium', Li:'Lithium', Be:'Beryllium', B:'Boron', C:'Carbon',
  N:'Nitrogen', O:'Oxygen', F:'Fluorine', Ne:'Neon', Na:'Sodium', Mg:'Magnesium',
  Al:'Aluminium', Si:'Silicon', P:'Phosphorus', S:'Sulfur', Cl:'Chlorine', Ar:'Argon',
  K:'Potassium', Ca:'Calcium', Fe:'Iron', Co:'Cobalt', Ni:'Nickel', Cu:'Copper',
  Zn:'Zinc', Se:'Selenium', Br:'Bromine', I:'Iodine', Pt:'Platinum', Au:'Gold',
  Ag:'Silver', Hg:'Mercury', Pb:'Lead',
};

function parseXyz(text) {
  const lines = text.split(/\r?\n/);
  const structures = [];
  let i = 0;
  while (i < lines.length) {
    const countLine = lines[i]?.trim();
    if (!countLine || !/^\d+$/.test(countLine)) { i++; continue; }
    const count = parseInt(countLine, 10);
    const comment = lines[i + 1]?.trim() || '';
    const atoms = [];
    for (let j = 0; j < count && i + 2 + j < lines.length; j++) {
      const parts = lines[i + 2 + j].trim().split(/\s+/);
      if (parts.length >= 4) {
        const sym = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        atoms.push({ symbol: sym, x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) });
      }
    }
    if (atoms.length > 0) structures.push({ count, comment, atoms });
    i += 2 + count;
  }
  return structures;
}

export function render(intake) {
  const text = intake.text || '';
  const structures = parseXyz(text);
  if (!structures.length) {
    return { bodyHtml: '<div class="xyz-preview"><p class="xyz-note">No valid XYZ frames found.</p></div>' };
  }

  const frames = structures.length;
  const htmlParts = structures.slice(0, 3).map((s, idx) => {
    const elementCounts = {};
    for (const atom of s.atoms) {
      elementCounts[atom.symbol] = (elementCounts[atom.symbol] || 0) + 1;
    }

    // Build formula
    const formulaParts = Object.entries(elementCounts)
      .sort(([a], [b]) => {
        const order = ['C', 'H', 'N', 'O', 'S', 'P'];
        const ai = order.indexOf(a), bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      })
      .map(([sym, cnt]) => cnt === 1 ? sym : `${sym}<sub>${cnt}</sub>`)
      .join('');

    const elemRows = Object.entries(elementCounts).sort((a,b) => b[1]-a[1]).map(([sym, cnt]) => {
      const name = ELEMENT_NAME[sym] || sym;
      return `<tr><td class="xyz-sym">${esc(sym)}</td><td class="xyz-name">${esc(name)}</td><td class="xyz-cnt">${cnt}</td></tr>`;
    }).join('');

    // Bounding box
    const xs = s.atoms.map(a=>a.x), ys = s.atoms.map(a=>a.y), zs = s.atoms.map(a=>a.z);
    const bbox = [Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys), Math.max(...zs)-Math.min(...zs)];

    const title = frames > 1 ? `<h3 class="xyz-frame-title">Frame ${idx + 1}</h3>` : '';

    return `${title}
${s.comment ? `<p class="xyz-comment">${esc(s.comment)}</p>` : ''}
<div class="xyz-formula">${formulaParts}</div>
<div class="xyz-stats">
  <div class="xyz-stat"><div class="xyz-stat-value">${s.atoms.length}</div><div class="xyz-stat-label">Atoms</div></div>
  <div class="xyz-stat"><div class="xyz-stat-value">${Object.keys(elementCounts).length}</div><div class="xyz-stat-label">Elements</div></div>
  <div class="xyz-stat"><div class="xyz-stat-value">${bbox.map(v=>v.toFixed(1)).join(' × ')} Å</div><div class="xyz-stat-label">Bounding box</div></div>
</div>
<table class="xyz-table"><thead><tr><th>Symbol</th><th>Element</th><th>Count</th></tr></thead><tbody>${elemRows}</tbody></table>`;
  });

  const moreFrames = frames > 3 ? `<p class="xyz-note">Showing first 3 of ${frames} frames.</p>` : '';

  const bodyHtml = `<div class="xyz-preview">
  <div class="xyz-header"><span class="badge-xyz">XYZ</span>${frames > 1 ? `<span class="xyz-frames">${frames} frames</span>` : ''}</div>
  ${htmlParts.join('<hr class="xyz-sep">')}
  ${moreFrames}
</div>`;

  return { bodyHtml };
}

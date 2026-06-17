// Example gallery on the intake screen. Reads examples/index.json, groups by category, and renders
// clickable buttons into #examples. The core load flow stays in app.js and is injected as `onPick`.
import { $ } from './state.js';
import { intakeFromFile } from './intake.js';

// Stable display order for the example gallery; unknown categories fall to the end.
const EXAMPLE_CATEGORY_ORDER = ['Documents', 'Data', 'Office', 'Config', 'Code', 'Media', 'Archive & Binary', 'Metagame'];

export async function loadExamples(onPick) {
  try {
    const res = await fetch('examples/index.json');
    if (!res.ok) return;
    const list = await res.json();
    const host = $('examples');
    host.textContent = '';

    const visible = list;

    // Group by category, preserving in-file order within each group.
    const groups = new Map();
    for (const ex of visible) {
      const cat = ex.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(ex);
    }
    const cats = [...groups.keys()].sort((a, b) => {
      const ia = EXAMPLE_CATEGORY_ORDER.indexOf(a), ib = EXAMPLE_CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    for (const cat of cats) {
      const group = document.createElement('div');
      group.className = 'ex-group';
      const label = document.createElement('span');
      label.className = 'ex-group-label';
      label.textContent = cat;
      group.appendChild(label);
      const row = document.createElement('div');
      row.className = 'ex-group-items';
      for (const ex of groups.get(cat)) {
        const b = document.createElement('button');
        b.textContent = ex.label || ex.file;
        b.onclick = async () => {
          const r = await fetch('examples/' + ex.file);
          const buf = new Uint8Array(await r.arrayBuffer());
          await onPick(await intakeFromFile(new File([buf], ex.file, { type: ex.mime || '' })));
        };
        row.appendChild(b);
      }
      group.appendChild(row);
      host.appendChild(group);
    }
  } catch {}
}

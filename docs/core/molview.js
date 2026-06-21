// Shared molecular 3D structure viewer — wraps the vendored 3Dmol.js WebGL viewer (BSD-3-Clause,
// docs/vendor/3dmol/) for PDB / XYZ / CIF / SDF(MOL) structures. 3Dmol parses these formats
// natively, so each type renderer just passes its raw text + a 3Dmol format string.
//
// Cost discipline: 3Dmol-min.js is ~525 KB and pulls in a WebGL context, so it is OPT-IN. The
// renderers show a "Load 3D structure" button; only a click triggers loadGlobal(...) + viewer
// mount. Plain metadata viewing never pays for the library.
//
// API:
//   build3dPanel(text, format, opts?) -> { el, revoke }
//     text   : raw file text (PDB/XYZ/CIF/MOL/SDF)
//     format : 3Dmol model format — 'pdb' | 'xyz' | 'cif' | 'sdf' | 'mol'
//     opts   : { style?: 'stick'|'sphere'|'cartoon'|'line', label?: string }
//   The returned `el` is a self-contained panel (collapsed button -> mounts viewer on click).
//   Call revoke() on teardown to release the WebGL context + observers.

import { vendor, loadGlobal } from './script-loader.js';

const SRC = vendor('3dmol/3Dmol-min.js');

// Format -> sensible default representation. Proteins/nucleic (pdb/cif w/ chains) default to
// cartoon; small molecules to stick.
function defaultStyle(format, text) {
  if (format === 'pdb' || (format === 'cif' && /_atom_site\.label_asym_id|^ATOM\s|^HETATM/m.test(text))) {
    // Heuristic: a macromolecule if it has many residues; otherwise ball-and-stick.
    const atoms = (text.match(/^(ATOM|HETATM)/gm) || []).length;
    return atoms > 80 ? 'cartoon' : 'stick';
  }
  return 'stick';
}

function styleSpec(style) {
  switch (style) {
    case 'sphere':  return { sphere: { scale: 0.3 }, stick: { radius: 0.12 } };
    case 'cartoon': return { cartoon: { color: 'spectrum' } };
    case 'line':    return { line: {} };
    case 'stick':
    default:        return { stick: { radius: 0.14 }, sphere: { scale: 0.22 } };
  }
}

export function build3dPanel(text, format, opts = {}) {
  const panel = document.createElement('div');
  panel.className = 'mol3d-panel';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mol3d-load-btn';
  toggle.textContent = '🧬 Load 3D structure';
  toggle.title = 'Render this structure in an interactive 3D viewer (~525 KB download, one-time)';
  panel.appendChild(toggle);

  let viewer = null;       // 3Dmol GLViewer
  let ro = null;           // ResizeObserver
  let spinning = false;
  let curStyle = opts.style || defaultStyle(format, text);
  let mounted = false;
  let loading = false;

  function teardown() {
    try { if (ro) ro.disconnect(); } catch { /* ignore */ }
    try { if (viewer) viewer.clear(); } catch { /* ignore */ }
    ro = null; viewer = null; spinning = false; mounted = false;
  }

  async function mount() {
    if (mounted || loading) return;
    loading = true;
    toggle.disabled = true;
    toggle.textContent = '🧬 Loading viewer…';
    let $3Dmol;
    try {
      $3Dmol = await loadGlobal(SRC, '3Dmol');
    } catch (e) {
      loading = false;
      toggle.disabled = false;
      toggle.textContent = '🧬 Load 3D structure';
      const err = document.createElement('div');
      err.className = 'mol3d-err';
      err.textContent = 'Could not load the 3D viewer' + (navigator.onLine ? ': ' + (e.message || e) : ' (offline and not cached).');
      panel.appendChild(err);
      return;
    }
    loading = false;
    mounted = true;
    toggle.remove();

    // Toolbar
    const bar = document.createElement('div');
    bar.className = 'mol3d-bar';
    const styleSel = document.createElement('select');
    styleSel.className = 'mol3d-style';
    styleSel.title = 'Representation';
    for (const [val, label] of [['stick', 'Stick'], ['sphere', 'Ball & stick'], ['cartoon', 'Cartoon'], ['line', 'Wireframe']]) {
      const o = document.createElement('option');
      o.value = val; o.textContent = label;
      if (val === curStyle) o.selected = true;
      styleSel.appendChild(o);
    }
    const spinBtn = document.createElement('button');
    spinBtn.type = 'button'; spinBtn.className = 'mol3d-btn'; spinBtn.textContent = '↻ Spin';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button'; resetBtn.className = 'mol3d-btn'; resetBtn.textContent = 'Reset';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'mol3d-label';
    if (opts.label) labelSpan.textContent = opts.label;
    bar.append(styleSel, spinBtn, resetBtn, labelSpan);

    const stage = document.createElement('div');
    stage.className = 'mol3d-stage';

    panel.append(bar, stage);

    try {
      viewer = $3Dmol.createViewer(stage, { backgroundColor: 'white', backgroundAlpha: 0 });
      viewer.addModel(text, format);
      applyStyle(curStyle);
      viewer.zoomTo();
      viewer.render();
    } catch (e) {
      teardown();
      const err = document.createElement('div');
      err.className = 'mol3d-err';
      err.textContent = 'WebGL rendering failed: ' + (e.message || e);
      panel.appendChild(err);
      return;
    }

    function applyStyle(style) {
      curStyle = style;
      viewer.setStyle({}, styleSpec(style));
      // Always show ligands/heteroatoms as sticks even in cartoon mode, so they don't vanish.
      if (style === 'cartoon') viewer.setStyle({ hetflag: true }, { stick: { radius: 0.18 }, sphere: { scale: 0.25 } });
      viewer.render();
    }

    styleSel.addEventListener('change', () => applyStyle(styleSel.value));
    spinBtn.addEventListener('click', () => {
      spinning = !spinning;
      viewer.spin(spinning ? 'y' : false);
      spinBtn.classList.toggle('mol3d-btn--on', spinning);
    });
    resetBtn.addEventListener('click', () => { viewer.zoomTo(); viewer.render(); });

    // Keep the canvas sized to its container.
    ro = new ResizeObserver(() => { try { viewer.resize(); } catch { /* ignore */ } });
    ro.observe(stage);
  }

  toggle.addEventListener('click', mount);

  return { el: panel, revoke: teardown };
}

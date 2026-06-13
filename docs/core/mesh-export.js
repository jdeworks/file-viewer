// Mesh interconversion. Serializes the shared mesh model ({ tris: [{ v:[[x,y,z]×3], n:[x,y,z] }] })
// to the common text mesh formats, so any mesh viewer (STL/OBJ/PLY) can export to the others. All
// pure string building — no dependency. Used via each mesh type's loadExports hook.

const f = (x) => (Math.round(x * 1e6) / 1e6).toString();

// ASCII STL.
export function toStl(model, name = 'mesh') {
  const out = ['solid ' + name];
  for (const t of model.tris) {
    const n = t.n || [0, 0, 0];
    out.push(' facet normal ' + f(n[0]) + ' ' + f(n[1]) + ' ' + f(n[2]));
    out.push('  outer loop');
    for (const v of t.v) out.push('   vertex ' + f(v[0]) + ' ' + f(v[1]) + ' ' + f(v[2]));
    out.push('  endloop');
    out.push(' endfacet');
  }
  out.push('endsolid ' + name);
  return out.join('\n') + '\n';
}

// Wavefront OBJ (vertices then triangular faces; 1-based indices).
export function toObj(model) {
  const verts = [], faces = [];
  let i = 1;
  for (const t of model.tris) {
    for (const v of t.v) verts.push('v ' + f(v[0]) + ' ' + f(v[1]) + ' ' + f(v[2]));
    faces.push('f ' + i + ' ' + (i + 1) + ' ' + (i + 2));
    i += 3;
  }
  return '# exported by file-viewer\n' + verts.join('\n') + '\n' + faces.join('\n') + '\n';
}

// ASCII PLY (one vertex triple per triangle corner; faces index them in groups of three).
export function toPly(model) {
  const n = model.tris.length;
  const head = [
    'ply', 'format ascii 1.0', 'comment exported by file-viewer',
    'element vertex ' + (n * 3), 'property float x', 'property float y', 'property float z',
    'element face ' + n, 'property list uchar int vertex_indices', 'end_header',
  ];
  const verts = [], faces = [];
  let i = 0;
  for (const t of model.tris) {
    for (const v of t.v) verts.push(f(v[0]) + ' ' + f(v[1]) + ' ' + f(v[2]));
    faces.push('3 ' + i + ' ' + (i + 1) + ' ' + (i + 2));
    i += 3;
  }
  return head.join('\n') + '\n' + verts.join('\n') + '\n' + faces.join('\n') + '\n';
}

// Build the export actions for a mesh, excluding its own format. `getModel` returns the parsed
// model lazily (only when an export runs).
export function meshExports(intake, getModel, ownFormat) {
  const base = (intake.filename || 'mesh').replace(/\.[^.]+$/, '');
  const all = [
    { fmt: 'stl', label: 'Download as STL', ext: 'stl', mime: 'model/stl', make: (m) => toStl(m, base) },
    { fmt: 'obj', label: 'Download as OBJ', ext: 'obj', mime: 'text/plain', make: toObj },
    { fmt: 'ply', label: 'Download as PLY', ext: 'ply', mime: 'text/plain', make: toPly },
  ];
  return all.filter((a) => a.fmt !== ownFormat).map((a) => ({
    label: a.label,
    run: async () => {
      const { downloadBlob } = await import('./exports.js');
      const model = await getModel();
      downloadBlob(a.make(model), base + '.' + a.ext, a.mime);
    },
  }));
}

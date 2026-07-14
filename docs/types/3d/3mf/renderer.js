import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { bounds, mountMeshView } from '../../../core/meshview.js';

const text = (node) => (node?.textContent || '').trim();
const attr = (node, name, fallback = '') => node?.getAttribute(name) ?? fallback;
const num = (node, name) => Number(attr(node, name, '0')) || 0;

function toBase64(bytes) {
  let value = '';
  for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(value);
}

function rgba(value) {
  const match = String(value || '').match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match) return [0.286, 0.471, 0.784, 1];
  return [
    parseInt(match[1].slice(0, 2), 16) / 255,
    parseInt(match[1].slice(2, 4), 16) / 255,
    parseInt(match[1].slice(4, 6), 16) / 255,
    match[2] ? parseInt(match[2], 16) / 255 : 1,
  ];
}

function transformFrom(value) {
  const values = String(value || '').trim().split(/\s+/).map(Number);
  return values.length === 12 && values.every(Number.isFinite)
    ? values
    : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
}

// 3MF stores a row-vector 4×3 affine transform as 12 numbers.
function transformPoint(point, matrix) {
  const [x, y, z] = point;
  return [
    x * matrix[0] + y * matrix[3] + z * matrix[6] + matrix[9],
    x * matrix[1] + y * matrix[4] + z * matrix[7] + matrix[10],
    x * matrix[2] + y * matrix[5] + z * matrix[8] + matrix[11],
  ];
}

function normal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const length = Math.hypot(...cross) || 1;
  return cross.map((value) => value / length);
}

function children(node, name) {
  return [...(node?.children || [])].filter((child) => child.localName === name || child.tagName === name);
}

function metadataEntries(doc) {
  return [...doc.getElementsByTagName('metadata')].map((node) => ({
    name: attr(node, 'name', 'Metadata'),
    value: text(node),
  })).filter((entry) => entry.value);
}

function geometryFrom(doc, objects, materialSets) {
  const objectById = new Map(objects.map((object) => [object.id, object.node]));
  const groups = [];
  const groupByMaterial = new Map();
  const groupFor = (pid, pindex) => {
    const key = `${pid}:${pindex}`;
    if (groupByMaterial.has(key)) return groupByMaterial.get(key);
    const material = materialSets.get(pid)?.[pindex] || { name: 'Default', color: '' };
    const index = groups.length;
    groups.push({ id: material.name || `material_${key}`, color: rgba(material.color) });
    groupByMaterial.set(key, index);
    return index;
  };
  const tris = [];

  function addObject(objectId, parentTransform, stack = new Set()) {
    const object = objectById.get(objectId);
    if (!object || stack.has(objectId)) return;
    const nextStack = new Set(stack); nextStack.add(objectId);
    const mesh = children(object, 'mesh')[0];
    if (mesh) {
      const verticesNode = children(mesh, 'vertices')[0];
      const vertices = children(verticesNode, 'vertex').map((vertex) => [num(vertex, 'x'), num(vertex, 'y'), num(vertex, 'z')]);
      const objectPid = attr(object, 'pid');
      const objectIndex = Math.max(0, Math.trunc(Number(attr(object, 'pindex', '0'))) || 0);
      const trianglesNode = children(mesh, 'triangles')[0];
      children(trianglesNode, 'triangle').forEach((triangle) => {
        const indices = ['v1', 'v2', 'v3'].map((name) => Math.trunc(num(triangle, name)));
        if (!indices.every((index) => vertices[index])) return;
        const points = indices.map((index) => transformPoint(vertices[index], parentTransform));
        const pid = attr(triangle, 'pid', objectPid);
        const pindex = Math.max(0, Math.trunc(Number(attr(triangle, 'p1', String(objectIndex)))) || 0);
        const groupIdx = groupFor(pid, pindex);
        tris.push({ v: points, n: normal(...points), color: groups[groupIdx].color, groupIdx });
      });
    }
    const components = children(object, 'components')[0];
    children(components, 'component').forEach((component) => {
      const local = transformFrom(attr(component, 'transform'));
      // Compose without allocating a matrix: map local coordinates first, then the parent space.
      const composed = composeTransforms(local, parentTransform);
      addObject(attr(component, 'objectid'), composed, nextStack);
    });
  }

  const build = [...doc.getElementsByTagName('build')][0];
  const items = children(build, 'item');
  if (items.length) {
    items.forEach((item) => addObject(attr(item, 'objectid'), transformFrom(attr(item, 'transform'))));
  } else {
    objects.filter((object) => children(object.node, 'mesh').length).forEach((object) => addObject(object.id, transformFrom('')));
  }
  return { tris, groups };
}

function composeTransforms(local, parent) {
  const origin = transformPoint(transformPoint([0, 0, 0], local), parent);
  const x = transformPoint(transformPoint([1, 0, 0], local), parent);
  const y = transformPoint(transformPoint([0, 1, 0], local), parent);
  const z = transformPoint(transformPoint([0, 0, 1], local), parent);
  return [
    x[0] - origin[0], x[1] - origin[1], x[2] - origin[2],
    y[0] - origin[0], y[1] - origin[1], y[2] - origin[2],
    z[0] - origin[0], z[1] - origin[1], z[2] - origin[2],
    ...origin,
  ];
}

export async function parse3mf(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const modelEntry = zip.file('3D/3dmodel.model');
  if (!modelEntry) throw new Error('Missing 3D/3dmodel.model');
  const xml = await modelEntry.async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid 3MF model XML');
  const root = doc.documentElement;
  const metadata = metadataEntries(doc);
  const objects = [...doc.getElementsByTagName('object')].map((node) => ({
    id: attr(node, 'id'),
    name: attr(node, 'name'),
    type: attr(node, 'type', 'model'),
    node,
  }));
  const materialSets = new Map([...doc.getElementsByTagName('basematerials')].map((set) => [
    attr(set, 'id'),
    children(set, 'base').map((base) => ({ name: attr(base, 'name'), color: attr(base, 'displaycolor') })),
  ]));
  const materials = [...materialSets.values()].flat();
  const geometry = geometryFrom(doc, objects, materialSets);
  const thumbName = Object.keys(zip.files).find((name) => /(^|\/)thumbnail\.png$/i.test(name) && !zip.files[name].dir);
  const thumbBytes = thumbName ? await zip.file(thumbName).async('uint8array') : null;
  const title = metadata.find((entry) => entry.name.toLowerCase() === 'title')?.value || '';
  const designer = metadata.find((entry) => entry.name.toLowerCase() === 'designer')?.value || '';
  return {
    ...geometry,
    ...bounds(geometry.tris),
    title,
    designer,
    unit: attr(root, 'unit', 'millimeter'),
    objects: objects.map(({ node, ...object }) => object),
    materials,
    metadata,
    thumbnail: thumbBytes ? 'data:image/png;base64,' + toBase64(thumbBytes) : '',
  };
}

export async function render(intake, _ctx) {
  let model;
  try { model = await parse3mf(intake); }
  catch (error) {
    const host = document.createElement('div'); host.className = 'stl-doc';
    const message = document.createElement('p'); message.className = 'stl-empty';
    message.textContent = `Could not read 3MF: ${error?.message || error}`;
    host.append(message);
    return { parentNode: host };
  }
  model._filename = intake.filename;
  model.extraStats = [
    ['Format', '3MF'],
    ['Title', model.title || '—'],
    ['Designer', model.designer || '—'],
    ['Unit', model.unit],
    ['Objects', model.objects.map((object) => object.name || `Object ${object.id}`).join(', ') || '—'],
    ['Materials', model.materials.map((material) => `${material.name || 'Material'} ${material.color || ''}`.trim()).join(', ') || '—'],
    ...model.metadata.filter((entry) => !/^(title|designer)$/i.test(entry.name)).map((entry) => [`3MF ${entry.name}`, entry.value]),
    ...(model.thumbnail ? [['Thumbnail', 'embedded PNG']] : []),
  ];
  const info = `${model.tris.length.toLocaleString()} triangles · ${model.objects.length.toLocaleString()} objects · ${model.unit}`;
  return mountMeshView(model, info);
}

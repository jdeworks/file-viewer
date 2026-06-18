// glTF 2.0 / GLB parser → triangle mesh for the shared mesh viewer. Self-contained files only:
// GLB (binary, embeds its buffer) and .gltf whose buffers use data: URIs — an external .bin can't
// be fetched (single-file open + zero-off-origin), so those primitives are skipped. Reads the
// POSITION accessor + indices for TRIANGLE primitives, applies the scene node transforms, and
// computes flat per-face normals. No materials/animation/sparse-accessor support. Pure JS.
import { bounds } from '../../../core/meshview.js';

const CT = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
const CSZ = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function decodeBase64(uri) {
  const b64 = uri.slice(uri.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Split a GLB into { json, bin }. GLB = 12-byte header + chunks (len, type, data).
function parseGLB(bytes) {
  if (!bytes || bytes.length < 20) throw new Error('GLB is too short to contain a header and JSON chunk');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');   // 'glTF'
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new Error('Unsupported GLB version ' + version + ' (expected 2)');
  const declaredLength = dv.getUint32(8, true);
  if (declaredLength !== bytes.length) {
    throw new Error(`Invalid GLB length: header says ${declaredLength.toLocaleString()} bytes, file has ${bytes.length.toLocaleString()}`);
  }
  let o = 12, json = null, bin = null;
  while (o + 8 <= bytes.length) {
    const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true);
    if (o + 8 + len > bytes.length) throw new Error('GLB chunk extends past end of file');
    if (o === 12 && type !== 0x4e4f534a) throw new Error('GLB first chunk is not JSON');
    const data = bytes.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));     // 'JSON'
    else if (type === 0x004e4942) bin = data;                                        // 'BIN\0'
    o += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

function getBuffers(gltf, glbBin) {
  return (gltf.buffers || []).map((b) => {
    if (!b.uri) return glbBin || null;                         // GLB embedded buffer
    if (/^data:/.test(b.uri)) return decodeBase64(b.uri);      // embedded data URI
    return null;                                               // external .bin — unavailable
  });
}

function readAccessor(gltf, buffers, idx) {
  const acc = gltf.accessors[idx];
  const bv = gltf.bufferViews[acc.bufferView];
  const buf = buffers[bv.buffer];
  if (!buf) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ncomp = NCOMP[acc.type] || 1;
  const csz = CSZ[acc.componentType];
  const stride = bv.byteStride || csz * ncomp;
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const get = CT[acc.componentType];
  const rows = [];
  for (let i = 0; i < acc.count; i++) {
    const row = [];
    for (let c = 0; c < ncomp; c++) row.push(dv[get](base + i * stride + c * csz, true));
    rows.push(ncomp === 1 ? row[0] : row);
  }
  return rows;
}

// ── mat4 (column-major) ──
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function fromTRS(t, q, s) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function nodeMatrix(n) { return n.matrix ? n.matrix.slice() : fromTRS(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]); }
function tp(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }

function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vnorm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

export function parseGLTF(intake) {
  let gltf, glbBin = null;
  const bytes = intake.bytes;
  if (bytes && bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    ({ json: gltf, bin: glbBin } = parseGLB(bytes));
  } else {
    gltf = JSON.parse(intake.text || new TextDecoder().decode(bytes));
  }
  const buffers = getBuffers(gltf, glbBin);
  const tris = [];
  const stats = {
    assetVersion: (gltf.asset && gltf.asset.version) || '',
    generator: (gltf.asset && gltf.asset.generator) || '',
    sceneCount: (gltf.scenes || []).length,
    nodeCount: (gltf.nodes || []).length,
    meshCount: (gltf.meshes || []).length,
    materialCount: (gltf.materials || []).length,
    animationCount: (gltf.animations || []).length,
    bufferCount: (gltf.buffers || []).length,
    externalBufferCount: (gltf.buffers || []).filter((b) => b.uri && !/^data:/.test(b.uri)).length,
    primitiveCount: 0,
    renderedPrimitiveCount: 0,
  };

  const addMesh = (meshIdx, matrix) => {
    const mesh = gltf.meshes[meshIdx];
    if (!mesh) return;
    for (const prim of mesh.primitives || []) {
      stats.primitiveCount++;
      if (prim.mode !== undefined && prim.mode !== 4) continue;          // TRIANGLES only
      if (prim.attributes.POSITION == null) continue;
      const pos = readAccessor(gltf, buffers, prim.attributes.POSITION);
      if (!pos) continue;
      const verts = pos.map((p) => tp(matrix, p));
      const idx = prim.indices != null ? readAccessor(gltf, buffers, prim.indices) : verts.map((_, i) => i);
      if (!idx) continue;
      stats.renderedPrimitiveCount++;
      for (let i = 0; i + 2 < idx.length; i += 3) {
        const a = verts[idx[i]], b = verts[idx[i + 1]], c = verts[idx[i + 2]];
        if (a && b && c) tris.push({ v: [a, b, c], n: vnorm(vcross(vsub(b, a), vsub(c, a))) });
      }
    }
  };

  const walk = (nodeIdx, parent) => {
    const node = gltf.nodes[nodeIdx];
    if (!node) return;
    const m = mul(parent, nodeMatrix(node));
    if (node.mesh != null) addMesh(node.mesh, m);
    for (const child of node.children || []) walk(child, m);
  };

  const scene = gltf.scenes ? gltf.scenes[gltf.scene || 0] : null;
  if (scene && scene.nodes) for (const n of scene.nodes) walk(n, IDENT);
  else if (gltf.nodes) gltf.nodes.forEach((_, i) => walk(i, IDENT));     // no scene — render all nodes
  else if (gltf.meshes) gltf.meshes.forEach((_, i) => addMesh(i, IDENT));

  return { tris, ...stats, ...bounds(tris) };
}

import { parseGLTF } from './gltflib.js';

export function extract(intake) {
  try {
    const m = parseGLTF(intake);
    const isGlb = intake.bytes && intake.bytes[0] === 0x67 && intake.bytes[1] === 0x6c;
    return [
      { label: 'Format', value: isGlb ? 'GLB (binary glTF)' : 'glTF (JSON)' },
      ...(m.assetVersion ? [{ label: 'glTF version', value: m.assetVersion }] : []),
      ...(m.generator ? [{ label: 'Generator', value: m.generator }] : []),
      { label: 'Scenes', value: m.sceneCount.toLocaleString() },
      { label: 'Nodes', value: m.nodeCount.toLocaleString() },
      { label: 'Meshes', value: m.meshCount.toLocaleString() },
      { label: 'Primitives', value: `${m.renderedPrimitiveCount.toLocaleString()} rendered / ${m.primitiveCount.toLocaleString()} total` },
      { label: 'Materials', value: m.materialCount.toLocaleString() },
      ...(m.materialColorCount ? [{ label: 'Base-color materials', value: m.materialColorCount.toLocaleString() }] : []),
      { label: 'Animations', value: m.animationCount.toLocaleString() },
      { label: 'Buffers', value: m.externalBufferCount ? `${m.bufferCount.toLocaleString()} (${m.externalBufferCount.toLocaleString()} external)` : m.bufferCount.toLocaleString() },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch (e) {
    return [
      { label: 'glTF', value: 'unreadable' },
      { label: 'Parse error', value: e.message || String(e) },
    ];
  }
}

export const plugin = {
  id: 'wgsl-shader',
  label: 'WGSL Shader',
  tags: ['wgsl', 'webgpu', 'shader', 'graphics'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.wgsl');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'WGSL (WebGPU Shading Language) is the shading language for WebGPU. Shader files define vertex, fragment, and compute entry points with typed bindings and built-in functions.',
    usedFor: [{ label: 'WebGPU WGSL spec', description: 'W3C WebGPU Shading Language specification', href: 'https://www.w3.org/TR/WGSL/' }],
  },
};
export default plugin;

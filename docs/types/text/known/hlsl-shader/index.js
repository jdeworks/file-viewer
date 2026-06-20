const HLSL_EXTS = new Set(['.hlsl', '.fx', '.vsh', '.psh']);

export const plugin = {
  id: 'hlsl-shader',
  label: 'HLSL Shader',
  tags: ['hlsl', 'directx', 'shader', 'graphics', 'gpu'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    if (dot !== -1 && HLSL_EXTS.has(name.slice(dot))) return true;
    const text = intake.text || '';
    if (/SV_Position|SV_Target|SV_Depth/.test(text)) return true;
    if (/cbuffer\s+\w+/.test(text)) return true;
    if (/Texture2D\s|Texture3D\s|SamplerState\s/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HLSL (High-Level Shading Language) is the shading language for DirectX. Shader programs define vertex, pixel, and compute entry points with typed constant buffers, textures, and semantic annotations.',
    usedFor: [{ label: 'HLSL reference', description: 'Microsoft DirectX HLSL documentation', href: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl' }],
  },
};
export default plugin;

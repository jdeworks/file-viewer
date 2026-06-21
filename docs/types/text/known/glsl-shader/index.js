const GLSL_EXTS = new Set(['.glsl', '.vert', '.frag', '.geom', '.comp', '.tese', '.tesc']);

export const plugin = {
  id: 'glsl-shader',
  label: 'GLSL Shader',
  tags: ['glsl', 'opengl', 'shader', 'graphics', 'gpu'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const dot = name.lastIndexOf('.');
    if (dot !== -1 && GLSL_EXTS.has(name.slice(dot))) return true;
    // The content heuristic (void main + GL builtins) appears in C-family languages (D, Dart,
    // etc.). Only content-match files with no/unknown extension (a bare extension guard).
    if (dot !== -1) return false;
    const text = intake.text || '';
    if (/void\s+main\s*\(\s*\)/.test(text)) {
      if (/gl_Position|gl_FragColor|gl_FragDepth|uniform\s|attribute\s|varying\s|\bin\s+\w|\bout\s+\w|texture\s*\(|sampler2D|samplerCube/.test(text)) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GLSL (OpenGL Shading Language) is the C-like shading language for OpenGL. Shader programs run on the GPU and transform vertex positions, shade fragments, and perform compute operations.',
    usedFor: [{ label: 'GLSL specification', description: 'Khronos OpenGL Shading Language reference', href: 'https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.pdf' }],
  },
};
export default plugin;

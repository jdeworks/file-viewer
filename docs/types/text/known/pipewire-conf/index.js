export default {
  id: 'pipewire-conf',
  label: 'PipeWire Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'pipewire.conf' || n === 'client.conf' || n === 'jack.conf' || n === 'client-rt.conf') return true;
    const text = intake.textSample || intake.text || '';
    // PipeWire uses SPA JSON-like syntax with context.properties, context.spa-libs, context.modules
    if (text.includes('context.properties') && (text.includes('core.daemon') || text.includes('link.max-buffers'))) return true;
    if (text.includes('context.modules') && text.includes('libpipewire-module-')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PipeWire audio/video server configuration — properties, modules, and session management.',
    tags: ['audio', 'video', 'pipewire', 'wayland', 'linux', 'config'],
  },
};

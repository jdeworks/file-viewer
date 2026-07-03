export default {
  id: 'pipewire-conf',
  label: 'PipeWire Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'pipewire.conf' || n === 'jack.conf' || n === 'client-rt.conf') return true;
    const text = intake.textSample || intake.text || '';
    // PipeWire uses SPA JSON-like syntax with context.properties, context.spa-libs, context.modules
    if (text.includes('context.properties') && (text.includes('core.daemon') || text.includes('link.max-buffers'))) return true;
    if (text.includes('context.modules') && text.includes('libpipewire-module-')) return true;
    // client.conf is ambiguous: both PipeWire (~/.config/pipewire/client.conf) and PulseAudio
    // (~/.config/pulse/client.conf) use that exact filename — require PipeWire-specific content
    // so this doesn't shadow the pulseaudio-conf plugin's client.conf detection.
    if (n === 'client.conf' && (text.includes('context.properties') || text.includes('libpipewire-module-'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PipeWire audio/video server configuration — properties, modules, and session management.',
    tags: ['audio', 'video', 'pipewire', 'wayland', 'linux', 'config'],
  },
};

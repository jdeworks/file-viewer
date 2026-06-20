export default {
  id: 'pulseaudio-conf',
  label: 'PulseAudio Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'daemon.conf' || n === 'default.pa' || n === 'client.conf' || n === 'system.pa') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('default-sample-format') && text.includes('default-sample-rate')) return true;
    if (n === 'daemon.conf' && text.includes('resample-method')) return true;
    // default.pa signals
    if (text.includes('load-module module-') && text.includes('set-default-sink')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PulseAudio sound server configuration — daemon settings, modules, sinks, and sources.',
    tags: ['audio', 'pulseaudio', 'sound', 'linux', 'config'],
  },
};

export default {
  id: 'frigate-config',
  label: 'Frigate NVR Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'frigate.yml' || n === 'frigate.yaml') return true;
    // config.yml only if content matches
    if (n === 'config.yml' || n === 'config.yaml') {
      const t = intake.text || '';
      return t.includes('cameras:') && (t.includes('detectors:') || t.includes('mqtt:') || t.includes('ffmpeg:'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Frigate NVR (Network Video Recorder) configuration — defines cameras, detectors, MQTT, recording, and object tracking.',
    usedFor: [
      { label: 'Frigate NVR', description: 'Configure Frigate, the open source AI-powered network video recorder with real-time object detection.', href: 'https://docs.frigate.video/' },
    ],
  },
};

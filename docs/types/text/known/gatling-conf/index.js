export default {
  id: 'gatling-conf',
  label: 'Gatling Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'gatling.conf') return true;
    if (n === 'application.conf') {
      // only match if file mentions gatling in first 500 chars
      const head = (intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 500)) : '')).slice(0, 500);
      return /gatling/i.test(head);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Gatling load testing configuration — HOCON format defining simulation directories, output paths, HTTP settings, and data writers.' },
};

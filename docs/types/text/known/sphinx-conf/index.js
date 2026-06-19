export default {
  id: 'sphinx-conf',
  label: 'Sphinx Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'conf.py') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    return /extensions\s*=/.test(text) || /html_theme\s*=/.test(text) || /sphinx/i.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Sphinx documentation generator configuration — defines project metadata, extensions, and HTML theme.' },
};

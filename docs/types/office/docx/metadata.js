import { loadGlobal, vendor } from '../../../core/script-loader.js';

function xmlText(doc, local) {
  const el = [...doc.getElementsByTagName('*')].find((n) => n.localName === local);
  return el ? (el.textContent || '').trim() : '';
}

function parseXml(text) {
  if (!text) return null;
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  return doc.getElementsByTagName('parsererror').length ? null : doc;
}

export async function extract(intake) {
  const [mammoth, JSZip] = await Promise.all([
    loadGlobal(vendor('mammoth/mammoth.browser.min.js'), 'mammoth'),
    loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip'),
  ]);
  const [{ value: text }, zip] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: intake.bytes.slice().buffer }),
    JSZip.loadAsync(intake.bytes),
  ]);
  const words = (text.match(/\S+/g) || []).length;
  const paras = text.split(/\n{2,}/).filter((p) => p.trim()).length;
  const core = parseXml(zip.file('docProps/core.xml') ? await zip.file('docProps/core.xml').async('string') : '');
  const app = parseXml(zip.file('docProps/app.xml') ? await zip.file('docProps/app.xml').async('string') : '');
  const rows = [];
  const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };
  if (core) {
    add('Title', xmlText(core, 'title'));
    add('Author', xmlText(core, 'creator'));
    add('Subject', xmlText(core, 'subject'));
    add('Keywords', xmlText(core, 'keywords'));
    add('Last modified by', xmlText(core, 'lastModifiedBy'));
    add('Created', xmlText(core, 'created'));
    add('Modified', xmlText(core, 'modified'));
  }
  if (app) {
    add('Pages', xmlText(app, 'Pages'));
    add('Template', xmlText(app, 'Template'));
    add('Application', xmlText(app, 'Application'));
    add('Company', xmlText(app, 'Company'));
  }
  add('Words', words);
  add('Paragraphs', paras);
  add('Characters', text.length);
  add('Read time', Math.max(1, Math.round(words / 200)) + ' min');
  return rows;
}

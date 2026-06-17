import { loadPptxViewer } from './pptxlib.js';
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
  const rows = [];
  const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };
  let slideCount = 0;
  try {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes);
    const core = parseXml(zip.file('docProps/core.xml') ? await zip.file('docProps/core.xml').async('string') : '');
    const app = parseXml(zip.file('docProps/app.xml') ? await zip.file('docProps/app.xml').async('string') : '');
    const pres = parseXml(zip.file('ppt/presentation.xml') ? await zip.file('ppt/presentation.xml').async('string') : '');
    slideCount = pres ? [...pres.getElementsByTagName('*')].filter((n) => n.localName === 'sldId').length : 0;
    if (app && !slideCount) slideCount = Number(xmlText(app, 'Slides')) || 0;
    add('Slides', slideCount);
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
      add('Application', xmlText(app, 'Application'));
      add('Company', xmlText(app, 'Company'));
      add('Paragraphs', xmlText(app, 'Paragraphs'));
      add('Words', xmlText(app, 'Words'));
    }
  } catch {
    const PPTXViewer = await loadPptxViewer();
    const viewer = new PPTXViewer({});   // no canvas: avoids auto-render before loadFile
    await viewer.loadFile(intake.bytes.slice());
    slideCount = viewer.getSlideCount();
    viewer.destroy?.();
    add('Slides', slideCount);
  }
  return rows;
}

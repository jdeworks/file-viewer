import { loadPptxViewer } from './pptxlib.js';

export async function extract(intake) {
  const PPTXViewer = await loadPptxViewer();
  const viewer = new PPTXViewer({});   // no canvas: avoids auto-render before loadFile
  await viewer.loadFile(intake.bytes.slice());
  const count = viewer.getSlideCount();
  viewer.destroy?.();
  return [{ label: 'Slides', value: String(count) }];
}

import { parse3mf } from './renderer.js';

export async function extract(intake) {
  try {
    const model = await parse3mf(intake);
    return [
      { label: 'Format', value: '3MF' },
      ...(model.title ? [{ label: 'Title', value: model.title }] : []),
      ...(model.designer ? [{ label: 'Designer', value: model.designer }] : []),
      { label: 'Unit', value: model.unit },
      { label: 'Objects', value: String(model.objects.length) },
      { label: 'Materials', value: String(model.materials.length) },
      ...(model.thumbnail ? [{ label: 'Thumbnail', value: 'embedded PNG' }] : []),
    ];
  } catch {
    return [{ label: '3MF', value: 'unreadable' }];
  }
}

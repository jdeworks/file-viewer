export function extract(intake) {
  let nb;
  try { nb = JSON.parse(intake.text || ''); } catch { return [{ label: 'Valid notebook', value: 'no' }]; }
  const cells = nb.cells || (nb.worksheets && nb.worksheets[0] && nb.worksheets[0].cells) || [];
  let code = 0, markdown = 0, raw = 0;
  for (const c of cells) {
    if (c.cell_type === 'code') code++;
    else if (c.cell_type === 'markdown') markdown++;
    else raw++;
  }
  const ks = (nb.metadata && nb.metadata.kernelspec) || {};
  const li = (nb.metadata && nb.metadata.language_info) || {};
  const lang = ks.language || li.name || 'unknown';
  return [
    { label: 'Format', value: 'nbformat ' + (nb.nbformat != null ? nb.nbformat : '?') },
    { label: 'Kernel', value: ks.display_name || lang },
    { label: 'Cells', value: String(cells.length) },
    { label: 'Code / Markdown', value: code + ' / ' + markdown },
  ];
}

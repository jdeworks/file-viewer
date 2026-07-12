export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function originalDocxDownload(intake) {
  return {
    bytes: intake.bytes,
    filename: intake.filename || 'document.docx',
    mime: intake.mime || DOCX_MIME,
  };
}

export function rebuiltDocxFilename(filename) {
  const base = (filename || 'document').replace(/\.[^.]+$/, '');
  return base + '-rebuilt.docx';
}

export function docxContentIsDirty(baselineHtml, currentHtml) {
  return typeof baselineHtml === 'string' && typeof currentHtml === 'string'
    && baselineHtml !== currentHtml;
}

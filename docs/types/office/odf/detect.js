import { hasExtension } from '../../../core/detect.js';

// OpenDocument text (.odt) and presentation (.odp). These are ZIP+XML like the Office formats;
// .ods (spreadsheet) is handled by the SheetJS-backed xlsx type, so it's not claimed here.
export function detect(intake) {
  if (hasExtension(intake, 'odt', 'odp', 'fodt', 'fodp')) return 0.95;
  return 0;
}

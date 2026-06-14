import { hasExtension, mimeMatches } from '../../../core/detect.js';

// Spreadsheets are binary (xlsx/ods are zips, xls is OLE). Extension/MIME drive detection;
// content sniffing would require unzipping, so we keep it to reliable signals.
export function detect(intake) {
  if (hasExtension(intake, 'xlsx', 'xls', 'xlsm', 'xlsb', 'ods')) return 0.95;
  if (mimeMatches(intake, 'spreadsheet', 'excel', 'ms-excel')) return 0.9;
  return 0;
}

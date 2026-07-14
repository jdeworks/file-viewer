import { validateDbf } from './validate.js';

export function extractMetadata(intake) {
  const result = validateDbf(intake);
  if (!result.valid) {
    return {
      Format: result.versionName ? 'dBase / DBF (invalid)' : 'Unrecognized data',
      ...(result.versionName ? { Version: result.versionName } : {}),
      Error: result.error,
    };
  }
  return {
    Format: 'dBase / DBF',
    Version: result.versionName,
    Records: String(result.numRecords),
    Fields: String(result.fields.length),
    'Last update': result.lastUpdate,
  };
}

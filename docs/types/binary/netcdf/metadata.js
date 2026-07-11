import { parseNetcdfHeader } from './parser.js';

export function extractMetadata(intake) {
  const bytes = intake.bytes;
  if (!bytes || bytes.length < 8) return {};
  if (!(bytes[0] === 0x43 && bytes[1] === 0x44 && bytes[2] === 0x46 && (bytes[3] === 1 || bytes[3] === 2))) return {};

  const fields = {
    Format: bytes[3] === 1 ? 'NetCDF-3 Classic' : 'NetCDF-3 64-bit Offset',
  };
  try {
    const parsed = parseNetcdfHeader(bytes);
    fields.Dimensions = String(parsed.dimensions.length);
    fields.Variables = String(parsed.variables.length);
    for (const attribute of parsed.globalAttrs) {
      if (attribute.name.toLowerCase() === 'title' && attribute.value) fields.Title = attribute.value;
      if (attribute.name.toLowerCase() === 'institution' && attribute.value) fields.Institution = attribute.value;
    }
  } catch {
    // Keep the magic-derived format field, but never surface counts from a malformed header.
  }
  return fields;
}

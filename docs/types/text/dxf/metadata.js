export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const fields = {};

  let currentVar = null;
  let inHeader = false;
  let sectionPending = false;
  let entityCounts = {};
  let inEntities = false;

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trim();
    if (isNaN(code)) continue;

    if (code === 0 && value === 'SECTION') { sectionPending = true; continue; }
    if (code === 2 && sectionPending) {
      sectionPending = false;
      inHeader   = value === 'HEADER';
      inEntities = value === 'ENTITIES';
      continue;
    }
    if (code === 0 && value === 'ENDSEC') { inHeader = false; inEntities = false; continue; }
    if (code === 0 && value === 'EOF') break;

    if (inHeader) {
      if (code === 9) { currentVar = value; }
      else if (currentVar) {
        if (currentVar === '$ACADVER') fields['Version'] = value;
        if (currentVar === '$INSUNITS') {
          const UNITS = {1:'Inches',2:'Feet',4:'Millimeters',5:'Centimeters',6:'Meters'};
          const u = UNITS[parseInt(value, 10)];
          if (u) fields['Units'] = u;
        }
        currentVar = null;
      }
    }
    if (inEntities && code === 0 && value && value !== 'ENDSEC') {
      entityCounts[value] = (entityCounts[value] || 0) + 1;
    }
  }

  const total = Object.values(entityCounts).reduce((s, n) => s + n, 0);
  if (total > 0) fields['Entities'] = String(total);

  return fields;
}

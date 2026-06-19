export function extractMetadata(intake) {
  const text = intake.text || '';
  const fields = {};
  const headerM = text.match(/^HEADER\s{4}(.{40})\s(.{9})\s{3}(.{4})/m);
  if (headerM) {
    const molType = headerM[1].trim();
    const date = headerM[2].trim();
    const id = headerM[3].trim();
    if (id) fields['PDB ID'] = id;
    if (molType) fields['Molecule Type'] = molType;
    if (date) fields['Deposition Date'] = date;
  }
  const expdtaM = text.match(/^EXPDTA\s{4}(.+)/m);
  if (expdtaM) fields['Experimental Method'] = expdtaM[1].trim();
  const resM = text.match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROMS/i);
  if (resM) fields['Resolution'] = resM[1] + ' Å';
  const atomCount = (text.match(/^ATOM\s/gm) || []).length;
  if (atomCount) fields['ATOM Records'] = String(atomCount);
  return fields;
}

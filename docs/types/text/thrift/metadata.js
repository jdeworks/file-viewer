export async function loadMetadata(intake) {
  const text = intake.text || '';
  const namespaces = [];
  const nsRe = /^namespace\s+(\w+)\s+(\S+)/mg;
  let m;
  while ((m = nsRe.exec(text)) !== null) {
    namespaces.push({ lang: m[1], ns: m[2] });
  }
  const structs = (text.match(/^struct\s+\w+/mg) || []).length;
  const services = (text.match(/^service\s+\w+/mg) || []).length;
  const enums = (text.match(/^enum\s+\w+/mg) || []).length;
  const exceptions = (text.match(/^exception\s+\w+/mg) || []).length;
  return {
    namespaces,
    structCount: structs,
    serviceCount: services,
    enumCount: enums,
    exceptionCount: exceptions,
  };
}

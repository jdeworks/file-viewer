// pom.xml enhancement (Maven): parse the project coordinates and <dependencies>, linking each to
// mvnrepository.com. An XML file whose schema we understand.
export default {
  id: 'pom-xml',
  label: 'pom.xml (Maven)',
  match: (intake, baseType) => baseType.id === 'xml' && /(^|\/)pom\.xml$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};

export default {
  id: 'spdx-sbom',
  label: 'SPDX SBOM',
  match(intake, _baseType) {
    const fn = intake.filename || '';
    const text = intake.text || intake.textSample || '';
    if (/\.spdx$/i.test(fn)) return true;
    return text.startsWith('SPDXVersion:') || text.includes('SPDXID: SPDXRef-DOCUMENT');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SPDX Software Bill of Materials — packages, licenses, and document info.',
    usedFor: [{ label: 'SBOM', description: 'SPDX (Software Package Data Exchange) is an open standard for communicating software bill of material information.', href: 'https://spdx.dev/' }],
  },
};

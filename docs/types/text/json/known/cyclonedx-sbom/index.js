export default {
  id: 'cyclonedx-sbom',
  label: 'CycloneDX SBOM',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const text = intake.text || intake.textSample || '';
    return text.includes('"bomFormat":"CycloneDX"') || text.includes('"bomFormat": "CycloneDX"');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CycloneDX Software Bill of Materials — components, licenses, and vulnerabilities.',
    usedFor: [{ label: 'SBOM', description: 'CycloneDX is a lightweight software bill of materials standard for application security contexts and supply chain component analysis.', href: 'https://cyclonedx.org/' }],
  },
};

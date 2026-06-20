export default {
  id: 'slsa-provenance',
  label: 'SLSA Provenance',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const text = intake.text || intake.textSample || '';
    if (text.includes('"_type":"https://in-toto.io/Statement/v0.1"') ||
        text.includes('"_type": "https://in-toto.io/Statement/v0.1"')) return true;
    return (text.includes('"buildType"') && text.includes('"builder"') &&
            (text.includes('slsa') || text.includes('provenance')));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SLSA provenance attestation — build info, subject digests, and dependency materials.',
    usedFor: [{ label: 'Supply chain security', description: 'SLSA (Supply-chain Levels for Software Artifacts) provenance describes how a software artifact was built.', href: 'https://slsa.dev/' }],
  },
};

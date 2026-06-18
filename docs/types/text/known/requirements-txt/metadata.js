import { parseRequirementsText, summarizeRequirements } from './parse.js';

export function extract(intake) {
  const entries = parseRequirementsText(intake.text || '');
  const stats = summarizeRequirements(entries);
  const unpinned = stats.requirements.filter((entry) => entry.pinKind === 'unpinned').map((entry) => entry.name);
  const extras = stats.requirements.filter((entry) => entry.extras.length).map((entry) => `${entry.name}[${entry.extras.join(',')}]`);
  const markers = stats.requirements.filter((entry) => entry.marker).map((entry) => `${entry.name}: ${entry.marker}`);
  const indexes = entries.filter((entry) => entry.kind === 'index').map((entry) => entry.raw);
  const findLinks = entries.filter((entry) => entry.kind === 'findLinks').map((entry) => entry.raw);
  return [
    { label: 'Packages', value: String(stats.packages) },
    { label: 'Pinned', value: String(stats.pinned) },
    { label: 'Constrained', value: String(stats.constrained) },
    { label: 'Unpinned', value: String(stats.unpinned) },
    { label: 'Unpinned packages', value: list(unpinned) },
    { label: 'Direct references', value: String(stats.directRefs) },
    { label: 'Extras', value: String(stats.extras) },
    { label: 'Extras detail', value: list(extras) },
    { label: 'Environment markers', value: String(stats.markers) },
    { label: 'Marker details', value: list(markers) },
    { label: 'Options', value: String(stats.options) },
    { label: 'Editable installs', value: String(stats.editable) },
    { label: 'Included files', value: String(stats.includes) },
    { label: 'Constraint files', value: String(stats.constraints) },
    { label: 'Index URLs', value: String(stats.indexes) },
    { label: 'Index options', value: list(indexes) },
    { label: 'Find links', value: String(stats.findLinks) },
    { label: 'Find-link options', value: list(findLinks) },
    { label: 'Hashes', value: String(stats.hashes) },
  ];
}

function list(values) {
  return values.length ? values.join(', ') : 'none';
}

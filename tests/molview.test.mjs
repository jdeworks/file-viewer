import assert from 'node:assert/strict';
import { zoomSelectionForStructure } from '../docs/core/molview.js';

const polymerWithOutliers = [
  'ATOM      1  CA  ALA A   1      10.000  10.000  10.000',
  'HETATM   2  O   HOH A 201      90.000  90.000  90.000',
].join('\n');
const smallMolecule = 'HETATM   1  C1  LIG A   1      10.000  10.000  10.000';

assert.deepEqual(zoomSelectionForStructure('pdb', polymerWithOutliers), { hetflag: false });
assert.deepEqual(zoomSelectionForStructure('pdb', smallMolecule), {});
assert.deepEqual(zoomSelectionForStructure('sdf', polymerWithOutliers), {});

console.log('molecular camera-selection regressions passed');

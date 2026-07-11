#!/usr/bin/env node
// Generates docs/examples/sample.pdb — a deterministic two-chain peptide with complete backbone
// atoms, realistic adjacent Cα spacing, and a nearby 12-atom demo ligand. It crosses the viewer's
// cartoon-style threshold and exercises ligand-aware framing without distant synthetic outliers.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const residueNames = ['ALA','GLY','SER','VAL','LEU','THR','ASP','LYS','ILE','ASN','GLU','PHE','ARG','TYR','PRO'];
const lines = [
  'HEADER    DEMO PEPTIDE STRUCTURE                  15-JAN-26   FV01',
  'TITLE     FILE VIEWER TWO-CHAIN PEPTIDE WITH DEMO LIGAND',
  'COMPND    MOL_ID: 1; MOLECULE: FILE VIEWER DEMO PEPTIDE; CHAIN: A, B;',
  'SOURCE    MOL_ID: 1; SYNTHETIC: YES; ORGANISM_SCIENTIFIC: SYNTHETIC CONSTRUCT;',
  'EXPDTA    X-RAY DIFFRACTION',
  'REMARK   2 RESOLUTION.    1.80 ANGSTROMS.',
  'HELIX    1 H1  ALA A    1  PRO A   15  1                                  15',
  'HELIX    2 H2  THR B    1  ASN B   10  1                                  10',
];
let serial = 1;
const atoms = [];

function atomLine(record, name, residue, chain, residueId, x, y, z, element, occupancy = 1, bFactor = 18) {
  return `${record.padEnd(6)}${String(serial++).padStart(5)} ${name.padStart(4)} ${residue.padStart(3)} ${chain}${String(residueId).padStart(4)}    `
    + `${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}`
    + `${occupancy.toFixed(2).padStart(6)}${bFactor.toFixed(2).padStart(6)}          ${element.padStart(2)}`;
}

function addChain(chain, count, yOffset, phase) {
  for (let index = 0; index < count; index++) {
    const residueId = index + 1;
    const residue = residueNames[(index + phase) % residueNames.length];
    const baseX = index * 3.8;
    const bend = Math.sin((index + phase) * 0.62);
    const z = Math.cos((index + phase) * 0.55) * 1.2;
    const coords = [
      ['N',  baseX,        yOffset + bend * 0.8,       z,       'N'],
      ['CA', baseX + 1.45, yOffset + 0.45 + bend,      z + 0.3, 'C'],
      ['C',  baseX + 2.82, yOffset + bend * 0.65,      z,       'C'],
      ['O',  baseX + 3.35, yOffset - 0.95 + bend * 0.5,z - 0.2, 'O'],
      ['CB', baseX + 1.38, yOffset + 1.85 + bend,      z + 1.0, 'C'],
    ];
    for (const [name, x, y, atomZ, element] of coords.filter(([name]) => residue !== 'GLY' || name !== 'CB')) {
      const line = atomLine('ATOM', name, residue, chain, residueId, x, y, atomZ, element);
      atoms.push({ record: 'ATOM', name, residue, chain, residueId, x, y, z: atomZ, element, serial: serial - 1 });
      lines.push(line);
    }
  }
  lines.push(`TER   ${String(serial++).padStart(5)}      ${residueNames[(count - 1 + phase) % residueNames.length]} ${chain}${String(count).padStart(4)}`);
}

addChain('A', 15, 0, 0);
addChain('B', 10, 8.2, 5);

const ligandCenter = { x: 28.2, y: 3.2, z: 1.4 };
const ligandAtoms = [
  ['P',0,0,0,'P'], ['O1P',1.4,0.2,0.1,'O'], ['O2P',-0.7,1.2,0.2,'O'], ['O3P',-0.6,-1.2,-0.1,'O'],
  ["O5'",0.6,0.3,1.4,'O'], ["C5'",1.5,0.8,2.2,'C'], ["C4'",2.6,0.0,2.6,'C'], ["O4'",3.5,0.8,3.2,'O'],
  ["C1'",4.4,0.0,3.7,'C'], ['N9',5.4,0.6,4.2,'N'], ['C8',6.5,0.0,4.5,'C'], ['N7',7.4,0.8,4.8,'N'],
];
const ligandSerials = [];
for (const [name, dx, dy, dz, element] of ligandAtoms) {
  lines.push(atomLine('HETATM', name, 'LIG', 'A', 501, ligandCenter.x + dx, ligandCenter.y + dy, ligandCenter.z + dz, element, 1, 22));
  ligandSerials.push(serial - 1);
}
for (let index = 1; index < ligandSerials.length; index++) {
  lines.push(`CONECT${String(ligandSerials[index - 1]).padStart(5)}${String(ligandSerials[index]).padStart(5)}`);
}
lines.push('END');

const output = lines.join('\n') + '\n';
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.pdb');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${atoms.length} polymer atoms, ${ligandAtoms.length} demo-ligand atoms)`);

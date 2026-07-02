#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const planPath = process.argv[2] || 'HELP_DOCS_AUDIT_PLAN.md';
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const sectionArg = process.argv.find((arg) => arg.startsWith('--section='));
const limit = Math.max(1, Number(limitArg?.slice('--limit='.length) || 5));
const wantedSection = sectionArg?.slice('--section='.length) || '';

const text = await readFile(planPath, 'utf8');
const sectionRe = /<!-- AUDIT_SECTION ([a-z0-9_-]+) START -->([\s\S]*?)<!-- AUDIT_SECTION \1 END -->/g;
const sections = [...text.matchAll(sectionRe)].map((match) => {
  const name = match[1];
  const body = match[2];
  const items = [...body.matchAll(/^- \[( |x|X)\] (.+)$/gm)].map((line) => ({
    section: name,
    checked: line[1].toLowerCase() === 'x',
    path: line[2].trim(),
  }));
  return { name, items };
});

if (!sections.length) {
  console.error(`Missing audit sections in ${planPath}`);
  process.exit(2);
}

const filtered = wantedSection
  ? sections.filter((section) => section.name === wantedSection)
  : sections;
if (!filtered.length) {
  console.error(`No audit section named ${wantedSection}`);
  process.exit(2);
}

let total = 0;
let checked = 0;
const unchecked = [];
for (const section of filtered) {
  const sectionUnchecked = section.items.filter((item) => !item.checked);
  total += section.items.length;
  checked += section.items.length - sectionUnchecked.length;
  unchecked.push(...sectionUnchecked);
  console.log(`${section.name}_total=${section.items.length}`);
  console.log(`${section.name}_checked=${section.items.length - sectionUnchecked.length}`);
  console.log(`${section.name}_unchecked=${sectionUnchecked.length}`);
}

console.log(`audit_total=${total}`);
console.log(`audit_checked=${checked}`);
console.log(`audit_unchecked=${unchecked.length}`);
for (const item of unchecked.slice(0, limit)) console.log(`${item.section}: ${item.path}`);

if (unchecked.length > 0) process.exit(1);

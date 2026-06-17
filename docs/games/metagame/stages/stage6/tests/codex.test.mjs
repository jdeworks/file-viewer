import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openEpub } from "../renderer.js";
import { defaultState } from "../state.js";
import { EPUB_PATH } from "../messages.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "../../../../../examples/metagame/stage6/protocols_of_the_entity.epub");

{
  const state = defaultState();
  const actionCalls = [];
  const viewerCalls = [];
  const achievements = [];
  const bells = [];

  openEpub({
    state,
    actions: { setAction: (...args) => actionCalls.push(args) },
    achievements: { unlockAchievement: (...args) => achievements.push(args) },
    bell: { push: (entry) => bells.push(entry) },
    viewer: { openFile: (...args) => viewerCalls.push(args) }
  });

  assert.deepEqual(actionCalls[0], [
    6,
    "protocol_ch9_read",
    { source: "stage6-codex", file: EPUB_PATH, chapter: 9 }
  ]);
  assert.equal(viewerCalls[0][0], EPUB_PATH);
  assert.equal(viewerCalls[0][1].source, "stage6");
  assert.equal("text" in viewerCalls[0][1], false);
  assert.equal("mime" in viewerCalls[0][1], false);
  assert.equal(state.boss.unlocked, true);
  assert.equal(achievements.length, 1);
  assert.equal(bells.length, 1);
}

{
  const entries = readZipEntries(readFileSync(fixturePath));
  assert.equal(entries[0].name, "mimetype");
  assert.equal(entries[0].method, 0);
  assert.equal(entries[0].text, "application/epub+zip");

  assert.match(entries.byName.get("META-INF/container.xml").text, /OEBPS\/content\.opf/);
  const opf = entries.byName.get("OEBPS/content.opf").text;
  assert.match(opf, /<dc:title>Protocols of the Entity<\/dc:title>/);
  assert.match(opf, /<dc:creator>Defragmenter Archive<\/dc:creator>/);
  assert.equal([...opf.matchAll(/<itemref /g)].length, 9);

  const nav = entries.byName.get("OEBPS/nav.xhtml").text;
  assert.match(nav, /Chapter 9: Refusal Is Still A Protocol/);

  const chapter9 = entries.byName.get("OEBPS/ch09.xhtml").text;
  assert.match(chapter9, /Phase 1 accepts Signal damage only when SYN is the first card/);
  assert.match(chapter9, /Phase 2 accepts Signal damage only after ACK/);
  assert.match(chapter9, /Phase 3 accepts Signal damage/);
  assert.match(chapter9, /SYN opens, ACK acknowledges, Signal resolves/);
}

console.log("stage6 codex tests passed");

function readZipEntries(bytes) {
  const entries = [];
  entries.byName = new Map();

  let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const compressed = bytes.subarray(dataStart, dataEnd);
    const data = method === 0 ? compressed : inflateRawSync(compressed);
    const entry = { name, method, text: data.toString("utf8") };
    entries.push(entry);
    entries.byName.set(name, entry);
    offset = dataEnd;
  }

  return entries;
}

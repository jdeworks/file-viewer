// stage-manifest.js — the lightweight, always-loaded index of all five metagame stages.
//
// The hub (nav, title, dev menu, bts path resolution) reads stage metadata from here WITHOUT pulling
// any stage's renderer graph. Each stage's full module (defaultState + mountStage + its ~6–16 modules)
// is fetched on demand via loadStage(id), so opening the Defragmenter loads only the ACTIVE stage's
// code instead of all five stages up front.
//
// This is the single hub-facing source of stage metadata. metagame.js validates each lazily-loaded
// stage's `stageMeta` against the matching entry here and throws on mismatch — and the games smoke
// traverses all five stages, so any drift fails the smoke automatically.
//
// Each LOADER imports the stage's BUNDLE (stage.generated.js), not its index.js: build/metagame/
// build.mjs collapses each stage's 6–16 source modules into that one same-origin ESM, so opening a
// stage is a single request instead of one-per-module. Sources stay modular under stageN/; the
// bundle is a committed *.generated.* artifact (regen: node scripts/gen-metagame-bundles.mjs).
//
// The lineup was deliberately reduced to the five stages that met the playtest bar. Protocol Codex
// moved from stage 6 to stage 5; the other retained stages kept their original numbers.

export const MANIFEST_FIELDS = ["id", "slug", "name", "btsPath", "requiredAction"];

export const STAGE_MANIFEST = [
  { id: 1, slug: "bit-foundry", name: "Bit Foundry", btsPath: "/docs/bts/bit_foundry.bts", requiredAction: "1.cheat_disabled" },
  { id: 2, slug: "glyph-dungeon", name: "Glyph Dungeon", btsPath: "/docs/bts/glyph_dungeon.bts", requiredAction: "2.search_passage" },
  { id: 3, slug: "memory-grid", name: "Memory Grid", btsPath: "/docs/bts/memory_grid.bts", requiredAction: "3.diff_key_restored" },
  { id: 4, slug: "fractal-bastion", name: "Fractal Bastion", btsPath: "/docs/bts/fractal_bastion.bts", requiredAction: "4.recursion_blueprint_read" },
  { id: 5, slug: "protocol-codex", name: "Protocol Codex", btsPath: "/docs/bts/protocol_codex.bts", requiredAction: "5.protocol_ch9_read" }
];

// Per-stage lazy loaders. The dynamic import() is what defers each stage's module graph.
const LOADERS = {
  1: () => import("./stages/stage1/stage.generated.js"),
  2: () => import("./stages/stage2/stage.generated.js"),
  3: () => import("./stages/stage3/stage.generated.js"),
  4: () => import("./stages/stage4/stage.generated.js"),
  5: () => import("./stages/stage5/stage.generated.js")
};

const moduleCache = new Map();

// Memoized: returns a Promise for the stage's full module namespace (defaultState/mountStage/…).
export function loadStage(id) {
  const n = Number(id);
  const loader = LOADERS[n];
  if (!loader) return Promise.reject(new Error(`Unknown metagame stage: ${id}`));
  if (!moduleCache.has(n)) moduleCache.set(n, loader());
  return moduleCache.get(n);
}

export function stageMetaFor(id) {
  return STAGE_MANIFEST.find((meta) => meta.id === Number(id)) || null;
}

export function listStageMetas() {
  return STAGE_MANIFEST.map((meta) => ({ ...meta }));
}

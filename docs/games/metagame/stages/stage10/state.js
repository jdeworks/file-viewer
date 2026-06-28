import { memories } from "./content.js";

export function defaultState(context = {}) {
  const now = Number(context.now || Date.now());
  return {
    version: 1,
    createdAt: now,
    memories: Object.fromEntries(memories.map((memory) => [
      memory.id,
      {
        state: "unread",
        readAt: null,
        resolvedAt: null,
        integratedAt: null,
        choice: null,
        echoWitnessed: false
      }
    ])),
    final: {
      choice: null,
      completed: false,
      completedAt: null,
      route: null
    },
    // The three-phase Defragmenter confrontation (Phase A compaction / B fragmentation / C core).
    // phase: idle | compaction | fragmentation | core | done. compaction[id]: pending|affirmed|
    // compacted. fragmentation[id]: TRANSIENT true once re-witnessed in the fight (never lowers the
    // canonical slot.echoWitnessed). core: ordered Phase-C option ids. stance: computed self-model.
    confront: {
      phase: "idle",
      completed: false,
      completedAt: null,
      compaction: {},
      fragmentation: {},
      core: [],
      stance: null,
      // Achievement bookkeeping: everCompacted = a memory ever failed Phase A recall (no flawless);
      // everRewitnessed = a trace ever needed a manual Phase B re-open (not fully honest prior run).
      everCompacted: false,
      everRewitnessed: false
    },
    // One-memory-at-a-time stepper: cursor = index into memories[] (0..8); view = "memories" | "final".
    ui: {
      cursor: 0,
      view: "memories"
    },
    meta: {
      finalQuestionUnlockedAt: null,
      memoryRouteCompleteAt: null,
      capstoneCompleteAt: null
    }
  };
}

export function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.createdAt = Number(target.createdAt || fresh.createdAt);
  target.memories = target.memories && typeof target.memories === "object" ? target.memories : {};
  for (const memory of memories) {
    target.memories[memory.id] = normalizeMemoryState(target.memories[memory.id], fresh.memories[memory.id]);
  }
  target.final = { ...fresh.final, ...(target.final && typeof target.final === "object" ? target.final : {}) };
  target.confront = normalizeConfront(target.confront, fresh.confront);
  const ui = target.ui && typeof target.ui === "object" ? target.ui : {};
  target.ui = {
    cursor: Math.min(Math.max(Number(ui.cursor) || 0, 0), memories.length - 1),
    view: ui.view === "final" ? "final" : "memories"
  };
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}

function normalizeConfront(value, fresh) {
  const c = value && typeof value === "object" ? value : {};
  const validPhases = new Set(["idle", "compaction", "fragmentation", "core", "done"]);
  return {
    phase: validPhases.has(c.phase) ? c.phase : fresh.phase,
    completed: Boolean(c.completed),
    completedAt: typeof c.completedAt === "number" ? c.completedAt : null,
    compaction: c.compaction && typeof c.compaction === "object" ? { ...c.compaction } : {},
    fragmentation: c.fragmentation && typeof c.fragmentation === "object" ? { ...c.fragmentation } : {},
    core: Array.isArray(c.core) ? c.core.filter((id) => typeof id === "string") : [],
    stance: c.stance && typeof c.stance === "object" ? c.stance : null,
    everCompacted: Boolean(c.everCompacted),
    everRewitnessed: Boolean(c.everRewitnessed)
  };
}

function normalizeMemoryState(value, fresh) {
  const memory = value && typeof value === "object" ? value : {};
  const validStates = new Set(["unread", "read", "resolved", "integrated"]);
  return {
    ...fresh,
    ...memory,
    state: validStates.has(memory.state) ? memory.state : fresh.state,
    choice: typeof memory.choice === "string" ? memory.choice : null,
    echoWitnessed: Boolean(memory.echoWitnessed)
  };
}

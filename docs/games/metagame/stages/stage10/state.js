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
        choice: null
      }
    ])),
    final: {
      choice: null,
      completed: false,
      completedAt: null,
      route: null
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
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}

function normalizeMemoryState(value, fresh) {
  const memory = value && typeof value === "object" ? value : {};
  const validStates = new Set(["unread", "read", "resolved", "integrated"]);
  return {
    ...fresh,
    ...memory,
    state: validStates.has(memory.state) ? memory.state : fresh.state,
    choice: typeof memory.choice === "string" ? memory.choice : null
  };
}

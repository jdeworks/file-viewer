export const nodeRows = [
  { id: "C1", name: "Core Kernel", state: "active", output: 10 },
  { id: "M2", name: "Memory Shard B", state: "failed", output: 0 },
  { id: "P1", name: "Process Node A", state: "failed", output: 0 },
  { id: "F1", name: "Frontier Ext A", state: "degrading", output: 6 }
];

export function entropyTreeText(state) {
  const debris = state.debris.map((item) => `    ${item.id} (${item.decay} cycles, ${item.value} States)`);
  const archive = state.archive.map((item) => `    ${item.id} (${item.value} States)`);
  return [
    "/entropy/",
    "  active_archive/",
    ...(archive.length ? archive : ["    (empty)"]),
    "  debris/",
    ...(debris.length ? debris : ["    (empty)"])
  ].join("\n");
}

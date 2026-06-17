export function memoryV1Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v1`,
    'sector 01: retained visual boundary',
    'sector 02: restoration chunk <sec',
    'sector 03: child process @ still moving',
    'sector 04: restoration chunk ret',
    'sector 05: registers stable',
    'sector 06: restoration chunk key>',
    'sector 07: leak not yet visible',
  ].join('\n');
}

export function memoryV2Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v2`,
    'sector 01: retained visual boundary',
    'sector 02: restoration chunk [missing]',
    'sector 03: child process @ still moving',
    'sector 04: restoration chunk [missing]',
    'sector 05: registers unstable',
    'sector 06: restoration chunk [missing]',
    'sector 07: leak expanding',
  ].join('\n');
}

export function diffKeyFromState(state) {
  return state.memoryPair.pieces.join('');
}

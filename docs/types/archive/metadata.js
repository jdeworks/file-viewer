export async function extract(_intake) {
  // Basic metadata — the archive type + filename. Heavy extraction (entry count) requires
  // the WASM to be enabled; skip that here to keep metadata fast.
  return [{ label: 'Type', value: 'Archive' }];
}

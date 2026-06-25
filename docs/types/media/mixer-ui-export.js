// P5 — mixer export helpers split out of mixer-ui.js.

export async function encodeMp3ViaFfmpeg(wavBlob) {
  const { loadFfmpeg } = await import('./transcoder.js');
  const ff = await loadFfmpeg();
  const data = new Uint8Array(await wavBlob.arrayBuffer());
  ff.FS('writeFile', 'mix.wav', data);
  try {
    await ff.run('-i', 'mix.wav', '-c:a', 'libmp3lame', '-q:a', '2', 'mix.mp3');
    const out = ff.FS('readFile', 'mix.mp3');
    return new Blob([out.buffer], { type: 'audio/mpeg' });
  } finally {
    try { ff.FS('unlink', 'mix.wav'); } catch {}
    try { ff.FS('unlink', 'mix.mp3'); } catch {}
  }
}

export function appendDownloadLink(exportResult, blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.className = 'media-tx-download';
  a.textContent = 'Download ' + filename;
  exportResult.textContent = '';
  exportResult.appendChild(a);
  a.click();   // auto-trigger; link stays for re-download
  return url;
}


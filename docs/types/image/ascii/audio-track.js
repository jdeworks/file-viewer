function audioCtor() {
  return window.AudioContext || window.webkitAudioContext;
}

function cleanupContext(ctx) {
  try { ctx?.close?.(); } catch { /* ignore */ }
}

async function fromDecodedFile(file, recStream) {
  const AudioContext = audioCtor();
  if (!AudioContext || !file?.arrayBuffer) throw new Error('decoded audio is not supported');
  const ctx = new AudioContext();
  try {
    const bytes = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    if (!buffer || !buffer.duration) throw new Error('no decodable audio track');
    const source = ctx.createBufferSource();
    const dest = ctx.createMediaStreamDestination();
    source.buffer = buffer;
    source.connect(dest);
    const tracks = dest.stream.getAudioTracks();
    if (!tracks.length) throw new Error('decoded audio produced no track');
    tracks.forEach((track) => recStream.addTrack(track));
    let started = false;
    return {
      included: true,
      method: 'decoded',
      start(offset = 0) {
        if (started) return;
        started = true;
        try { source.start(0, Math.max(0, offset || 0)); } catch { /* ignore */ }
      },
      cleanup() {
        try { if (started) source.stop(); } catch { /* ignore */ }
        tracks.forEach((track) => { try { track.stop(); } catch { /* ignore */ } });
        cleanupContext(ctx);
      },
    };
  } catch (err) {
    cleanupContext(ctx);
    throw err;
  }
}

async function fromMediaElement(video, recStream) {
  const AudioContext = audioCtor();
  if (!AudioContext) throw new Error('media element audio is not supported');
  const ctx = new AudioContext();
  try {
    await ctx.resume?.();
    const source = ctx.createMediaElementSource(video);
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);
    const tracks = dest.stream.getAudioTracks();
    if (!tracks.length) throw new Error('media element produced no audio track');
    tracks.forEach((track) => recStream.addTrack(track));
    return {
      included: true,
      method: 'media-element',
      tracks,
      start() { ctx.resume?.(); },
      cleanup() {
        tracks.forEach((track) => { try { track.stop(); } catch { /* ignore */ } });
        cleanupContext(ctx);
      },
    };
  } catch (err) {
    cleanupContext(ctx);
    throw err;
  }
}

export async function attachBestEffortAudio(file, video, recStream) {
  const errors = [];
  try {
    return await fromDecodedFile(file, recStream);
  } catch (err) {
    errors.push(err);
  }
  try {
    return await fromMediaElement(video, recStream);
  } catch (err) {
    errors.push(err);
  }
  return {
    included: false,
    method: 'silent',
    warning: 'Audio could not be included on this browser; exported silent video.',
    errors,
    start() {},
    cleanup() {},
  };
}

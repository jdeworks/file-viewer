export function detect(intake) {
  const { filename, text, textSample } = intake;
  const name = (filename || '').toLowerCase();
  const isDockerfileName = name === 'dockerfile' || name.startsWith('dockerfile.') || name.endsWith('.dockerfile');
  const src = (text || textSample || '').trimStart();
  // A Dockerfile starts with a FROM (possibly after comments)
  const lines = src.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
  const firstInstr = (lines[0] || '').trim().toUpperCase();
  const hasFrom = firstInstr.startsWith('FROM ') || firstInstr === 'FROM';
  const hasDockerInstructions = /^(FROM|RUN|COPY|ADD|EXPOSE|ENV|ENTRYPOINT|CMD|WORKDIR|USER|ARG|LABEL|VOLUME|HEALTHCHECK|ONBUILD|STOPSIGNAL|SHELL)\s/m.test(src);
  if (isDockerfileName && hasFrom) return 0.99;
  if (isDockerfileName && hasDockerInstructions) return 0.92;
  if (hasFrom && hasDockerInstructions) return 0.85;
  if (isDockerfileName) return 0.6;
  return 0;
}

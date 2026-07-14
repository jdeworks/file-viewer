// Cheap repository markers used while a dropped folder is classified. The actual object reader
// and repository UI stay behind a lazy boundary until a Git folder is opened.
export function findGitDir(entries) {
  const head = entries.find((entry) => entry.path === '.git/HEAD' || entry.path.endsWith('/.git/HEAD'));
  if (!head) return null;
  const gitPrefix = head.path.slice(0, -'/HEAD'.length);
  const repoRoot = gitPrefix.slice(0, -'/.git'.length);
  const repoName = repoRoot.split('/').filter(Boolean).pop() || 'repository';
  return { gitPrefix, repoName, repoRoot };
}

export function isGitInternal(path) {
  return path === '.git' || path.startsWith('.git/') || /\/\.git(\/|$)/.test(path);
}

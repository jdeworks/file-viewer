export default {
  id: 'har',
  label: 'HTTP Archive (HAR)',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'json') return false;
    const obj = intake.parsed ?? null;
    if (obj && obj.log && Array.isArray(obj.log.entries)) return true;
    // Fallback: cheap text check before full parse
    const t = intake.textSample || intake.text || '';
    if (t.includes('"log"') && t.includes('"entries"')) {
      try {
        const parsed = JSON.parse(intake.text || '{}');
        return !!(parsed.log && Array.isArray(parsed.log.entries));
      } catch { return false; }
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Browser network traffic capture — all HTTP requests, timings, headers, and response sizes from a page load or session.',
    usedFor: [
      { label: 'Chrome DevTools', description: 'Export from Network tab → Save all as HAR with content', href: 'https://developer.chrome.com/docs/devtools/network/reference/' },
      { label: 'Firefox DevTools', description: 'Network tab → Save All As HAR', href: 'https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/' },
    ],
  },
};

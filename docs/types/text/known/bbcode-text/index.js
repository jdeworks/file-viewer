export const plugin = {
  id: 'bbcode-text',
  label: 'BBCode',
  tags: ['bbcode', 'bbc', 'forum', 'markup', 'phpbb', 'vbulletin'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.bbc') || name.endsWith('.bbcode')) return true;
    // Content-guard: must have clear BBCode patterns
    const preview = (intake.text || '').slice(0, 2000);
    const hits = [
      /\[b\]/i.test(preview),
      /\[url=/i.test(preview),
      /\[img\]/i.test(preview),
      /\[quote/i.test(preview),
      /\[code\]/i.test(preview),
      /\[color=/i.test(preview),
      /\[size=/i.test(preview),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'BBCode (Bulletin Board Code) is a lightweight markup language used in web forums and bulletin boards (phpBB, vBulletin, etc.). Tags use square-bracket syntax like [b], [url=], and [img].',
    usedFor: [
      { label: 'BBCode', description: 'Forum markup language overview', href: 'https://en.wikipedia.org/wiki/BBCode' },
      { label: 'phpBB BBCode', description: 'BBCode reference for phpBB forums', href: 'https://www.phpbb.com/community/help/bbcode' },
    ],
  },
};
export default plugin;

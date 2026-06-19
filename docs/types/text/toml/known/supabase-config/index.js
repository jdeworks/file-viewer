export default {
  id: 'supabase-config',
  label: 'Supabase config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const filename = (intake.filename || '').split('/').pop().toLowerCase();
    // Accept both the real filename (config.toml) and our example alias (supabase-config.toml)
    if (filename !== 'config.toml' && filename !== 'supabase-config.toml') return false;
    const text = intake.text || '';
    return /\[api\]/.test(text) && /\[db\]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Supabase project configuration — defines database, API, auth, and storage settings for a local Supabase project.',
    usedFor: [{ label: 'Supabase', description: 'Open-source Firebase alternative', href: 'https://supabase.com/docs/guides/cli/config' }],
  },
};

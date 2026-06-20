export default {
  id: 'android-strings',
  label: 'Android Strings',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'strings.xml') return true;
    // Also match any XML that has <resources> with <string name= inside
    const text = intake.text || '';
    return /<resources[\s>]/.test(text) && /<string\s+name=/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Android string resources — defines localizable text strings, string arrays, and plural rules for an Android application.',
    usedFor: [
      { label: 'Android', description: 'String resource definitions for UI text, supporting localization and pluralization', href: 'https://developer.android.com/guide/topics/resources/string-resource' },
    ],
  },
};

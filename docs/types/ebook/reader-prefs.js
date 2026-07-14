export const FB2_READER_PREFS = Object.freeze({
  key: 'fb2',
  defaults: Object.freeze({ size: 'normal', font: 'serif', theme: 'light', line: 'normal', margin: 'normal' }),
  options: Object.freeze({
    size: Object.freeze(['normal', 'large']),
    font: Object.freeze(['serif', 'sans']),
    theme: Object.freeze(['light', 'sepia', 'dark']),
    line: Object.freeze(['normal', 'loose']),
    margin: Object.freeze(['normal', 'wide']),
  }),
});

export const MOBI_READER_PREFS = Object.freeze({
  ...FB2_READER_PREFS,
  key: 'mobi',
});

export const COMIC_READER_PREFS = Object.freeze({
  key: 'comic',
  defaults: Object.freeze({ layout: 'single', fit: 'width', direction: 'ltr' }),
  options: Object.freeze({
    layout: Object.freeze(['single', 'spread']),
    fit: Object.freeze(['width', 'page']),
    direction: Object.freeze(['ltr', 'rtl']),
  }),
});

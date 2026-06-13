// Sony LRF (BBeB) is a proprietary Sony Reader binary format with a compressed object stream that
// would need a substantial hand-rolled parser. Rather than show a misleading hex dump, we
// recognize it and explain — with a pointer to the formats we DO read.
export async function render(intake, _ctx) {
  const ver = (intake.bytes && intake.bytes.length >= 10) ? (intake.bytes[8] | (intake.bytes[9] << 8)) : 0;
  const body = '<div class="comic-note"><strong>Sony LRF e-book (BBeB)</strong><br>'
    + 'This is a Sony Reader <code>.lrf</code> book' + (ver ? ' (format version ' + ver + ')' : '') + '. Its proprietary BBeB '
    + 'format isn’t supported yet. If you can convert it, <strong>EPUB</strong>, <strong>FB2</strong>, and '
    + '<strong>MOBI</strong> all open in the reader here.</div>';
  return { bodyHtml: body, hadUnsafe: false };
}

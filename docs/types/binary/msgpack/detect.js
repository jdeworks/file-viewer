export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isMsgpackExt = ext === 'msgpack' || ext === 'mpk';

  if (!b || b.length === 0) return isMsgpackExt ? 0.6 : 0;

  // MessagePack has no magic bytes, but byte 0 identifies the first value type.
  // Valid first bytes cover: fixint (0x00-0x7f), nil (0xc0), false/true (0xc2/c3),
  // fixmap (0x80-0x8f), fixarray (0x90-0x9f), fixstr (0xa0-0xbf),
  // uint8-64 (0xcc-0xcf), int8-64 (0xd0-0xd3), float32/64 (0xca/cb),
  // str8-32 (0xd9-0xdb), bin8-32 (0xc4-0xc6), array16/32 (0xdc-0xdd),
  // map16/32 (0xde-0xdf), ext8-32 (0xc7-0xc9), fixext1-16 (0xd4-0xd8).
  // 0xc1 is never-used (RESERVED), 0xe0-0xff are negative fixint.
  const first = b[0];
  const invalid = first === 0xc1; // only reserved byte
  if (isMsgpackExt) return invalid ? 0.5 : 0.95;

  // Without extension: require a map or array root object (common in practice)
  // and at least minimal structural validity.
  const isMapOrArray =
    (first >= 0x80 && first <= 0x8f) || // fixmap
    (first >= 0x90 && first <= 0x9f) || // fixarray
    first === 0xdc || first === 0xdd ||  // array 16/32
    first === 0xde || first === 0xdf;    // map 16/32

  return isMapOrArray && !invalid ? 0.45 : 0;
}

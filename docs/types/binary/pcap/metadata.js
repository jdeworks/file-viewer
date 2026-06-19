function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 24) return {};
  const fields = {};
  if (b[0] === 0x0a && b[1] === 0x0d && b[2] === 0x0d && b[3] === 0x0a) {
    fields['Format'] = 'PCAPNG';
  } else {
    const ns = b[0] === 0x4d || (b[0] === 0xa1 && b[2] === 0x3c);
    fields['Format'] = ns ? 'PCAP (nanosecond timestamps)' : 'PCAP';
    const le = b[0] === 0xd4 || b[0] === 0x4d;
    const r32 = le ? r32le : (b, off) => ((b[off]*0x1000000)+((b[off+1]<<16)|(b[off+2]<<8)|b[off+3])) >>> 0;
    const linkType = r32(b, 20) & 0x0FFFFFFF;
    const LINK = { 1:'Ethernet', 105:'802.11 Wireless', 228:'Raw IPv4', 229:'Raw IPv6', 113:'Linux cooked' };
    if (LINK[linkType]) fields['Link Type'] = LINK[linkType];
    fields['Snaplen'] = String(r32(b, 16));
  }
  return fields;
}

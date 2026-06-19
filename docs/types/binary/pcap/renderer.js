// PCAP / PCAPNG network capture viewer — pure-JS header parser.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const LINK_TYPES = {
  0: 'Null/loopback', 1: 'Ethernet', 6: 'Token Ring', 7: 'ARCnet (BSD)',
  8: 'SLIP', 9: 'PPP', 10: 'FDDI', 50: 'PPP (HDLC)', 51: 'PPP Ether',
  100: 'ATM RFC 1483', 101: 'Raw IP', 104: 'BSD/OS SLIP', 105: '802.11 Wireless',
  108: 'OpenBSD loopback', 113: 'Linux cooked', 117: 'OpenBSD PFLOG',
  119: '802.11 + Prism', 127: '802.11 (radiotap)', 128: 'TZSP', 129: 'Arcnet (Linux)',
  138: 'MTP2-with-PHDR', 139: 'MTP2', 140: 'MTP3', 141: 'SCCP',
  143: 'DOCSIS', 144: 'Linux IrDA', 147: 'User link type 0', 160: 'PPI',
  163: '802.11 + AvS', 165: 'TZSP link', 177: 'GPRS LLC', 187: 'Bluetooth HCI',
  189: 'USB linux', 192: 'PPI (another)', 195: '802.15.4', 228: 'IPv4', 229: 'IPv6',
};

const ETH_TYPES = { 0x0800: 'IPv4', 0x0806: 'ARP', 0x86DD: 'IPv6', 0x8100: '802.1Q', 0x8847: 'MPLS', 0x88CC: 'LLDP' };
const IP_PROTO = { 1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 41: 'IPv6-in-IPv4', 47: 'GRE', 50: 'ESP', 51: 'AH', 58: 'ICMPv6', 89: 'OSPF', 132: 'SCTP' };

function r16le(b, off) { return b[off] | (b[off+1] << 8); }
function r16be(b, off) { return (b[off] << 8) | b[off+1]; }
function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }
function r32be(b, off) { return ((b[off]*0x1000000) + ((b[off+1]<<16)|(b[off+2]<<8)|b[off+3])) >>> 0; }
function macStr(b, off) { return Array.from(b.slice(off, off+6)).map(x => x.toString(16).padStart(2,'0')).join(':'); }
function ipStr(b, off) { return Array.from(b.slice(off, off+4)).join('.'); }

function parseEthernetProto(data) {
  if (data.length < 14) return null;
  const ethType = r16be(data, 12);
  const ethLabel = ETH_TYPES[ethType] || `0x${ethType.toString(16).toUpperCase()}`;
  if (ethType === 0x0800 && data.length >= 34) {
    const ipProto = data[23];
    const proto = IP_PROTO[ipProto] || `IP(${ipProto})`;
    if ((ipProto === 6 || ipProto === 17) && data.length >= 36) {
      const sport = r16be(data, 34);
      const dport = r16be(data, 36);
      const portPart = `:${sport}→:${dport}`;
      return { proto, sport, dport, src: ipStr(data, 26), dst: ipStr(data, 30), label: `${proto}${portPart}` };
    }
    return { proto, src: ipStr(data, 26), dst: ipStr(data, 30), label: `${ethLabel}/${proto}` };
  }
  if (ethType === 0x0806) return { proto: 'ARP', label: 'ARP' };
  if (ethType === 0x86DD) return { proto: 'IPv6', label: 'IPv6' };
  return { proto: ethLabel, label: ethLabel };
}

function parsePcap(b) {
  const leN = b[0] === 0xd4 && b[1] === 0xc3 && b[2] === 0xb2 && b[3] === 0xa1;
  const beN = b[0] === 0xa1 && b[1] === 0xb2 && b[2] === 0xc3 && b[3] === 0xd4;
  const le_ns = b[0] === 0x4d && b[1] === 0x3c && b[2] === 0xb2 && b[3] === 0xa1;
  const be_ns = b[0] === 0xa1 && b[1] === 0xb2 && b[2] === 0x3c && b[3] === 0x4d;
  const le = leN || le_ns;
  const ns = le_ns || be_ns;
  const r16 = le ? r16le : r16be;
  const r32 = le ? r32le : r32be;

  const major = r16(b, 4);
  const minor = r16(b, 6);
  const snaplen = r32(b, 16);
  const linkType = r32(b, 20) & 0x0FFFFFFF;

  const packets = [];
  let pos = 24;
  let firstTs = null, lastTs = null;
  const protos = {};

  while (pos + 16 <= b.length) {
    const ts_sec = r32(b, pos);
    const ts_frac = r32(b, pos + 4);
    const incl_len = r32(b, pos + 8);
    // const orig_len = r32(b, pos + 12); // unused
    if (incl_len > 65535 || pos + 16 + incl_len > b.length) break;

    const ts = ts_sec + (ns ? ts_frac / 1e9 : ts_frac / 1e6);
    if (firstTs == null) firstTs = ts;
    lastTs = ts;

    const data = b.slice(pos + 16, pos + 16 + incl_len);
    let protoInfo = null;
    if (linkType === 1) protoInfo = parseEthernetProto(data);

    packets.push({ n: packets.length + 1, ts_sec, ts_frac, ts, len: incl_len, proto: protoInfo?.label || '—', src: protoInfo?.src || '', dst: protoInfo?.dst || '' });
    if (protoInfo?.proto) protos[protoInfo.proto] = (protos[protoInfo.proto] || 0) + 1;

    pos += 16 + incl_len;
    if (pos % 4 !== 0) pos += 4 - (pos % 4); // some pcaps are padded
  }

  const duration = (lastTs != null && firstTs != null) ? (lastTs - firstTs) : 0;
  return { version: `${major}.${minor}`, snaplen, linkType, linkLabel: LINK_TYPES[linkType] || String(linkType),
    packetCount: packets.length, duration, packets: packets.slice(0, 20),
    protos, ns, firstTs };
}

function parsePcapng(b) {
  // Section Header Block: 0x0A0D0D0A
  if (b.length < 12) return null;
  const blockLen = r32le(b, 4);
  const boMagic = r32le(b, 8);
  const le = boMagic === 0x1A2B3C4D;
  const r32 = le ? r32le : r32be;

  const major = le ? r16le(b, 12) : r16be(b, 12);
  const minor = le ? r16le(b, 14) : r16be(b, 14);

  let linkType = -1, snaplen = 0;
  let packetCount = 0;
  const protos = { 'PCAPNG': 1 };

  // Walk blocks
  let pos = blockLen;
  while (pos + 8 <= b.length) {
    const bType = r32(b, pos);
    const bLen = r32(b, pos + 4);
    if (bLen < 12 || pos + bLen > b.length) break;
    if (bType === 1) { // IDB
      linkType = le ? r16le(b, pos+8) : r16be(b, pos+8);
      snaplen = r32(b, pos+12);
    } else if (bType === 6 || bType === 2 || bType === 3) { // EPB/OPB/SPB
      packetCount++;
    }
    pos += bLen;
  }

  return { version: `${major}.${minor}` + ' (PCAPNG)', snaplen, linkType,
    linkLabel: LINK_TYPES[linkType] || (linkType >= 0 ? String(linkType) : 'Unknown'),
    packetCount, duration: 0, packets: [], protos, ns: false, firstTs: null };
}

function fmtTs(info, pkt) {
  if (info.firstTs == null) return String(pkt.n);
  const d = pkt.ts - info.firstTs;
  return '+' + d.toFixed(3) + 's';
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 24) return { bodyHtml: '<div class="pcap-preview"><p class="pcap-note">File too small to be a valid PCAP.</p></div>' };

  const isPcapng = b[0] === 0x0a && b[1] === 0x0d && b[2] === 0x0d && b[3] === 0x0a;
  let info;
  try {
    info = isPcapng ? parsePcapng(b) : parsePcap(b);
    if (!info) throw new Error('Parse failed');
  } catch (e) {
    return { bodyHtml: `<div class="pcap-preview"><p class="pcap-note">Parse error: ${esc(e.message)}</p></div>` };
  }

  const fmt = isPcapng ? 'PCAPNG' : (info.ns ? 'PCAP (nanosecond)' : 'PCAP');

  const protoItems = Object.entries(info.protos).sort((a,b) => b[1]-a[1]).map(([p, c]) =>
    `<span class="pcap-proto-pill">${esc(p)}<em>${c}</em></span>`
  ).join('');

  const pktRows = info.packets.map((pkt) =>
    `<tr><td class="pcap-n">${pkt.n}</td><td class="pcap-ts">${fmtTs(info, pkt)}</td><td class="pcap-proto">${esc(pkt.proto)}</td><td class="pcap-len">${pkt.len}</td></tr>`
  ).join('');

  const more = info.packetCount > 20 ? `<p class="pcap-note">Showing first 20 of ${info.packetCount} packets.</p>` : '';

  const bodyHtml = `<div class="pcap-preview">
  <div class="pcap-header"><span class="badge-pcap">${esc(fmt)}</span></div>
  <div class="pcap-meta">
    <div class="pcap-meta-row"><span class="pcap-key">Link type</span><span class="pcap-val">${esc(info.linkLabel)}</span></div>
    <div class="pcap-meta-row"><span class="pcap-key">Version</span><span class="pcap-val">${esc(info.version)}</span></div>
    <div class="pcap-meta-row"><span class="pcap-key">Packets</span><span class="pcap-val">${info.packetCount.toLocaleString()}</span></div>
    ${info.snaplen ? `<div class="pcap-meta-row"><span class="pcap-key">Snaplen</span><span class="pcap-val">${info.snaplen.toLocaleString()} bytes</span></div>` : ''}
    ${info.duration > 0 ? `<div class="pcap-meta-row"><span class="pcap-key">Duration</span><span class="pcap-val">${info.duration.toFixed(3)}s</span></div>` : ''}
  </div>
  ${protoItems ? `<div class="pcap-protos">${protoItems}</div>` : ''}
  ${pktRows ? `<table class="pcap-pkts"><thead><tr><th>#</th><th>Time</th><th>Protocol</th><th>Len</th></tr></thead><tbody>${pktRows}</tbody></table>` : ''}
  ${more}
</div>`;

  return { bodyHtml };
}

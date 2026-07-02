# Network Capture (.pcap / .pcapng)

> PCAP and PCAPNG viewer — link type, packet count, protocol breakdown, first-packet table, and relative timestamps.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pcap`, `.pcapng`, `.cap` |
| MIME type | `application/vnd.tcpdump.pcap` |
| Binary / Text | Binary |
| Common use | Wireshark network captures, `tcpdump` output, network debugging |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| PCAP / PCAPNG detection | ✅ | Magic bytes auto-detected; both LE and BE |
| Link type | ✅ | Ethernet, 802.11, Linux cooked, loopback, etc. |
| PCAP version | ✅ | Major.Minor from header |
| Snaplen | ✅ | Max capture length |
| Packet count | ✅ | Total packets parsed |
| Protocol breakdown | ✅ | Ethernet IPv4/IPv6/ARP and common IP protocol counts where supported |
| Top flows | ❌ | Conversation aggregation is not implemented |
| Timestamps | ⚠️ Partial | Relative timestamps are shown for classic PCAP packets |
| Packet table | ✅ | First 20 packets with number, relative time, protocol, and captured length |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ Partial | Side-panel metadata exposes format, snaplen, and some link types; richer counts are in the preview |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary capture — not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Payload decryption (TLS/HTTPS) is not possible
- Application-layer protocols (HTTP, DNS) are not dissected
- PCAPNG support is structural only: packet counts are read, but packet payloads and timestamps are not listed
- Non-Ethernet link types have limited protocol dissection
- Truncated at the loaded byte budget for large captures

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| DNS query extraction | Med | Med | Parse UDP port-53 payloads |
| Conversation aggregation | Med | Med | Build src:port → dst:port flow counts |
| HTTP request list | Med | Hard | Reassemble TCP streams for HTTP |
| Export conversation table as CSV | Low | Easy | Top flows to CSV download |

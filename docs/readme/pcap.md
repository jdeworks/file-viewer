# Network Capture (.pcap / .pcapng)

> PCAP and PCAPNG viewer — link type, packet count, protocol breakdown, top conversations, and packet timestamps.

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
| Protocol breakdown | ✅ | IPv4 / IPv6 / ARP / TCP / UDP / ICMP counts |
| Top flows | ✅ | Most frequent src:port → dst:port conversations |
| Timestamps | ✅ | First and last capture timestamps |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Link type, packet count, protocol counts |

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
- Truncated at the loaded byte budget for large captures

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| DNS query extraction | Med | Med | Parse UDP port-53 payloads |
| HTTP request list | Med | Hard | Reassemble TCP streams for HTTP |
| Export conversation table as CSV | Low | Easy | Top flows to CSV download |

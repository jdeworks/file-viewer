# Torrent

> BitTorrent v1/v2 metainfo viewer — exact info hashes, tracker URLs, bounded file inventory, total size, and piece size.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.torrent` |
| MIME type | `application/x-bittorrent` |
| Binary / Text | Binary (bencoded) |
| Common use | BitTorrent metadata for peer-to-peer file distribution |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Info hashes | ✅ | SHA-1 `btih` for valid v1 layouts; SHA-256 `btmh` multihash for valid v2 metadata |
| Name | ✅ | From `info.name` |
| Tracker URLs | ✅ | `announce` + `announce-list` tiers |
| Total size | ✅ | v1 file layout or bounded BEP 52 file-tree traversal |
| Piece size | ✅ | `info['piece length']` in KB/MB |
| File count | ✅ | Number of files in v1 layouts or v2 file trees |
| File list | ✅ | Path and size per file (first 200; traversal is depth/node bounded) |
| Creation date | ✅ | Unix epoch from `creation date` |
| Created by | ✅ | `created by` client string |
| Comment | ✅ | `comment` field |
| Magnet link | ✅ | v1 `btih`, v2 `btmh`, or both exact topics for a valid hybrid, plus name and trackers |
| Raw view | ✅ | Binary/raw pane available for the bencoded source bytes |
| Diff | ❌ | Binary bencoded format |
| Metadata | ✅ | Name, size, file count, piece size, tracker count, created by/date |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary bencoded format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Private torrent flag is not surfaced yet
- Piece hashes are not verified
- Malformed or traversal-truncated v2 file trees are reported without emitting a usable-looking v2 magnet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export file list as CSV | Low | Easy | Path/size list to CSV |
| Private flag display | Low | Easy | Surface `info.private = 1` alongside tracker data |

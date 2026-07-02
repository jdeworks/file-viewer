# Torrent

> BitTorrent metainfo viewer — info hash, name, tracker URLs, file list, total size, and piece size.

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
| Info hash (SHA-1) | ✅ | Hex representation of torrent hash |
| Name | ✅ | From `info.name` |
| Tracker URLs | ✅ | `announce` + `announce-list` tiers |
| Total size | ✅ | Sum of all file lengths |
| Piece size | ✅ | `info.piece_length` in KB/MB |
| File count | ✅ | Number of files in multi-file torrent |
| File list | ✅ | Path and size per file (first 200) |
| Creation date | ✅ | Unix epoch from `creation date` |
| Created by | ✅ | `created by` client string |
| Comment | ✅ | `comment` field |
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

- Magnet links cannot be generated without tracker access
- Private torrent flag is not surfaced yet
- Piece hashes are not verified

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Magnet link generation | Med | Easy | Compose `magnet:?xt=urn:btih:...` from info hash |
| Export file list as CSV | Low | Easy | Path/size list to CSV |
| Private flag display | Low | Easy | Surface `info.private = 1` alongside tracker data |

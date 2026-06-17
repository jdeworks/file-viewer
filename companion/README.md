# file-viewer-companion

Local HTTP server for file-viewer that enables save-back to disk.

**What is exchanged** (for transparency — users are encouraged to inspect all traffic in the Network tab):

| Endpoint | Method | Data sent | Data received |
|----------|--------|-----------|---------------|
| /ping | GET | nothing | `{ ok, version }` |
| /watched-paths | GET | nothing | list of watched folder paths |
| /watched-paths | POST/DELETE | folder path | success/error |
| /find-file | GET | filename + size | list of matching absolute paths |
| /find-folder | GET | relative path | list of matching root paths |
| /file | GET | absolute path | file bytes |
| /file | POST | absolute path + file bytes | success/error |

The companion only accesses files within configured watched folders. All mutating endpoints require a session token (`X-Companion-Token` header) generated at startup.

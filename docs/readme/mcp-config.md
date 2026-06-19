# MCP Server Config

> Claude MCP (Model Context Protocol) server config viewer — lists configured servers with transport, command, and environment variables.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `claude_desktop_config.json`, `mcp.json` |
| MIME type | `application/json` |
| Binary / Text | Text (JSON) |
| Common use | Claude Desktop, Claude Code, and MCP-compatible client tool configuration |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Server list | ✅ | Each `mcpServers` entry shown as a card |
| Transport type | ✅ | stdio / HTTP / SSE distinguished |
| Command display | ✅ | Launch command and arguments shown |
| Environment variables | ✅ | Env vars shown (sensitive values masked) |
| Tool list | ✅ | `tools` array shown per server if present |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Server count, transport type breakdown |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`claude_desktop_config.json`](../examples/claude_desktop_config.json) — example MCP server configuration

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Schema validation | Low | Easy | Validate against MCP config JSON Schema |
| Server health check | Low | Hard | Would require executing the command — violates zero-off-origin |

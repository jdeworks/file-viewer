export function detect(intake) {
  if (intake.bytes?.[0] > 127) return 0; // not text
  const name = intake.filename?.toLowerCase() ?? '';
  const text = intake.textSample ?? '';

  // Exact known filenames → high confidence
  const MCP_NAMES = new Set(['mcp.json', '.mcp.json', 'claude_desktop_config.json', 'claude_code_config.json', 'claude.json']);
  if (MCP_NAMES.has(name)) {
    // Confirm it actually has mcpServers
    if (text.includes('"mcpServers"')) return 0.97;
    return 0.75; // filename match but maybe different format
  }

  // Any JSON with mcpServers key
  if (name.endsWith('.json') && text.includes('"mcpServers"')) return 0.85;
  if (text.includes('"mcpServers"') && text.includes('"command"')) return 0.80;

  return 0;
}

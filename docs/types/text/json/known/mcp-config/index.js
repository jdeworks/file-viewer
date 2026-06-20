export default {
  id: 'mcp-config',
  label: 'MCP Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'json') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    if (['claude_desktop_config.json', 'mcp.json', '.mcp.json', 'mcp_servers.json', 'claude.json'].includes(n)) return true;
    return intake.parsed != null && typeof intake.parsed === 'object' && 'mcpServers' in intake.parsed;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MCP (Model Context Protocol) server configuration — tool servers, transports, and environment configuration for AI assistants.',
    usedFor: [
      { label: 'claude_desktop_config.json', description: 'Claude Desktop MCP configuration', href: 'https://modelcontextprotocol.io/quickstart/user' },
      { label: 'mcp.json', description: 'MCP server configuration file', href: 'https://modelcontextprotocol.io/' },
    ],
  },
};

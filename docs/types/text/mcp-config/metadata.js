function parseMCPConfig(text) {
  const config = JSON.parse(text);
  const servers = config.mcpServers ?? {};

  return Object.entries(servers).map(([name, def]) => {
    const isStdio = !!(def.command);
    const isHttp = !!(def.url);

    return {
      name,
      transport: isStdio ? 'stdio' : isHttp ? 'http' : 'unknown',
      command: def.command ?? null,
      args: def.args ?? [],
      url: def.url ?? null,
      headers: def.headers ?? {},
      env: def.env ?? {},
      envCount: Object.keys(def.env ?? {}).length,
    };
  });
}

export async function extractMetadata(intake) {
  try {
    const servers = parseMCPConfig(intake.text ?? '');
    return {
      serverCount: servers.length,
      stdioCount: servers.filter((s) => s.transport === 'stdio').length,
      httpCount: servers.filter((s) => s.transport === 'http').length,
      servers: servers.map((s) => ({
        name: s.name,
        transport: s.transport,
        command: s.command ? [s.command, ...s.args].join(' ') : null,
        url: s.url,
        envVarCount: s.envCount,
      })),
    };
  } catch {
    return { error: 'Invalid JSON', serverCount: 0 };
  }
}

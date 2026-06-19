export function metadata(intake) {
  const src = intake.textSample || '';
  let sarif;
  try { sarif = JSON.parse(src); } catch { return {}; }
  const runs = sarif.runs || [];
  if (!runs.length) return {};
  const toolName = runs[0]?.tool?.driver?.name || null;
  const results = runs.flatMap(r => r.results || []);
  const errors = results.filter(r => r.level === 'error').length;
  const warnings = results.filter(r => r.level === 'warning').length;
  return {
    tool: toolName,
    findings: results.length,
    errors: errors || null,
    warnings: warnings || null,
    version: sarif.version || null,
  };
}

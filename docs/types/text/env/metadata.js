const SENSITIVE = /SECRET|PASSWORD|PASSWD|TOKEN|KEY|AUTH|CREDENTIAL|PRIVATE|PWD|SALT|SIGNING|MASTER|WEBHOOK/i;
const NOT_SENSITIVE = /_LENGTH$|_TIMEOUT$|_COUNT$|_SIZE$|_MAX$|_MIN$|^NODE_ENV$|^PORT$|^HOST$|^DEBUG$|^LOG_LEVEL$/i;

export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  let varCount = 0;
  let sensitiveCount = 0;

  for (const line of lines) {
    const m = line.trim().replace(/^export\s+/, '').match(/^([A-Z_][A-Z0-9_]*)\s*=/i);
    if (m) {
      varCount++;
      if (SENSITIVE.test(m[1]) && !NOT_SENSITIVE.test(m[1])) sensitiveCount++;
    }
  }

  return [
    { label: 'Total variables', value: String(varCount) },
    { label: 'Sensitive variables', value: String(sensitiveCount) },
  ];
}

// Split an mbox mailbox into individual RFC822 messages. Messages are separated by a line that
// starts with "From " at column 0 (the mbox envelope line); we strip that envelope line so the
// remainder can go straight through the shared .eml MIME parser.
export function splitMbox(text) {
  const lines = (text || '').split(/\r?\n/);
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (/^From .+/.test(line)) { if (cur !== null) out.push(cur); cur = ''; continue; }   // boundary; drop envelope line
    if (cur === null) cur = '';
    cur += (cur ? '\n' : '') + line;
  }
  if (cur) out.push(cur);
  return out.filter((m) => m.trim());
}

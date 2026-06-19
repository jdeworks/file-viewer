function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function ago(ms) {
  const d = Math.floor(ms / 86400000);
  if (d > 365) return `${Math.floor(d/365)}y ago`;
  if (d > 30) return `${Math.floor(d/30)}mo ago`;
  if (d > 0) return `${d}d ago`;
  return 'today';
}

// ── WhatsApp text format ──────────────────────────────────────────────────────
function parseWhatsApp(text) {
  // Matches: [DD/MM/YYYY, HH:MM:SS] Sender: Message
  //       or: DD/MM/YYYY, HH:MM - Sender: Message
  const LINE = /^[\[\(]?(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?[\]\)]?\s+[-–]?\s*([^:]+):\s(.+)$/;
  const lines = text.split('\n');
  const senders = {};
  let count = 0, first = null, last = null;
  for (const line of lines) {
    const m = LINE.exec(line.trim());
    if (!m) continue;
    count++;
    senders[m[2].trim()] = (senders[m[2].trim()] || 0) + 1;
    if (!first) first = m[1];
    last = m[1];
  }
  if (count < 2) return null;
  return { platform: 'WhatsApp', messages: count, senders, first, last };
}

// ── Telegram JSON ─────────────────────────────────────────────────────────────
function parseTelegram(doc) {
  const msgs = doc.messages || [];
  const senders = {};
  let first = null, last = null, mediaCount = 0;
  for (const m of msgs) {
    if (m.type !== 'message') continue;
    const from = m.from || m.actor || 'Unknown';
    senders[from] = (senders[from] || 0) + 1;
    if (m.date) { if (!first) first = m.date; last = m.date; }
    if (m.media_type || m.file) mediaCount++;
  }
  const chatName = doc.name || doc.title || 'Telegram Chat';
  return { platform: 'Telegram', chatName, messages: Object.values(senders).reduce((a,b)=>a+b,0), senders, first, last, mediaCount };
}

// ── Discord JSON (DiscordChatExporter) ────────────────────────────────────────
function parseDiscord(doc) {
  const msgs = doc.messages || [];
  const senders = {};
  let first = null, last = null, attachments = 0;
  for (const m of msgs) {
    const from = m.author?.name || m.author?.username || 'Unknown';
    senders[from] = (senders[from] || 0) + 1;
    if (m.timestamp) { if (!first) first = m.timestamp; last = m.timestamp; }
    attachments += (m.attachments || []).length;
  }
  const channelName = doc.channel?.name || doc.channel?.category || 'channel';
  const guildName = doc.guild?.name || '';
  return { platform: 'Discord', chatName: guildName ? `${guildName} #${channelName}` : `#${channelName}`, messages: msgs.length, senders, first, last, attachments };
}

// ── Facebook JSON ─────────────────────────────────────────────────────────────
function parseFacebook(doc) {
  const msgs = doc.messages || [];
  const senders = {};
  let first = null, last = null;
  for (const m of msgs) {
    const from = m.sender_name || 'Unknown';
    senders[from] = (senders[from] || 0) + 1;
    if (m.timestamp_ms) { if (!first) first = m.timestamp_ms; last = m.timestamp_ms; }
  }
  const participants = (doc.participants || []).map((p) => p.name).join(', ');
  const chatName = doc.title || participants || 'Messenger Chat';
  return { platform: 'Messenger', chatName, messages: msgs.length, senders, first, last };
}

function parseChat(intake) {
  const text = intake.text || '';
  // Try JSON first
  if (text.trim().startsWith('{')) {
    try {
      const doc = JSON.parse(text);
      if ((doc.type === 'personal_chat' || doc.type === 'saved_messages') && doc.messages) return parseTelegram(doc);
      if (doc.guild && doc.channel && doc.messages) return parseDiscord(doc);
      if (doc.participants && doc.messages && doc.messages[0]?.sender_name) return parseFacebook(doc);
    } catch { /* fall through */ }
  }
  return parseWhatsApp(text);
}

function formatDate(d) {
  if (!d) return null;
  if (typeof d === 'number') return new Date(d).toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export function render(intake) {
  const info = parseChat(intake);
  if (!info || info.messages < 1) {
    return { bodyHtml: '<div class="chat-preview"><p class="chat-note">Could not parse chat export.</p></div>' };
  }

  const senderEntries = Object.entries(info.senders).sort((a, b) => b[1] - a[1]);
  const top5 = senderEntries.slice(0, 5);
  const total = Object.values(info.senders).reduce((a,b)=>a+b,0) || info.messages;

  const senderRows = top5.map(([name, n]) => {
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    return `<tr>
      <td class="chat-sender">${esc(name)}</td>
      <td class="chat-count">${n.toLocaleString()}</td>
      <td class="chat-bar-cell"><div class="chat-bar" style="width:${pct}%"></div></td>
    </tr>`;
  }).join('');

  const extra = senderEntries.length > 5
    ? `<p class="chat-note">… and ${senderEntries.length - 5} more participant${senderEntries.length - 5 > 1 ? 's' : ''}</p>`
    : '';

  const firstDate = formatDate(info.first);
  const lastDate = formatDate(info.last);
  const dateRange = firstDate && lastDate && firstDate !== lastDate
    ? `${firstDate} → ${lastDate}`
    : (firstDate || null);

  const extraStats = [
    info.mediaCount ? `<div class="chat-stat"><div class="chat-stat-value">${info.mediaCount}</div><div class="chat-stat-label">Media</div></div>` : '',
    info.attachments ? `<div class="chat-stat"><div class="chat-stat-value">${info.attachments}</div><div class="chat-stat-label">Attachments</div></div>` : '',
  ].filter(Boolean).join('');

  const PLATFORM_COLORS = { WhatsApp: '#25d366', Telegram: '#229ed9', Discord: '#5865f2', Messenger: '#0099ff' };
  const badgeColor = PLATFORM_COLORS[info.platform] || '#64748b';

  return { bodyHtml: `<div class="chat-preview">
  <div class="chat-header">
    <span class="chat-badge" style="background:${badgeColor}">${esc(info.platform)}</span>
    ${info.chatName ? `<span class="chat-title">${esc(info.chatName)}</span>` : ''}
  </div>
  <div class="chat-stats">
    <div class="chat-stat"><div class="chat-stat-value">${info.messages.toLocaleString()}</div><div class="chat-stat-label">Messages</div></div>
    <div class="chat-stat"><div class="chat-stat-value">${senderEntries.length}</div><div class="chat-stat-label">Participants</div></div>
    ${extraStats}
  </div>
  ${dateRange ? `<p class="chat-dates">${esc(dateRange)}</p>` : ''}
  <div class="chat-section">
    <div class="chat-label">Top participants</div>
    <table class="chat-table">${senderRows}</table>
    ${extra}
  </div>
</div>` };
}

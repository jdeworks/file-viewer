export async function extractMetadata(intake) {
  const text = intake.text || '';
  let platform = 'Chat';
  let participants = null, messageCount = null;

  if (text.trim().startsWith('{')) {
    try {
      const doc = JSON.parse(text);
      if (doc.type === 'personal_chat' || doc.type === 'saved_messages') {
        platform = 'Telegram';
        messageCount = String((doc.messages || []).filter((m) => m.type === 'message').length);
        const names = [...new Set((doc.messages || []).map((m) => m.from || m.actor).filter(Boolean))];
        participants = names.slice(0, 5).join(', ');
      } else if (doc.guild && doc.channel && doc.messages) {
        platform = 'Discord';
        messageCount = String((doc.messages || []).length);
      } else if (doc.participants && doc.messages?.[0]?.sender_name) {
        platform = 'Messenger';
        messageCount = String((doc.messages || []).length);
        participants = (doc.participants || []).map((p) => p.name).join(', ');
      }
    } catch { /* skip */ }
  } else {
    platform = 'WhatsApp';
    const count = (text.match(/^[\[\(]?\d{1,2}[.\/\-]/gm) || []).length;
    if (count > 0) messageCount = String(count);
  }

  return {
    fields: [
      { label: 'Platform', value: platform },
      { label: 'Messages', value: messageCount },
      { label: 'Participants', value: participants },
    ].filter((f) => f.value),
  };
}

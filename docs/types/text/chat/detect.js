import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (intake.isBinary) return 0;
  const name = (intake.filename || '').toLowerCase();
  const head = (intake.textSample || '').slice(0, 600);

  // WhatsApp: _chat.txt with date pattern at the start of lines
  if (name === '_chat.txt' || name.endsWith('_chat.txt')) return 0.97;
  if (/^\[\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4},\s*\d{1,2}:\d{2}(:\d{2})?\]\s+\S+:/m.test(head)) return 0.92;
  if (/^\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4},\s*\d{1,2}:\d{2}\s+-\s+\S+/m.test(head)) return 0.9;

  // Telegram JSON export
  if (/"type"\s*:\s*"personal_chat"/.test(head) && /"messages"/.test(head)) return 0.97;
  if (/"type"\s*:\s*"saved_messages"/.test(head) && /"messages"/.test(head)) return 0.97;

  // Discord JSON (DiscordChatExporter)
  if (/"guild"/.test(head) && /"channel"/.test(head) && /"messages"/.test(head)) return 0.95;

  // Facebook Messenger JSON
  if (/"participants"/.test(head) && /"messages"/.test(head) && /"sender_name"/.test(head)) return 0.93;

  if (!hasExtension(intake, 'txt', 'json')) return 0;
  return 0;
}

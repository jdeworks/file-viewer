// Audio/video preview: a native <audio>/<video> player in the sandboxed iframe, fed a
// data: URL. No execution risk — it's media bytes, not markup. Nothing leaves the page.
import { mediaInfo, dataUrl } from './medialib.js';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const info = mediaInfo(intake);
  if (!info.kind) return { bodyHtml: '<p class="media-note">Unsupported media file.</p>', hadUnsafe: false };
  const url = dataUrl(intake, info.mime);
  const name = esc(intake.filename);
  if (info.kind === 'audio') {
    return {
      bodyHtml: '<div class="media-doc media-audio"><div class="media-name">' + name + '</div>'
        + '<audio class="media-view" controls preload="metadata" src="' + url + '"></audio></div>',
      hadUnsafe: false,
    };
  }
  return {
    bodyHtml: '<div class="media-doc media-video">'
      + '<video class="media-view" controls playsinline preload="metadata" src="' + url + '"></video>'
      + '<div class="media-name">' + name + '</div></div>',
    hadUnsafe: false,
  };
}

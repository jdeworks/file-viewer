// Audio/video preview: a native <audio>/<video> element rendered directly in the preview
// pane (NOT the sandboxed iframe). The bytes are served from a blob: URL the browser
// streams from — no base64 inflation, efficient seeking, no real size ceiling. Media
// bytes can't execute script, so rendering them in the parent document is safe; the
// sandboxed iframe is reserved for untrusted *markup*.
import { mediaInfo, blobUrl } from './medialib.js';

export async function render(intake, _ctx) {
  const info = mediaInfo(intake);
  const host = document.createElement('div');
  host.className = 'media-doc media-' + (info.kind || 'audio');
  if (!info.kind) {
    host.innerHTML = '<p class="media-note">Unsupported media file.</p>';
    return { parentNode: host };
  }
  const url = blobUrl(intake, info.mime);
  const el = document.createElement(info.kind === 'video' ? 'video' : 'audio');
  el.className = 'media-view';
  el.controls = true;
  el.preload = 'metadata';
  el.src = url;
  if (info.kind === 'video') el.setAttribute('playsinline', '');
  const name = document.createElement('div');
  name.className = 'media-name';
  name.textContent = intake.filename;
  if (info.kind === 'audio') host.append(name, el);
  else host.append(el, name);
  // parentNode = render outside the sandbox; revoke frees the blob when the preview changes.
  return { parentNode: host, revoke: () => URL.revokeObjectURL(url) };
}

// iOS background-audio install EXCEPTION. The web app is no-install everywhere — except this:
// on an iPhone/iPad, a plain web page can't keep audio playing once the screen locks (iOS
// suspends web audio; reliable background playback needs the page added to the Home Screen).
// So when an AUDIO file is open on iOS (and we're not already running standalone), we surface a
// clearly-explained, opt-in "Add to Home Screen" hint. It never appears on Android/desktop,
// where background audio + Media Session already work without installing.
//
// The Android/desktop install prompt is separately suppressed (suppressInstallPrompt) so the
// no-install default holds everywhere else.

const DISMISS_KEY = 'fv:iosAudioHint:dismissed';

export function isIos() {
  const ua = navigator.userAgent || '';
  // iPhone/iPod/iPad — plus iPadOS 13+ which reports as Mac but has touch.
  return /iphone|ipod|ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

// Stop Chrome/Edge (Android/desktop) from offering to install the app — keeps the no-install
// promise. Call once at startup.
export function suppressInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
}

// Show the iOS hint if appropriate. Safe to call repeatedly. No-op off iOS, when standalone,
// or once permanently dismissed.
export function showIosAudioHint() {
  const el = document.getElementById('iosAudioHint');
  if (!el || !isIos() || isStandalone()) return;
  if (localStorage.getItem(DISMISS_KEY) === '1') return;
  el.hidden = false;
  el.innerHTML =
    '<div class="ios-hint-body">'
    + '<strong>📱 iPhone tip — background audio</strong>'
    + '<p>To keep playing while your screen is locked, add this page to your Home Screen: '
    + 'tap <b>Share</b> <span class="ios-share">⬆️</span> then <b>Add to Home Screen</b>. '
    + 'Everything still runs privately on your device — nothing is installed from a store.</p>'
    + '<div class="ios-hint-actions">'
    + '<button class="ios-hint-dismiss" type="button">Not now</button>'
    + '<button class="ios-hint-never" type="button">Don’t show again</button>'
    + '</div></div>';
  el.querySelector('.ios-hint-dismiss').onclick = () => hideIosAudioHint();
  el.querySelector('.ios-hint-never').onclick = () => { localStorage.setItem(DISMISS_KEY, '1'); hideIosAudioHint(); };
}

export function hideIosAudioHint() {
  const el = document.getElementById('iosAudioHint');
  if (el) { el.hidden = true; el.innerHTML = ''; }
}

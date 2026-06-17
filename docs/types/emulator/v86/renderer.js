// v86 x86 PC emulator renderer.
// Uses the parentNode pattern: returns { parentNode: HTMLElement, revoke() }.

const LIBV86_JS = new URL('../../../vendor/v86/libv86.js', import.meta.url).href;
const V86_WASM  = new URL('../../../vendor/v86/v86.wasm',  import.meta.url).href;
const SEABIOS   = new URL('../../../vendor/v86/seabios.bin', import.meta.url).href;
const VGABIOS   = new URL('../../../vendor/v86/vgabios.bin', import.meta.url).href;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex', 'flex-direction:column', 'align-items:stretch',
    'min-height:200px', 'padding:24px', 'box-sizing:border-box',
    'background:var(--bg-1,#1e1e1e)', 'color:var(--fg,#ccc)',
    'font-family:var(--font-ui,sans-serif)',
  ].join(';');

  // --- Security warning dialog ---
  const dialog = document.createElement('div');
  dialog.style.cssText = [
    'display:flex', 'flex-direction:column', 'gap:16px',
    'max-width:540px', 'margin:auto',
    'padding:24px', 'border-radius:8px',
    'background:var(--bg-2,#252525)', 'border:1px solid var(--border,#444)',
  ].join(';');

  const heading = document.createElement('div');
  heading.style.cssText = 'font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;';
  heading.innerHTML = '<span style="font-size:20px;">&#9888;</span> x86 Emulator (v86)';
  dialog.appendChild(heading);

  const body = document.createElement('p');
  body.style.cssText = 'margin:0;font-size:13px;line-height:1.6;opacity:0.85;';
  body.textContent =
    'Only open disk images (.img, .iso) from trusted sources. Running unknown ' +
    'executables in an emulator carries real security risk.';
  dialog.appendChild(body);

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

  const btnLoad = document.createElement('button');
  btnLoad.textContent = 'I understand — Start emulator';
  btnLoad.style.cssText = [
    'padding:8px 16px', 'border-radius:5px', 'border:none', 'cursor:pointer',
    'background:var(--accent,#4a8fff)', 'color:#fff', 'font-size:13px', 'font-weight:500',
  ].join(';');

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancel';
  btnCancel.style.cssText = [
    'padding:8px 16px', 'border-radius:5px', 'cursor:pointer',
    'background:transparent', 'border:1px solid var(--border,#444)',
    'color:var(--fg,#ccc)', 'font-size:13px',
  ].join(';');

  buttons.appendChild(btnLoad);
  buttons.appendChild(btnCancel);
  dialog.appendChild(buttons);
  wrap.appendChild(dialog);

  // Emulator reference for cleanup.
  let emulator = null;

  // Determine the drive type from filename + size.
  function getDriveConfig(bytes) {
    const n = intake.filename.toLowerCase();
    const size = bytes.byteLength;
    if (n.endsWith('.iso')) {
      return { cdrom: { buffer: bytes } };
    }
    // .img / .ima: floppy if <= 1.44MB, otherwise hard disk
    if (size <= 1474560) {
      return { fda: { buffer: bytes } };
    }
    return { hda: { buffer: bytes } };
  }

  async function startEmulator() {
    dialog.remove();

    const status = document.createElement('div');
    status.style.cssText = 'text-align:center;padding:24px;opacity:0.7;font-size:13px;';
    status.textContent = 'Loading v86…';
    wrap.appendChild(status);

    try {
      await loadScript(LIBV86_JS);
    } catch (e) {
      status.textContent = 'Could not load libv86.js: ' + e.message;
      return;
    }

    status.remove();

    // Reset wrap layout for the emulator screen.
    wrap.style.cssText = [
      'display:flex', 'flex-direction:column', 'flex:1',
      'min-height:400px', 'padding:0', 'box-sizing:border-box',
      'background:#000',
    ].join(';');

    // Screen container — v86 creates a canvas inside this.
    const screenDiv = document.createElement('div');
    screenDiv.style.cssText = 'background:#000;width:640px;height:400px;max-width:100%;';
    wrap.appendChild(screenDiv);

    // Toolbar below the screen.
    const toolbar = document.createElement('div');
    toolbar.style.cssText = [
      'display:flex', 'gap:8px', 'flex-wrap:wrap', 'padding:8px 10px',
      'background:var(--bg-1,#1e1e1e)', 'border-top:1px solid var(--border,#333)',
    ].join(';');

    function makeToolBtn(label) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = [
        'padding:5px 12px', 'border-radius:4px', 'border:1px solid var(--border,#444)',
        'background:var(--bg-2,#252525)', 'color:var(--fg,#ccc)',
        'font-size:12px', 'cursor:pointer',
      ].join(';');
      return b;
    }

    const btnPause    = makeToolBtn('Pause');
    const btnSave     = makeToolBtn('Save State');
    const btnLoad     = makeToolBtn('Load State');
    const btnFullscr  = makeToolBtn('Full Screen');

    toolbar.appendChild(btnPause);
    toolbar.appendChild(btnSave);
    toolbar.appendChild(btnLoad);
    toolbar.appendChild(btnFullscr);
    wrap.appendChild(toolbar);

    // Instantiate v86 (screen_container must be in DOM first — it is, since we just appended wrap content).
    const driveConfig = getDriveConfig(intake.bytes.buffer);
    try {
      emulator = new window.V86({
        wasm_path: V86_WASM,
        bios:      { url: SEABIOS },
        vga_bios:  { url: VGABIOS },
        screen_container: screenDiv,
        ...driveConfig,
        memory_size:     32 * 1024 * 1024,
        vga_memory_size:  2 * 1024 * 1024,
        autostart: true,
      });
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:16px;color:var(--fg,#ccc);font-size:13px;';
      errDiv.textContent = 'Failed to start emulator: ' + e.message;
      wrap.appendChild(errDiv);
      return;
    }

    window.__v86SavePending = true;

    // Pause / Resume toggle.
    let paused = false;
    btnPause.addEventListener('click', () => {
      if (!emulator) return;
      if (paused) {
        emulator.run();
        btnPause.textContent = 'Pause';
        paused = false;
      } else {
        emulator.stop();
        btnPause.textContent = 'Resume';
        paused = true;
      }
    });

    // Save State — download as a file.
    btnSave.addEventListener('click', () => {
      if (!emulator) return;
      emulator.save_state((err, state) => {
        if (err) { alert('Save state failed: ' + err.message); return; }
        const blob = new Blob([state], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = intake.filename + '.v86state';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
    });

    // Load State — file picker.
    btnLoad.addEventListener('click', () => {
      if (!emulator) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.v86state';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        file.arrayBuffer().then((buf) => {
          emulator.restore_state(buf);
        }).catch((e) => {
          alert('Load state failed: ' + e.message);
        });
      });
      input.click();
    });

    // Full Screen — native browser fullscreen on the screen container.
    btnFullscr.addEventListener('click', () => {
      if (screenDiv.requestFullscreen) screenDiv.requestFullscreen();
      else if (screenDiv.webkitRequestFullscreen) screenDiv.webkitRequestFullscreen();
    });
  }

  btnLoad.addEventListener('click', startEmulator);

  btnCancel.addEventListener('click', () => {
    dialog.remove();

    const msg = document.createElement('div');
    msg.style.cssText = [
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:12px',
      'padding:32px', 'text-align:center', 'opacity:0.8', 'font-size:13px',
    ].join(';');

    const text = document.createElement('div');
    text.textContent = 'Disk image not loaded.';
    msg.appendChild(text);

    const loadAnyway = document.createElement('button');
    loadAnyway.textContent = 'Load anyway';
    loadAnyway.style.cssText = [
      'padding:7px 14px', 'border-radius:5px', 'border:none', 'cursor:pointer',
      'background:var(--accent,#4a8fff)', 'color:#fff', 'font-size:13px',
    ].join(';');
    loadAnyway.addEventListener('click', () => {
      msg.remove();
      startEmulator();
    });
    msg.appendChild(loadAnyway);

    wrap.appendChild(msg);
  });

  return {
    parentNode: wrap,
    revoke() {
      window.__v86SavePending = false;
      try { emulator?.stop?.(); } catch (_) {}
      emulator = null;
    },
  };
}

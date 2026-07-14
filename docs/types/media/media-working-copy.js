function extension(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
}

function outputBlob(result) {
  if (result?.blob instanceof Blob) return result.blob;
  if (result?.bytesData) {
    return new Blob([result.bytesData], {
      type: result.mime || 'application/octet-stream',
    });
  }
  return null;
}

// Companion writes are exact-target replacements. Only an output with the same concrete
// extension may become the pending binary edit; conversions remain download-only.
export function isCompatibleMediaOutput(intake, result) {
  const sourceExt = extension(intake?.filename);
  const outputExt = extension(result?.filename);
  return !!sourceExt && sourceExt === outputExt && !!outputBlob(result);
}

export function createMediaWorkingCopyController(intake, ctx = {}) {
  return {
    canUse(result) {
      return typeof ctx.onBinaryEdit === 'function' && isCompatibleMediaOutput(intake, result);
    },
    use(result) {
      if (!this.canUse(result)) return false;
      const blob = outputBlob(result);
      ctx.onBinaryEdit({
        dirty: true,
        mimeType: result.mime || blob.type || intake?.mimeType || 'application/octet-stream',
        getBytes: async () => new Uint8Array(await blob.arrayBuffer()),
      });
      ctx.toast?.('Media output is now the working copy. Download it or use Companion Save to replace the exact source after confirmation.');
      return true;
    },
  };
}

export function buildWorkingCopyButton(result, controller, className = 'media-ed-btn media-working-copy') {
  if (!controller?.canUse?.(result)) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = 'Use as working copy';
  button.title = 'Make these same-format bytes available to Download and Companion Save; the original is not changed until Save is confirmed.';
  button.addEventListener('click', () => {
    if (!controller.use(result)) return;
    button.disabled = true;
    button.textContent = 'Working copy ready';
  });
  return button;
}

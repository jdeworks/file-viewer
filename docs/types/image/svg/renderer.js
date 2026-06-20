// SVG preview renderer — renders SVG in a sandboxed iframe.
// Returns { bodyHtml } so the core shell mounts it in its sandboxed iframe
// (scripts disabled by default, same-origin isolation preserved).

export async function render(intake, _ctx) {
  const svgSource = intake.text || '';

  // Wrap bare <svg> in a minimal HTML shell that centers it and sets a
  // transparent background so the checkerboard from the shell shows through.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; overflow: auto; }
  svg { max-width: 100%; max-height: 100%; }
</style>
</head>
<body>${svgSource}</body>
</html>`;

  return { bodyHtml: html };
}

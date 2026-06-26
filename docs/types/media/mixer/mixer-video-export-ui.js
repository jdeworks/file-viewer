export function renderVideoExportPlanPanel(plan, runtime = {}) {
  const budget = plan.provenance?.renderBudget || {};
  const hardBlocked = isHardBlocked(plan, budget);
  const canAttemptLoad = runtime.ffmpegEnabled && !runtime.ffmpegLoaded && !hardBlocked;
  const canRun = !!runtime.ffmpegEnabled && (plan.canRender || canAttemptLoad);
  const panel = document.createElement('section');
  panel.className = 'mmx-video-export-status';
  panel.dataset.status = plan.status;
  panel.dataset.canRender = plan.canRender ? 'true' : 'false';
  panel.dataset.canAttemptRender = canRun ? 'true' : 'false';
  panel.dataset.hardBlocked = hardBlocked ? 'true' : 'false';
  const title = document.createElement('strong');
  title.textContent = hardBlocked
    ? 'Final video export blocked'
    : (plan.canRender ? 'Final video export ready' : 'Final video export needs Media Transcoding');
  const summary = document.createElement('span');
  summary.className = 'mmx-video-export-summary';
  const visual = plan.provenance?.visualItems?.length || 0;
  const audio = plan.provenance?.audioItems?.length || 0;
  const complexity = budget.compositionItems ? ` · ${budget.compositionItems} items` : '';
  summary.textContent = `${visual} visual · ${audio} audio · ${Math.round(plan.durationMs || 0)} ms${complexity}`;
  const note = document.createElement('p');
  note.className = 'mmx-video-export-note';
  note.textContent = plan.warnings?.[0] || plan.statusMessage || 'ffmpeg render planning is available for this project.';
  const render = document.createElement('button');
  render.type = 'button';
  render.className = 'mmx-video-render-run';
  render.textContent = 'Render final export';
  render.disabled = !canRun;
  render.title = buttonTitle({ runtime, hardBlocked, canRun, plan });
  panel.append(title, summary, note, render);
  return panel;
}

function isHardBlocked(plan, budget) {
  if (!(plan.provenance?.visualItems?.length)) return true;
  if (budget.overBudget || budget.durationOverBudget || budget.complexityOverBudget) return true;
  return (plan.provenance?.assets || []).some((asset) => asset.status === 'missing' || asset.status === 'needs-relink');
}

function buttonTitle({ runtime, hardBlocked, canRun, plan }) {
  if (!runtime.ffmpegEnabled) return 'Enable Media Transcoding to render this mix';
  if (hardBlocked) return plan.warnings?.[0] || 'Resolve blocked media or browser render limits before rendering';
  if (!canRun) return plan.statusMessage || 'Render is not available yet';
  return runtime.ffmpegLoaded ? 'Render this mix' : 'Load Media Transcoding and render this mix';
}

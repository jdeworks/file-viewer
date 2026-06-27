export function createWorkspaceModes({
  tabWrap,
  panelWrap,
  stickyModes = [],
  onRegisterController,
  onReleaseController,
  onModeChange,
}) {
  const states = new Map();
  const sticky = new Set(stickyModes);
  let activeMode = null;

  const registerMode = (id, label, mount) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'media-mode-tab';
    tab.textContent = label;
    tab.dataset.mode = id;

    const panel = document.createElement('div');
    panel.className = 'media-mode-panel';
    panel.dataset.mode = id;
    panel.hidden = true;

    const entry = {
      id,
      tab,
      panel,
      mount,
      mounted: false,
      controller: null,
      mountInProgress: false,
      mountToken: 0,
    };

    tabWrap.append(tab);
    panelWrap.append(panel);
    states.set(id, entry);
    tab.addEventListener('click', () => { void setMode(id); });
    return entry;
  };

  const releaseController = (entry) => {
    const controller = entry?.controller;
    if (!controller) return;
    onReleaseController?.(controller, entry);
  };

  const unmountMode = (entry) => {
    if (!entry || sticky.has(entry.id)) return;
    if (!entry.mounted) return;
    const previous = entry.controller;
    releaseController(entry);
    if (previous && typeof previous.destroy === 'function') previous.destroy();
    entry.controller = null;
    entry.mounted = false;
    entry.mountInProgress = false;
    entry.panel.innerHTML = '';
    entry.panel.hidden = true;
  };

  const setMode = async (id) => {
    const next = states.get(id);
    if (!next) return;
    activeMode = id;
    onModeChange?.(id);
    for (const entry of states.values()) {
      const on = entry.id === id;
      entry.tab.classList.toggle('active', on);
      entry.panel.hidden = !on;
      if (!on && !sticky.has(entry.id) && entry.mounted) {
        unmountMode(entry);
      }
    }

    if (next.mount && !next.mounted && !next.mountInProgress) {
      next.mountInProgress = true;
      const mountToken = ++next.mountToken;
      try {
        const controller = await next.mount(next.panel);
        if (next.mountToken !== mountToken || activeMode !== id) {
          next.panel.innerHTML = '';
          next.panel.hidden = true;
          if (controller && typeof controller.destroy === 'function') controller.destroy();
          next.controller = null;
          next.mounted = false;
          next.mountInProgress = false;
          return;
        }
        if (controller) {
          onRegisterController?.(controller, next);
          next.controller = controller;
        }
        next.mounted = true;
      } finally {
        next.mountInProgress = false;
      }
    }
    if (!next.mount) next.mounted = true;
  };

  return {
    states,
    registerMode,
    setMode,
  };
}

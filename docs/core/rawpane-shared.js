// Stateless DOM helpers shared by the bundled raw-pane controller and editor/tool modules that
// load later. Keeping this outside rawpane.js prevents lazy modules from importing a second copy of
// the controller just to update toolbar geometry.
export function syncHasToolsClass() {
  const anyVisible = ['markdownTools', 'jsonTools', 'yamlTools', 'xmlTools', 'tomlTools', 'htmlToolbar', 'binaryTools'].some(
    (id) => {
      const el = document.getElementById(id);
      return el && !el.hidden;
    },
  );
  document.getElementById('rawPane')?.classList.toggle('has-tools', anyVisible);
}

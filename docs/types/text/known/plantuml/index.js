export const plugin = {
  id: 'plantuml',
  label: 'PlantUML',
  tags: ['diagram', 'uml', 'visualization'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (['puml', 'plantuml', 'pu', 'uml'].includes(ext)) return true;
    const text = intake.text || '';
    return /@startuml/.test(text) || /@enduml/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PlantUML diagram definition file — describe sequence, class, use case, activity, component, state, deployment, timing, wireframe, mindmap, WBS, Gantt, or ER diagrams using simple text syntax.',
    usedFor: [
      { label: 'PlantUML', description: 'Generate UML and other diagrams from plain text descriptions', href: 'https://plantuml.com/' },
      { label: 'PlantUML Online Server', description: 'Render PlantUML diagrams interactively in the browser', href: 'https://www.plantuml.com/plantuml/uml/' },
    ],
  },
};
export default plugin;

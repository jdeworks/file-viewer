export const plugin = {
  id: 'ballerina-lang',
  label: 'Ballerina',
  tags: ['ballerina', 'bal', 'wso2', 'cloud-native', 'integration'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.bal')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('import ') && !text.includes('service ') && !text.includes('function ')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ballerina is an open-source, cloud-native programming language designed for integration and microservices. It has built-in support for network protocols, data transformation, and concurrency.',
    usedFor: [
      { label: 'ballerina.io', description: 'Official Ballerina language home', href: 'https://ballerina.io/' },
      { label: 'Ballerina Central', description: 'Ballerina package registry', href: 'https://central.ballerina.io/' },
    ],
  },
};
export default plugin;

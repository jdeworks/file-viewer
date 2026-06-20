export default {
  id: 'open-webui-config',
  label: 'Open WebUI Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'open-webui.env') return true;
    return (intake.text || '').includes('WEBUI_SECRET_KEY');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Open WebUI self-hosted AI chat interface (for Ollama/OpenAI) environment configuration — server, backend, security, API keys, database, RAG, storage, and admin settings.',
    tags: ['open-webui', 'ollama', 'openai', 'ai', 'self-hosted', 'env', 'config'],
  },
};

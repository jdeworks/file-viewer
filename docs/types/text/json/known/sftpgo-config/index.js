export default {
  id: 'sftpgo-config',
  label: 'SFTPGo Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'sftpgo.json' || n === 'sftpgo.yaml' || n === 'sftpgo.yml') return true;
    const cfg = intake.parsed || {};
    return !!cfg.data_provider && !!(cfg.httpd || cfg.sftpd);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SFTPGo SFTP/FTP/WebDAV server configuration — data provider, listeners, HTTP admin UI, telemetry, and connection limits.',
    tags: ['sftpgo', 'sftp', 'ftp', 'webdav', 'file-transfer', 'self-hosted', 'config'],
  },
};

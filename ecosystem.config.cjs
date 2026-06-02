// PM2 konfigurace produkčního serveru.
// Spuštění:  npm run build && npm run pm2:start
// Pozn.: Socket.IO drží stavové připojení, proto běží jediná instance ve fork módu.
//        Pro cluster by bylo potřeba sticky-session load balancer + Socket.IO adapter (Redis).
module.exports = {
  apps: [
    {
      name: 'ruleta-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
}

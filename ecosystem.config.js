module.exports = {
  apps: [
    {
      name: 'leadgen-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/leadgen',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'leadgen-scan-worker',
      script: 'dist/workers/scan-worker.js',
      cwd: '/opt/leadgen',
      cron_restart: '0 8 * * 1',
      autorestart: false,
    },
    {
      name: 'leadgen-outreach-worker',
      script: 'dist/workers/outreach-worker.js',
      cwd: '/opt/leadgen',
      cron_restart: '0 9 * * 1-5',
      autorestart: false,
    },
    {
      name: 'leadgen-site-generator',
      script: 'dist/workers/site-generator-worker.js',
      cwd: '/opt/leadgen',
      watch: false,
      autorestart: true,
      restart_delay: 10000,
    },
  ],
}

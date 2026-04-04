module.exports = {
  apps: [
    {
      name: 'stark-api',
      script: 'venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      cwd: '/var/www/starktrade-ai/backend',
      interpreter: 'none',
      env: {
        PATH: '/var/www/starktrade-ai/backend/venv/bin:$PATH'
      }
    },
    {
      name: 'stark-webapp',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/starktrade-ai/frontend'
    }
  ]
};

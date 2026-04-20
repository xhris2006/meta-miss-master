module.exports = {
  apps: [
    {
      name: "mmm-backend",
      script: "./backend/src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "mmm-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "../logs/frontend-error.log",
      out_file: "../logs/frontend-out.log",
    },
  ],
};

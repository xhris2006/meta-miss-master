module.exports = {
  apps: [
    {
      name: "mmm-backend",
      script: "./backend/src/index.js",

      /**
       * instances: "max" → PM2 démarre autant d'instances que de vCPU disponibles.
       * Sur un VPS 4 vCPU → 4 instances Node.js en parallèle.
       * Chaque instance peut gérer ~5 000 connexions concurrentes.
       * Total : ~20 000 connexions simultanées.
       *
       * IMPORTANT : Socket.io avec plusieurs instances nécessite un Redis adapter
       * pour que les événements soient partagés entre instances.
       * Tant que Redis n'est pas configuré, mettre instances: 1 pour éviter
       * que les mises à jour Socket.io soient perdues sur certains clients.
       *
       * → Décommenter "max" et configurer REDIS_URL quand Redis est prêt.
       */
      instances: 1,          // passer à "max" avec Redis Socket.io adapter
      exec_mode: "cluster",  // mode cluster activé (prêt pour scale-out)
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",

      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        // UV_THREADPOOL_SIZE augmente le pool de threads pour les ops I/O (bcrypt, fs)
        UV_THREADPOOL_SIZE: 16,
      },

      // Graceful shutdown : attendre 10s pour finir les requêtes en cours
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,

      error_file: "./logs/backend-error.log",
      out_file:   "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "mmm-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      error_file: "../logs/frontend-error.log",
      out_file:   "../logs/frontend-out.log",
    },
  ],
};

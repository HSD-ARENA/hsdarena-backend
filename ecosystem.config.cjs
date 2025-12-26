module.exports = {
  apps: [
    {
      name: "nestjs-backend",
      script: "npm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8082,
      },
    },
  ],
};
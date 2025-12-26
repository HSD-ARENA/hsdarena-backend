module.exports = {
  apps: [
    {
      name: "nestjs-backend",
      script: "npm",
      args: "start",
      exec_mode: "fork",
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
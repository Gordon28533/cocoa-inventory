module.exports = {
  apps: [
    {
      name: "cocoa-inventory",
      script: "Backend/server.js",
      cwd: __dirname,
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      time: true
    }
  ]
};

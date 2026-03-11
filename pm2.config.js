// PM2 进程管理配置
// 用法: pm2 start pm2.config.js
// 开机自启: pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: 'xdwttxsp-backend',
      script: './backend/dist/app.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8081
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      // 崩溃重启延迟
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}

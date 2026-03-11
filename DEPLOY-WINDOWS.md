# xdwTTXsp GPS车辆监控平台 - Windows Server 部署指南

## 目录结构

```
xdwTTXsp/
├── backend/          # Node.js 后端 (Express + TypeScript)
│   ├── dist/         # 编译后的 JS 文件 (已编译)
│   ├── src/          # TypeScript 源码
│   ├── .env          # 环境配置 (需自行创建)
│   └── .env.example  # 环境配置示例
├── frontend/
│   └── dist/         # 前端构建产物 (已编译)
├── database/
│   └── init.sql      # 数据库初始化脚本
├── windows/
│   ├── start.bat         # 使用 PM2 启动 (推荐)
│   ├── start-simple.bat  # 直接启动 (调试用)
│   ├── stop.bat          # 停止服务
│   └── nginx.conf        # nginx 配置
├── pm2.config.js     # PM2 进程管理配置
└── logs/             # 日志目录 (自动创建)
```

---

## 一、环境要求

| 软件 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | 18.x 或 20.x LTS | https://nodejs.org |
| MySQL | 5.7+ 或 8.0+ | https://dev.mysql.com/downloads/mysql/ |
| nginx (Windows) | 最新稳定版 | http://nginx.org/en/download.html |
| PM2 (可选) | 最新版 | `npm install -g pm2` |

---

## 二、安装步骤

### 1. 安装 Node.js

1. 下载并安装 Node.js 20.x LTS
2. 安装完成后验证:
   ```cmd
   node -v   # 应显示 v20.x.x
   npm -v    # 应显示 10.x.x
   ```

### 2. 安装 MySQL

1. 下载安装 MySQL 8.0
2. 安装时设置 root 密码，记住该密码
3. 创建数据库:
   ```sql
   mysql -u root -p
   CREATE DATABASE gps_platform DEFAULT CHARACTER SET utf8mb4;
   exit;
   ```

### 3. 部署项目文件

将整个 `xdwTTXsp` 目录复制到服务器，例如: `C:\xdwTTXsp\`

### 4. 配置后端环境变量

```cmd
cd C:\xdwTTXsp\backend
copy .env.example .env
```

用文本编辑器打开 `.env`，修改以下配置:

```env
PORT=8081
NODE_ENV=production

# 修改为你的 MySQL 密码
DB_PASSWORD=your_mysql_password

# 修改为强随机密钥 (至少32位)
JWT_SECRET=your_strong_secret_key_here_min_32_chars

# 前端访问地址 (CORS)
# 如果前后端同域访问可设为 *，否则填写具体地址
CORS_ORIGIN=*
```

### 5. 安装后端依赖

```cmd
cd C:\xdwTTXsp\backend
npm install --production
```

### 6. 初始化数据库

首次运行时，Sequelize 会自动创建数据表。然后导入初始数据:

```cmd
mysql -u root -p gps_platform < C:\xdwTTXsp\database\init.sql
```

**默认管理员账号:**
- 用户名: `admin`
- 密码: `Admin123456`
- **首次登录后请立即修改密码!**

---

## 三、配置 nginx (前端静态服务 + 反向代理)

### 1. 下载配置 nginx

1. 下载 nginx Windows 版并解压到 `C:\nginx\`
2. 编辑 `C:\nginx\conf\nginx.conf`，替换为以下内容:

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;
    gzip  on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen       8090;
        server_name  localhost;

        # 修改为实际的前端 dist 目录路径
        root   C:/xdwTTXsp/frontend/dist;
        index  index.html;

        # API 代理
        location /api/ {
            proxy_pass http://127.0.0.1:8081;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # WebSocket 代理
        location /socket.io/ {
            proxy_pass http://127.0.0.1:8081;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400s;
        }

        # SPA 路由
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 2. 启动 nginx

```cmd
cd C:\nginx
start nginx.exe
```

验证: 浏览器访问 `http://localhost:8090`

---

## 四、启动后端服务

### 方式一: 使用 PM2 (推荐生产环境)

```cmd
:: 全局安装 PM2
npm install -g pm2
npm install -g pm2-windows-startup

:: 启动服务
cd C:\xdwTTXsp
pm2 start pm2.config.js

:: 保存 PM2 进程列表
pm2 save

:: 设置开机自启 (以管理员权限运行)
pm2-startup install
```

**PM2 常用命令:**
```cmd
pm2 status                    # 查看服务状态
pm2 logs xdwttxsp-backend    # 查看日志
pm2 restart xdwttxsp-backend # 重启服务
pm2 stop xdwttxsp-backend    # 停止服务
```

### 方式二: 使用批处理脚本 (调试)

双击运行 `C:\xdwTTXsp\windows\start-simple.bat`

---

## 五、防火墙配置

在 Windows 防火墙中开放以下端口:

| 端口 | 用途 | 说明 |
|-----|------|------|
| 8090 | HTTP 前端访问 | 用户浏览器访问 |
| 8081 | 后端 API | 内部使用，可不对外开放 |
| 8808 | JT808 TCP | GPS 设备通信 (必须开放) |
| 1078 | JT1078 | 视频流 (按需开放) |

```cmd
:: 以管理员身份运行以下命令
netsh advfirewall firewall add rule name="xdwTTXsp-Web" protocol=TCP dir=in localport=8090 action=allow
netsh advfirewall firewall add rule name="xdwTTXsp-JT808" protocol=TCP dir=in localport=8808 action=allow
netsh advfirewall firewall add rule name="xdwTTXsp-JT1078" protocol=TCP dir=in localport=1078 action=allow
```

---

## 六、验证部署

1. **前端页面**: 浏览器访问 `http://服务器IP:8090`
2. **登录**: 使用 `admin / Admin123456`
3. **API健康检查**: `http://服务器IP:8081/api/health`
4. **系统状态**: `http://服务器IP:8081/api/system/stats`

---

## 七、nginx 设置为 Windows 服务 (可选)

使用 NSSM 将 nginx 注册为 Windows 服务，实现开机自启:

1. 下载 NSSM: https://nssm.cc/download
2. 注册服务:
   ```cmd
   nssm install nginx C:\nginx\nginx.exe
   nssm set nginx AppDirectory C:\nginx
   nssm start nginx
   ```

---

## 八、常见问题

### Q: 后端启动失败 - 数据库连接错误
检查 `.env` 中的 `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` 是否正确。

### Q: 前端页面空白或404
检查 nginx 配置中 `root` 路径是否指向正确的 `frontend/dist` 目录。注意 Windows 路径使用正斜杠 `/`。

### Q: WebSocket 连接失败
确保 nginx 的 `/socket.io/` 代理配置正确，且包含 `proxy_http_version 1.1` 和 `Upgrade` 头。

### Q: GPS 设备无法连接
- 确认防火墙已开放 8808 端口
- 检查 `.env` 中 `JT808_PORT=8808`
- 查看日志: `pm2 logs xdwttxsp-backend`

### Q: 端口被占用
```cmd
netstat -ano | findstr :8081
taskkill /F /PID <PID>
```

---

## 九、目录权限

确保运行 Node.js 的用户对以下目录有写权限:
- `C:\xdwTTXsp\logs\` (日志文件)
- `C:\xdwTTXsp\backend\` (运行目录)

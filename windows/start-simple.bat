@echo off
chcp 65001 >nul
title xdwTTXsp GPS监控平台 (直接启动)

echo [信息] 直接启动后端服务 (不使用PM2)...
cd /d "%~dp0..\backend"

if not exist ".env" (
    echo [错误] 未找到 .env 配置文件
    echo 请复制 .env.example 为 .env 并配置数据库连接
    pause
    exit /b 1
)

if not exist "dist\app.js" (
    echo [错误] 未找到编译文件 dist\app.js
    echo 请先运行: npm run build
    pause
    exit /b 1
)

echo [信息] 服务启动中...
echo [信息] 后端 API: http://localhost:8081
echo [信息] 按 Ctrl+C 停止服务
echo.
node dist\app.js
pause

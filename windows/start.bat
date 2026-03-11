@echo off
chcp 65001 >nul
title xdwTTXsp GPS监控平台

echo ====================================
echo  xdwTTXsp GPS车辆监控平台 启动脚本
echo ====================================

:: 检查 Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查 pm2
pm2 -v >nul 2>&1
if errorlevel 1 (
    echo [信息] 正在全局安装 PM2...
    npm install -g pm2
)

:: 创建日志目录
if not exist "..\logs" mkdir "..\logs"

:: 检查 .env 文件
if not exist "..\backend\.env" (
    echo [警告] 未找到 backend\.env 文件
    echo [信息] 请复制 backend\.env.example 为 backend\.env 并配置数据库信息
    pause
    exit /b 1
)

echo [信息] 使用 PM2 启动后端服务...
cd /d "%~dp0.."
pm2 start pm2.config.js

echo.
echo [信息] 服务已启动!
echo [信息] 后端 API: http://localhost:8081
echo [信息] JT808 TCP: 端口 8808
echo [信息] JT1078 视频: 端口 1078
echo.
echo [信息] 查看日志: pm2 logs xdwttxsp-backend
echo [信息] 查看状态: pm2 status
echo.

pause

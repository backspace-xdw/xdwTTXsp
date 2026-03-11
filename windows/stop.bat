@echo off
chcp 65001 >nul
title xdwTTXsp - 停止服务

echo [信息] 正在停止 xdwTTXsp 服务...
pm2 stop xdwttxsp-backend
pm2 delete xdwttxsp-backend

echo [信息] 服务已停止
pause

-- ================================================
-- xdwTTXsp GPS车辆监控平台 - 数据库初始化脚本
-- MySQL 5.7+ / 8.0+
-- ================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `gps_platform`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `gps_platform`;

-- ================================================
-- 初始化管理员账号
-- 默认账号: admin  密码: Admin123456
-- 密码哈希值由 bcryptjs rounds=10 生成
-- 生产环境务必修改密码!
-- ================================================
INSERT IGNORE INTO `users` (
  `username`, `password`, `real_name`, `email`, `role_id`, `status`, `created_at`, `updated_at`
) VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFMC',
  '系统管理员',
  'admin@example.com',
  1,
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 注意: 数据表由 Sequelize 自动创建 (syncModels)
-- 首次启动后端服务时会自动建表，无需手动建表
-- 如需手动建表请参考 backend/src/models/ 目录下的模型定义

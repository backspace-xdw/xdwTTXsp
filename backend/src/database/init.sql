-- JT/T 808 协议相关数据库表
-- 创建数据库
CREATE DATABASE IF NOT EXISTS gps_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE gps_platform;

-- =====================
-- 设备表
-- =====================
CREATE TABLE IF NOT EXISTS devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) NOT NULL COMMENT '终端ID/手机号',
  sim_no VARCHAR(20) DEFAULT NULL COMMENT 'SIM卡号',
  plate_no VARCHAR(20) DEFAULT NULL COMMENT '车牌号',
  vehicle_id INT DEFAULT NULL COMMENT '关联车辆ID',
  protocol_version VARCHAR(10) DEFAULT '2013' COMMENT '协议版本 2013/2019',
  manufacturer_id VARCHAR(20) DEFAULT NULL COMMENT '制造商ID',
  terminal_model VARCHAR(50) DEFAULT NULL COMMENT '终端型号',
  terminal_id VARCHAR(50) DEFAULT NULL COMMENT '终端ID',
  auth_code VARCHAR(100) DEFAULT NULL COMMENT '鉴权码',
  province_id INT DEFAULT NULL COMMENT '省域ID',
  city_id INT DEFAULT NULL COMMENT '市县域ID',
  plate_color TINYINT DEFAULT 0 COMMENT '车牌颜色 0未上牌 1蓝色 2黄色 3黑色 4白色 9其他',
  is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线',
  last_heartbeat DATETIME DEFAULT NULL COMMENT '最后心跳时间',
  last_location_time DATETIME DEFAULT NULL COMMENT '最后位置时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_device_id (device_id),
  INDEX idx_vehicle_id (vehicle_id),
  INDEX idx_plate_no (plate_no),
  INDEX idx_is_online (is_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='终端设备表';

-- =====================
-- 位置表 (使用分区表提高大数据量查询性能)
-- =====================
CREATE TABLE IF NOT EXISTS locations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) NOT NULL COMMENT '终端ID',
  alarm_flag INT UNSIGNED DEFAULT 0 COMMENT '报警标志',
  status INT UNSIGNED DEFAULT 0 COMMENT '状态',
  latitude DECIMAL(10, 6) NOT NULL COMMENT '纬度',
  longitude DECIMAL(10, 6) NOT NULL COMMENT '经度',
  altitude SMALLINT UNSIGNED DEFAULT 0 COMMENT '海拔(m)',
  speed DECIMAL(5, 1) DEFAULT 0 COMMENT '速度(km/h)',
  direction SMALLINT UNSIGNED DEFAULT 0 COMMENT '方向(0-359度)',
  mileage DECIMAL(12, 1) DEFAULT NULL COMMENT '里程(km)',
  fuel DECIMAL(8, 1) DEFAULT NULL COMMENT '油量(L)',
  record_speed DECIMAL(5, 1) DEFAULT NULL COMMENT '行驶记录速度(km/h)',
  gps_time DATETIME NOT NULL COMMENT 'GPS时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_time (device_id, gps_time),
  INDEX idx_gps_time (gps_time),
  INDEX idx_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='位置数据表';

-- =====================
-- 报警表
-- =====================
CREATE TABLE IF NOT EXISTS alarms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) NOT NULL COMMENT '终端ID',
  alarm_type INT NOT NULL COMMENT '报警类型',
  alarm_name VARCHAR(50) DEFAULT NULL COMMENT '报警名称',
  alarm_flag INT UNSIGNED DEFAULT 0 COMMENT '报警标志位',
  alarm_level TINYINT DEFAULT 1 COMMENT '报警级别 1一般 2重要 3紧急',
  latitude DECIMAL(10, 6) DEFAULT NULL COMMENT '纬度',
  longitude DECIMAL(10, 6) DEFAULT NULL COMMENT '经度',
  altitude SMALLINT UNSIGNED DEFAULT 0 COMMENT '海拔',
  speed DECIMAL(5, 1) DEFAULT 0 COMMENT '速度',
  direction SMALLINT UNSIGNED DEFAULT 0 COMMENT '方向',
  address VARCHAR(255) DEFAULT NULL COMMENT '地址',
  status TINYINT DEFAULT 0 COMMENT '处理状态 0未处理 1已处理 2已忽略',
  handler_id INT DEFAULT NULL COMMENT '处理人ID',
  handle_time DATETIME DEFAULT NULL COMMENT '处理时间',
  handle_remark VARCHAR(500) DEFAULT NULL COMMENT '处理备注',
  gps_time DATETIME NOT NULL COMMENT 'GPS时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_time (device_id, gps_time),
  INDEX idx_alarm_type (alarm_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警记录表';

-- =====================
-- 车辆表
-- =====================
CREATE TABLE IF NOT EXISTS vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plate_no VARCHAR(20) NOT NULL COMMENT '车牌号',
  plate_color TINYINT DEFAULT 1 COMMENT '车牌颜色',
  vehicle_type VARCHAR(50) DEFAULT NULL COMMENT '车辆类型',
  brand VARCHAR(50) DEFAULT NULL COMMENT '品牌',
  model VARCHAR(50) DEFAULT NULL COMMENT '型号',
  color VARCHAR(20) DEFAULT NULL COMMENT '车身颜色',
  vin VARCHAR(20) DEFAULT NULL COMMENT '车架号',
  engine_no VARCHAR(20) DEFAULT NULL COMMENT '发动机号',
  company_id INT DEFAULT NULL COMMENT '所属企业ID',
  driver_id INT DEFAULT NULL COMMENT '主驾驶员ID',
  status TINYINT DEFAULT 1 COMMENT '状态 0停用 1启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_plate_no (plate_no),
  INDEX idx_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆表';

-- =====================
-- 驾驶员表
-- =====================
CREATE TABLE IF NOT EXISTS drivers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  id_card VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  license_no VARCHAR(20) DEFAULT NULL COMMENT '驾驶证号',
  license_type VARCHAR(10) DEFAULT NULL COMMENT '准驾车型',
  phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  company_id INT DEFAULT NULL COMMENT '所属企业ID',
  ic_card_no VARCHAR(50) DEFAULT NULL COMMENT 'IC卡号',
  status TINYINT DEFAULT 1 COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_id (company_id),
  INDEX idx_ic_card_no (ic_card_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='驾驶员表';

-- =====================
-- 企业表
-- =====================
CREATE TABLE IF NOT EXISTS companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '企业名称',
  short_name VARCHAR(50) DEFAULT NULL COMMENT '简称',
  parent_id INT DEFAULT NULL COMMENT '上级企业ID',
  contact_name VARCHAR(50) DEFAULT NULL COMMENT '联系人',
  contact_phone VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  address VARCHAR(255) DEFAULT NULL COMMENT '地址',
  status TINYINT DEFAULT 1 COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业表';

-- =====================
-- 用户表
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  name VARCHAR(50) DEFAULT NULL COMMENT '姓名',
  phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  company_id INT DEFAULT NULL COMMENT '所属企业ID',
  role_id INT DEFAULT NULL COMMENT '角色ID',
  status TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
  last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username),
  INDEX idx_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 插入默认管理员
INSERT INTO users (username, password, name, role_id, status) VALUES
('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '系统管理员', 1, 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================
-- 设备实时状态表 (用于快速查询)
-- =====================
CREATE TABLE IF NOT EXISTS device_realtime (
  device_id VARCHAR(20) PRIMARY KEY COMMENT '终端ID',
  latitude DECIMAL(10, 6) DEFAULT NULL COMMENT '纬度',
  longitude DECIMAL(10, 6) DEFAULT NULL COMMENT '经度',
  altitude SMALLINT UNSIGNED DEFAULT 0 COMMENT '海拔',
  speed DECIMAL(5, 1) DEFAULT 0 COMMENT '速度',
  direction SMALLINT UNSIGNED DEFAULT 0 COMMENT '方向',
  mileage DECIMAL(12, 1) DEFAULT NULL COMMENT '里程',
  alarm_flag INT UNSIGNED DEFAULT 0 COMMENT '报警标志',
  status INT UNSIGNED DEFAULT 0 COMMENT '状态',
  acc_on BOOLEAN DEFAULT FALSE COMMENT 'ACC状态',
  is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线',
  gps_time DATETIME DEFAULT NULL COMMENT 'GPS时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_online (is_online),
  INDEX idx_acc_on (acc_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备实时状态表';

-- =====================================================
-- GPS 平台数据库优化脚本
-- 支持 1万+ 车辆并发
-- =====================================================

USE gps_platform;

-- =====================================================
-- 1. 优化 locations 表 - 添加分区 (按月分区)
-- =====================================================

-- 如果已有数据，先备份
-- 注意: 分区表需要 MySQL 5.7+ 或 8.0+

-- 删除旧索引，分区表不支持非分区键的唯一索引
-- ALTER TABLE locations DROP INDEX IF EXISTS idx_device_time;

-- 重建 locations 表为分区表 (可选，需要数据迁移)
-- 建议新系统使用，已有数据的系统谨慎操作

/*
-- 分区表版本 (需要手动迁移数据)
CREATE TABLE IF NOT EXISTS locations_partitioned (
  id BIGINT NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (id, gps_time),
  INDEX idx_device_time (device_id, gps_time),
  INDEX idx_gps_time (gps_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='位置数据表(分区版)'
PARTITION BY RANGE (TO_DAYS(gps_time)) (
  PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
  PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
  PARTITION p202503 VALUES LESS THAN (TO_DAYS('2025-04-01')),
  PARTITION p202504 VALUES LESS THAN (TO_DAYS('2025-05-01')),
  PARTITION p202505 VALUES LESS THAN (TO_DAYS('2025-06-01')),
  PARTITION p202506 VALUES LESS THAN (TO_DAYS('2025-07-01')),
  PARTITION p202507 VALUES LESS THAN (TO_DAYS('2025-08-01')),
  PARTITION p202508 VALUES LESS THAN (TO_DAYS('2025-09-01')),
  PARTITION p202509 VALUES LESS THAN (TO_DAYS('2025-10-01')),
  PARTITION p202510 VALUES LESS THAN (TO_DAYS('2025-11-01')),
  PARTITION p202511 VALUES LESS THAN (TO_DAYS('2025-12-01')),
  PARTITION p202512 VALUES LESS THAN (TO_DAYS('2026-01-01')),
  PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
  PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
*/

-- =====================================================
-- 2. 优化 devices_realtime 表
-- =====================================================

-- 确保实时状态表有正确的索引
ALTER TABLE devices_realtime
  ADD INDEX IF NOT EXISTS idx_is_online (is_online),
  ADD INDEX IF NOT EXISTS idx_last_heartbeat (last_heartbeat);

-- =====================================================
-- 3. 添加数据清理存储过程
-- =====================================================

DELIMITER //

-- 清理过期位置数据 (保留指定天数)
CREATE PROCEDURE IF NOT EXISTS cleanup_old_locations(IN retain_days INT)
BEGIN
  DECLARE cutoff_date DATETIME;
  SET cutoff_date = DATE_SUB(NOW(), INTERVAL retain_days DAY);

  -- 分批删除，避免锁表太久
  DELETE FROM locations
  WHERE gps_time < cutoff_date
  LIMIT 100000;

  -- 返回删除数量
  SELECT ROW_COUNT() AS deleted_rows;
END //

-- 清理过期报警数据 (保留指定天数)
CREATE PROCEDURE IF NOT EXISTS cleanup_old_alarms(IN retain_days INT)
BEGIN
  DECLARE cutoff_date DATETIME;
  SET cutoff_date = DATE_SUB(NOW(), INTERVAL retain_days DAY);

  DELETE FROM alarms
  WHERE created_at < cutoff_date AND status != 0
  LIMIT 50000;

  SELECT ROW_COUNT() AS deleted_rows;
END //

-- 获取系统统计信息
CREATE PROCEDURE IF NOT EXISTS get_system_stats()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM devices) AS total_devices,
    (SELECT COUNT(*) FROM devices WHERE is_online = 1) AS online_devices,
    (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
    (SELECT COUNT(*) FROM locations WHERE gps_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS locations_today,
    (SELECT COUNT(*) FROM alarms WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS alarms_today,
    (SELECT COUNT(*) FROM alarms WHERE status = 0) AS pending_alarms;
END //

DELIMITER ;

-- =====================================================
-- 4. 创建定时清理事件 (需要开启 MySQL Event Scheduler)
-- =====================================================

-- 开启事件调度器 (需要在 my.cnf 中设置 event_scheduler=ON)
-- SET GLOBAL event_scheduler = ON;

-- 每天凌晨3点清理90天前的位置数据
/*
CREATE EVENT IF NOT EXISTS evt_cleanup_locations
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURRENT_DATE, '03:00:00')
DO
  CALL cleanup_old_locations(90);

-- 每周清理180天前的已处理报警
CREATE EVENT IF NOT EXISTS evt_cleanup_alarms
ON SCHEDULE EVERY 1 WEEK
STARTS TIMESTAMP(CURRENT_DATE, '04:00:00')
DO
  CALL cleanup_old_alarms(180);
*/

-- =====================================================
-- 5. MySQL 性能优化建议 (需要修改 my.cnf)
-- =====================================================

/*
[mysqld]
# InnoDB 配置
innodb_buffer_pool_size = 4G          # 设为服务器内存的 50-70%
innodb_buffer_pool_instances = 4      # 缓冲池实例数
innodb_log_file_size = 512M           # 日志文件大小
innodb_log_buffer_size = 64M          # 日志缓冲大小
innodb_flush_log_at_trx_commit = 2    # 每秒刷新 (性能优先)
innodb_flush_method = O_DIRECT        # 跳过 OS 缓存

# 连接配置
max_connections = 500                  # 最大连接数
thread_cache_size = 64                 # 线程缓存
table_open_cache = 4000                # 表缓存

# 查询优化
join_buffer_size = 4M
sort_buffer_size = 4M
read_buffer_size = 2M
read_rnd_buffer_size = 4M

# 批量插入优化
bulk_insert_buffer_size = 64M

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
*/

-- =====================================================
-- 6. 查看当前表状态
-- =====================================================

-- 检查表大小
SELECT
  table_name,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'gps_platform'
ORDER BY data_length DESC;

-- 检查索引使用情况
SHOW INDEX FROM locations;
SHOW INDEX FROM devices;
SHOW INDEX FROM devices_realtime;

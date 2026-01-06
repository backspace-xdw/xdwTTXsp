-- 种子数据 - GPS车辆监控平台初始数据
USE gps_platform;

-- =====================
-- 企业数据
-- =====================
INSERT INTO companies (id, name, short_name, contact_name, contact_phone, address, status) VALUES
(1, '北京智慧交通科技有限公司', '智慧交通', '张经理', '13800138001', '北京市朝阳区建国路88号', 1),
(2, '上海物流运输有限公司', '上海物流', '李总', '13900139002', '上海市浦东新区陆家嘴金融中心', 1),
(3, '广州危险品运输公司', '广州危运', '王主任', '13700137003', '广州市天河区体育西路', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =====================
-- 驾驶员数据
-- =====================
INSERT INTO drivers (id, name, id_card, license_no, license_type, phone, company_id, status) VALUES
(1, '张三', '110101199001011234', 'D110101199001011234', 'A2', '13811112222', 1, 1),
(2, '李四', '310101198505052345', 'D310101198505052345', 'B2', '13922223333', 2, 1),
(3, '王五', '440101199203033456', 'D440101199203033456', 'A1', '13633334444', 3, 1),
(4, '赵六', '110101198808084567', 'D110101198808084567', 'B2', '13744445555', 1, 1),
(5, '钱七', '310101199106065678', 'D310101199106065678', 'A2', '13855556666', 2, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =====================
-- 车辆数据
-- =====================
INSERT INTO vehicles (id, plate_no, plate_color, vehicle_type, brand, model, color, company_id, driver_id, status) VALUES
(1, '京A11111', 2, '重型货车', '东风', 'DFL1160', '白色', 1, 1, 1),
(2, '京A22222', 2, '重型货车', '解放', 'CA1310', '蓝色', 1, 4, 1),
(3, '沪B33333', 2, '危险品运输车', '重汽', 'ZZ4257', '黄色', 2, 2, 1),
(4, '沪B44444', 1, '轻型货车', '江淮', 'HFC1048', '白色', 2, 5, 1),
(5, '粤C55555', 2, '危险品运输车', '陕汽', 'SX4258', '红色', 3, 3, 1),
(6, '京A66666', 2, '重型牵引车', '东风', 'DFL4251', '白色', 1, NULL, 1),
(7, '沪B77777', 2, '集装箱运输车', '解放', 'CA4250', '蓝色', 2, NULL, 1),
(8, '粤C88888', 1, '轻型厢式货车', '福田', 'BJ5049', '白色', 3, NULL, 1)
ON DUPLICATE KEY UPDATE plate_no = VALUES(plate_no);

-- =====================
-- 设备数据 (关联车辆)
-- =====================
INSERT INTO devices (id, device_id, sim_no, plate_no, vehicle_id, protocol_version, manufacturer_id, terminal_model, is_online, last_heartbeat) VALUES
(1, '013912345678', '13912345678', '京A11111', 1, '2019', 'XDWT', 'XDW-T100', TRUE, NOW()),
(2, '013912345679', '13912345679', '京A22222', 2, '2019', 'XDWT', 'XDW-T100', TRUE, NOW()),
(3, '013812345680', '13812345680', '沪B33333', 3, '2019', 'XDWT', 'XDW-T200', TRUE, NOW()),
(4, '013812345681', '13812345681', '沪B44444', 4, '2013', 'XDWT', 'XDW-T100', FALSE, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, '013712345682', '13712345682', '粤C55555', 5, '2019', 'XDWT', 'XDW-T200', TRUE, NOW()),
(6, '013912345683', '13912345683', '京A66666', 6, '2019', 'XDWT', 'XDW-T100', FALSE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, '013812345684', '13812345684', '沪B77777', 7, '2013', 'XDWT', 'XDW-T100', FALSE, NULL),
(8, '013712345685', '13712345685', '粤C88888', 8, '2019', 'XDWT', 'XDW-T100', TRUE, NOW())
ON DUPLICATE KEY UPDATE device_id = VALUES(device_id);

-- =====================
-- 设备实时状态数据 (北京、上海、广州区域)
-- =====================
INSERT INTO device_realtime (device_id, latitude, longitude, altitude, speed, direction, mileage, is_online, acc_on, gps_time) VALUES
('013912345678', 39.9042, 116.4074, 50, 45.5, 90, 12580.5, TRUE, TRUE, NOW()),
('013912345679', 39.9150, 116.4200, 48, 62.0, 180, 8920.3, TRUE, TRUE, NOW()),
('013812345680', 31.2304, 121.4737, 10, 55.8, 270, 45230.8, TRUE, TRUE, NOW()),
('013812345681', 31.2400, 121.4900, 12, 0.0, 0, 23100.5, FALSE, FALSE, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('013712345682', 23.1291, 113.2644, 25, 48.2, 45, 67890.2, TRUE, TRUE, NOW()),
('013912345683', 39.9300, 116.3800, 45, 0.0, 0, 5670.0, FALSE, FALSE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('013812345684', 31.2200, 121.4500, 8, 0.0, 0, 0.0, FALSE, FALSE, NULL),
('013712345685', 23.1400, 113.2800, 30, 38.5, 135, 15280.6, TRUE, TRUE, NOW())
ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), speed = VALUES(speed), is_online = VALUES(is_online);

-- =====================
-- 最近位置历史数据
-- =====================
INSERT INTO locations (device_id, alarm_flag, status, latitude, longitude, altitude, speed, direction, mileage, gps_time) VALUES
-- 京A11111 轨迹
('013912345678', 0, 3, 39.9000, 116.4000, 50, 42.0, 85, 12570.0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('013912345678', 0, 3, 39.9020, 116.4030, 50, 48.5, 88, 12575.0, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('013912345678', 0, 3, 39.9035, 116.4060, 50, 45.0, 90, 12578.0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('013912345678', 0, 3, 39.9042, 116.4074, 50, 45.5, 90, 12580.5, NOW()),
-- 沪B33333 轨迹
('013812345680', 0, 3, 31.2250, 121.4680, 10, 52.0, 265, 45210.0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('013812345680', 0, 3, 31.2280, 121.4710, 10, 58.5, 270, 45220.0, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('013812345680', 0, 3, 31.2295, 121.4725, 10, 54.0, 268, 45226.0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('013812345680', 0, 3, 31.2304, 121.4737, 10, 55.8, 270, 45230.8, NOW()),
-- 粤C55555 轨迹
('013712345682', 0, 3, 23.1240, 113.2590, 25, 45.0, 40, 67870.0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('013712345682', 0, 3, 23.1260, 113.2610, 25, 50.5, 43, 67880.0, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('013712345682', 0, 3, 23.1278, 113.2628, 25, 46.0, 45, 67886.0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('013712345682', 0, 3, 23.1291, 113.2644, 25, 48.2, 45, 67890.2, NOW());

-- =====================
-- 报警数据
-- =====================
INSERT INTO alarms (device_id, alarm_type, alarm_name, alarm_level, latitude, longitude, speed, status, gps_time, created_at) VALUES
('013912345678', 2, '超速报警', 2, 39.9020, 116.4030, 85.5, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('013812345680', 4, '疲劳驾驶', 3, 31.2280, 121.4710, 58.5, 0, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('013712345682', 1, '紧急报警', 3, 23.1260, 113.2610, 50.5, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('013912345679', 2, '超速报警', 2, 39.9150, 116.4200, 92.0, 0, DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('013712345685', 8, '区域报警', 1, 23.1400, 113.2800, 38.5, 0, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 完成
SELECT 'Seed data imported successfully!' AS result;

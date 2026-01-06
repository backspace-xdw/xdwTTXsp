-- Add test devices for JT1078 video streaming testing
-- Run with: mysql -u root -p --default-character-set=utf8mb4 gps_platform < scripts/add-test-devices.sql

-- Ensure proper character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Insert test devices (or update if they exist)
INSERT INTO devices (device_id, sim_no, plate_no, is_online, created_at, updated_at) VALUES
('13912345678', '13912345678', '京A12345', 1, NOW(), NOW()),
('13900000002', '13900000002', '京B22222', 1, NOW(), NOW()),
('13900000003', '13900000003', '京C33333', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  plate_no = VALUES(plate_no),
  is_online = 1,
  updated_at = NOW();

-- Insert realtime data for test devices
INSERT INTO device_realtime (device_id, latitude, longitude, speed, is_online, updated_at) VALUES
('13912345678', 39.9042, 116.4074, 0, 1, NOW()),
('13900000002', 39.92, 116.46, 0, 1, NOW()),
('13900000003', 39.93, 116.47, 0, 1, NOW())
ON DUPLICATE KEY UPDATE
  is_online = 1,
  updated_at = NOW();

-- Verify the data
SELECT device_id, plate_no, is_online FROM devices ORDER BY device_id;

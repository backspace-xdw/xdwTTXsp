# xdwTTXsp - GPS车辆监控平台

## 项目概述

基于 JT/T 808 协议的GPS车辆监控云平台，实现车辆实时定位、轨迹回放、报警管理等功能。

### 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI组件库 | Element Plus |
| 状态管理 | Pinia |
| 地图服务 | 高德地图 JS API 2.0 |
| 后端框架 | Node.js + Express + TypeScript |
| 数据库 | MySQL 8.0 |
| 实时通信 | Socket.IO |
| 协议支持 | JT/T 808-2019 |

---

## 项目结构

```
xdwTTXsp/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                # API接口
│   │   ├── assets/             # 静态资源
│   │   ├── components/         # 公共组件
│   │   ├── layouts/            # 布局组件
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # Pinia状态管理
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   └── vehicle.ts      # 车辆状态管理
│   │   ├── types/              # TypeScript类型定义
│   │   ├── utils/
│   │   │   └── websocket.ts    # WebSocket服务
│   │   ├── views/              # 页面视图
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── jt808/              # JT808协议模块
│   │   │   ├── constants.ts    # 协议常量定义
│   │   │   ├── parser.ts       # 协议解析器
│   │   │   ├── server.ts       # TCP服务器
│   │   │   ├── simulator.ts    # 协议模拟器
│   │   │   └── handlers/       # 消息处理器
│   │   │       ├── index.ts
│   │   │       ├── register.ts # 终端注册
│   │   │       ├── auth.ts     # 终端鉴权
│   │   │       ├── heartbeat.ts# 心跳处理
│   │   │       └── location.ts # 位置上报
│   │   ├── models/             # Sequelize数据模型
│   │   │   ├── index.ts
│   │   │   ├── Device.ts       # 设备模型
│   │   │   ├── Location.ts     # 位置模型
│   │   │   ├── Alarm.ts        # 报警模型
│   │   │   └── ...
│   │   ├── services/           # 业务服务层
│   │   │   ├── deviceService.ts
│   │   │   ├── locationService.ts
│   │   │   └── alarmService.ts
│   │   ├── routes/             # API路由
│   │   ├── websocket/          # WebSocket服务
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   └── init.sql        # 数据库初始化脚本
│   │   └── app.ts              # 应用入口
│   ├── .env                    # 环境配置
│   └── package.json
│
└── PROJECT_DOCUMENTATION.md    # 本文档
```

---

## JT/T 808 协议实现

### 协议特点

- **传输层**: TCP长连接
- **数据格式**: 二进制
- **帧结构**: `0x7e` + 消息头 + 消息体 + 校验码 + `0x7e`
- **转义规则**:
  - `0x7e` → `0x7d 0x02`
  - `0x7d` → `0x7d 0x01`

### 支持的消息类型

| 消息ID | 消息名称 | 方向 |
|--------|---------|------|
| 0x0001 | 终端通用应答 | 终端→平台 |
| 0x0002 | 终端心跳 | 终端→平台 |
| 0x0100 | 终端注册 | 终端→平台 |
| 0x0102 | 终端鉴权 | 终端→平台 |
| 0x0200 | 位置信息汇报 | 终端→平台 |
| 0x8001 | 平台通用应答 | 平台→终端 |
| 0x8100 | 终端注册应答 | 平台→终端 |

### 报警类型支持

| 报警标志位 | 报警类型 |
|-----------|---------|
| bit0 | 紧急报警 |
| bit1 | 超速报警 |
| bit2 | 疲劳驾驶报警 |
| bit3 | 危险预警 |
| bit4 | GNSS模块故障 |
| bit5-31 | 更多报警类型... |

### 状态标志位

| 状态位 | 含义 |
|--------|------|
| bit0 | ACC开关状态 (0:关, 1:开) |
| bit1 | 定位状态 (0:未定位, 1:已定位) |
| bit2 | 南纬/北纬 (0:北纬, 1:南纬) |
| bit3 | 东经/西经 (0:东经, 1:西经) |
| bit4 | 运营状态 |
| bit5 | 经纬度加密 |

---

## 数据库设计

### devices 设备表

```sql
CREATE TABLE devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) UNIQUE NOT NULL COMMENT '终端ID',
  sim_no VARCHAR(20) COMMENT 'SIM卡号',
  plate_no VARCHAR(20) COMMENT '车牌号',
  vehicle_id INT COMMENT '关联车辆ID',
  protocol_version VARCHAR(10) DEFAULT '2019' COMMENT '协议版本',
  manufacturer_id VARCHAR(10) COMMENT '制造商ID',
  terminal_model VARCHAR(30) COMMENT '终端型号',
  terminal_id VARCHAR(30) COMMENT '终端ID',
  auth_code VARCHAR(50) COMMENT '鉴权码',
  province_id INT COMMENT '省域ID',
  city_id INT COMMENT '市县域ID',
  plate_color TINYINT DEFAULT 1 COMMENT '车牌颜色',
  is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线',
  last_heartbeat DATETIME COMMENT '最后心跳时间',
  last_location_time DATETIME COMMENT '最后定位时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### locations 位置表

```sql
CREATE TABLE locations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) NOT NULL COMMENT '设备ID',
  alarm_flag INT UNSIGNED DEFAULT 0 COMMENT '报警标志',
  status INT UNSIGNED DEFAULT 0 COMMENT '状态',
  latitude DECIMAL(10, 6) NOT NULL COMMENT '纬度',
  longitude DECIMAL(10, 6) NOT NULL COMMENT '经度',
  altitude SMALLINT UNSIGNED DEFAULT 0 COMMENT '海拔(米)',
  speed DECIMAL(5, 1) DEFAULT 0 COMMENT '速度(km/h)',
  direction SMALLINT UNSIGNED DEFAULT 0 COMMENT '方向(0-359)',
  gps_time DATETIME NOT NULL COMMENT 'GPS时间',
  mileage DECIMAL(10, 1) COMMENT '里程(km)',
  fuel DECIMAL(10, 2) COMMENT '油量(L)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_time (device_id, gps_time)
);
```

### alarms 报警表

```sql
CREATE TABLE alarms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(20) NOT NULL COMMENT '设备ID',
  alarm_type INT NOT NULL COMMENT '报警类型',
  alarm_name VARCHAR(50) COMMENT '报警名称',
  alarm_flag INT UNSIGNED COMMENT '报警标志位',
  alarm_level TINYINT DEFAULT 1 COMMENT '报警级别',
  latitude DECIMAL(10, 6) COMMENT '纬度',
  longitude DECIMAL(10, 6) COMMENT '经度',
  altitude SMALLINT UNSIGNED COMMENT '海拔',
  speed DECIMAL(5, 1) COMMENT '速度',
  direction SMALLINT UNSIGNED COMMENT '方向',
  address VARCHAR(255) COMMENT '位置描述',
  status TINYINT DEFAULT 0 COMMENT '状态(0未处理,1已处理,2已忽略)',
  handler_id INT COMMENT '处理人ID',
  handle_time DATETIME COMMENT '处理时间',
  handle_remark VARCHAR(500) COMMENT '处理备注',
  gps_time DATETIME NOT NULL COMMENT 'GPS时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## WebSocket 事件

### 客户端 → 服务端

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `subscribe:all` | - | 订阅所有GPS更新 |
| `unsubscribe:all` | - | 取消订阅所有更新 |
| `subscribe:vehicle` | `string[]` | 订阅指定车辆 |
| `unsubscribe:vehicle` | `string[]` | 取消订阅指定车辆 |

### 服务端 → 客户端

| 事件名 | 数据结构 | 说明 |
|--------|---------|------|
| `gps:update` | `GpsUpdateData` | GPS位置更新 |
| `alarm:new` | `AlarmData` | 新报警通知 |
| `device:status` | `DeviceStatusData` | 设备状态变化 |

### 数据结构

```typescript
// GPS更新数据
interface GpsUpdateData {
  deviceId: string
  plateNo?: string
  lat: number
  lng: number
  altitude?: number
  speed: number
  direction: number
  gpsTime: string
  accOn: boolean
  located: boolean
  mileage?: number
  alarmFlag?: number
}

// 报警数据
interface AlarmData {
  deviceId: string
  plateNo?: string
  alarmType: number
  alarmName: string
  alarmLevel: number
  lat?: number
  lng?: number
  speed?: number
  gpsTime: string
}

// 设备状态数据
interface DeviceStatusData {
  deviceId: string
  plateNo?: string
  online: boolean
  status?: string
}
```

---

## API 接口

### 认证接口

```
POST /api/auth/login
请求: { username: string, password: string }
响应: { token: string, user: UserInfo }

POST /api/auth/logout
响应: { success: boolean }
```

### 车辆接口

```
GET /api/vehicles
响应: Vehicle[]

GET /api/vehicles/:id
响应: Vehicle

GET /api/vehicles/:id/location
响应: Location

GET /api/vehicles/:id/track?startTime=&endTime=
响应: Location[]
```

### 报警接口

```
GET /api/alarms?status=&type=&startTime=&endTime=
响应: { data: Alarm[], total: number }

PUT /api/alarms/:id/handle
请求: { status: number, remark: string }
响应: Alarm
```

---

## 环境配置

### backend/.env

```env
# Server
PORT=8081
NODE_ENV=development

# JWT
JWT_SECRET=xdwttxsp-secret-key-2024
JWT_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gps_platform
DB_USER=root
DB_PASSWORD=root123

# Redis (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JT808 Server
JT808_PORT=8808
JT808_HEARTBEAT_TIMEOUT=180000

# GPS Simulation
ENABLE_GPS_SIMULATION=false

# CORS
CORS_ORIGIN=*
```

---

## 快速开始

### 1. 启动数据库

```bash
# 使用Docker启动MySQL
docker run -d --name mysql-gps \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=gps_platform \
  -p 3306:3306 \
  mysql:8.0

# 初始化数据库表
docker exec -i mysql-gps mysql -uroot -proot123 gps_platform < backend/src/database/init.sql
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

服务启动后:
- HTTP API: http://localhost:8081
- WebSocket: ws://localhost:8081
- JT808 TCP: localhost:8808

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端访问: http://localhost:5173

### 4. 测试JT808协议

```bash
cd backend
npx ts-node src/jt808/simulator.ts
```

---

## 数据流架构

```
┌─────────────────┐     TCP:8808     ┌─────────────────┐
│   JT808终端     │ ───────────────> │   JT808服务器   │
│   (GPS设备)     │                  │   (parser.ts)   │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   消息处理器    │
                                     │   (handlers/)   │
                                     └────────┬────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
           ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
           │   MySQL     │           │   Redis     │           │  WebSocket  │
           │  (持久化)   │           │  (缓存)     │           │  (实时推送) │
           └─────────────┘           └─────────────┘           └──────┬──────┘
                                                                      │
                                                                      ▼
                                                              ┌─────────────┐
                                                              │   前端应用  │
                                                              │   (Vue 3)   │
                                                              └─────────────┘
```

---

## 测试结果

### JT808协议测试

```
========== JT808 协议测试 ==========
[模拟器] 已连接到 127.0.0.1:8808
--- 步骤1: 终端注册 ---
[模拟器] 注册应答: 流水号=1, 结果=成功
[模拟器] 获得鉴权码: 345678_xxx
--- 步骤2: 终端鉴权 ---
[模拟器] 通用应答: 消息=终端鉴权, 结果=成功
--- 步骤3: 发送心跳 ---
[模拟器] 通用应答: 消息=终端心跳, 结果=成功
--- 步骤4: 位置上报 ---
[模拟器] 通用应答: 消息=位置信息汇报, 结果=成功 (x6)
--- 步骤5: 模拟报警 ---
[JT808] 检测到报警: 13912345678 [ '超速报警' ]
========== 测试完成 ==========
```

### WebSocket测试

```
[WS] Connected, socket id: xxx
[WS] Subscribed to all updates
[WS] GPS update received: 13912345678 44.5km/h
[WS] GPS update received: 13912345678 38.2km/h
[WS] GPS update received: 13912345678 53.5km/h
[WS] GPS update received: 13912345678 49.6km/h
[WS] GPS update received: 13912345678 35.7km/h
[WS] GPS update received: 13912345678 120km/h (超速报警)
[WS] Device status: 13912345678 offline
```

### 数据库验证

```sql
-- 位置记录数
SELECT COUNT(*) FROM locations;  -- 30+

-- 报警记录
SELECT * FROM alarms;  -- 超速报警记录

-- 设备信息
SELECT device_id, plate_no, is_online FROM devices;
-- 13912345678, 京A12345, 0
```

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0.0 | 2026-01-04 | 初始版本，实现JT808协议核心功能 |
| - | - | 支持终端注册、鉴权、心跳、位置上报 |
| - | - | 实现报警检测和存储 |
| - | - | WebSocket实时推送 |
| - | - | 前后端数据流打通 |

---

## 待实现功能

- [ ] 轨迹回放功能
- [ ] 电子围栏
- [ ] 视频监控集成 (JT/T 1078)
- [ ] 多租户支持
- [ ] 报表导出
- [ ] 移动端适配

---

*文档版本: v1.0 | 更新时间: 2026-01-04*

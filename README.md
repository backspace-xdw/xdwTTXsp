# xdwTTXsp - GPS车辆监控平台

1:1 复刻 Active Security Cloud Platform (主动安全云平台) GPS车辆监控系统

## 技术栈

### 前端
- Vue 3 + TypeScript + Vite
- Element Plus (UI组件库)
- Pinia (状态管理)
- Vue Router 4
- ECharts 5 (图表)
- 高德地图 JS API 2.0

### 后端
- Node.js + Express + TypeScript
- Socket.IO (WebSocket实时通信)
- JWT (用户认证)
- MySQL + Redis (数据存储)

## 项目结构

```
xdwTTXsp/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── assets/          # 静态资源
│   │   ├── components/      # 公共组件
│   │   ├── layouts/         # 布局组件
│   │   ├── views/           # 页面视图
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态
│   │   ├── api/             # API接口
│   │   ├── utils/           # 工具函数
│   │   └── types/           # 类型定义
│   └── package.json
├── backend/                  # 后端项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 中间件
│   │   ├── websocket/       # WebSocket
│   │   └── utils/           # 工具函数
│   └── package.json
└── README.md
```

## 功能模块

| 模块 | 说明 | 状态 |
|------|------|------|
| Dashboard | 数据仪表盘 | ✅ |
| Monitor | 实时监控 | ✅ |
| Group Mon | 分组监控 | 🔧 |
| AI Safe | AI主动安全 | 🔧 |
| Replay | 轨迹回放 | 🔧 |
| Multi-V | 多视频监控 | 🔧 |
| Safety CAL | 安全计算 | 🔧 |
| AI Manage | AI管理 | 🔧 |
| Safety Edu | 安全教育 | 🔧 |
| Reports | 报表统计 | 🔧 |
| Operations | 运营管理 | 🔧 |
| Rules | 规则设置 | 🔧 |
| Server | 服务器管理 | 🔧 |

✅ 已完成  🔧 开发中

## 快速开始

### 前提条件

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd ../backend
npm install
```

### 配置环境变量

```bash
# 后端配置
cd backend
cp .env.example .env
# 编辑 .env 文件配置数据库等信息
```

### 高德地图配置

1. 访问 [高德开放平台](https://lbs.amap.com/) 注册账号
2. 创建应用获取 Key
3. 修改 `frontend/src/views/monitor/index.vue` 中的 `YOUR_AMAP_KEY`

### 启动服务

```bash
# 启动后端 (端口 8081)
cd backend
npm run dev

# 启动前端 (端口 3000)
cd frontend
npm run dev
```

### 访问

- 前端: http://localhost:3000
- 后端API: http://localhost:8081/api

### 默认账号

- 用户名: admin
- 密码: 任意6位以上密码

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 退出
- `GET /api/auth/user` - 获取当前用户

### 车辆
- `GET /api/vehicles` - 车辆列表
- `GET /api/vehicles/:id` - 车辆详情
- `GET /api/vehicles/:id/location` - 实时位置
- `GET /api/vehicles/:id/track` - 历史轨迹
- `GET /api/vehicles/stats/overview` - 统计数据

### 企业
- `GET /api/companies` - 企业列表
- `GET /api/companies/tree` - 企业树结构

### 报警
- `GET /api/alarms` - 报警列表
- `GET /api/alarms/stats` - 报警统计
- `POST /api/alarms/:id/handle` - 处理报警

### 报表
- `GET /api/reports/dashboard` - 仪表盘数据
- `GET /api/reports/online-trend` - 在线趋势
- `GET /api/reports/alarm-rank` - 报警排名
- `GET /api/reports/mileage-rank` - 里程排名

## WebSocket 事件

### 客户端 -> 服务端
- `subscribe:vehicle` - 订阅车辆
- `unsubscribe:vehicle` - 取消订阅
- `subscribe:all` - 订阅所有更新

### 服务端 -> 客户端
- `gps:update` - GPS位置更新
- `alarm:new` - 新报警
- `status:change` - 状态变化

## 开发说明

### 代码规范
- 使用 TypeScript 编写
- 遵循 ESLint 规则
- 使用 Prettier 格式化

### 提交规范
- feat: 新功能
- fix: Bug修复
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

## License

MIT

# xdwTTXsp 车辆监控平台 - 项目文档

> 文档生成时间: 2026-01-21
> 版本: v1.0.0

---

## 项目概述

xdwTTXsp 是一个基于 Vue 3 + TypeScript 的GPS车辆监控平台前端项目，实现了 JT/T 808 和 JT/T 1078 协议的车辆监控功能。

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Element Plus | 2.x | UI组件库 |
| Vite | 5.x | 构建工具 |
| AMap (高德地图) | 2.0 | 地图服务 |
| ECharts | 5.x | 数据可视化 |
| FlvPlayer | - | 视频播放 |
| SCSS | - | 样式预处理 |

---

## 模块功能清单

### 1. 报警监控模块 (`/ai-safe`)

**路径**: `src/views/ai-safe/index.vue`

| 功能 | 状态 | 描述 |
|------|------|------|
| 实时报警列表 | ✅ 已完成 | 展示车辆实时报警信息 |
| 报警详情弹窗 | ✅ 已完成 | 查看报警详细信息和证据 |
| 报警处理 | ✅ 已完成 | 处理/忽略报警操作 |
| 报警类型筛选 | ✅ 已完成 | 按类型过滤报警 |
| 时间范围查询 | ✅ 已完成 | 按时间段查询报警 |

**报警类型支持**:
- 疲劳驾驶
- 接打电话
- 抽烟
- 分神驾驶
- 驾驶员异常
- 前向碰撞预警
- 车道偏离预警
- 车距过近预警

---

### 2. 多车轨迹回放模块 (`/multi-track`)

**路径**: `src/views/multi-video/index.vue`

| 功能 | 状态 | 描述 |
|------|------|------|
| 车辆树选择 | ✅ 已完成 | 支持多选车辆（最多16辆） |
| 动态窗口布局 | ✅ 已完成 | 根据车辆数量自动调整布局 |
| 时间范围选择 | ✅ 已完成 | 选择回放时间段 |
| 轨迹回放控制 | ✅ 已完成 | 播放/暂停/停止控制 |
| 进度条控制 | ✅ 已完成 | 拖拽调整播放进度 |

**布局规则**:
```
1辆车    → 1x1 单窗口
2-4辆车  → 2x2 四窗口
5-9辆车  → 3x3 九窗口
10-16辆车 → 4x4 十六窗口
```

**核心算法**:
```typescript
function calculateOptimalLayout(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 4
  if (count <= 9) return 9
  if (count <= 16) return 16
  return 16
}
```

---

### 3. 安全管理模块 (`/safety-manage`)

**路径**: `src/views/safety-manage/`

#### 3.1 主动安全报警处理

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 主动安全报警处理 | AlarmHandle.vue | ✅ 已完成 |
| 主动安全报警申诉 | AlarmAppeal.vue | ✅ 已完成 |
| 主动安全报警申诉审核 | AlarmAppealAudit.vue | ✅ 已完成 |
| 综合重点报警报表 | AlarmKeyReport.vue | ✅ 已完成 |
| 主动安全证据查询 | AlarmEvidence.vue | ✅ 已完成 |
| 报警误报查询 | AlarmFalse.vue | ✅ 已完成 |
| 罚单处理 | TicketHandle.vue | ✅ 已完成 |
| 罚单档案 | TicketArchive.vue | ✅ 已完成 |

#### 3.2 驾驶员身份识别报表

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 驾驶员身份识别报表 | DriverIdentify.vue | ✅ 已完成 |
| 驾驶员身份识别证据查询 | DriverEvidence.vue | ✅ 已完成 |

#### 3.3 主动安全证据中心

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 驾驶辅助证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 异常行驶证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 胎压报警证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 盲点监测证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 激烈驾驶证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 卫星定位证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 智能检测证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 驾驶员身份识别证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 车辆运行监测证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| 设备失效监测证据中心 | EvidenceCenter.vue | ✅ 已完成 |
| IO报警证据中心 | EvidenceCenter.vue | ✅ 已完成 |

#### 3.4 主动安全警报分析

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 企业警报分析 | AnalysisReport.vue | ✅ 已完成 |
| 车辆警报分析 | AnalysisReport.vue | ✅ 已完成 |
| 司机警报分析 | AnalysisReport.vue | ✅ 已完成 |
| 车辆类型报警分析 | AnalysisReport.vue | ✅ 已完成 |
| 未上报附件报警分析 | AnalysisReport.vue | ✅ 已完成 |
| 未报警里程分析 | AnalysisReport.vue | ✅ 已完成 |

#### 3.5 主动安全风险画像

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 车辆风险画像 | RiskProfile.vue | ✅ 已完成 |
| 企业风险画像 | RiskProfile.vue | ✅ 已完成 |
| 司机风险画像 | RiskProfile.vue | ✅ 已完成 |
| 驾驶员评分报表 | RiskProfile.vue | ✅ 已完成 |
| 车辆评分报表 | RiskProfile.vue | ✅ 已完成 |
| 企业评分报表 | RiskProfile.vue | ✅ 已完成 |
| 评分标准 | RiskProfile.vue | ✅ 已完成 |

#### 3.6 安全报告

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 企业联网联控报告 | SafetyReport.vue | ✅ 已完成 |
| 企业主动安全报告 | SafetyReport.vue | ✅ 已完成 |
| 车辆主动安全报告 | SafetyReport.vue | ✅ 已完成 |
| 企业综合报告 | SafetyReport.vue | ✅ 已完成 |

#### 3.7 定制运营报告

| 子功能 | 组件 | 状态 |
|--------|------|------|
| 定制日报表 | CustomReport.vue | ✅ 已完成 |
| 定制周报表 | CustomReport.vue | ✅ 已完成 |
| 定制月报表 | CustomReport.vue | ✅ 已完成 |

---

## 项目结构

```
src/
├── views/
│   ├── ai-safe/                    # 报警监控模块
│   │   └── index.vue
│   │
│   ├── multi-video/                # 多车轨迹回放模块
│   │   └── index.vue
│   │
│   └── safety-manage/              # 安全管理模块
│       ├── index.vue               # 主框架页面
│       └── components/
│           ├── AlarmHandle.vue     # 主动安全报警处理
│           ├── AlarmAppeal.vue     # 报警申诉
│           ├── AlarmAppealAudit.vue # 申诉审核
│           ├── AlarmKeyReport.vue  # 重点报警报表
│           ├── AlarmEvidence.vue   # 证据查询
│           ├── AlarmFalse.vue      # 误报查询
│           ├── TicketHandle.vue    # 罚单处理
│           ├── TicketArchive.vue   # 罚单档案
│           ├── DriverIdentify.vue  # 驾驶员识别报表
│           ├── DriverEvidence.vue  # 驾驶员证据查询
│           ├── EvidenceCenter.vue  # 证据中心（通用）
│           ├── AnalysisReport.vue  # 警报分析报表
│           ├── RiskProfile.vue     # 风险画像
│           ├── SafetyReport.vue    # 安全报告
│           └── CustomReport.vue    # 定制报告
│
├── router/
│   └── index.ts                    # 路由配置
│
└── layouts/
    └── MainLayout.vue              # 主布局（含菜单）
```

---

## 路由配置

```typescript
// 主要路由
{
  path: '/ai-safe',
  name: 'AiSafe',
  component: () => import('@/views/ai-safe/index.vue'),
  meta: { title: '报警监控' }
},
{
  path: '/multi-track',
  name: 'MultiTrack',
  component: () => import('@/views/multi-video/index.vue'),
  meta: { title: '多车轨迹' }
},
{
  path: '/safety-manage',
  name: 'SafetyManage',
  component: () => import('@/views/safety-manage/index.vue'),
  meta: { title: '安全管理' }
}
```

---

## 待优化功能清单

### 高优先级

| 模块 | 功能 | 描述 |
|------|------|------|
| 安全管理 | API对接 | 替换模拟数据，对接真实后端接口 |
| 安全管理 | 证据服务 | 对接视频/图片证据存储服务 |
| 多车轨迹 | 轨迹API | 对接历史轨迹数据接口 |

### 中优先级

| 模块 | 功能 | 描述 |
|------|------|------|
| 多车轨迹 | 倍速播放 | 支持0.5x/1x/2x/4x倍速 |
| 多车轨迹 | 轨迹同步 | 多车轨迹同步播放 |
| 报警监控 | 统计面板 | 添加报警统计仪表盘 |
| 报警监控 | 批量处理 | 批量处理/忽略报警 |
| 安全管理 | 图表数据 | ECharts对接真实统计数据 |

### 低优先级

| 模块 | 功能 | 描述 |
|------|------|------|
| 多车轨迹 | 数据导出 | 导出Excel/KML格式 |
| 报警监控 | 数据导出 | 报警数据导出Excel |
| 安全管理 | 邮件发送 | 定制报告邮件发送功能 |
| 通用 | 响应式 | 移动端适配优化 |

---

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

---

## 参考站点

- 功能参考: http://106.14.161.63:8080

---

## 更新日志

### 2026-01-21
- ✅ 新增安全管理模块，包含7大类41个子功能
- ✅ 优化多车轨迹模块，支持动态窗口布局（1/4/9/16窗口）
- ✅ 添加 `calculateOptimalLayout()` 算法实现智能布局
- ✅ 修复TypeScript类型错误

### 历史版本
- 报警监控模块完成
- 多车轨迹基础功能完成
- 项目框架搭建

---

*文档维护: Claude Code Assistant*

<template>
  <div class="dashboard-page">
    <!-- 左侧车辆树 -->
    <div class="dashboard-sidebar">
      <!-- 筛选 -->
      <div class="sidebar-filters">
        <el-select v-model="filters.type" placeholder="全部类型" size="small">
          <el-option label="全部类型" value="" />
          <el-option label="客运车" value="passenger" />
          <el-option label="货运车" value="cargo" />
        </el-select>
        <el-select v-model="filters.status" placeholder="全部状态" size="small">
          <el-option label="全部状态" value="" />
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
        </el-select>
        <el-select v-model="filters.device" placeholder="全部设备" size="small">
          <el-option label="全部设备" value="" />
        </el-select>
      </div>
      <!-- 搜索 -->
      <div class="sidebar-search">
        <el-input v-model="searchKeyword" placeholder="搜索" prefix-icon="Search" size="small" />
        <el-button size="small" type="primary" :icon="Setting" />
      </div>
      <!-- 树形列表 -->
      <div class="sidebar-tree">
        <el-tree
          :data="vehicleTreeData"
          :props="{ children: 'children', label: 'label' }"
          highlight-current
          default-expand-all
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <el-icon v-if="data.children"><OfficeBuilding /></el-icon>
              <el-icon v-else :color="data.online ? '#52c41a' : '#999'"><Van /></el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧仪表盘内容 -->
    <div class="dashboard-content">
      <!-- 顶部Tab切换 - 仿原系统样式 -->
      <div class="dashboard-tabs">
        <div class="tab-nav">
          <span
            :class="['tab-item', { active: activeTab === 'operation' }]"
            @click="activeTab = 'operation'"
          >
            运营看板
          </span>
          <span class="tab-divider">|</span>
          <span
            :class="['tab-item', { active: activeTab === 'safety' }]"
            @click="activeTab = 'safety'"
          >
            安全看板
          </span>
          <span class="tab-divider">|</span>
          <span
            :class="['tab-item', { active: activeTab === 'data' }]"
            @click="activeTab = 'data'"
          >
            数据看板
          </span>
        </div>
      </div>

      <!-- 运营看板内容 -->
      <div v-if="activeTab === 'operation'" class="tab-content">
        <!-- 统计卡片 - 8个卡片 -->
        <div class="stats-cards eight-cols">
          <div class="stat-card mini">
            <div class="stat-icon green">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">企业总数</div>
              <div class="stat-value orange">{{ stats.totalEnterprises }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon yellow">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">司机总数</div>
              <div class="stat-value">{{ stats.totalDrivers }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon cyan">
              <el-icon><Van /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">当前车辆总数</div>
              <div class="stat-value blue">{{ stats.totalVehicles }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon orange">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">今日车辆上线</div>
              <div class="stat-value orange">{{ stats.todayOnline }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon red">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">当前报警车辆</div>
              <div class="stat-value red">{{ stats.alarmVehicles }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon blue">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">当前在线数</div>
              <div class="stat-value green">{{ stats.currentOnline }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon purple">
              <el-icon><Odometer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">日均里程</div>
              <div class="stat-value">{{ stats.averageMileage }}</div>
            </div>
          </div>
          <div class="stat-card mini">
            <div class="stat-icon teal">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">日均在线时长</div>
              <div class="stat-value">{{ stats.averageOnlineHours }}</div>
            </div>
          </div>
        </div>

        <!-- 图表区域 - 第一行 -->
        <div class="charts-section">
          <div class="chart-row three-cols">
            <!-- 车辆运营状态 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">当前车辆运营情况</span>
                <div class="chart-legend">
                  <span class="legend-text">正常 {{ operationData.normal }}</span>
                  <span class="legend-text">停运 {{ operationData.stopped }}</span>
                  <span class="legend-text">服务到期 {{ operationData.expired }}</span>
                </div>
              </div>
              <div class="chart-body">
                <div class="chart-with-legend">
                  <div ref="operationChartRef" class="chart-container"></div>
                  <div class="legend-vertical">
                    <div class="legend-item">
                      <span class="dot blue"></span>
                      <span>正常</span>
                    </div>
                    <div class="legend-item">
                      <span class="dot purple"></span>
                      <span>停运</span>
                    </div>
                    <div class="legend-item">
                      <span class="dot cyan"></span>
                      <span>服务到期</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 车辆在线趋势 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">车辆上线趋势</span>
              </div>
              <div class="chart-body">
                <div ref="onlineTrendChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 查岗情况 -->
            <div class="chart-card check-card">
              <div class="chart-header">
                <span class="chart-title">查岗情况</span>
                <div class="check-stats">
                  <span>查岗 <strong>{{ checkData.total }}</strong></span>
                  <span>已应答 <strong>{{ checkData.answered }}</strong></span>
                  <span>未应答 <strong>{{ checkData.unanswered }}</strong></span>
                </div>
              </div>
              <div class="chart-body">
                <div class="date-toggle">
                  <el-button-group>
                    <el-button :type="dateRange === 'today' ? 'primary' : ''" size="small" @click="dateRange = 'today'">今天</el-button>
                    <el-button :type="dateRange === 'yesterday' ? 'primary' : ''" size="small" @click="dateRange = 'yesterday'">昨日</el-button>
                  </el-button-group>
                </div>
                <div ref="checkChartRef" class="chart-container small"></div>
              </div>
            </div>
          </div>

          <!-- 第二行图表 -->
          <div class="chart-row four-cols">
            <!-- 里程排名 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">里程排名（公里）</span>
                <el-button type="primary" size="small" :icon="TrendCharts" circle />
              </div>
              <div class="chart-body">
                <div ref="mileageRankChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 报警分布情况 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警分布情况</span>
              </div>
              <div class="chart-body">
                <div ref="alarmDistributionChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 报警趋势 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警趋势</span>
              </div>
              <div class="chart-body">
                <div ref="alarmTrendOperationChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 在线时长排名 -->
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">在线时长排名（小时）</span>
                <el-button type="primary" size="small" :icon="TrendCharts" circle />
              </div>
              <div class="chart-body">
                <div ref="onlineTimeRankChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 安全看板内容 -->
      <div v-if="activeTab === 'safety'" class="tab-content">
        <!-- AI报警统计卡片 -->
        <div class="ai-alarm-section">
          <div class="section-title">AI报警统计</div>
          <div class="ai-alarm-cards">
            <div class="ai-alarm-card total">
              <div class="ai-alarm-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">AI报警总数</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.total }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon blue">
                <el-icon><Camera /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">驾驶辅助</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.adas }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon orange">
                <el-icon><User /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">驾驶员异常</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.dsm }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon purple">
                <el-icon><View /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">盲点监测</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.bsd }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon red">
                <el-icon><Compass /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">激烈驾驶</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.aggressive }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon green">
                <el-icon><Position /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">卫星定位</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.gps }}</div>
              </div>
            </div>
            <div class="ai-alarm-card">
              <div class="ai-alarm-icon cyan">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="ai-alarm-info">
                <div class="ai-alarm-label">智能检测</div>
                <div class="ai-alarm-value">{{ aiAlarmStats.smart }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 安全统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">车辆电子证件到期数</div>
              <div class="stat-value orange">{{ safetyStats.expiredDocs }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">未完成安全教育司机数</div>
              <div class="stat-value blue">{{ safetyStats.untrainedDrivers }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">近7天未处理报警数</div>
              <div class="stat-value red">{{ safetyStats.unhandledAlarms }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">近7天报警处理率</div>
              <div class="stat-value green">{{ safetyStats.handleRate }}%</div>
            </div>
          </div>
        </div>

        <!-- 报警类型筛选 -->
        <div class="alarm-filter-tabs">
          <el-radio-group v-model="alarmFilter" size="small">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="id">ID</el-radio-button>
            <el-radio-button label="sp">SP</el-radio-button>
            <el-radio-button label="fd">FD</el-radio-button>
            <el-radio-button label="bsd">BSD</el-radio-button>
            <el-radio-button label="dsm">DSM</el-radio-button>
            <el-radio-button label="adas">ADAS</el-radio-button>
          </el-radio-group>
        </div>

        <div class="charts-section">
          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警类型分布</span>
              </div>
              <div class="chart-body">
                <div ref="alarmTypeChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警趋势</span>
              </div>
              <div class="chart-body">
                <div ref="alarmTrendChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警处理情况</span>
              </div>
              <div class="chart-body">
                <div ref="alarmHandleChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">报警车辆排名</span>
              </div>
              <div class="chart-body">
                <div ref="alarmVehicleRankChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据看板内容 -->
      <div v-if="activeTab === 'data'" class="tab-content">
        <!-- 数据统计卡片 - 6个 -->
        <div class="stats-cards six-cols">
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon><Van /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">车辆总数</div>
              <div class="stat-value blue">{{ dataStats.totalVehicles }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">司机总数</div>
              <div class="stat-value orange">{{ dataStats.totalDrivers }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon><Tickets /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总订单数目</div>
              <div class="stat-value green">{{ dataStats.totalOrders }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cyan">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总订单营收</div>
              <div class="stat-value">¥{{ dataStats.totalRevenue }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">
              <el-icon><Odometer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">平均里程订单</div>
              <div class="stat-value purple">{{ dataStats.avgMileageOrder }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">平均里程营收</div>
              <div class="stat-value">¥{{ dataStats.avgMileageRevenue }}</div>
            </div>
          </div>
        </div>

        <div class="charts-section">
          <!-- 行驶里程和里程利用率走势 -->
          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">行驶里程（公里）</span>
              </div>
              <div class="chart-body">
                <div ref="drivingMileageChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">里程利用率走势</span>
              </div>
              <div class="chart-body">
                <div ref="mileageUtilizationChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>

          <!-- 排名图表 -->
          <div class="chart-row three-cols">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">里程订单排名</span>
              </div>
              <div class="chart-body">
                <div ref="mileageOrderRankChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">里程营收排名</span>
              </div>
              <div class="chart-body">
                <div ref="mileageRevenueRankChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">空驶里程排名</span>
              </div>
              <div class="chart-body">
                <div ref="emptyMileageRankChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>

          <!-- 订单和营收 -->
          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">订单数目排名</span>
              </div>
              <div class="chart-body">
                <div ref="orderCountRankChartRef" class="chart-container"></div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">营收走势</span>
              </div>
              <div class="chart-body">
                <div ref="revenueTrendChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  Setting,
  OfficeBuilding,
  User,
  Van,
  Connection,
  Odometer,
  Clock,
  TrendCharts,
  Warning,
  Bell,
  Camera,
  View,
  DataLine,
  Upload,
  Timer,
  Histogram,
  Monitor,
  Compass,
  Position,
  Cpu,
  Document,
  Reading,
  CircleCheck,
  Tickets,
  Money,
  Coin
} from '@element-plus/icons-vue'

// 状态
const activeTab = ref('operation')
const searchKeyword = ref('')
const dateRange = ref('today')
const alarmFilter = ref('all')
const filters = ref({
  type: '',
  status: '',
  device: ''
})

// 运营统计数据 - 增加新字段
const stats = ref({
  totalEnterprises: 30,
  totalDrivers: 0,
  totalVehicles: 4558,
  todayOnline: 353,
  alarmVehicles: 111,
  currentOnline: 150,
  averageMileage: 11.65,
  averageOnlineHours: 0.52
})

// 运营数据
const operationData = ref({
  normal: 4557,
  stopped: 0,
  expired: 1
})

// 查岗数据
const checkData = ref({
  total: 0,
  answered: 0,
  unanswered: 0
})

// AI报警统计
const aiAlarmStats = ref({
  total: 12568,
  adas: 3456,
  dsm: 2890,
  bsd: 1234,
  aggressive: 987,
  gps: 2345,
  smart: 1656
})

// 安全统计
const safetyStats = ref({
  expiredDocs: 23,
  untrainedDrivers: 156,
  unhandledAlarms: 89,
  handleRate: 92.5
})

// 数据统计
const dataStats = ref({
  totalVehicles: 4558,
  totalDrivers: 1234,
  totalOrders: 125680,
  totalRevenue: 1568900,
  avgMileageOrder: 45.6,
  avgMileageRevenue: 12.8
})

// 车辆树数据
const vehicleTreeData = ref([
  {
    label: '监控中心 (151/4558)',
    children: [
      { label: '808测试 (0/5)' },
      { label: '金旅 (144/4187)' },
      { label: '本安测试部 (6/89)' },
      { label: '山东四通 (1/20)' }
    ]
  }
])

// 图表引用 - 运营看板
const operationChartRef = ref<HTMLElement>()
const onlineTrendChartRef = ref<HTMLElement>()
const checkChartRef = ref<HTMLElement>()
const mileageRankChartRef = ref<HTMLElement>()
const alarmDistributionChartRef = ref<HTMLElement>()
const alarmTrendOperationChartRef = ref<HTMLElement>()
const onlineTimeRankChartRef = ref<HTMLElement>()

// 图表引用 - 安全看板
const alarmTypeChartRef = ref<HTMLElement>()
const alarmTrendChartRef = ref<HTMLElement>()
const alarmHandleChartRef = ref<HTMLElement>()
const alarmVehicleRankChartRef = ref<HTMLElement>()

// 图表引用 - 数据看板
const drivingMileageChartRef = ref<HTMLElement>()
const mileageUtilizationChartRef = ref<HTMLElement>()
const mileageOrderRankChartRef = ref<HTMLElement>()
const mileageRevenueRankChartRef = ref<HTMLElement>()
const emptyMileageRankChartRef = ref<HTMLElement>()
const orderCountRankChartRef = ref<HTMLElement>()
const revenueTrendChartRef = ref<HTMLElement>()

let charts: echarts.ECharts[] = []

// 初始化运营状态图表
const initOperationChart = () => {
  if (!operationChartRef.value) return

  const chart = echarts.init(operationChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['55%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: '正常',
        fontSize: 14,
        color: '#333'
      },
      data: [
        { value: operationData.value.normal, name: '正常', itemStyle: { color: '#409eff' } },
        { value: operationData.value.stopped, name: '停运', itemStyle: { color: '#9b59b6' } },
        { value: operationData.value.expired, name: '服务到期', itemStyle: { color: '#00bcd4' } }
      ]
    }]
  })
}

// 初始化在线趋势图表
const initOnlineTrendChart = () => {
  if (!onlineTrendChartRef.value) return

  const chart = echarts.init(onlineTrendChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['0:00', '4:00', '8:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      max: 350,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ])
      },
      lineStyle: { color: '#409eff', width: 2 },
      itemStyle: { color: '#409eff' },
      data: [50, 30, 150, 280, 320, 250, 100]
    }]
  })
}

// 初始化查岗情况图表
const initCheckChart = () => {
  if (!checkChartRef.value) return

  const chart = echarts.init(checkChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: checkData.value.answered, name: '已应答', itemStyle: { color: '#67c23a' } },
        { value: checkData.value.unanswered, name: '未应答', itemStyle: { color: '#f56c6c' } }
      ],
      label: { show: false }
    }]
  })
}

// 初始化里程排名图表
const initMileageRankChart = () => {
  if (!mileageRankChartRef.value) return

  const chart = echarts.init(mileageRankChartRef.value)
  charts.push(chart)

  const data = [
    { name: '沪A12345', value: 2856 },
    { name: '京B67890', value: 2340 },
    { name: '粤C11111', value: 1980 },
    { name: '苏D22222', value: 1650 },
    { name: '浙E33333', value: 1420 }
  ]

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#333' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#67c23a' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#666'
      }
    }]
  })
}

// 初始化报警分布图表
const initAlarmDistributionChart = () => {
  if (!alarmDistributionChartRef.value) return

  const chart = echarts.init(alarmDistributionChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['35%', '55%'],
      center: ['35%', '50%'],
      data: [
        { value: 456, name: '超速', itemStyle: { color: '#f56c6c' } },
        { value: 312, name: '疲劳', itemStyle: { color: '#e6a23c' } },
        { value: 234, name: '越界', itemStyle: { color: '#409eff' } },
        { value: 178, name: '离线', itemStyle: { color: '#909399' } },
        { value: 156, name: '其他', itemStyle: { color: '#67c23a' } }
      ],
      label: { show: false }
    }]
  })
}

// 初始化运营看板报警趋势图表
const initAlarmTrendOperationChart = () => {
  if (!alarmTrendOperationChartRef.value) return

  const chart = echarts.init(alarmTrendOperationChartRef.value)
  charts.push(chart)

  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      type: 'bar',
      data: [120, 200, 150, 80, 70, 110, 130],
      barWidth: 20,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#f56c6c' },
          { offset: 1, color: '#fbc4c4' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  })
}

// 初始化在线时长排名图表
const initOnlineTimeRankChart = () => {
  if (!onlineTimeRankChartRef.value) return

  const chart = echarts.init(onlineTimeRankChartRef.value)
  charts.push(chart)

  const data = [
    { name: '沪A12345', value: 23.5 },
    { name: '京B67890', value: 21.2 },
    { name: '粤C11111', value: 19.8 },
    { name: '苏D22222', value: 18.5 },
    { name: '浙E33333', value: 16.2 }
  ]

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#333' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#67c23a' },
          { offset: 1, color: '#95d475' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#666'
      }
    }]
  })
}

// 初始化报警类型图表
const initAlarmTypeChart = () => {
  if (!alarmTypeChartRef.value) return

  const chart = echarts.init(alarmTypeChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'center'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['35%', '50%'],
      data: [
        { value: 456, name: 'ADAS报警', itemStyle: { color: '#409eff' } },
        { value: 312, name: 'DSM报警', itemStyle: { color: '#67c23a' } },
        { value: 234, name: 'BSD报警', itemStyle: { color: '#e6a23c' } },
        { value: 178, name: '超速报警', itemStyle: { color: '#f56c6c' } },
        { value: 76, name: '其他报警', itemStyle: { color: '#909399' } }
      ]
    }]
  })
}

// 初始化报警趋势图表
const initAlarmTrendChart = () => {
  if (!alarmTrendChartRef.value) return

  const chart = echarts.init(alarmTrendChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['ADAS', 'DSM', 'BSD'], top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [
      { name: 'ADAS', type: 'line', data: [120, 132, 101, 134, 90, 230, 210], itemStyle: { color: '#409eff' } },
      { name: 'DSM', type: 'line', data: [220, 182, 191, 234, 290, 330, 310], itemStyle: { color: '#67c23a' } },
      { name: 'BSD', type: 'line', data: [150, 232, 201, 154, 190, 330, 410], itemStyle: { color: '#e6a23c' } }
    ]
  })
}

// 初始化报警处理图表
const initAlarmHandleChart = () => {
  if (!alarmHandleChartRef.value) return

  const chart = echarts.init(alarmHandleChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: 856, name: '已处理', itemStyle: { color: '#67c23a' } },
        { value: 89, name: '未处理', itemStyle: { color: '#f56c6c' } },
        { value: 45, name: '处理中', itemStyle: { color: '#e6a23c' } }
      ],
      label: {
        show: true,
        formatter: '{b}: {c}'
      }
    }]
  })
}

// 初始化报警车辆排名图表
const initAlarmVehicleRankChart = () => {
  if (!alarmVehicleRankChartRef.value) return

  const chart = echarts.init(alarmVehicleRankChartRef.value)
  charts.push(chart)

  const data = [
    { name: '沪A12345', value: 45 },
    { name: '京B67890', value: 38 },
    { name: '粤C11111', value: 32 },
    { name: '苏D22222', value: 28 },
    { name: '浙E33333', value: 21 }
  ]

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#333' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#f56c6c' },
          { offset: 1, color: '#fbc4c4' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#666'
      }
    }]
  })
}

// 初始化行驶里程图表
const initDrivingMileageChart = () => {
  if (!drivingMileageChartRef.value) return

  const chart = echarts.init(drivingMileageChartRef.value)
  charts.push(chart)

  const days = ['1日', '5日', '10日', '15日', '20日', '25日', '30日']

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      type: 'bar',
      data: [12000, 15000, 13500, 16800, 14200, 17500, 15800],
      barWidth: 30,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#79bbff' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  })
}

// 初始化里程利用率图表
const initMileageUtilizationChart = () => {
  if (!mileageUtilizationChartRef.value) return

  const chart = echarts.init(mileageUtilizationChartRef.value)
  charts.push(chart)

  const days = ['1日', '5日', '10日', '15日', '20日', '25日', '30日']

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: days,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666', formatter: '{value}%' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
          { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
        ])
      },
      lineStyle: { color: '#67c23a', width: 2 },
      itemStyle: { color: '#67c23a' },
      data: [65, 72, 68, 78, 82, 75, 80]
    }]
  })
}

// 初始化排名图表的通用函数
const initRankChart = (chartRef: HTMLElement | undefined, data: { name: string; value: number }[], color1: string, color2: string) => {
  if (!chartRef) return null

  const chart = echarts.init(chartRef)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#333' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 14,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: color1 },
          { offset: 1, color: color2 }
        ]),
        borderRadius: [0, 7, 7, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#666'
      }
    }]
  })

  return chart
}

// 初始化数据看板排名图表
const initDataRankCharts = () => {
  // 里程订单排名
  initRankChart(mileageOrderRankChartRef.value, [
    { name: '沪A12345', value: 156 },
    { name: '京B67890', value: 142 },
    { name: '粤C11111', value: 128 },
    { name: '苏D22222', value: 115 },
    { name: '浙E33333', value: 98 }
  ], '#409eff', '#79bbff')

  // 里程营收排名
  initRankChart(mileageRevenueRankChartRef.value, [
    { name: '沪A12345', value: 12800 },
    { name: '京B67890', value: 11500 },
    { name: '粤C11111', value: 10200 },
    { name: '苏D22222', value: 9800 },
    { name: '浙E33333', value: 8500 }
  ], '#67c23a', '#95d475')

  // 空驶里程排名
  initRankChart(emptyMileageRankChartRef.value, [
    { name: '沪A12345', value: 856 },
    { name: '京B67890', value: 742 },
    { name: '粤C11111', value: 628 },
    { name: '苏D22222', value: 515 },
    { name: '浙E33333', value: 398 }
  ], '#e6a23c', '#f3d19e')

  // 订单数目排名
  initRankChart(orderCountRankChartRef.value, [
    { name: '沪A12345', value: 89 },
    { name: '京B67890', value: 76 },
    { name: '粤C11111', value: 68 },
    { name: '苏D22222', value: 54 },
    { name: '浙E33333', value: 42 }
  ], '#9b59b6', '#c39bd3')
}

// 初始化营收走势图表
const initRevenueTrendChart = () => {
  if (!revenueTrendChartRef.value) return

  const chart = echarts.init(revenueTrendChartRef.value)
  charts.push(chart)

  const days = ['1日', '5日', '10日', '15日', '20日', '25日', '30日']

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: ¥{c}' },
    grid: { left: 80, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: days,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(155, 89, 182, 0.3)' },
          { offset: 1, color: 'rgba(155, 89, 182, 0.05)' }
        ])
      },
      lineStyle: { color: '#9b59b6', width: 2 },
      itemStyle: { color: '#9b59b6' },
      data: [45000, 52000, 48000, 58000, 62000, 55000, 68000]
    }]
  })
}

// 响应式处理
const handleResize = () => {
  charts.forEach(chart => chart.resize())
}

// 初始化当前Tab的图表
const initCurrentTabCharts = () => {
  // 清除旧图表
  charts.forEach(chart => chart.dispose())
  charts = []

  nextTick(() => {
    if (activeTab.value === 'operation') {
      initOperationChart()
      initOnlineTrendChart()
      initCheckChart()
      initMileageRankChart()
      initAlarmDistributionChart()
      initAlarmTrendOperationChart()
      initOnlineTimeRankChart()
    } else if (activeTab.value === 'safety') {
      initAlarmTypeChart()
      initAlarmTrendChart()
      initAlarmHandleChart()
      initAlarmVehicleRankChart()
    } else if (activeTab.value === 'data') {
      initDrivingMileageChart()
      initMileageUtilizationChart()
      initDataRankCharts()
      initRevenueTrendChart()
    }
  })
}

// 监听tab变化
watch(activeTab, () => {
  initCurrentTabCharts()
})

onMounted(() => {
  initCurrentTabCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(chart => chart.dispose())
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  display: flex;
  height: 100%;
  background: #f0f2f5;
}

.dashboard-sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-filters {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .el-select {
      flex: 1;
    }
  }

  .sidebar-search {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .el-input {
      flex: 1;
    }
  }

  .sidebar-tree {
    flex: 1;
    overflow: auto;
    padding: 8px;

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }
}

.dashboard-content {
  flex: 1;
  overflow: auto;
  padding: 16px;

  .dashboard-tabs {
    margin-bottom: 16px;

    .tab-nav {
      display: flex;
      align-items: center;
      gap: 8px;

      .tab-item {
        font-size: 16px;
        color: #333;
        cursor: pointer;
        padding: 4px 8px;

        &:hover {
          color: #409eff;
        }

        &.active {
          color: #409eff;
          font-weight: 500;
        }
      }

      .tab-divider {
        color: #ddd;
      }
    }
  }

  .tab-content {
    animation: fadeIn 0.3s ease;
  }

  // AI报警统计区域
  .ai-alarm-section {
    margin-bottom: 16px;

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 12px;
    }

    .ai-alarm-cards {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;

      .ai-alarm-card {
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

        &.total {
          background: linear-gradient(135deg, #409eff, #67c23a);

          .ai-alarm-icon {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
          }

          .ai-alarm-info {
            .ai-alarm-label,
            .ai-alarm-value {
              color: #fff;
            }
          }
        }

        .ai-alarm-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: #f0f2f5;
          color: #409eff;

          &.blue { background: #ecf5ff; color: #409eff; }
          &.orange { background: #fdf6ec; color: #e6a23c; }
          &.purple { background: #f4ecfb; color: #9b59b6; }
          &.red { background: #fef0f0; color: #f56c6c; }
          &.green { background: #f0f9eb; color: #67c23a; }
          &.cyan { background: #e6f7ff; color: #00bcd4; }
        }

        .ai-alarm-info {
          text-align: center;

          .ai-alarm-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }

          .ai-alarm-value {
            font-size: 20px;
            font-weight: 600;
            color: #333;
          }
        }
      }
    }
  }

  // 报警筛选标签
  .alarm-filter-tabs {
    margin-bottom: 16px;

    .el-radio-group {
      background: #fff;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;

    &.eight-cols {
      grid-template-columns: repeat(8, 1fr);
      gap: 12px;
    }

    &.six-cols {
      grid-template-columns: repeat(6, 1fr);
    }

    .stat-card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      &.mini {
        padding: 12px;
        gap: 10px;

        .stat-icon {
          width: 40px;
          height: 40px;
          font-size: 20px;
        }

        .stat-info {
          .stat-label {
            font-size: 11px;
          }

          .stat-value {
            font-size: 20px;
          }
        }
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: #fff;

        &.blue { background: #409eff; }
        &.orange { background: #e6a23c; }
        &.cyan { background: #00bcd4; }
        &.green { background: #67c23a; }
        &.yellow { background: #f4d03f; }
        &.red { background: #f56c6c; }
        &.purple { background: #9b59b6; }
        &.teal { background: #20c997; }
      }

      .stat-info {
        .stat-label {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #333;

          &.blue { color: #409eff; }
          &.orange { color: #e6a23c; }
          &.green { color: #67c23a; }
          &.red { color: #f56c6c; }
          &.purple { color: #9b59b6; }
        }
      }
    }
  }

  .mileage-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    .mileage-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #409eff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #fff;
    }

    .mileage-info {
      flex: 1;

      .mileage-label {
        font-size: 13px;
        color: #666;
      }

      .mileage-value {
        font-size: 32px;
        font-weight: 600;
        color: #409eff;
      }
    }

    .mileage-chart {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid #e8e8e8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #409eff;
    }
  }

  .charts-section {
    .chart-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;

      &.three-cols {
        grid-template-columns: repeat(3, 1fr);
      }

      &.four-cols {
        grid-template-columns: repeat(4, 1fr);
      }

      &:has(.full-width) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      &.full-width {
        grid-column: 1 / -1;
      }

      .chart-header {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .chart-title {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .chart-legend {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;

          .legend-text {
            color: #999;
          }
        }

        .check-stats {
          display: flex;
          gap: 20px;
          font-size: 13px;
          color: #666;

          strong {
            color: #333;
            margin-left: 4px;
          }
        }
      }

      .chart-body {
        padding: 16px;

        .chart-container {
          width: 100%;
          height: 200px;

          &.tall {
            height: 300px;
          }

          &.small {
            height: 120px;
          }
        }

        .chart-with-legend {
          display: flex;
          align-items: center;

          .chart-container {
            flex: 1;
          }

          .legend-vertical {
            width: 80px;
            display: flex;
            flex-direction: column;
            gap: 12px;

            .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: #666;

              .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;

                &.blue { background: #409eff; }
                &.purple { background: #9b59b6; }
                &.cyan { background: #00bcd4; }
              }
            }
          }
        }

        .date-toggle {
          display: flex;
          justify-content: center;
          padding: 10px 0;
        }
      }
    }

    .check-card {
      .chart-body {
        min-height: 100px;
      }
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 1600px) {
  .dashboard-content {
    .stats-cards.eight-cols {
      grid-template-columns: repeat(4, 1fr);
    }

    .ai-alarm-section .ai-alarm-cards {
      grid-template-columns: repeat(4, 1fr);
    }

    .charts-section {
      .chart-row.three-cols,
      .chart-row.four-cols {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  }
}

@media (max-width: 1200px) {
  .dashboard-content {
    .stats-cards {
      grid-template-columns: repeat(2, 1fr);

      &.eight-cols,
      &.six-cols {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .ai-alarm-section .ai-alarm-cards {
      grid-template-columns: repeat(2, 1fr);
    }

    .charts-section .chart-row {
      grid-template-columns: 1fr;

      &.three-cols,
      &.four-cols {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>

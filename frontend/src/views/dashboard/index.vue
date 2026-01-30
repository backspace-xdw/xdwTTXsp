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
import { ElMessage } from 'element-plus'
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
import { getOperationData, getSafetyData, getDataDashboard } from '@/api/dashboard'
import type { OperationData, SafetyData, DataDashboardData } from '@/api/dashboard'

// 状态
const activeTab = ref('operation')
const searchKeyword = ref('')
const dateRange = ref('today')
const alarmFilter = ref('all')
const loading = ref(false)
const filters = ref({
  type: '',
  status: '',
  device: ''
})

// 运营统计数据
const stats = ref({
  totalEnterprises: 0,
  totalDrivers: 0,
  totalVehicles: 0,
  todayOnline: 0,
  alarmVehicles: 0,
  currentOnline: 0,
  averageMileage: 0,
  averageOnlineHours: 0
})

// 运营数据
const operationData = ref({
  normal: 0,
  stopped: 0,
  expired: 0
})

// 查岗数据
const checkData = ref({
  total: 0,
  answered: 0,
  unanswered: 0
})

// API返回的图表数据
const operationChartData = ref<{
  onlineTrend: number[]
  mileageRank: { name: string; value: number }[]
  alarmDistribution: { name: string; value: number }[]
  alarmTrend: { date: string; count: number }[]
  onlineTimeRank: { name: string; value: number }[]
}>({
  onlineTrend: [],
  mileageRank: [],
  alarmDistribution: [],
  alarmTrend: [],
  onlineTimeRank: []
})

// AI报警统计
const aiAlarmStats = ref({
  total: 0,
  adas: 0,
  dsm: 0,
  bsd: 0,
  aggressive: 0,
  gps: 0,
  smart: 0
})

// 安全统计
const safetyStats = ref({
  expiredDocs: 0,
  untrainedDrivers: 0,
  unhandledAlarms: 0,
  handleRate: 0
})

// 安全看板图表数据
const safetyChartData = ref<{
  alarmTypeDistribution: { name: string; value: number }[]
  alarmTrend: { date: string; adas: number; dsm: number; bsd: number }[]
  alarmHandleStats: { handled: number; unhandled: number; processing: number }
  alarmVehicleRank: { name: string; value: number }[]
}>({
  alarmTypeDistribution: [],
  alarmTrend: [],
  alarmHandleStats: { handled: 0, unhandled: 0, processing: 0 },
  alarmVehicleRank: []
})

// 数据统计
const dataStats = ref({
  totalVehicles: 0,
  totalDrivers: 0,
  totalOrders: 0,
  totalRevenue: 0,
  avgMileageOrder: 0,
  avgMileageRevenue: 0
})

// 数据看板图表数据
const dataChartData = ref<{
  drivingMileage: { date: string; value: number }[]
  mileageUtilization: { date: string; value: number }[]
  mileageOrderRank: { name: string; value: number }[]
  mileageRevenueRank: { name: string; value: number }[]
  emptyMileageRank: { name: string; value: number }[]
  orderCountRank: { name: string; value: number }[]
  revenueTrend: { date: string; value: number }[]
}>({
  drivingMileage: [],
  mileageUtilization: [],
  mileageOrderRank: [],
  mileageRevenueRank: [],
  emptyMileageRank: [],
  orderCountRank: [],
  revenueTrend: []
})

// 车辆树数据
const vehicleTreeData = ref([
  {
    label: '监控中心 (0/0)',
    children: []
  }
])

// 获取运营看板数据
async function fetchOperationData() {
  try {
    loading.value = true
    const res = await getOperationData()
    if (res.code === 0 && res.data) {
      stats.value = res.data.stats
      operationData.value = res.data.operationData
      operationChartData.value = {
        onlineTrend: res.data.onlineTrend,
        mileageRank: res.data.mileageRank,
        alarmDistribution: res.data.alarmDistribution,
        alarmTrend: res.data.alarmTrend,
        onlineTimeRank: res.data.onlineTimeRank
      }
      // 更新车辆树
      vehicleTreeData.value = [{
        label: `监控中心 (${stats.value.currentOnline}/${stats.value.totalVehicles})`,
        children: []
      }]
    }
  } catch (error) {
    console.error('获取运营数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取安全看板数据
async function fetchSafetyData() {
  try {
    loading.value = true
    const res = await getSafetyData()
    if (res.code === 0 && res.data) {
      aiAlarmStats.value = res.data.aiAlarmStats
      safetyStats.value = res.data.safetyStats
      safetyChartData.value = {
        alarmTypeDistribution: res.data.alarmTypeDistribution,
        alarmTrend: res.data.alarmTrend,
        alarmHandleStats: res.data.alarmHandleStats,
        alarmVehicleRank: res.data.alarmVehicleRank
      }
    }
  } catch (error) {
    console.error('获取安全数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取数据看板数据
async function fetchDataDashboard() {
  try {
    loading.value = true
    const res = await getDataDashboard()
    if (res.code === 0 && res.data) {
      dataStats.value = res.data.dataStats
      dataChartData.value = {
        drivingMileage: res.data.drivingMileage,
        mileageUtilization: res.data.mileageUtilization,
        mileageOrderRank: res.data.mileageOrderRank,
        mileageRevenueRank: res.data.mileageRevenueRank,
        emptyMileageRank: res.data.emptyMileageRank,
        orderCountRank: res.data.orderCountRank,
        revenueTrend: res.data.revenueTrend
      }
    }
  } catch (error) {
    console.error('获取数据看板失败:', error)
  } finally {
    loading.value = false
  }
}

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
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
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
        color: '#e0e6ed'
      },
      data: [
        { value: operationData.value.normal, name: '正常', itemStyle: { color: '#00d4ff' } },
        { value: operationData.value.stopped, name: '停运', itemStyle: { color: '#a855f7' } },
        { value: operationData.value.expired, name: '服务到期', itemStyle: { color: '#00ffc8' } }
      ]
    }]
  })
}

// 初始化在线趋势图表
const initOnlineTrendChart = () => {
  if (!onlineTrendChartRef.value) return

  const chart = echarts.init(onlineTrendChartRef.value)
  charts.push(chart)

  const trendData = operationChartData.value.onlineTrend.length > 0
    ? operationChartData.value.onlineTrend
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['0:00', '4:00', '8:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } },
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 212, 255, 0.25)' },
          { offset: 1, color: 'rgba(0, 212, 255, 0.02)' }
        ])
      },
      lineStyle: { color: '#00d4ff', width: 2 },
      itemStyle: { color: '#00d4ff' },
      data: trendData
    }]
  })
}

// 初始化查岗情况图表
const initCheckChart = () => {
  if (!checkChartRef.value) return

  const chart = echarts.init(checkChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    series: [{
      type: 'pie',
      radius: ['40%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: checkData.value.answered, name: '已应答', itemStyle: { color: '#00ffc8' } },
        { value: checkData.value.unanswered, name: '未应答', itemStyle: { color: '#ff4d6a' } }
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

  const data = operationChartData.value.mileageRank.length > 0
    ? operationChartData.value.mileageRank
    : [{ name: '暂无数据', value: 0 }]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
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
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#00d4ff' },
          { offset: 1, color: '#00ffc8' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#7eb8da'
      }
    }]
  })
}

// 初始化报警分布图表
const initAlarmDistributionChart = () => {
  if (!alarmDistributionChartRef.value) return

  const chart = echarts.init(alarmDistributionChartRef.value)
  charts.push(chart)

  const colors = ['#ff4d6a', '#ffb800', '#00d4ff', '#7eb8da', '#00ffc8']
  const data = operationChartData.value.alarmDistribution.length > 0
    ? operationChartData.value.alarmDistribution.map((item, idx) => ({
        value: item.value,
        name: item.name,
        itemStyle: { color: colors[idx % colors.length] }
      }))
    : [{ value: 0, name: '暂无数据', itemStyle: { color: '#4a6a8a' } }]

  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#7eb8da' }
    },
    series: [{
      type: 'pie',
      radius: ['35%', '55%'],
      center: ['35%', '50%'],
      data,
      label: { show: false }
    }]
  })
}

// 初始化运营看板报警趋势图表
const initAlarmTrendOperationChart = () => {
  if (!alarmTrendOperationChartRef.value) return

  const chart = echarts.init(alarmTrendOperationChartRef.value)
  charts.push(chart)

  const alarmTrend = operationChartData.value.alarmTrend
  const dates = alarmTrend.length > 0
    ? alarmTrend.map(item => item.date)
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const counts = alarmTrend.length > 0
    ? alarmTrend.map(item => item.count)
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } },
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'bar',
      data: counts,
      barWidth: 20,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff4d6a' },
          { offset: 1, color: 'rgba(255, 77, 106, 0.3)' }
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

  const data = operationChartData.value.onlineTimeRank.length > 0
    ? operationChartData.value.onlineTimeRank
    : [{ name: '暂无数据', value: 0 }]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
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
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#00ffc8' },
          { offset: 1, color: 'rgba(0, 255, 200, 0.5)' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#7eb8da'
      }
    }]
  })
}

// 初始化报警类型图表
const initAlarmTypeChart = () => {
  if (!alarmTypeChartRef.value) return

  const chart = echarts.init(alarmTypeChartRef.value)
  charts.push(chart)

  const colors = ['#00d4ff', '#00ffc8', '#ffb800', '#ff4d6a', '#a855f7']
  const data = safetyChartData.value.alarmTypeDistribution.length > 0
    ? safetyChartData.value.alarmTypeDistribution.map((item, idx) => ({
        value: item.value,
        name: item.name,
        itemStyle: { color: colors[idx % colors.length] }
      }))
    : [{ value: 0, name: '暂无数据', itemStyle: { color: '#4a6a8a' } }]

  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'center',
      textStyle: { color: '#7eb8da' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['35%', '50%'],
      data
    }]
  })
}

// 初始化报警趋势图表
const initAlarmTrendChart = () => {
  if (!alarmTrendChartRef.value) return

  const chart = echarts.init(alarmTrendChartRef.value)
  charts.push(chart)

  const alarmTrend = safetyChartData.value.alarmTrend
  const dates = alarmTrend.length > 0
    ? alarmTrend.map(item => item.date)
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const adasData = alarmTrend.length > 0
    ? alarmTrend.map(item => item.adas)
    : [0, 0, 0, 0, 0, 0, 0]
  const dsmData = alarmTrend.length > 0
    ? alarmTrend.map(item => item.dsm)
    : [0, 0, 0, 0, 0, 0, 0]
  const bsdData = alarmTrend.length > 0
    ? alarmTrend.map(item => item.bsd)
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    legend: { data: ['ADAS', 'DSM', 'BSD'], top: 0, textStyle: { color: '#7eb8da' } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } }, axisLabel: { color: '#7eb8da' } },
    series: [
      { name: 'ADAS', type: 'line', data: adasData, itemStyle: { color: '#00d4ff' }, lineStyle: { color: '#00d4ff' } },
      { name: 'DSM', type: 'line', data: dsmData, itemStyle: { color: '#00ffc8' }, lineStyle: { color: '#00ffc8' } },
      { name: 'BSD', type: 'line', data: bsdData, itemStyle: { color: '#ffb800' }, lineStyle: { color: '#ffb800' } }
    ]
  })
}

// 初始化报警处理图表
const initAlarmHandleChart = () => {
  if (!alarmHandleChartRef.value) return

  const chart = echarts.init(alarmHandleChartRef.value)
  charts.push(chart)

  const handleStats = safetyChartData.value.alarmHandleStats

  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    series: [{
      type: 'pie',
      radius: ['40%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: handleStats.handled, name: '已处理', itemStyle: { color: '#00ffc8' } },
        { value: handleStats.unhandled, name: '未处理', itemStyle: { color: '#ff4d6a' } },
        { value: handleStats.processing, name: '处理中', itemStyle: { color: '#ffb800' } }
      ],
      label: {
        show: true,
        formatter: '{b}: {c}',
        color: '#7eb8da'
      }
    }]
  })
}

// 初始化报警车辆排名图表
const initAlarmVehicleRankChart = () => {
  if (!alarmVehicleRankChartRef.value) return

  const chart = echarts.init(alarmVehicleRankChartRef.value)
  charts.push(chart)

  const data = safetyChartData.value.alarmVehicleRank.length > 0
    ? safetyChartData.value.alarmVehicleRank
    : [{ name: '暂无数据', value: 0 }]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#ff4d6a' },
          { offset: 1, color: 'rgba(255, 77, 106, 0.4)' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#7eb8da'
      }
    }]
  })
}

// 初始化行驶里程图表
const initDrivingMileageChart = () => {
  if (!drivingMileageChartRef.value) return

  const chart = echarts.init(drivingMileageChartRef.value)
  charts.push(chart)

  const mileageData = dataChartData.value.drivingMileage
  const dates = mileageData.length > 0
    ? mileageData.map(item => item.date)
    : ['1日', '5日', '10日', '15日', '20日', '25日', '30日']
  const values = mileageData.length > 0
    ? mileageData.map(item => item.value)
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } },
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'bar',
      data: values,
      barWidth: 30,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#00d4ff' },
          { offset: 1, color: 'rgba(0, 212, 255, 0.3)' }
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

  const utilizationData = dataChartData.value.mileageUtilization
  const dates = utilizationData.length > 0
    ? utilizationData.map(item => item.date)
    : ['1日', '5日', '10日', '15日', '20日', '25日', '30日']
  const values = utilizationData.length > 0
    ? utilizationData.map(item => item.value)
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } },
      axisLabel: { color: '#7eb8da', formatter: '{value}%' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 255, 200, 0.25)' },
          { offset: 1, color: 'rgba(0, 255, 200, 0.02)' }
        ])
      },
      lineStyle: { color: '#00ffc8', width: 2 },
      itemStyle: { color: '#00ffc8' },
      data: values
    }]
  })
}

// 初始化排名图表的通用函数
const initRankChart = (chartRef: HTMLElement | undefined, data: { name: string; value: number }[], color1: string, color2: string) => {
  if (!chartRef) return null

  const chart = echarts.init(chartRef)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 100, right: 60, top: 10, bottom: 10 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#7eb8da' }
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
        color: '#7eb8da'
      }
    }]
  })

  return chart
}

// 初始化数据看板排名图表
const initDataRankCharts = () => {
  const defaultData = [{ name: '暂无数据', value: 0 }]

  // 里程订单排名
  initRankChart(
    mileageOrderRankChartRef.value,
    dataChartData.value.mileageOrderRank.length > 0
      ? dataChartData.value.mileageOrderRank
      : defaultData,
    '#00d4ff', 'rgba(0, 212, 255, 0.4)'
  )

  // 里程营收排名
  initRankChart(
    mileageRevenueRankChartRef.value,
    dataChartData.value.mileageRevenueRank.length > 0
      ? dataChartData.value.mileageRevenueRank
      : defaultData,
    '#00ffc8', 'rgba(0, 255, 200, 0.4)'
  )

  // 空驶里程排名
  initRankChart(
    emptyMileageRankChartRef.value,
    dataChartData.value.emptyMileageRank.length > 0
      ? dataChartData.value.emptyMileageRank
      : defaultData,
    '#ffb800', 'rgba(255, 184, 0, 0.4)'
  )

  // 订单数目排名
  initRankChart(
    orderCountRankChartRef.value,
    dataChartData.value.orderCountRank.length > 0
      ? dataChartData.value.orderCountRank
      : defaultData,
    '#a855f7', 'rgba(168, 85, 247, 0.4)'
  )
}

// 初始化营收走势图表
const initRevenueTrendChart = () => {
  if (!revenueTrendChartRef.value) return

  const chart = echarts.init(revenueTrendChartRef.value)
  charts.push(chart)

  const revenueTrend = dataChartData.value.revenueTrend
  const dates = revenueTrend.length > 0
    ? revenueTrend.map(item => item.date)
    : ['1日', '5日', '10日', '15日', '20日', '25日', '30日']
  const values = revenueTrend.length > 0
    ? revenueTrend.map(item => item.value)
    : [0, 0, 0, 0, 0, 0, 0]

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: ¥{c}', backgroundColor: 'rgba(10, 14, 39, 0.9)', borderColor: 'rgba(0, 200, 255, 0.3)', textStyle: { color: '#e0e6ed' } },
    grid: { left: 80, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#2a3a5c' } },
      axisLabel: { color: '#7eb8da' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.08)' } },
      axisLabel: { color: '#7eb8da' }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(168, 85, 247, 0.25)' },
          { offset: 1, color: 'rgba(168, 85, 247, 0.02)' }
        ])
      },
      lineStyle: { color: '#a855f7', width: 2 },
      itemStyle: { color: '#a855f7' },
      data: values
    }]
  })
}

// 响应式处理
const handleResize = () => {
  charts.forEach(chart => chart.resize())
}

// 初始化当前Tab的图表
const initCurrentTabCharts = async () => {
  // 清除旧图表
  charts.forEach(chart => chart.dispose())
  charts = []

  // 根据当前tab获取数据
  if (activeTab.value === 'operation') {
    await fetchOperationData()
  } else if (activeTab.value === 'safety') {
    await fetchSafetyData()
  } else if (activeTab.value === 'data') {
    await fetchDataDashboard()
  }

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

  // 设置定时刷新 (每60秒)
  const refreshInterval = setInterval(() => {
    if (activeTab.value === 'operation') {
      fetchOperationData()
    }
  }, 60000)

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(chart => chart.dispose())
})
</script>


<style lang="scss" scoped>
/* === Dark Tech Theme Animations === */
@keyframes techPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes techGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6); }
}

@keyframes scanLine {
  0% { background-position: 0 -100%; }
  100% { background-position: 0 200%; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dashboard-page {
  display: flex;
  height: 100%;
  background: linear-gradient(135deg, #0a0e27 0%, #0d1b2a 100%);
  color: #e0e6ed;
}

.dashboard-sidebar {
  width: 280px;
  background: rgba(10, 14, 39, 0.95);
  border-right: 1px solid rgba(0, 200, 255, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 15px rgba(0, 200, 255, 0.05);

  .sidebar-filters {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid rgba(0, 200, 255, 0.1);

    .el-select {
      flex: 1;
    }
  }

  .sidebar-search {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid rgba(0, 200, 255, 0.1);

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
      color: #7eb8da;
    }
  }
}

/* Deep selectors for Element Plus dark theme */
:deep(.el-select) {
  .el-input__wrapper {
    background: rgba(10, 18, 42, 0.8) !important;
    border-color: rgba(0, 200, 255, 0.15) !important;
    box-shadow: none !important;
  }
  .el-input__inner {
    color: #7eb8da !important;
  }
  .el-select__caret {
    color: #4a6a8a !important;
  }
}

:deep(.el-input) {
  .el-input__wrapper {
    background: rgba(10, 18, 42, 0.8) !important;
    border-color: rgba(0, 200, 255, 0.15) !important;
    box-shadow: none !important;
  }
  .el-input__inner {
    color: #7eb8da !important;
  }
  .el-input__prefix .el-icon {
    color: #4a6a8a !important;
  }
}

:deep(.el-button) {
  &.el-button--primary {
    background: rgba(0, 212, 255, 0.2);
    border-color: rgba(0, 212, 255, 0.4);
    color: #00d4ff;

    &:hover {
      background: rgba(0, 212, 255, 0.3);
    }
  }
}

:deep(.el-tree) {
  background: transparent !important;
  color: #7eb8da;

  .el-tree-node__content:hover {
    background: rgba(0, 200, 255, 0.08) !important;
  }

  .el-tree-node.is-current > .el-tree-node__content {
    background: rgba(0, 200, 255, 0.12) !important;
  }

  .el-tree-node__expand-icon {
    color: #4a6a8a;
  }
}

:deep(.el-button-group) {
  .el-button {
    background: rgba(10, 18, 42, 0.8) !important;
    border-color: rgba(0, 200, 255, 0.15) !important;
    color: #7eb8da !important;

    &.el-button--primary,
    &.is-active {
      background: rgba(0, 212, 255, 0.2) !important;
      border-color: rgba(0, 212, 255, 0.4) !important;
      color: #00d4ff !important;
    }
  }
}

:deep(.el-radio-group) {
  .el-radio-button__inner {
    background: rgba(10, 18, 42, 0.8);
    border-color: rgba(0, 200, 255, 0.15);
    color: #7eb8da;
    box-shadow: none !important;
  }

  .el-radio-button__original-radio:checked + .el-radio-button__inner {
    background: rgba(0, 212, 255, 0.2);
    border-color: rgba(0, 212, 255, 0.4);
    color: #00d4ff;
    box-shadow: none !important;
  }
}

.dashboard-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background-image:
    linear-gradient(rgba(0, 200, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 200, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;

  .dashboard-tabs {
    margin-bottom: 16px;

    .tab-nav {
      display: flex;
      align-items: center;
      gap: 8px;

      .tab-item {
        font-size: 16px;
        color: #7eb8da;
        cursor: pointer;
        padding: 4px 8px;
        transition: all 0.3s ease;
        border-bottom: 2px solid transparent;

        &:hover {
          color: #00d4ff;
        }

        &.active {
          color: #00d4ff;
          font-weight: 500;
          text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          border-bottom: 2px solid #00d4ff;
          box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
        }
      }

      .tab-divider {
        color: #2a3a5c;
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
      color: #00d4ff;
      margin-bottom: 12px;
      text-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
    }

    .ai-alarm-cards {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;

      .ai-alarm-card {
        background: rgba(10, 18, 42, 0.8);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(0, 200, 255, 0.15);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;

        &:hover {
          border-color: rgba(0, 200, 255, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 200, 255, 0.15);
        }

        // Tech corner decorations
        &::before, &::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          border-color: rgba(0, 212, 255, 0.4);
          border-style: solid;
        }

        &::before {
          top: 4px;
          left: 4px;
          border-width: 1px 0 0 1px;
        }

        &::after {
          bottom: 4px;
          right: 4px;
          border-width: 0 1px 1px 0;
        }

        &.total {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 255, 200, 0.1));
          border-color: rgba(0, 212, 255, 0.3);

          .ai-alarm-icon {
            background: rgba(0, 212, 255, 0.2);
            color: #00d4ff;
          }

          .ai-alarm-info {
            .ai-alarm-label,
            .ai-alarm-value {
              color: #00d4ff;
            }
            .ai-alarm-value {
              text-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
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
          background: rgba(0, 200, 255, 0.08);
          color: #00d4ff;
          animation: techPulse 3s ease-in-out infinite;

          &.blue { background: rgba(0, 212, 255, 0.1); color: #00d4ff; }
          &.orange { background: rgba(255, 184, 0, 0.1); color: #ffb800; }
          &.purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
          &.red { background: rgba(255, 77, 106, 0.1); color: #ff4d6a; }
          &.green { background: rgba(0, 255, 136, 0.1); color: #00ff88; }
          &.cyan { background: rgba(0, 255, 200, 0.1); color: #00ffc8; }
        }

        .ai-alarm-info {
          text-align: center;

          .ai-alarm-label {
            font-size: 12px;
            color: #7eb8da;
            margin-bottom: 4px;
          }

          .ai-alarm-value {
            font-size: 20px;
            font-weight: 600;
            color: #e0e6ed;
            font-variant-numeric: tabular-nums;
          }
        }
      }
    }
  }

  // 报警筛选标签
  .alarm-filter-tabs {
    margin-bottom: 16px;

    .el-radio-group {
      background: rgba(10, 18, 42, 0.8);
      padding: 8px;
      border-radius: 8px;
      border: 1px solid rgba(0, 200, 255, 0.1);
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
      background: rgba(10, 18, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid rgba(0, 200, 255, 0.15);
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;

      &:hover {
        border-color: rgba(0, 200, 255, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 200, 255, 0.15);
      }

      // Tech corner decorations
      &::before, &::after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        border-color: rgba(0, 212, 255, 0.4);
        border-style: solid;
      }

      &::before {
        top: 4px;
        left: 4px;
        border-width: 1px 0 0 1px;
      }

      &::after {
        bottom: 4px;
        right: 4px;
        border-width: 0 1px 1px 0;
      }

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
        animation: techPulse 3s ease-in-out infinite;

        &.blue { background: rgba(0, 212, 255, 0.2); color: #00d4ff; box-shadow: 0 0 12px rgba(0, 212, 255, 0.3); }
        &.orange { background: rgba(255, 184, 0, 0.2); color: #ffb800; box-shadow: 0 0 12px rgba(255, 184, 0, 0.3); }
        &.cyan { background: rgba(0, 255, 200, 0.2); color: #00ffc8; box-shadow: 0 0 12px rgba(0, 255, 200, 0.3); }
        &.green { background: rgba(0, 255, 136, 0.2); color: #00ff88; box-shadow: 0 0 12px rgba(0, 255, 136, 0.3); }
        &.yellow { background: rgba(240, 224, 48, 0.2); color: #f0e030; box-shadow: 0 0 12px rgba(240, 224, 48, 0.3); }
        &.red { background: rgba(255, 77, 106, 0.2); color: #ff4d6a; box-shadow: 0 0 12px rgba(255, 77, 106, 0.3); }
        &.purple { background: rgba(168, 85, 247, 0.2); color: #a855f7; box-shadow: 0 0 12px rgba(168, 85, 247, 0.3); }
        &.teal { background: rgba(0, 255, 200, 0.2); color: #00ffc8; box-shadow: 0 0 12px rgba(0, 255, 200, 0.3); }
      }

      .stat-info {
        .stat-label {
          font-size: 13px;
          color: #7eb8da;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #e0e6ed;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 10px rgba(0, 200, 255, 0.3);

          &.blue { color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5); }
          &.orange { color: #ffb800; text-shadow: 0 0 10px rgba(255, 184, 0, 0.5); }
          &.green { color: #00ff88; text-shadow: 0 0 10px rgba(0, 255, 136, 0.5); }
          &.red { color: #ff4d6a; text-shadow: 0 0 10px rgba(255, 77, 106, 0.5); }
          &.purple { color: #a855f7; text-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
        }
      }
    }
  }

  .mileage-card {
    background: rgba(10, 18, 42, 0.8);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    border: 1px solid rgba(0, 200, 255, 0.15);

    .mileage-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: rgba(0, 212, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #00d4ff;
    }

    .mileage-info {
      flex: 1;

      .mileage-label {
        font-size: 13px;
        color: #7eb8da;
      }

      .mileage-value {
        font-size: 32px;
        font-weight: 600;
        color: #00d4ff;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
      }
    }

    .mileage-chart {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid rgba(0, 200, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #00d4ff;
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
      background: rgba(10, 18, 42, 0.8);
      border-radius: 8px;
      border: 1px solid rgba(0, 200, 255, 0.15);
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;

      &:hover {
        border-color: rgba(0, 200, 255, 0.3);
        box-shadow: 0 4px 20px rgba(0, 200, 255, 0.1);
      }

      // Tech corner decorations
      &::before, &::after {
        content: '';
        position: absolute;
        width: 10px;
        height: 10px;
        border-color: rgba(0, 212, 255, 0.3);
        border-style: solid;
        z-index: 1;
      }

      &::before {
        top: 4px;
        left: 4px;
        border-width: 1px 0 0 1px;
      }

      &::after {
        bottom: 4px;
        right: 4px;
        border-width: 0 1px 1px 0;
      }

      &.full-width {
        grid-column: 1 / -1;
      }

      .chart-header {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 200, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;

        // Tech left decoration line (gradient bar)
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background: linear-gradient(180deg, #00d4ff, #00ffc8);
          border-radius: 0 2px 2px 0;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 500;
          color: #e0e6ed;
          padding-left: 8px;
        }

        .chart-legend {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #7eb8da;

          .legend-text {
            color: #7eb8da;
          }
        }

        .check-stats {
          display: flex;
          gap: 20px;
          font-size: 13px;
          color: #7eb8da;

          strong {
            color: #00d4ff;
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
              color: #7eb8da;

              .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                box-shadow: 0 0 6px currentColor;

                &.blue { background: #00d4ff; color: #00d4ff; }
                &.purple { background: #a855f7; color: #a855f7; }
                &.cyan { background: #00ffc8; color: #00ffc8; }
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

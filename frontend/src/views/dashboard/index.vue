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
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">企业总数</div>
              <div class="stat-value orange">{{ stats.totalEnterprises }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">司机总数</div>
              <div class="stat-value">{{ stats.totalDrivers }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cyan">
              <el-icon><Van /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">当前车辆总数</div>
              <div class="stat-value blue">{{ stats.totalVehicles }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">今日车辆上线</div>
              <div class="stat-value orange">{{ stats.todayOnline }}</div>
            </div>
          </div>
        </div>

        <!-- 平均里程 -->
        <div class="mileage-card">
          <div class="mileage-icon">
            <el-icon><Odometer /></el-icon>
          </div>
          <div class="mileage-info">
            <div class="mileage-label">平均里程(公里/天)</div>
            <div class="mileage-value">{{ stats.averageMileage }}</div>
          </div>
          <div class="mileage-chart">
            <el-icon><Clock /></el-icon>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="charts-section">
          <div class="chart-row">
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
          </div>

          <div class="chart-row">
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
                    <el-button :type="dateRange === 'today' ? 'primary' : ''" @click="dateRange = 'today'">今天</el-button>
                    <el-button :type="dateRange === 'yesterday' ? 'primary' : ''" @click="dateRange = 'yesterday'">昨日</el-button>
                  </el-button-group>
                </div>
              </div>
            </div>

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
          </div>
        </div>
      </div>

      <!-- 安全看板内容 -->
      <div v-if="activeTab === 'safety'" class="tab-content">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon red">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">今日报警总数</div>
              <div class="stat-value red">{{ safetyStats.todayAlarms }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">未处理报警</div>
              <div class="stat-value orange">{{ safetyStats.unhandled }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon><Camera /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">ADAS报警</div>
              <div class="stat-value blue">{{ safetyStats.adas }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">
              <el-icon><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">DSM报警</div>
              <div class="stat-value purple">{{ safetyStats.dsm }}</div>
            </div>
          </div>
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
        </div>
      </div>

      <!-- 数据看板内容 -->
      <div v-if="activeTab === 'data'" class="tab-content">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon><DataLine /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">今日数据量</div>
              <div class="stat-value blue">{{ dataStats.todayData }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon><Upload /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">上传成功率</div>
              <div class="stat-value green">{{ dataStats.uploadRate }}%</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cyan">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">平均响应时间</div>
              <div class="stat-value">{{ dataStats.responseTime }}ms</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon><Histogram /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">存储使用量</div>
              <div class="stat-value orange">{{ dataStats.storage }}GB</div>
            </div>
          </div>
        </div>

        <div class="charts-section">
          <div class="chart-row">
            <div class="chart-card full-width">
              <div class="chart-header">
                <span class="chart-title">数据上报趋势</span>
              </div>
              <div class="chart-body">
                <div ref="dataReportChartRef" class="chart-container tall"></div>
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
  Histogram
} from '@element-plus/icons-vue'

// 状态
const activeTab = ref('operation')
const searchKeyword = ref('')
const dateRange = ref('today')
const filters = ref({
  type: '',
  status: '',
  device: ''
})

// 运营统计数据
const stats = ref({
  totalEnterprises: 30,
  totalDrivers: 0,
  totalVehicles: 4558,
  todayOnline: 378,
  averageMileage: 10.33
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

// 安全统计
const safetyStats = ref({
  todayAlarms: 1256,
  unhandled: 89,
  adas: 456,
  dsm: 312
})

// 数据统计
const dataStats = ref({
  todayData: 125680,
  uploadRate: 99.8,
  responseTime: 45,
  storage: 1024
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

// 图表引用
const operationChartRef = ref<HTMLElement>()
const onlineTrendChartRef = ref<HTMLElement>()
const mileageRankChartRef = ref<HTMLElement>()
const alarmTypeChartRef = ref<HTMLElement>()
const alarmTrendChartRef = ref<HTMLElement>()
const dataReportChartRef = ref<HTMLElement>()

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

// 初始化数据上报图表
const initDataReportChart = () => {
  if (!dataReportChartRef.value) return

  const chart = echarts.init(dataReportChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['GPS数据', '报警数据', '媒体数据'], top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'GPS数据',
        type: 'bar',
        stack: 'total',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 5000 + 3000)),
        itemStyle: { color: '#409eff' }
      },
      {
        name: '报警数据',
        type: 'bar',
        stack: 'total',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 500 + 100)),
        itemStyle: { color: '#f56c6c' }
      },
      {
        name: '媒体数据',
        type: 'bar',
        stack: 'total',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 1000 + 500)),
        itemStyle: { color: '#67c23a' }
      }
    ]
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
      initMileageRankChart()
    } else if (activeTab.value === 'safety') {
      initAlarmTypeChart()
      initAlarmTrendChart()
    } else if (activeTab.value === 'data') {
      initDataReportChart()
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

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;

    .stat-card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

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
          padding: 20px 0;
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

@media (max-width: 1200px) {
  .dashboard-content {
    .stats-cards {
      grid-template-columns: repeat(2, 1fr);
    }

    .charts-section .chart-row {
      grid-template-columns: 1fr;
    }
  }
}
</style>

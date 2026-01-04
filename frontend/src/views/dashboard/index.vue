<template>
  <div class="dashboard-page">
    <!-- 左侧车辆树 (复用Monitor的结构) -->
    <div class="dashboard-sidebar">
      <!-- 筛选 -->
      <div class="sidebar-filters">
        <el-select v-model="filters.type" placeholder="All Types" size="small">
          <el-option label="All Types" value="" />
        </el-select>
        <el-select v-model="filters.status" placeholder="All States" size="small">
          <el-option label="All States" value="" />
        </el-select>
        <el-select v-model="filters.device" placeholder="All Device" size="small">
          <el-option label="All Device" value="" />
        </el-select>
      </div>
      <!-- 搜索 -->
      <div class="sidebar-search">
        <el-input v-model="searchKeyword" placeholder="Search" prefix-icon="Search" size="small" />
        <el-button size="small" type="primary" :icon="Setting" />
      </div>
      <!-- 树形列表 -->
      <div class="sidebar-tree">
        <el-tree
          :data="vehicleTreeData"
          :props="{ children: 'children', label: 'label' }"
          highlight-current
        />
      </div>
    </div>

    <!-- 右侧仪表盘内容 -->
    <div class="dashboard-content">
      <!-- 顶部Tab切换 -->
      <div class="dashboard-tabs">
        <el-tabs v-model="activeTab" type="card">
          <el-tab-pane label="Daily Dashboard" name="daily" />
          <el-tab-pane label="AI Dashboard" name="ai" />
          <el-tab-pane label="Data Dashboard" name="data" />
        </el-tabs>
        <el-button size="small" :icon="Setting" class="setting-btn" />
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon blue">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">Total Enterprises</div>
            <div class="stat-value">{{ stats.totalEnterprises }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">Total Drivers</div>
            <div class="stat-value">{{ stats.totalDrivers }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cyan">
            <el-icon><Van /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">Total Vehicles</div>
            <div class="stat-value">{{ stats.totalVehicles }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">Today Online</div>
            <div class="stat-value">{{ stats.todayOnline }}</div>
          </div>
        </div>
      </div>

      <!-- 平均里程 -->
      <div class="mileage-card">
        <div class="mileage-icon">
          <el-icon><Odometer /></el-icon>
        </div>
        <div class="mileage-info">
          <div class="mileage-label">Average Mileage(KM /day)</div>
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
              <span class="chart-title">Vehicle Operation</span>
              <div class="chart-legend">
                <span class="legend-item"><span class="dot green"></span>Normal</span>
                <span class="legend-item"><span class="dot yellow"></span>Repair</span>
                <span class="legend-item"><span class="dot red"></span>Disable</span>
                <span class="legend-item"><span class="dot gray"></span>Service Expired</span>
              </div>
            </div>
            <div class="chart-body">
              <div ref="operationChartRef" class="chart-container"></div>
            </div>
          </div>

          <!-- 车辆在线趋势 -->
          <div class="chart-card">
            <div class="chart-header">
              <span class="chart-title">Vehicle Online Trend</span>
            </div>
            <div class="chart-body">
              <div ref="onlineTrendChartRef" class="chart-container"></div>
            </div>
          </div>
        </div>

        <div class="chart-row">
          <!-- 车辆报警排名 -->
          <div class="chart-card">
            <div class="chart-header">
              <span class="chart-title">Vehicle Alarm Rank</span>
              <div class="rank-toggle">
                <el-button type="primary" size="small">Best</el-button>
                <el-button size="small">Worst</el-button>
              </div>
            </div>
            <div class="chart-body">
              <div ref="alarmRankChartRef" class="chart-container"></div>
            </div>
          </div>

          <!-- 里程排名 -->
          <div class="chart-card">
            <div class="chart-header">
              <span class="chart-title">Mileage Rank(KM)</span>
              <el-button type="primary" size="small" :icon="TrendCharts" circle />
            </div>
            <div class="chart-body">
              <div ref="mileageRankChartRef" class="chart-container"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import {
  Setting,
  OfficeBuilding,
  User,
  Van,
  Connection,
  Odometer,
  Clock,
  TrendCharts
} from '@element-plus/icons-vue'

// 状态
const activeTab = ref('daily')
const searchKeyword = ref('')
const filters = ref({
  type: '',
  status: '',
  device: ''
})

// 统计数据
const stats = ref({
  totalEnterprises: 30,
  totalDrivers: 0,
  totalVehicles: 4558,
  todayOnline: 355,
  averageMileage: 10.33
})

// 车辆树数据
const vehicleTreeData = ref([
  {
    label: 'Monitoring Center (151/4558)',
    children: [
      { label: '808 (0/5)' },
      { label: '金旅 (144/4187)' },
      { label: '本安测试部 (0/89)' }
    ]
  }
])

// 图表引用
const operationChartRef = ref<HTMLElement>()
const onlineTrendChartRef = ref<HTMLElement>()
const alarmRankChartRef = ref<HTMLElement>()
const mileageRankChartRef = ref<HTMLElement>()

let charts: echarts.ECharts[] = []

// 初始化运营状态图表
const initOperationChart = () => {
  if (!operationChartRef.value) return

  const chart = echarts.init(operationChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: [
        { value: 735, name: 'Normal', itemStyle: { color: '#52c41a' } },
        { value: 310, name: 'Repair', itemStyle: { color: '#faad14' } },
        { value: 234, name: 'Disable', itemStyle: { color: '#ff4d4f' } },
        { value: 135, name: 'Expired', itemStyle: { color: '#d9d9d9' } }
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
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(64, 158, 255, 0.2)' },
      lineStyle: { color: '#409eff' },
      data: [150, 120, 280, 350, 400, 320, 180]
    }]
  })
}

// 初始化报警排名图表
const initAlarmRankChart = () => {
  if (!alarmRankChartRef.value) return

  const chart = echarts.init(alarmRankChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: ['沪A12345', '沪B67890', '京A11111', '粤A22222', '苏B33333']
    },
    series: [{
      type: 'bar',
      data: [120, 98, 85, 72, 65],
      itemStyle: { color: '#409eff' }
    }]
  })
}

// 初始化里程排名图表
const initMileageRankChart = () => {
  if (!mileageRankChartRef.value) return

  const chart = echarts.init(mileageRankChartRef.value)
  charts.push(chart)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: ['沪C44444', '沪D55555', '京E66666', '粤F77777', '苏G88888']
    },
    series: [{
      type: 'bar',
      data: [2500, 2200, 1800, 1500, 1200],
      itemStyle: { color: '#67c23a' }
    }]
  })
}

// 响应式处理
const handleResize = () => {
  charts.forEach(chart => chart.resize())
}

onMounted(() => {
  initOperationChart()
  initOnlineTrendChart()
  initAlarmRankChart()
  initMileageRankChart()

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
  }
}

.dashboard-content {
  flex: 1;
  overflow: auto;
  padding: 16px;

  .dashboard-tabs {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    :deep(.el-tabs) {
      flex: 1;

      .el-tabs__header {
        margin: 0;
      }
    }

    .setting-btn {
      margin-left: 12px;
    }
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
    }

    .chart-card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      .chart-header {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .chart-title {
          font-size: 14px;
          font-weight: 500;
        }

        .chart-legend {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #666;

          .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;

            .dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;

              &.green { background: #52c41a; }
              &.yellow { background: #faad14; }
              &.red { background: #ff4d4f; }
              &.gray { background: #d9d9d9; }
            }
          }
        }

        .rank-toggle {
          display: flex;
          gap: 8px;
        }
      }

      .chart-body {
        padding: 16px;

        .chart-container {
          width: 100%;
          height: 200px;
        }
      }
    }
  }
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

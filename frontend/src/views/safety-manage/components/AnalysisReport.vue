<template>
  <div class="analysis-report">
    <!-- 查询条件 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="企业">
          <el-tree-select
            v-model="searchForm.companyId"
            :data="companyTree"
            placeholder="请选择企业"
            check-strictly
            filterable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="统计维度">
          <el-select v-model="searchForm.dimension" placeholder="请选择" style="width: 120px">
            <el-option label="企业" value="company" />
            <el-option label="车辆" value="vehicle" />
            <el-option label="司机" value="driver" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计周期">
          <el-select v-model="searchForm.period" placeholder="请选择" style="width: 120px">
            <el-option label="日" value="day" />
            <el-option label="周" value="week" />
            <el-option label="月" value="month" />
            <el-option label="年" value="year" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value total">{{ stats.total }}</div>
          <div class="stat-label">报警总数</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value fatigue">{{ stats.fatigue }}</div>
          <div class="stat-label">疲劳驾驶</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value phone">{{ stats.phone }}</div>
          <div class="stat-label">接打电话</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value distraction">{{ stats.distraction }}</div>
          <div class="stat-label">分神驾驶</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value collision">{{ stats.collision }}</div>
          <div class="stat-label">前向碰撞</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value lane">{{ stats.lane }}</div>
          <div class="stat-label">车道偏离</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>报警类型分布</span>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>报警趋势分析</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>报警时段分布</span>
          </template>
          <div ref="barChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>TOP10报警排名</span>
          </template>
          <div ref="rankChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>报警统计明细</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe show-summary>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="fatigueCount" label="疲劳驾驶" width="90" align="center" />
        <el-table-column prop="phoneCount" label="接打电话" width="90" align="center" />
        <el-table-column prop="smokingCount" label="抽烟" width="80" align="center" />
        <el-table-column prop="distractionCount" label="分神驾驶" width="90" align="center" />
        <el-table-column prop="collisionCount" label="前向碰撞" width="90" align="center" />
        <el-table-column prop="laneCount" label="车道偏离" width="90" align="center" />
        <el-table-column prop="closeCount" label="车距过近" width="90" align="center" />
        <el-table-column prop="totalCount" label="报警总数" width="90" align="center" />
        <el-table-column prop="handleRate" label="处理率" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'low-rate': parseFloat(row.handleRate) < 80 }">{{ row.handleRate }}%</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const searchForm = reactive({
  companyId: '',
  dimension: 'company',
  period: 'day',
  dateRange: [] as string[]
})

const companyTree = ref([
  {
    value: '1',
    label: '总公司',
    children: [
      { value: '1-1', label: '分公司A' },
      { value: '1-2', label: '分公司B' }
    ]
  }
])

const stats = reactive({
  total: 1256,
  fatigue: 328,
  phone: 245,
  distraction: 198,
  collision: 156,
  lane: 189
})

const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 图表
const pieChartRef = ref<HTMLElement>()
const lineChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const rankChartRef = ref<HTMLElement>()
let pieChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let rankChart: echarts.ECharts | null = null

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    dimension: 'company',
    period: 'day',
    dateRange: []
  })
  handleSearch()
}

const fetchData = async () => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    tableData.value = [
      {
        name: '北京运输公司',
        fatigueCount: 35,
        phoneCount: 28,
        smokingCount: 15,
        distractionCount: 22,
        collisionCount: 18,
        laneCount: 20,
        closeCount: 12,
        totalCount: 150,
        handleRate: '92.5'
      },
      {
        name: '北京货运公司',
        fatigueCount: 28,
        phoneCount: 22,
        smokingCount: 10,
        distractionCount: 18,
        collisionCount: 12,
        laneCount: 15,
        closeCount: 8,
        totalCount: 113,
        handleRate: '78.3'
      },
      {
        name: '北京物流公司',
        fatigueCount: 42,
        phoneCount: 35,
        smokingCount: 18,
        distractionCount: 25,
        collisionCount: 20,
        laneCount: 22,
        closeCount: 15,
        totalCount: 177,
        handleRate: '88.6'
      }
    ]
    pagination.total = 50
    updateCharts()
  } finally {
    loading.value = false
  }
}

const updateCharts = () => {
  // 饼图
  if (pieChart) {
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 328, name: '疲劳驾驶' },
          { value: 245, name: '接打电话' },
          { value: 198, name: '分神驾驶' },
          { value: 156, name: '前向碰撞' },
          { value: 189, name: '车道偏离' },
          { value: 140, name: '其他' }
        ]
      }]
    })
  }

  // 折线图
  if (lineChart) {
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['疲劳驾驶', '接打电话', '分神驾驶'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['1/14', '1/15', '1/16', '1/17', '1/18', '1/19', '1/20']
      },
      yAxis: { type: 'value' },
      series: [
        { name: '疲劳驾驶', type: 'line', data: [45, 52, 38, 65, 48, 35, 55] },
        { name: '接打电话', type: 'line', data: [32, 38, 28, 42, 35, 25, 40] },
        { name: '分神驾驶', type: 'line', data: [28, 32, 22, 38, 30, 20, 35] }
      ]
    })
  }

  // 柱状图 - 时段分布
  if (barChart) {
    barChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24']
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [25, 18, 32, 85, 120, 95, 78, 105, 130, 88, 45, 35],
        itemStyle: { color: '#409eff' }
      }]
    })
  }

  // 排名图
  if (rankChart) {
    rankChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: ['物流公司E', '货运公司D', '运输公司C', '物流公司B', '运输公司A'].reverse()
      },
      series: [{
        type: 'bar',
        data: [85, 95, 113, 150, 177].reverse(),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f56c6c', '#e6a23c', '#67c23a', '#409eff', '#909399']
            return colors[params.dataIndex]
          }
        }
      }]
    })
  }
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = () => {
  fetchData()
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

const initCharts = () => {
  if (pieChartRef.value) pieChart = echarts.init(pieChartRef.value)
  if (lineChartRef.value) lineChart = echarts.init(lineChartRef.value)
  if (barChartRef.value) barChart = echarts.init(barChartRef.value)
  if (rankChartRef.value) rankChart = echarts.init(rankChartRef.value)
}

const handleResize = () => {
  pieChart?.resize()
  lineChart?.resize()
  barChart?.resize()
  rankChart?.resize()
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  lineChart?.dispose()
  barChart?.dispose()
  rankChart?.dispose()
})
</script>

<style lang="scss" scoped>
.analysis-report {
  .search-card {
    margin-bottom: 16px;
  }

  .stat-row {
    margin-bottom: 16px;

    .stat-card {
      text-align: center;
      padding: 16px;

      .stat-value {
        font-size: 28px;
        font-weight: bold;

        &.total { color: #409eff; }
        &.fatigue { color: #f56c6c; }
        &.phone { color: #e6a23c; }
        &.distraction { color: #909399; }
        &.collision { color: #f56c6c; }
        &.lane { color: #e6a23c; }
      }

      .stat-label {
        font-size: 13px;
        color: #666;
        margin-top: 6px;
      }
    }
  }

  .chart-row {
    margin-bottom: 16px;

    .chart-container {
      height: 300px;
    }
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .low-rate {
      color: #f56c6c;
      font-weight: bold;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

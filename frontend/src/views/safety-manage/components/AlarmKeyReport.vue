<template>
  <div class="alarm-key-report">
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
        <el-form-item label="报警类型">
          <el-select v-model="searchForm.alarmType" placeholder="请选择" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="疲劳驾驶" value="fatigue" />
            <el-option label="接打电话" value="phone" />
            <el-option label="抽烟" value="smoking" />
            <el-option label="分神驾驶" value="distraction" />
            <el-option label="前向碰撞" value="forwardCollision" />
            <el-option label="车道偏离" value="laneDeparture" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计周期">
          <el-select v-model="searchForm.period" placeholder="请选择" style="width: 120px">
            <el-option label="日报" value="day" />
            <el-option label="周报" value="week" />
            <el-option label="月报" value="month" />
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

    <!-- 统计图表 -->
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
            <span>报警趋势</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>综合重点报警报表</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe show-summary>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="companyName" label="企业名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="vehicleCount" label="车辆数" width="80" align="center" />
        <el-table-column prop="fatigueCount" label="疲劳驾驶" width="90" align="center" />
        <el-table-column prop="phoneCount" label="接打电话" width="90" align="center" />
        <el-table-column prop="smokingCount" label="抽烟" width="80" align="center" />
        <el-table-column prop="distractionCount" label="分神驾驶" width="90" align="center" />
        <el-table-column prop="collisionCount" label="前向碰撞" width="90" align="center" />
        <el-table-column prop="laneCount" label="车道偏离" width="90" align="center" />
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
  alarmType: '',
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
let pieChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    alarmType: '',
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
        companyName: '北京运输公司',
        vehicleCount: 120,
        fatigueCount: 35,
        phoneCount: 28,
        smokingCount: 15,
        distractionCount: 22,
        collisionCount: 8,
        laneCount: 18,
        totalCount: 126,
        handleRate: '92.5'
      },
      {
        companyName: '北京货运公司',
        vehicleCount: 85,
        fatigueCount: 22,
        phoneCount: 18,
        smokingCount: 12,
        distractionCount: 15,
        collisionCount: 5,
        laneCount: 10,
        totalCount: 82,
        handleRate: '78.3'
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
        radius: '60%',
        data: [
          { value: 57, name: '疲劳驾驶' },
          { value: 46, name: '接打电话' },
          { value: 27, name: '抽烟' },
          { value: 37, name: '分神驾驶' },
          { value: 13, name: '前向碰撞' },
          { value: 28, name: '车道偏离' }
        ]
      }]
    })
  }

  // 折线图
  if (lineChart) {
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['疲劳驾驶', '接打电话', '分神驾驶'] },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      },
      yAxis: { type: 'value' },
      series: [
        { name: '疲劳驾驶', type: 'line', data: [12, 15, 8, 18, 10, 5, 8] },
        { name: '接打电话', type: 'line', data: [8, 10, 6, 12, 8, 4, 5] },
        { name: '分神驾驶', type: 'line', data: [5, 8, 4, 9, 6, 3, 4] }
      ]
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
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
  }
  if (lineChartRef.value) {
    lineChart = echarts.init(lineChartRef.value)
  }
}

const handleResize = () => {
  pieChart?.resize()
  lineChart?.resize()
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
})
</script>

<style lang="scss" scoped>
.alarm-key-report {
  .search-card {
    margin-bottom: 16px;
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

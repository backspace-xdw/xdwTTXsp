<template>
  <div class="risk-profile">
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
        <el-form-item label="风险等级">
          <el-select v-model="searchForm.riskLevel" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="高风险" value="high" />
            <el-option label="中风险" value="medium" />
            <el-option label="低风险" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分范围">
          <el-slider
            v-model="searchForm.scoreRange"
            range
            :min="0"
            :max="100"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="统计周期">
          <el-select v-model="searchForm.period" placeholder="请选择" style="width: 120px">
            <el-option label="近7天" value="7" />
            <el-option label="近30天" value="30" />
            <el-option label="近90天" value="90" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 风险分布统计 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card high">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.high }}</div>
            <div class="stat-label">高风险</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card medium">
          <div class="stat-icon"><el-icon><InfoFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.medium }}</div>
            <div class="stat-label">中风险</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card low">
          <div class="stat-icon"><el-icon><SuccessFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.low }}</div>
            <div class="stat-label">低风险</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card score">
          <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.avgScore }}</div>
            <div class="stat-label">平均评分</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>风险等级分布</span>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>风险评分趋势</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>风险画像列表</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="score" label="安全评分" width="100" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="row.score"
              :color="getScoreColor(row.score)"
              :stroke-width="8"
              :show-text="true"
            />
          </template>
        </el-table-column>
        <el-table-column prop="riskLevel" label="风险等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRiskLevelTag(row.riskLevelCode)">{{ row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarmCount" label="报警次数" width="90" align="center" />
        <el-table-column prop="violationCount" label="违章次数" width="90" align="center" />
        <el-table-column prop="mileage" label="行驶里程(km)" width="110" align="center" />
        <el-table-column prop="alarmRate" label="报警率" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'high-rate': parseFloat(row.alarmRate) > 5 }">{{ row.alarmRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="trend" label="趋势" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.trend === 'up'" class="trend-up"><Top /></el-icon>
            <el-icon v-else-if="row.trend === 'down'" class="trend-down"><Bottom /></el-icon>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="风险画像详情" width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称">{{ currentRow?.name }}</el-descriptions-item>
        <el-descriptions-item label="所属企业">{{ currentRow?.companyName }}</el-descriptions-item>
        <el-descriptions-item label="安全评分">
          <el-progress :percentage="currentRow?.score || 0" :color="getScoreColor(currentRow?.score || 0)" />
        </el-descriptions-item>
        <el-descriptions-item label="风险等级">
          <el-tag :type="getRiskLevelTag(currentRow?.riskLevelCode)">{{ currentRow?.riskLevel }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="报警次数">{{ currentRow?.alarmCount }}</el-descriptions-item>
        <el-descriptions-item label="违章次数">{{ currentRow?.violationCount }}</el-descriptions-item>
        <el-descriptions-item label="行驶里程">{{ currentRow?.mileage }} km</el-descriptions-item>
        <el-descriptions-item label="报警率">{{ currentRow?.alarmRate }}%</el-descriptions-item>
      </el-descriptions>
      <div ref="radarChartRef" class="radar-chart"></div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download, Warning, InfoFilled, SuccessFilled, TrendCharts, Top, Bottom } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const searchForm = reactive({
  companyId: '',
  riskLevel: '',
  scoreRange: [0, 100] as [number, number],
  period: '30'
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
  high: 15,
  medium: 42,
  low: 143,
  avgScore: 78.5
})

const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const detailDialogVisible = ref(false)
const currentRow = ref<any>(null)

// 图表
const pieChartRef = ref<HTMLElement>()
const lineChartRef = ref<HTMLElement>()
const radarChartRef = ref<HTMLElement>()
let pieChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null

const getScoreColor = (score: number) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getRiskLevelTag = (level: string) => {
  const map: Record<string, string> = {
    high: 'danger',
    medium: 'warning',
    low: 'success'
  }
  return map[level] || 'info'
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    riskLevel: '',
    scoreRange: [0, 100],
    period: '30'
  })
  handleSearch()
}

const fetchData = async () => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    tableData.value = [
      {
        id: 1,
        name: '张三',
        companyName: '北京运输公司',
        score: 85,
        riskLevelCode: 'low',
        riskLevel: '低风险',
        alarmCount: 12,
        violationCount: 1,
        mileage: 15680,
        alarmRate: '0.8',
        trend: 'down'
      },
      {
        id: 2,
        name: '李四',
        companyName: '北京货运公司',
        score: 62,
        riskLevelCode: 'medium',
        riskLevel: '中风险',
        alarmCount: 45,
        violationCount: 3,
        mileage: 12350,
        alarmRate: '3.6',
        trend: 'up'
      },
      {
        id: 3,
        name: '王五',
        companyName: '北京物流公司',
        score: 45,
        riskLevelCode: 'high',
        riskLevel: '高风险',
        alarmCount: 88,
        violationCount: 8,
        mileage: 8920,
        alarmRate: '9.9',
        trend: 'up'
      }
    ]
    pagination.total = 200
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
          { value: 15, name: '高风险', itemStyle: { color: '#f56c6c' } },
          { value: 42, name: '中风险', itemStyle: { color: '#e6a23c' } },
          { value: 143, name: '低风险', itemStyle: { color: '#67c23a' } }
        ]
      }]
    })
  }

  // 折线图
  if (lineChart) {
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['平均评分', '高风险数'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['1周前', '6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天']
      },
      yAxis: [
        { type: 'value', name: '评分', min: 0, max: 100 },
        { type: 'value', name: '数量', min: 0 }
      ],
      series: [
        { name: '平均评分', type: 'line', data: [75, 76, 78, 77, 79, 78, 79, 78.5] },
        { name: '高风险数', type: 'bar', yAxisIndex: 1, data: [18, 17, 16, 17, 15, 16, 15, 15] }
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

const handleView = async (row: any) => {
  currentRow.value = row
  detailDialogVisible.value = true
  await nextTick()

  // 初始化雷达图
  if (radarChartRef.value) {
    if (radarChart) radarChart.dispose()
    radarChart = echarts.init(radarChartRef.value)
    radarChart.setOption({
      tooltip: {},
      radar: {
        indicator: [
          { name: '安全驾驶', max: 100 },
          { name: '违章情况', max: 100 },
          { name: '行驶效率', max: 100 },
          { name: '设备状态', max: 100 },
          { name: '响应速度', max: 100 }
        ]
      },
      series: [{
        type: 'radar',
        data: [{ value: [row.score, 100 - row.violationCount * 10, 85, 90, 75], name: row.name }]
      }]
    })
  }
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

const initCharts = () => {
  if (pieChartRef.value) pieChart = echarts.init(pieChartRef.value)
  if (lineChartRef.value) lineChart = echarts.init(lineChartRef.value)
}

const handleResize = () => {
  pieChart?.resize()
  lineChart?.resize()
  radarChart?.resize()
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
  radarChart?.dispose()
})
</script>

<style lang="scss" scoped>
.risk-profile {
  .search-card {
    margin-bottom: 16px;
  }

  .stat-row {
    margin-bottom: 16px;

    .stat-card {
      display: flex;
      align-items: center;
      padding: 20px;

      .stat-icon {
        font-size: 40px;
        margin-right: 16px;
      }

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: bold;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-top: 4px;
        }
      }

      &.high {
        .stat-icon { color: #f56c6c; }
        .stat-value { color: #f56c6c; }
      }

      &.medium {
        .stat-icon { color: #e6a23c; }
        .stat-value { color: #e6a23c; }
      }

      &.low {
        .stat-icon { color: #67c23a; }
        .stat-value { color: #67c23a; }
      }

      &.score {
        .stat-icon { color: #409eff; }
        .stat-value { color: #409eff; }
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

    .high-rate {
      color: #f56c6c;
      font-weight: bold;
    }

    .trend-up {
      color: #f56c6c;
      font-size: 18px;
    }

    .trend-down {
      color: #67c23a;
      font-size: 18px;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .radar-chart {
    height: 350px;
    margin-top: 16px;
  }
}
</style>

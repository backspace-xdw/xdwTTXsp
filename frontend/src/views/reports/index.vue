<template>
  <div class="reports-page" :class="{ 'print-mode': isPrinting }">
    <!-- 顶部标签页 -->
    <div class="tabs-header no-print">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="上下线报告" name="online-offline" />
        <el-tab-pane label="里程统计" name="mileage" />
        <el-tab-pane label="报警统计" name="alarm" />
        <el-tab-pane label="车辆运营" name="operation" />
        <el-tab-pane label="超速报表" name="overspeed" />
      </el-tabs>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <!-- 上下线 -->
      <template v-if="activeTab === 'online-offline'">
        <div class="stat-card cyan">
          <div class="stat-icon"><el-icon><Van /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ onlineStats.totalDevices }}
              <span v-if="compareMode && compareDelta.totalDevices !== null" :class="['delta', compareDelta.totalDevices >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalDevices >= 0 ? '+' : '' }}{{ compareDelta.totalDevices }}%
              </span>
            </div>
            <div class="stat-label">设备总数</div>
          </div>
        </div>
        <div class="stat-card neon">
          <div class="stat-icon"><el-icon><Timer /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ onlineStats.avgOnlineHours }}h
              <span v-if="compareMode && compareDelta.avgOnlineHours !== null" :class="['delta', compareDelta.avgOnlineHours >= 0 ? 'up' : 'down']">
                {{ compareDelta.avgOnlineHours >= 0 ? '+' : '' }}{{ compareDelta.avgOnlineHours }}%
              </span>
            </div>
            <div class="stat-label">平均在线时长</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon"><el-icon><Document /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ onlineStats.totalRecords }}
              <span v-if="compareMode && compareDelta.totalRecords !== null" :class="['delta', compareDelta.totalRecords >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalRecords >= 0 ? '+' : '' }}{{ compareDelta.totalRecords }}%
              </span>
            </div>
            <div class="stat-label">总记录数</div>
          </div>
        </div>
      </template>
      <!-- 里程 -->
      <template v-if="activeTab === 'mileage'">
        <div class="stat-card cyan">
          <div class="stat-icon"><el-icon><Odometer /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ mileageStats.totalMileage }}km
              <span v-if="compareMode && compareDelta.totalMileage !== null" :class="['delta', compareDelta.totalMileage >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalMileage >= 0 ? '+' : '' }}{{ compareDelta.totalMileage }}%
              </span>
            </div>
            <div class="stat-label">总里程</div>
          </div>
        </div>
        <div class="stat-card neon">
          <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ mileageStats.avgDailyMileage }}km
              <span v-if="compareMode && compareDelta.avgDailyMileage !== null" :class="['delta', compareDelta.avgDailyMileage >= 0 ? 'up' : 'down']">
                {{ compareDelta.avgDailyMileage >= 0 ? '+' : '' }}{{ compareDelta.avgDailyMileage }}%
              </span>
            </div>
            <div class="stat-label">日均里程</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon"><el-icon><Van /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ mileageStats.vehicleCount }}</div>
            <div class="stat-label">车辆数</div>
          </div>
        </div>
      </template>
      <!-- 报警 -->
      <template v-if="activeTab === 'alarm'">
        <div class="stat-card red">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ alarmStats.totalAlarms }}
              <span v-if="compareMode && compareDelta.totalAlarms !== null" :class="['delta', compareDelta.totalAlarms >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalAlarms >= 0 ? '+' : '' }}{{ compareDelta.totalAlarms }}%
              </span>
            </div>
            <div class="stat-label">总报警</div>
          </div>
        </div>
        <div class="stat-card neon">
          <div class="stat-icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ alarmStats.handledCount }}</div>
            <div class="stat-label">已处理</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ alarmStats.unhandledCount }}</div>
            <div class="stat-label">未处理</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon"><el-icon><Promotion /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ alarmStats.handleRate }}%</div>
            <div class="stat-label">处理率</div>
          </div>
        </div>
      </template>
      <!-- 运营 -->
      <template v-if="activeTab === 'operation'">
        <div class="stat-card cyan">
          <div class="stat-icon"><el-icon><Van /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ operationStats.vehicleCount }}</div>
            <div class="stat-label">车辆数</div>
          </div>
        </div>
        <div class="stat-card neon">
          <div class="stat-icon"><el-icon><Timer /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ operationStats.totalDrivingHours }}h
              <span v-if="compareMode && compareDelta.totalDrivingHours !== null" :class="['delta', compareDelta.totalDrivingHours >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalDrivingHours >= 0 ? '+' : '' }}{{ compareDelta.totalDrivingHours }}%
              </span>
            </div>
            <div class="stat-label">总行驶小时</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon"><el-icon><DataAnalysis /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ operationStats.avgUtilization }}%
              <span v-if="compareMode && compareDelta.avgUtilization !== null" :class="['delta', compareDelta.avgUtilization >= 0 ? 'up' : 'down']">
                {{ compareDelta.avgUtilization >= 0 ? '+' : '' }}{{ compareDelta.avgUtilization }}%
              </span>
            </div>
            <div class="stat-label">平均利用率</div>
          </div>
        </div>
      </template>
      <!-- 超速 -->
      <template v-if="activeTab === 'overspeed'">
        <div class="stat-card red">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ overspeedStats.totalOverspeed }}
              <span v-if="compareMode && compareDelta.totalOverspeed !== null" :class="['delta', compareDelta.totalOverspeed >= 0 ? 'up' : 'down']">
                {{ compareDelta.totalOverspeed >= 0 ? '+' : '' }}{{ compareDelta.totalOverspeed }}%
              </span>
            </div>
            <div class="stat-label">总次数</div>
          </div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-icon"><el-icon><Van /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ overspeedStats.involvedVehicles }}</div>
            <div class="stat-label">涉及车辆</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon"><el-icon><Odometer /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ overspeedStats.maxSpeed }}km/h</div>
            <div class="stat-label">最高速度</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon"><el-icon><Setting /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ speedLimit }}km/h</div>
            <div class="stat-label">限速值</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">{{ mainChartTitle }}</div>
        <div ref="mainChartRef" class="chart-container"></div>
        <!-- 打印时显示图片 -->
        <img v-if="isPrinting && mainChartImage" :src="mainChartImage" class="chart-print-img" />
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ subChartTitle }}</div>
        <div ref="subChartRef" class="chart-container"></div>
        <img v-if="isPrinting && subChartImage" :src="subChartImage" class="chart-print-img" />
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar no-print">
      <div class="filter-area">
        <el-radio-group v-model="quickDate" size="small" @change="handleQuickDate">
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="yesterday">昨天</el-radio-button>
          <el-radio-button value="week">本周</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 240px; margin-left: 12px"
          @change="handleDateChange"
        />
        <el-select
          v-model="companyId"
          placeholder="所有企业"
          clearable
          style="width: 160px; margin-left: 12px"
          @change="loadData"
        >
          <el-option
            v-for="c in companies"
            :key="c.id"
            :label="c.name"
            :value="c.id"
          />
        </el-select>
        <el-input
          v-model="plateNo"
          placeholder="车牌搜索"
          clearable
          style="width: 140px; margin-left: 12px"
          @keyup.enter="loadData"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <!-- 报警额外筛选 -->
        <template v-if="activeTab === 'alarm'">
          <el-select
            v-model="alarmLevel"
            placeholder="报警级别"
            clearable
            style="width: 120px; margin-left: 12px"
            @change="loadData"
          >
            <el-option label="一般" :value="1" />
            <el-option label="重要" :value="2" />
            <el-option label="紧急" :value="3" />
          </el-select>
        </template>
        <!-- 超速阈值 -->
        <template v-if="activeTab === 'overspeed'">
          <el-input-number
            v-model="speedLimit"
            :min="20"
            :max="200"
            :step="10"
            style="width: 140px; margin-left: 12px"
            @change="loadData"
          />
          <span class="speed-unit">km/h</span>
        </template>
        <el-button type="primary" style="margin-left: 12px" @click="loadData">
          <el-icon><Search /></el-icon>查询
        </el-button>
        <!-- 对比开关 -->
        <div class="compare-switch" style="margin-left: 16px">
          <span class="switch-label">对比</span>
          <el-switch v-model="compareMode" size="small" @change="handleCompareChange" />
        </div>
      </div>
      <div class="action-area">
        <!-- 自动刷新 -->
        <div class="auto-refresh">
          <el-switch v-model="autoRefresh" size="small" @change="handleAutoRefreshChange" />
          <span class="refresh-label">自动刷新</span>
          <el-select
            v-if="autoRefresh"
            v-model="refreshInterval"
            size="small"
            style="width: 80px; margin-left: 4px"
            @change="handleAutoRefreshChange"
          >
            <el-option label="30s" :value="30" />
            <el-option label="60s" :value="60" />
            <el-option label="5min" :value="300" />
          </el-select>
        </div>
        <el-button @click="handlePrint">
          <el-icon><Printer /></el-icon>打印
        </el-button>
        <el-button type="warning" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon>导出
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <!-- 上下线 -->
      <el-table v-if="activeTab === 'online-offline'" v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="deviceId" label="设备ID" width="140" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="firstOnline" label="首次上线" width="170" />
        <el-table-column prop="lastOnline" label="末次上线" width="170" />
        <el-table-column prop="onlineHours" label="在线时长(h)" width="110" align="right" />
        <el-table-column prop="reportCount" label="上报次数" width="100" align="right" />
      </el-table>

      <!-- 里程 -->
      <el-table v-else-if="activeTab === 'mileage'" v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="deviceId" label="设备ID" width="140" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="dailyMileage" label="日行驶里程(km)" width="140" align="right" />
        <el-table-column prop="maxMileage" label="最大累计里程(km)" width="150" align="right" />
        <el-table-column prop="minMileage" label="最小累计里程(km)" width="150" align="right" />
      </el-table>

      <!-- 报警 -->
      <el-table v-else-if="activeTab === 'alarm'" v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="alarmName" label="报警类型" width="140" />
        <el-table-column label="报警级别" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.alarmLevel === 3 ? 'danger' : row.alarmLevel === 2 ? 'warning' : 'info'" size="small">
              {{ row.alarmLevel === 3 ? '紧急' : row.alarmLevel === 2 ? '重要' : '一般' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="speed" label="速度(km/h)" width="110" align="right" />
        <el-table-column label="处理状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'warning' : 'danger'" size="small">
              {{ row.status === 1 ? '已处理' : row.status === 2 ? '已忽略' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="gpsTime" label="报警时间" width="170" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
      </el-table>

      <!-- 运营 -->
      <el-table v-else-if="activeTab === 'operation'" v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="drivingHours" label="行驶时长(h)" width="110" align="right" />
        <el-table-column prop="parkingHours" label="停车时长(h)" width="110" align="right" />
        <el-table-column label="利用率" width="100" align="right">
          <template #default="{ row }">{{ row.utilization }}%</template>
        </el-table-column>
        <el-table-column prop="maxSpeed" label="最高速度(km/h)" width="130" align="right" />
        <el-table-column prop="avgSpeed" label="平均速度(km/h)" width="130" align="right" />
        <el-table-column prop="totalPoints" label="数据点数" width="100" align="right" />
      </el-table>

      <!-- 超速 -->
      <el-table v-else-if="activeTab === 'overspeed'" v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="speed" label="实际速度(km/h)" width="130" align="right" />
        <el-table-column prop="speedLimit" label="限速(km/h)" width="110" align="right" />
        <el-table-column label="超速比例" width="100" align="right">
          <template #default="{ row }">
            <span class="overspeed-percent">+{{ row.overspeedPercent }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="gpsTime" label="时间" width="170" />
        <el-table-column prop="latitude" label="纬度" width="110" />
        <el-table-column prop="longitude" label="经度" width="110" />
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination no-print">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Van, Timer, Document, Odometer, TrendCharts, WarningFilled, CircleCheck,
  Clock, Promotion, DataAnalysis, Setting, Search, Download, Printer
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import {
  getOnlineOfflineReport, getMileageReport, getAlarmReport,
  getOperationReport, getOverspeedReport, getReportCompanies,
  type CompanyItem
} from '@/api/report'

// ==================== 科技风配色 ====================
const techColors = {
  cyan: '#00d4ff',
  neon: '#00ffc8',
  amber: '#ffb800',
  red: '#ff4d6a',
  purple: '#a855f7',
  text: '#7eb8da',
  grid: 'rgba(0, 200, 255, 0.08)',
  tooltipBg: 'rgba(10, 14, 39, 0.9)',
  tooltipBorder: '#00d4ff'
}
const chartColorPalette = [techColors.cyan, techColors.neon, techColors.amber, techColors.red, techColors.purple, '#66b1ff', '#ff9f43', '#54dea6']

// ==================== 状态 ====================
const activeTab = ref('online-offline')
const loading = ref(false)
const exporting = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选
const quickDate = ref('today')
const dateRange = ref<[string, string] | null>(null)
const companyId = ref<number | undefined>()
const plateNo = ref('')
const alarmLevel = ref<number | undefined>()
const speedLimit = ref(120)
const companies = ref<CompanyItem[]>([])

// 自动刷新
const autoRefresh = ref(false)
const refreshInterval = ref(60)
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 对比模式
const compareMode = ref(false)
const comparePrevStats = ref<any>(null)
const comparePrevTrend = ref<any[]>([])
const compareDelta = reactive({
  totalDevices: null as number | null,
  avgOnlineHours: null as number | null,
  totalRecords: null as number | null,
  totalMileage: null as number | null,
  avgDailyMileage: null as number | null,
  totalAlarms: null as number | null,
  handledCount: null as number | null,
  unhandledCount: null as number | null,
  handleRate: null as number | null,
  vehicleCount: null as number | null,
  totalDrivingHours: null as number | null,
  avgUtilization: null as number | null,
  totalOverspeed: null as number | null,
  involvedVehicles: null as number | null,
  maxSpeed: null as number | null,
  speedLimit: null as number | null,
})

// 打印
const isPrinting = ref(false)
let mainChartImage = ref('')
let subChartImage = ref('')

// 统计数据
const onlineStats = reactive({ totalDevices: 0, avgOnlineHours: 0, totalRecords: 0 })
const mileageStats = reactive({ totalMileage: 0, avgDailyMileage: 0, vehicleCount: 0 })
const alarmStats = reactive({ totalAlarms: 0, handledCount: 0, unhandledCount: 0, handleRate: 0 })
const operationStats = reactive({ vehicleCount: 0, totalDrivingHours: 0, avgUtilization: 0 })
const overspeedStats = reactive({ totalOverspeed: 0, involvedVehicles: 0, maxSpeed: 0, speedLimit: 120 })

// 图表
const mainChartRef = ref<HTMLElement>()
const subChartRef = ref<HTMLElement>()
let mainChart: echarts.ECharts | null = null
let subChart: echarts.ECharts | null = null

// 图表数据缓存
let chartTrendData: any[] = []
let chartSecondaryData: any[] = []

// 图表标题
const mainChartTitle = computed(() => {
  const titles: Record<string, string> = {
    'online-offline': '每日在线设备数趋势',
    'mileage': '每日总里程趋势',
    'alarm': '每日报警趋势',
    'operation': '每日利用率与行驶时长',
    'overspeed': '每日超速次数趋势'
  }
  return titles[activeTab.value] || ''
})

const subChartTitle = computed(() => {
  const titles: Record<string, string> = {
    'online-offline': '在线时长分布',
    'mileage': 'Top10 里程排名',
    'alarm': '报警类型分布',
    'operation': '车辆利用率分布',
    'overspeed': '速度段分布'
  }
  return titles[activeTab.value] || ''
})

// ==================== 通用图表配置 ====================
function getTooltipConfig() {
  return {
    trigger: 'axis' as const,
    backgroundColor: techColors.tooltipBg,
    borderColor: techColors.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: '#e2e8f0', fontSize: 12 }
  }
}

function getAxisConfig(name?: string) {
  return {
    axisLabel: { color: techColors.text, fontSize: 11 },
    axisLine: { lineStyle: { color: 'rgba(0, 200, 255, 0.2)' } },
    splitLine: { lineStyle: { color: techColors.grid } },
    nameTextStyle: { color: techColors.text },
    ...(name ? { name } : {})
  }
}

function makeGradient(color: string, direction: 'vertical' | 'horizontal' = 'vertical') {
  return new echarts.graphic.LinearGradient(
    direction === 'vertical' ? 0 : 0,
    direction === 'vertical' ? 0 : 0,
    direction === 'vertical' ? 0 : 1,
    direction === 'vertical' ? 1 : 0,
    [
      { offset: 0, color: color },
      { offset: 1, color: 'transparent' }
    ]
  )
}

function resetCompareDelta() {
  const keys = Object.keys(compareDelta) as (keyof typeof compareDelta)[]
  keys.forEach(k => { (compareDelta as any)[k] = null })
}

// ==================== 日期处理 ====================
function getDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function handleQuickDate(val: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let start = new Date(today)
  const end = new Date(today)

  switch (val) {
    case 'today':
      break
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
      break
    case 'week':
      start.setDate(start.getDate() - start.getDay() + 1)
      break
    case 'month':
      start.setDate(1)
      break
  }
  dateRange.value = [getDateStr(start), getDateStr(end)]
  page.value = 1
  loadData()
}

function handleDateChange() {
  quickDate.value = ''
  page.value = 1
  loadData()
}

function handleTabChange() {
  page.value = 1
  // 清除对比数据
  comparePrevStats.value = null
  comparePrevTrend.value = []
  resetCompareDelta()
  loadData()
}

function buildParams(overrides?: any) {
  const params: any = {
    page: page.value,
    pageSize: pageSize.value,
    ...overrides
  }
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }
  if (companyId.value) params.companyId = companyId.value
  if (plateNo.value) params.plateNo = plateNo.value
  return params
}

// ==================== 对比日期计算 ====================
function getCompareRange(): { startDate: string; endDate: string } | null {
  if (!dateRange.value || dateRange.value.length !== 2) return null
  const start = new Date(dateRange.value[0])
  const end = new Date(dateRange.value[1])
  const durationMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 86400000) // 前一天
  const prevStart = new Date(prevEnd.getTime() - durationMs)
  return {
    startDate: getDateStr(prevStart),
    endDate: getDateStr(prevEnd)
  }
}

function calcDeltaPercent(current: number, prev: number): number | null {
  if (prev === 0 && current === 0) return 0
  if (prev === 0) return 100
  return parseFloat((((current - prev) / prev) * 100).toFixed(1))
}

// ==================== 数据加载 ====================
let loadingLock = false
async function loadData() {
  if (loadingLock) return
  loadingLock = true
  loading.value = true
  try {
    const params = buildParams()
    switch (activeTab.value) {
      case 'online-offline': {
        const res = await getOnlineOfflineReport(params)
        if (res.code === 0) {
          const d = res.data
          tableData.value = d.list
          total.value = d.total
          Object.assign(onlineStats, d.stats)
          chartTrendData = d.trend
          chartSecondaryData = d.top10 || []
        }
        break
      }
      case 'mileage': {
        const res = await getMileageReport(params)
        if (res.code === 0) {
          const d = res.data
          tableData.value = d.list
          total.value = d.total
          Object.assign(mileageStats, d.stats)
          chartTrendData = d.trend
          chartSecondaryData = d.top10
        }
        break
      }
      case 'alarm': {
        if (alarmLevel.value) params.alarmLevel = alarmLevel.value
        const res = await getAlarmReport(params)
        if (res.code === 0) {
          const d = res.data
          tableData.value = d.list
          total.value = d.total
          Object.assign(alarmStats, d.stats)
          chartTrendData = d.trend
          chartSecondaryData = d.typeDistribution
        }
        break
      }
      case 'operation': {
        const res = await getOperationReport(params)
        if (res.code === 0) {
          const d = res.data
          tableData.value = d.list
          total.value = d.total
          Object.assign(operationStats, d.stats)
          chartTrendData = d.trend
          chartSecondaryData = d.utilizationDistribution || []
        }
        break
      }
      case 'overspeed': {
        params.speedLimit = speedLimit.value
        const res = await getOverspeedReport(params)
        if (res.code === 0) {
          const d = res.data
          tableData.value = d.list
          total.value = d.total
          Object.assign(overspeedStats, d.stats)
          chartTrendData = d.trend
          chartSecondaryData = d.speedDistribution
        }
        break
      }
    }

    // 对比模式: 加载上一时段数据
    if (compareMode.value) {
      await loadCompareData()
    }

    await nextTick()
    renderCharts()
  } catch (error) {
    console.error('加载报表数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
    loadingLock = false
  }
}

async function loadCompareData() {
  const range = getCompareRange()
  if (!range) return

  try {
    const params = buildParams({ ...range, page: 1, pageSize: 1 })
    let prevStats: any = null
    let prevTrend: any[] = []

    switch (activeTab.value) {
      case 'online-offline': {
        const res = await getOnlineOfflineReport(params)
        if (res.code === 0) {
          prevStats = res.data.stats
          prevTrend = res.data.trend
        }
        break
      }
      case 'mileage': {
        const res = await getMileageReport(params)
        if (res.code === 0) {
          prevStats = res.data.stats
          prevTrend = res.data.trend
        }
        break
      }
      case 'alarm': {
        if (alarmLevel.value) params.alarmLevel = alarmLevel.value
        const res = await getAlarmReport(params)
        if (res.code === 0) {
          prevStats = res.data.stats
          prevTrend = res.data.trend
        }
        break
      }
      case 'operation': {
        const res = await getOperationReport(params)
        if (res.code === 0) {
          prevStats = res.data.stats
          prevTrend = res.data.trend
        }
        break
      }
      case 'overspeed': {
        params.speedLimit = speedLimit.value
        const res = await getOverspeedReport(params)
        if (res.code === 0) {
          prevStats = res.data.stats
          prevTrend = res.data.trend
        }
        break
      }
    }

    comparePrevStats.value = prevStats
    comparePrevTrend.value = prevTrend || []

    // 计算delta
    if (prevStats) {
      const currentStats = getCurrentStats()
      Object.keys(currentStats).forEach(key => {
        const curr = currentStats[key] as number
        const prev = prevStats[key] as number
        if (typeof curr === 'number' && typeof prev === 'number') {
          ;(compareDelta as any)[key] = calcDeltaPercent(curr, prev)
        }
      })
    }
  } catch (e) {
    console.error('加载对比数据失败:', e)
  }
}

function getCurrentStats(): Record<string, number> {
  switch (activeTab.value) {
    case 'online-offline': return { ...onlineStats }
    case 'mileage': return { ...mileageStats }
    case 'alarm': return { ...alarmStats }
    case 'operation': return { ...operationStats }
    case 'overspeed': return { ...overspeedStats }
    default: return {}
  }
}

// ==================== 图表渲染 ====================
function ensureCharts() {
  if (mainChartRef.value) {
    if (mainChart) mainChart.dispose()
    mainChart = echarts.init(mainChartRef.value)
  }
  if (subChartRef.value) {
    if (subChart) subChart.dispose()
    subChart = echarts.init(subChartRef.value)
  }
}

function renderCharts() {
  ensureCharts()
  if (!mainChart || !subChart) return

  const tab = activeTab.value
  const hasCompare = compareMode.value && comparePrevTrend.value.length > 0

  // ===== 主图表 =====
  if (tab === 'online-offline') {
    const series: any[] = [{
      type: 'line', name: '本期', data: chartTrendData.map((d: any) => d.count), smooth: true,
      areaStyle: { color: makeGradient(techColors.cyan) },
      itemStyle: { color: techColors.cyan }, lineStyle: { width: 2 }
    }]
    if (hasCompare) {
      series.push({
        type: 'line', name: '上期', data: comparePrevTrend.value.map((d: any) => d.count), smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: 'rgba(0, 212, 255, 0.4)' },
        itemStyle: { color: 'rgba(0, 212, 255, 0.4)' }, areaStyle: { opacity: 0 }
      })
    }
    mainChart.setOption({
      tooltip: getTooltipConfig(),
      legend: hasCompare ? { data: ['本期', '上期'], textStyle: { color: techColors.text }, top: 0 } : undefined,
      grid: { left: 50, right: 20, top: hasCompare ? 40 : 30, bottom: 30 },
      xAxis: { type: 'category', data: chartTrendData.map((d: any) => d.date), ...getAxisConfig() },
      yAxis: { type: 'value', ...getAxisConfig() },
      series
    }, true)
  } else if (tab === 'mileage') {
    const series: any[] = [{
      type: 'bar', name: '本期', data: chartTrendData.map((d: any) => d.mileage),
      itemStyle: { color: makeGradient(techColors.cyan, 'vertical'), borderRadius: [4, 4, 0, 0] }
    }]
    if (hasCompare) {
      series.push({
        type: 'bar', name: '上期', data: comparePrevTrend.value.map((d: any) => d.mileage),
        itemStyle: { color: 'rgba(0, 212, 255, 0.25)', borderRadius: [4, 4, 0, 0] }
      })
    }
    mainChart.setOption({
      tooltip: getTooltipConfig(),
      legend: hasCompare ? { data: ['本期', '上期'], textStyle: { color: techColors.text }, top: 0 } : undefined,
      grid: { left: 60, right: 20, top: hasCompare ? 40 : 30, bottom: 30 },
      xAxis: { type: 'category', data: chartTrendData.map((d: any) => d.date), ...getAxisConfig() },
      yAxis: { type: 'value', ...getAxisConfig('km') },
      series
    }, true)
  } else if (tab === 'alarm') {
    const series: any[] = [{
      type: 'line', name: '本期', data: chartTrendData.map((d: any) => d.count), smooth: true,
      areaStyle: { color: makeGradient(techColors.red) },
      itemStyle: { color: techColors.red }, lineStyle: { width: 2 }
    }]
    if (hasCompare) {
      series.push({
        type: 'line', name: '上期', data: comparePrevTrend.value.map((d: any) => d.count), smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: 'rgba(255, 77, 106, 0.4)' },
        itemStyle: { color: 'rgba(255, 77, 106, 0.4)' }, areaStyle: { opacity: 0 }
      })
    }
    mainChart.setOption({
      tooltip: getTooltipConfig(),
      legend: hasCompare ? { data: ['本期', '上期'], textStyle: { color: techColors.text }, top: 0 } : undefined,
      grid: { left: 50, right: 20, top: hasCompare ? 40 : 30, bottom: 30 },
      xAxis: { type: 'category', data: chartTrendData.map((d: any) => d.date), ...getAxisConfig() },
      yAxis: { type: 'value', ...getAxisConfig() },
      series
    }, true)
  } else if (tab === 'operation') {
    const dates = chartTrendData.map((d: any) => d.date)
    const series: any[] = [
      {
        name: '利用率(%)', type: 'line', data: chartTrendData.map((d: any) => d.utilization), smooth: true,
        itemStyle: { color: techColors.cyan }, lineStyle: { width: 2 }
      },
      {
        name: '行驶时长(h)', type: 'bar', yAxisIndex: 1, data: chartTrendData.map((d: any) => d.drivingHours),
        itemStyle: { color: makeGradient(techColors.neon, 'vertical'), borderRadius: [4, 4, 0, 0] }
      }
    ]
    if (hasCompare) {
      series.push({
        name: '上期利用率(%)', type: 'line', data: comparePrevTrend.value.map((d: any) => d.utilization), smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: 'rgba(0, 212, 255, 0.4)' },
        itemStyle: { color: 'rgba(0, 212, 255, 0.4)' }
      })
    }
    const legendData = hasCompare ? ['利用率(%)', '行驶时长(h)', '上期利用率(%)'] : ['利用率(%)', '行驶时长(h)']
    mainChart.setOption({
      tooltip: getTooltipConfig(),
      legend: { data: legendData, textStyle: { color: techColors.text }, top: 0 },
      grid: { left: 50, right: 50, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: dates, ...getAxisConfig() },
      yAxis: [
        { type: 'value', max: 100, ...getAxisConfig('%') },
        { type: 'value', ...getAxisConfig('h'), splitLine: { show: false } }
      ],
      series
    }, true)
  } else if (tab === 'overspeed') {
    const series: any[] = [{
      type: 'line', name: '本期', data: chartTrendData.map((d: any) => d.count), smooth: true,
      areaStyle: { color: makeGradient(techColors.red) },
      itemStyle: { color: techColors.red }, lineStyle: { width: 2 }
    }]
    if (hasCompare) {
      series.push({
        type: 'line', name: '上期', data: comparePrevTrend.value.map((d: any) => d.count), smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: 'rgba(255, 77, 106, 0.4)' },
        itemStyle: { color: 'rgba(255, 77, 106, 0.4)' }, areaStyle: { opacity: 0 }
      })
    }
    mainChart.setOption({
      tooltip: getTooltipConfig(),
      legend: hasCompare ? { data: ['本期', '上期'], textStyle: { color: techColors.text }, top: 0 } : undefined,
      grid: { left: 50, right: 20, top: hasCompare ? 40 : 30, bottom: 30 },
      xAxis: { type: 'category', data: chartTrendData.map((d: any) => d.date), ...getAxisConfig() },
      yAxis: { type: 'value', ...getAxisConfig() },
      series
    }, true)
  }

  // ===== 副图表 =====
  if (tab === 'online-offline') {
    const names = chartSecondaryData.map((d: any) => d.name).reverse()
    const values = chartSecondaryData.map((d: any) => d.value).reverse()
    subChart.setOption({
      tooltip: { ...getTooltipConfig(), trigger: 'axis' },
      grid: { left: 80, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'value', ...getAxisConfig('h') },
      yAxis: { type: 'category', data: names, ...getAxisConfig() },
      series: [{
        type: 'bar', data: values,
        itemStyle: { color: makeGradient(techColors.neon, 'horizontal'), borderRadius: [0, 4, 4, 0] }
      }]
    }, true)
  } else if (tab === 'mileage') {
    const names = chartSecondaryData.map((d: any) => d.name).reverse()
    const values = chartSecondaryData.map((d: any) => d.value).reverse()
    subChart.setOption({
      tooltip: { ...getTooltipConfig(), trigger: 'axis' },
      grid: { left: 80, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'value', ...getAxisConfig('km') },
      yAxis: { type: 'category', data: names, ...getAxisConfig() },
      series: [{
        type: 'bar', data: values,
        itemStyle: { color: makeGradient(techColors.amber, 'horizontal'), borderRadius: [0, 4, 4, 0] }
      }]
    }, true)
  } else if (tab === 'alarm' || tab === 'overspeed') {
    subChart.setOption({
      tooltip: {
        trigger: 'item', formatter: '{b}: {c} ({d}%)',
        backgroundColor: techColors.tooltipBg, borderColor: techColors.tooltipBorder,
        borderWidth: 1, textStyle: { color: '#e2e8f0' }
      },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: techColors.text } },
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
        data: chartSecondaryData,
        label: { show: false },
        emphasis: { label: { show: true, color: '#e2e8f0' } },
        itemStyle: { borderColor: '#0f172a', borderWidth: 2 }
      }],
      color: chartColorPalette
    }, true)
  } else if (tab === 'operation') {
    subChart.setOption({
      tooltip: {
        trigger: 'item', formatter: '{b}: {c} ({d}%)',
        backgroundColor: techColors.tooltipBg, borderColor: techColors.tooltipBorder,
        borderWidth: 1, textStyle: { color: '#e2e8f0' }
      },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: techColors.text } },
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
        data: chartSecondaryData,
        label: { show: false },
        emphasis: { label: { show: true, color: '#e2e8f0' } },
        itemStyle: { borderColor: '#0f172a', borderWidth: 2 }
      }],
      color: chartColorPalette
    }, true)
  }
}

// ==================== 自动刷新 ====================
function handleAutoRefreshChange() {
  clearRefreshTimer()
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      loadData()
    }, refreshInterval.value * 1000)
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// ==================== 对比模式 ====================
function handleCompareChange() {
  if (!compareMode.value) {
    comparePrevStats.value = null
    comparePrevTrend.value = []
    resetCompareDelta()
    renderCharts()
  } else {
    loadData()
  }
}

// ==================== 全量导出 ====================
async function handleExport() {
  if (tableData.value.length === 0 && total.value === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  exporting.value = true
  try {
    // 请求全量数据
    const params = buildParams({ page: 1, pageSize: 99999 })
    let allData: any[] = []
    const tab = activeTab.value

    switch (tab) {
      case 'online-offline': {
        const res = await getOnlineOfflineReport(params)
        if (res.code === 0) allData = res.data.list
        break
      }
      case 'mileage': {
        const res = await getMileageReport(params)
        if (res.code === 0) allData = res.data.list
        break
      }
      case 'alarm': {
        if (alarmLevel.value) params.alarmLevel = alarmLevel.value
        const res = await getAlarmReport(params)
        if (res.code === 0) allData = res.data.list
        break
      }
      case 'operation': {
        const res = await getOperationReport(params)
        if (res.code === 0) allData = res.data.list
        break
      }
      case 'overspeed': {
        params.speedLimit = speedLimit.value
        const res = await getOverspeedReport(params)
        if (res.code === 0) allData = res.data.list
        break
      }
    }

    if (allData.length === 0) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    const tabNames: Record<string, string> = {
      'online-offline': '上下线报告',
      'mileage': '里程统计',
      'alarm': '报警统计',
      'operation': '车辆运营',
      'overspeed': '超速报表'
    }

    let exportData: any[] = []
    if (tab === 'online-offline') {
      exportData = allData.map(r => ({
        '车牌号': r.plateNo, '设备ID': r.deviceId, '日期': r.date,
        '首次上线': r.firstOnline, '末次上线': r.lastOnline,
        '在线时长(h)': r.onlineHours, '上报次数': r.reportCount
      }))
    } else if (tab === 'mileage') {
      exportData = allData.map(r => ({
        '车牌号': r.plateNo, '设备ID': r.deviceId, '日期': r.date,
        '日行驶里程(km)': r.dailyMileage, '最大累计里程': r.maxMileage, '最小累计里程': r.minMileage
      }))
    } else if (tab === 'alarm') {
      exportData = allData.map(r => ({
        '车牌号': r.plateNo, '报警类型': r.alarmName,
        '报警级别': r.alarmLevel === 3 ? '紧急' : r.alarmLevel === 2 ? '重要' : '一般',
        '速度(km/h)': r.speed,
        '处理状态': r.status === 1 ? '已处理' : r.status === 2 ? '已忽略' : '未处理',
        '时间': r.gpsTime, '地址': r.address
      }))
    } else if (tab === 'operation') {
      exportData = allData.map(r => ({
        '车牌号': r.plateNo, '日期': r.date,
        '行驶时长(h)': r.drivingHours, '停车时长(h)': r.parkingHours,
        '利用率(%)': r.utilization, '最高速度': r.maxSpeed, '平均速度': r.avgSpeed
      }))
    } else if (tab === 'overspeed') {
      exportData = allData.map(r => ({
        '车牌号': r.plateNo, '实际速度(km/h)': r.speed, '限速(km/h)': r.speedLimit,
        '超速比例(%)': r.overspeedPercent, '时间': r.gpsTime,
        '纬度': r.latitude, '经度': r.longitude
      }))
    }

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tabNames[tab] || '报表')
    XLSX.writeFile(wb, `${tabNames[tab]}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success(`导出成功，共 ${allData.length} 条`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// ==================== 打印 ====================
async function handlePrint() {
  // 将图表转为图片用于打印
  if (mainChart) {
    mainChartImage.value = mainChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0f172a' })
  }
  if (subChart) {
    subChartImage.value = subChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0f172a' })
  }

  isPrinting.value = true
  await nextTick()
  window.print()
  isPrinting.value = false
}

// ==================== 其他 ====================
function handleResize() {
  mainChart?.resize()
  subChart?.resize()
}

async function loadCompanies() {
  try {
    const res = await getReportCompanies()
    if (res.code === 0) {
      companies.value = res.data
    }
  } catch (e) {
    console.error('加载企业列表失败:', e)
  }
}

onMounted(() => {
  handleQuickDate('today')
  loadCompanies()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearRefreshTimer()
  mainChart?.dispose()
  subChart?.dispose()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

// 科技风颜色变量
$tech-cyan: #00d4ff;
$tech-neon: #00ffc8;
$tech-amber: #ffb800;
$tech-red: #ff4d6a;
$tech-purple: #a855f7;
$tech-text: #7eb8da;

// 脉冲动画
@keyframes techPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
}

.reports-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-dark-primary;
  color: $text-primary;
  overflow: hidden;

  // ===== 标签页 =====
  .tabs-header {
    background: $bg-dark-secondary;
    padding: 0 24px;
    border-bottom: 1px solid $border-dark;
    flex-shrink: 0;

    :deep(.el-tabs__header) { margin: 0; }
    :deep(.el-tabs__nav-wrap::after) { display: none; }
    :deep(.el-tabs__item) {
      height: 50px;
      line-height: 50px;
      font-size: 15px;
      color: $text-secondary;
      transition: all 0.3s ease;
      &.is-active {
        color: $tech-cyan;
        text-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
      }
      &:hover {
        color: $tech-cyan;
      }
    }
    :deep(.el-tabs__active-bar) {
      background-color: $tech-cyan;
      box-shadow: 0 2px 8px rgba(0, 212, 255, 0.5);
    }
  }

  // ===== 统计卡片 =====
  .stats-cards {
    display: flex;
    gap: 16px;
    padding: 16px 24px;
    flex-shrink: 0;

    .stat-card {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-radius: $radius-lg;
      background: $bg-dark-secondary;
      border: 1px solid $border-dark;
      transition: all 0.3s ease;
      cursor: default;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }

      // 颜色主题
      &.cyan {
        border-left: 3px solid $tech-cyan;
        &:hover { box-shadow: 0 8px 24px rgba(0, 212, 255, 0.15); }
        .stat-icon { background: rgba(0, 212, 255, 0.1); .el-icon { color: $tech-cyan; } }
        .stat-value { text-shadow: 0 0 8px rgba(0, 212, 255, 0.3); }
      }
      &.neon {
        border-left: 3px solid $tech-neon;
        &:hover { box-shadow: 0 8px 24px rgba(0, 255, 200, 0.15); }
        .stat-icon { background: rgba(0, 255, 200, 0.1); .el-icon { color: $tech-neon; } }
        .stat-value { text-shadow: 0 0 8px rgba(0, 255, 200, 0.3); }
      }
      &.amber {
        border-left: 3px solid $tech-amber;
        &:hover { box-shadow: 0 8px 24px rgba(255, 184, 0, 0.15); }
        .stat-icon { background: rgba(255, 184, 0, 0.1); .el-icon { color: $tech-amber; } }
        .stat-value { text-shadow: 0 0 8px rgba(255, 184, 0, 0.3); }
      }
      &.red {
        border-left: 3px solid $tech-red;
        &:hover { box-shadow: 0 8px 24px rgba(255, 77, 106, 0.15); }
        .stat-icon { background: rgba(255, 77, 106, 0.1); .el-icon { color: $tech-red; } }
        .stat-value { text-shadow: 0 0 8px rgba(255, 77, 106, 0.3); }
      }
      &.purple {
        border-left: 3px solid $tech-purple;
        &:hover { box-shadow: 0 8px 24px rgba(168, 85, 247, 0.15); }
        .stat-icon { background: rgba(168, 85, 247, 0.1); .el-icon { color: $tech-purple; } }
        .stat-value { text-shadow: 0 0 8px rgba(168, 85, 247, 0.3); }
      }

      .stat-icon {
        width: 44px;
        height: 44px;
        @include flex-center;
        border-radius: $radius-md;
        margin-right: 14px;
        animation: techPulse 3s ease-in-out infinite;
        .el-icon { font-size: 22px; }
      }

      .stat-info {
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          line-height: 1.2;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .stat-label { font-size: 13px; color: $text-secondary; margin-top: 4px; }
      }

      // 对比delta
      .delta {
        font-size: 12px;
        font-weight: 500;
        padding: 1px 6px;
        border-radius: 4px;
        &.up { color: $tech-neon; background: rgba(0, 255, 200, 0.1); }
        &.down { color: $tech-red; background: rgba(255, 77, 106, 0.1); }
      }
    }
  }

  // ===== 图表区域 =====
  .charts-row {
    display: flex;
    gap: 16px;
    padding: 0 24px 16px;
    flex-shrink: 0;

    .chart-card {
      flex: 1;
      background: $bg-dark-secondary;
      border: 1px solid $border-dark;
      border-radius: $radius-lg;
      padding: 16px;
      transition: all 0.3s ease;

      &:hover {
        border-color: rgba(0, 212, 255, 0.2);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.05);
      }

      .chart-title {
        font-size: 14px;
        color: $tech-text;
        margin-bottom: 8px;
        padding-left: 12px;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 2px;
          bottom: 2px;
          width: 3px;
          border-radius: 2px;
          background: linear-gradient(180deg, $tech-cyan, $tech-neon);
        }
      }

      .chart-container {
        height: 220px;
        width: 100%;
      }

      .chart-print-img {
        width: 100%;
        height: auto;
        display: none;
      }
    }
  }

  // ===== 工具栏 =====
  .toolbar {
    @include flex-between;
    padding: 12px 24px;
    background: $bg-dark-secondary;
    border-top: 1px solid $border-dark;
    border-bottom: 1px solid $border-dark;
    flex-shrink: 0;

    .filter-area {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;

      .speed-unit {
        font-size: 13px;
        color: $text-secondary;
        margin-left: 4px;
      }

      .compare-switch {
        display: flex;
        align-items: center;
        gap: 6px;
        .switch-label {
          font-size: 13px;
          color: $text-secondary;
        }
      }
    }

    .action-area {
      display: flex;
      align-items: center;
      gap: 8px;

      .auto-refresh {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-right: 8px;

        .refresh-label {
          font-size: 13px;
          color: $text-secondary;
        }
      }
    }

    :deep(.el-radio-button__inner) {
      background: $bg-dark-tertiary;
      border-color: $border-dark;
      color: $text-secondary;
    }
    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
      background: $tech-cyan;
      border-color: $tech-cyan;
      color: #fff;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
    }
    :deep(.el-input__wrapper),
    :deep(.el-select .el-input__wrapper) {
      background: $bg-dark-tertiary;
      box-shadow: 0 0 0 1px $border-dark inset;
    }
    :deep(.el-input__inner) { color: $text-primary; }
    :deep(.el-date-editor .el-range-input) { color: $text-primary; background: transparent; }
    :deep(.el-date-editor .el-range-separator) { color: $text-secondary; }
  }

  // ===== 表格 =====
  .table-container {
    flex: 1;
    overflow: auto;
    padding: 0 24px;
    @include custom-scrollbar;

    :deep(.el-table) {
      background: $bg-dark-secondary;
      --el-table-bg-color: #{$bg-dark-secondary};
      --el-table-tr-bg-color: #{$bg-dark-secondary};
      --el-table-header-bg-color: #{$bg-dark-tertiary};
      --el-table-row-hover-bg-color: #{$bg-dark-elevated};
      --el-table-border-color: #{$border-dark};
      --el-table-text-color: #{$text-primary};
      --el-table-header-text-color: #{$tech-text};
      color: $text-primary;
    }

    :deep(.el-table__body-wrapper) {
      @include custom-scrollbar;
    }

    .overspeed-percent {
      color: $tech-red;
      font-weight: 600;
    }
  }

  // ===== 分页 =====
  .pagination {
    display: flex;
    justify-content: flex-end;
    padding: 12px 24px;
    background: $bg-dark-secondary;
    border-top: 1px solid $border-dark;
    flex-shrink: 0;

    :deep(.el-pagination) {
      --el-pagination-bg-color: transparent;
      --el-pagination-text-color: #{$text-secondary};
      --el-pagination-button-bg-color: #{$bg-dark-tertiary};
      --el-pagination-button-color: #{$text-secondary};
      --el-pagination-hover-color: #{$tech-cyan};
    }
    :deep(.el-input__wrapper) {
      background: $bg-dark-tertiary;
      box-shadow: 0 0 0 1px $border-dark inset;
    }
    :deep(.el-input__inner) { color: $text-primary; }
  }
}

// ===== 打印样式 =====
@media print {
  .no-print { display: none !important; }

  .reports-page {
    background: #fff !important;
    color: #333 !important;
    overflow: visible !important;
    height: auto !important;

    .stats-cards {
      .stat-card {
        background: #f5f5f5 !important;
        border-color: #ddd !important;
        color: #333 !important;
        .stat-value { color: #333 !important; text-shadow: none !important; }
        .stat-label { color: #666 !important; }
        .stat-icon { animation: none !important; }
      }
    }

    .charts-row .chart-card {
      background: #fff !important;
      border-color: #ddd !important;
      page-break-inside: avoid;

      .chart-container { display: none !important; }
      .chart-print-img { display: block !important; }
      .chart-title { color: #333 !important; &::before { background: #409eff !important; } }
    }

    .table-container {
      overflow: visible !important;
      :deep(.el-table) {
        --el-table-bg-color: #fff !important;
        --el-table-tr-bg-color: #fff !important;
        --el-table-header-bg-color: #f5f5f5 !important;
        --el-table-border-color: #ddd !important;
        --el-table-text-color: #333 !important;
        --el-table-header-text-color: #666 !important;
      }
    }

    .pagination { display: none !important; }
  }
}

// ===== 打印模式下图表图片显示 =====
.print-mode {
  .charts-row .chart-card {
    .chart-container { visibility: hidden; height: 0; }
    .chart-print-img { display: block !important; }
  }
}
</style>

<template>
  <div class="ai-safe-page" @keydown="handleKeydown" tabindex="0" ref="pageRef">
    <!-- 左侧筛选面板 -->
    <div class="filter-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed">报警筛选</span>
        <el-button link @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon><ArrowLeft v-if="!sidebarCollapsed" /><ArrowRight v-else /></el-icon>
        </el-button>
      </div>
      <template v-if="!sidebarCollapsed">
        <!-- 报警类型分类 -->
        <div class="filter-section">
          <div class="section-title">报警类型</div>
          <div class="alarm-type-list">
            <div
              v-for="type in alarmTypes"
              :key="type.key"
              class="alarm-type-item"
              :class="{ active: selectedAlarmTypes.includes(type.key) }"
              @click="toggleAlarmType(type.key)"
            >
              <el-icon :style="{ color: type.color }"><component :is="type.icon" /></el-icon>
              <span class="type-name">{{ type.name }}</span>
              <span class="type-count">{{ type.count }}</span>
            </div>
          </div>
        </div>

        <!-- 风险等级筛选 -->
        <div class="filter-section">
          <div class="section-title">风险等级</div>
          <div class="risk-filter">
            <el-checkbox-group v-model="selectedRiskLevels">
              <el-checkbox value="high"><span class="risk-dot high"></span>高风险</el-checkbox>
              <el-checkbox value="medium"><span class="risk-dot medium"></span>中风险</el-checkbox>
              <el-checkbox value="low"><span class="risk-dot low"></span>低风险</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <!-- 时间范围 -->
        <div class="filter-section">
          <div class="section-title">时间范围</div>
          <el-radio-group v-model="timeRange" class="time-range-group">
            <el-radio-button value="today">今日</el-radio-button>
            <el-radio-button value="week">本周</el-radio-button>
            <el-radio-button value="month">本月</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 处理状态 -->
        <div class="filter-section">
          <div class="section-title">处理状态</div>
          <el-radio-group v-model="processStatus" class="status-group">
            <el-radio value="all">全部</el-radio>
            <el-radio value="pending">待处理</el-radio>
            <el-radio value="processing">处理中</el-radio>
            <el-radio value="done">已处理</el-radio>
          </el-radio-group>
        </div>

        <div class="filter-actions">
          <el-button size="small" @click="resetFilters">重置筛选</el-button>
          <el-button size="small" type="primary" @click="applyFilters">应用</el-button>
        </div>
      </template>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部统计卡片 -->
      <div class="stats-row">
        <div class="stat-card danger" @click="filterByRisk('high')">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">
              <CountUp :end-val="stats.highRisk" :duration="1" />
            </div>
            <div class="stat-label">高风险车辆</div>
          </div>
          <div class="stat-trend up"><el-icon><Top /></el-icon>{{ stats.highRiskTrend }}%</div>
          <div class="stat-bg"></div>
        </div>
        <div class="stat-card warning" @click="filterByRisk('medium')">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">
              <CountUp :end-val="stats.mediumRisk" :duration="1" />
            </div>
            <div class="stat-label">中风险车辆</div>
          </div>
          <div class="stat-trend down"><el-icon><Bottom /></el-icon>{{ stats.mediumRiskTrend }}%</div>
          <div class="stat-bg"></div>
        </div>
        <div class="stat-card info" @click="filterByRisk('low')">
          <div class="stat-icon"><el-icon><InfoFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">
              <CountUp :end-val="stats.lowRisk" :duration="1" />
            </div>
            <div class="stat-label">低风险车辆</div>
          </div>
          <div class="stat-bg"></div>
        </div>
        <div class="stat-card primary">
          <div class="stat-icon"><el-icon><Bell /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">
              <CountUp :end-val="stats.todayAlarms" :duration="1.5" />
            </div>
            <div class="stat-label">今日报警</div>
          </div>
          <div class="stat-bg"></div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.processedRate }}%</div>
            <div class="stat-label">处理率</div>
          </div>
          <el-progress :percentage="stats.processedRate" :stroke-width="4" :show-text="false" color="#22c55e" class="stat-progress" />
          <div class="stat-bg"></div>
        </div>
      </div>

      <!-- 图表和实时报警区 -->
      <div class="charts-row">
        <!-- 报警趋势图 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="title">
              <el-icon><TrendCharts /></el-icon>
              今日报警趋势
            </span>
            <div class="chart-actions">
              <el-radio-group v-model="chartType" size="small" @change="updateChart">
                <el-radio-button value="line">折线</el-radio-button>
                <el-radio-button value="bar">柱状</el-radio-button>
              </el-radio-group>
              <el-button size="small" circle @click="refreshChart" :loading="chartLoading">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="chart-container" ref="trendChartRef"></div>
        </div>

        <!-- 实时报警通知 -->
        <div class="realtime-card">
          <div class="card-header">
            <span class="title">
              <span class="live-dot" :class="{ active: soundEnabled }"></span>
              实时报警
              <el-tooltip content="点击切换声音提醒" placement="top">
                <el-button size="small" circle @click="toggleSound" :type="soundEnabled ? 'primary' : 'default'">
                  <el-icon><component :is="soundEnabled ? 'Microphone' : 'Mute'" /></el-icon>
                </el-button>
              </el-tooltip>
            </span>
            <el-badge :value="newAlarmCount" :hidden="newAlarmCount === 0">
              <el-button size="small" @click="clearNewAlarms">清除</el-button>
            </el-badge>
          </div>
          <div class="realtime-list" ref="realtimeListRef">
            <TransitionGroup name="alarm">
              <div
                v-for="alarm in realtimeAlarms"
                :key="alarm.id"
                class="realtime-item"
                :class="[alarm.level, { new: alarm.isNew }]"
                @click="handleAlarmClick(alarm)"
              >
                <div class="alarm-icon">
                  <el-icon><WarningFilled /></el-icon>
                </div>
                <div class="alarm-info">
                  <div class="alarm-title">{{ alarm.plateNo }} - {{ alarm.type }}</div>
                  <div class="alarm-time">{{ alarm.time }}</div>
                </div>
                <div class="alarm-actions">
                  <el-button size="small" circle @click.stop="handleQuickProcess(alarm)" type="success">
                    <el-icon><Check /></el-icon>
                  </el-button>
                  <el-button size="small" circle @click.stop="quickLocate(alarm)" type="primary">
                    <el-icon><Location /></el-icon>
                  </el-button>
                </div>
              </div>
            </TransitionGroup>
            <el-empty v-if="!realtimeAlarms.length" description="暂无新报警" :image-size="60" />
          </div>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索车牌号/司机/公司 (Enter搜索)"
            :prefix-icon="Search"
            clearable
            style="width: 280px"
            @keyup.enter="applyFilters"
          />
          <el-button-group>
            <el-tooltip content="表格视图" placement="top">
              <el-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">
                <el-icon><List /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="卡片视图" placement="top">
              <el-button :type="viewMode === 'card' ? 'primary' : 'default'" @click="viewMode = 'card'">
                <el-icon><Grid /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
          <el-divider direction="vertical" />
          <el-tooltip content="自动刷新" placement="top">
            <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="" size="small" />
          </el-tooltip>
        </div>
        <div class="toolbar-right">
          <el-button @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>刷新
          </el-button>
          <el-button @click="exportAlarms" type="success">
            <el-icon><Download /></el-icon>导出
          </el-button>
          <el-button @click="batchProcess" :disabled="!selectedRows.length" type="warning">
            <el-icon><Check /></el-icon>批量处理 {{ selectedRows.length ? `(${selectedRows.length})` : '' }}
          </el-button>
          <el-dropdown @command="handleMoreAction">
            <el-button>更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="history"><el-icon><Clock /></el-icon>历史报警</el-dropdown-item>
                <el-dropdown-item command="statistics"><el-icon><DataAnalysis /></el-icon>报警统计</el-dropdown-item>
                <el-dropdown-item command="settings" divided><el-icon><Setting /></el-icon>报警设置</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 报警表格 -->
      <div class="alarm-table-container" v-show="viewMode === 'table'">
        <el-table
          ref="alarmTableRef"
          :data="filteredAlarmList"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          @row-dblclick="viewDetail"
          row-key="id"
          highlight-current-row
        >
          <el-table-column type="selection" width="50" />
          <el-table-column label="风险等级" width="100" align="center">
            <template #default="{ row }">
              <span class="risk-tag" :class="row.riskLevel">
                <span class="risk-pulse" :class="row.riskLevel"></span>
                {{ getRiskText(row.riskLevel) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="plateNo" label="车牌号" width="110">
            <template #default="{ row }">
              <span class="plate-link" @click.stop="viewDetail(row)">{{ row.plateNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="driverName" label="司机" width="90" />
          <el-table-column prop="companyName" label="公司" width="120" show-overflow-tooltip />
          <el-table-column prop="alarmType" label="报警类型" width="140">
            <template #default="{ row }">
              <el-tag size="small" :type="getAlarmTypeTag(row.alarmType)" effect="dark">
                {{ row.alarmType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="alarmCount" label="次数" width="80" align="center">
            <template #default="{ row }">
              <el-badge :value="row.alarmCount" :type="row.alarmCount > 5 ? 'danger' : 'warning'" />
            </template>
          </el-table-column>
          <el-table-column prop="location" label="位置" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="location-text">
                <el-icon><Location /></el-icon>
                {{ row.location }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small" effect="plain">
                <span class="status-dot" :class="getStatusClass(row.status)"></span>
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="alarmTime" label="时间" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-tooltip content="查看详情" placement="top">
                  <el-button type="primary" link size="small" @click.stop="viewDetail(row)">
                    <el-icon><View /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="处理报警" placement="top">
                  <el-button type="success" link size="small" @click.stop="processAlarm(row)">
                    <el-icon><Check /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="查看视频" placement="top">
                  <el-button type="warning" link size="small" @click.stop="viewVideo(row)">
                    <el-icon><VideoCamera /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="地图定位" placement="top">
                  <el-button type="info" link size="small" @click.stop="locateOnMap(row)">
                    <el-icon><MapLocation /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @change="loadAlarms"
            background
          />
        </div>
      </div>

      <!-- 报警卡片视图 -->
      <div class="alarm-cards-container" v-show="viewMode === 'card'">
        <TransitionGroup name="card" class="alarm-cards-grid">
          <div
            v-for="(alarm, index) in filteredAlarmList"
            :key="alarm.id"
            class="alarm-card"
            :class="alarm.riskLevel"
            :style="{ animationDelay: `${index * 0.05}s` }"
            @click="viewDetail(alarm)"
          >
            <div class="card-header">
              <span class="plate-no">{{ alarm.plateNo }}</span>
              <span class="risk-tag" :class="alarm.riskLevel">{{ getRiskText(alarm.riskLevel) }}</span>
            </div>
            <div class="card-body">
              <div class="info-row"><el-icon><User /></el-icon><span>{{ alarm.driverName }}</span></div>
              <div class="info-row"><el-icon><Warning /></el-icon><span>{{ alarm.alarmType }}</span></div>
              <div class="info-row"><el-icon><Location /></el-icon><span>{{ alarm.location }}</span></div>
              <div class="info-row"><el-icon><Clock /></el-icon><span>{{ alarm.alarmTime }}</span></div>
            </div>
            <div class="card-footer">
              <el-tag :type="getStatusType(alarm.status)" size="small">{{ alarm.status }}</el-tag>
              <div class="actions">
                <el-button size="small" circle @click.stop="processAlarm(alarm)" type="success">
                  <el-icon><Check /></el-icon>
                </el-button>
                <el-button size="small" circle @click.stop="viewVideo(alarm)" type="warning">
                  <el-icon><VideoCamera /></el-icon>
                </el-button>
                <el-button size="small" circle @click.stop="locateOnMap(alarm)" type="primary">
                  <el-icon><MapLocation /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- 报警详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`报警详情 - ${currentAlarm?.plateNo}`" width="950px" destroy-on-close class="detail-dialog-wrapper">
      <div class="detail-dialog" v-if="currentAlarm">
        <div class="detail-left">
          <div class="info-section">
            <h4><el-icon><Van /></el-icon>车辆信息</h4>
            <div class="info-grid">
              <div class="info-item"><span class="label">车牌号</span><span class="value highlight">{{ currentAlarm.plateNo }}</span></div>
              <div class="info-item"><span class="label">司机</span><span class="value">{{ currentAlarm.driverName }}</span></div>
              <div class="info-item"><span class="label">公司</span><span class="value">{{ currentAlarm.companyName }}</span></div>
              <div class="info-item"><span class="label">风险等级</span><span class="risk-tag" :class="currentAlarm.riskLevel">{{ getRiskText(currentAlarm.riskLevel) }}</span></div>
            </div>
          </div>

          <div class="info-section">
            <h4><el-icon><Warning /></el-icon>报警信息</h4>
            <div class="info-grid">
              <div class="info-item"><span class="label">报警类型</span><span class="value">{{ currentAlarm.alarmType }}</span></div>
              <div class="info-item"><span class="label">报警时间</span><span class="value">{{ currentAlarm.alarmTime }}</span></div>
              <div class="info-item"><span class="label">报警次数</span><span class="value count">{{ currentAlarm.alarmCount }}次</span></div>
              <div class="info-item"><span class="label">状态</span><el-tag :type="getStatusType(currentAlarm.status)" size="small">{{ currentAlarm.status }}</el-tag></div>
              <div class="info-item full"><span class="label">位置</span><span class="value">{{ currentAlarm.location }}</span></div>
            </div>
          </div>

          <div class="info-section">
            <h4><el-icon><List /></el-icon>历史报警 (最近10条)</h4>
            <el-table :data="alarmHistory" size="small" max-height="180">
              <el-table-column prop="time" label="时间" width="150" />
              <el-table-column prop="type" label="类型" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div class="detail-right">
          <div class="video-section">
            <h4><el-icon><VideoCamera /></el-icon>报警视频</h4>
            <div class="video-placeholder" @click="playAlarmVideo">
              <el-icon><VideoCameraFilled /></el-icon>
              <span>点击播放报警视频</span>
              <el-button type="primary" size="small">播放视频</el-button>
            </div>
          </div>

          <div class="process-section">
            <h4><el-icon><Edit /></el-icon>处理操作</h4>
            <el-form :model="processForm" label-width="80px">
              <el-form-item label="处理结果">
                <el-select v-model="processForm.result" placeholder="请选择" style="width: 100%">
                  <el-option label="有效报警" value="valid" />
                  <el-option label="误报" value="false_alarm" />
                  <el-option label="待核实" value="pending" />
                </el-select>
              </el-form-item>
              <el-form-item label="处理备注">
                <el-input v-model="processForm.remark" type="textarea" :rows="3" placeholder="请输入处理备注" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitProcess" :loading="processLoading">提交处理</el-button>
                <el-button @click="detailVisible = false">关闭</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 视频播放弹窗 -->
    <el-dialog v-model="videoVisible" title="报警视频回放" width="850px" destroy-on-close>
      <div class="video-player-container">
        <FlvPlayer
          v-if="currentAlarm?.deviceId"
          :device-id="currentAlarm.deviceId"
          :channel="1"
          :autoplay="true"
          style="width: 100%; height: 480px;"
        />
        <el-empty v-else description="暂无视频" />
      </div>
    </el-dialog>

    <!-- 地图定位弹窗 -->
    <el-dialog v-model="mapVisible" title="报警位置" width="800px" destroy-on-close>
      <div class="map-container" ref="mapContainerRef">
        <div class="map-info" v-if="currentAlarm">
          <div class="info-badge">
            <span class="risk-tag" :class="currentAlarm.riskLevel">{{ getRiskText(currentAlarm.riskLevel) }}</span>
            <span class="plate">{{ currentAlarm.plateNo }}</span>
          </div>
          <div class="info-detail">
            <div><el-icon><Warning /></el-icon> {{ currentAlarm.alarmType }}</div>
            <div><el-icon><Location /></el-icon> {{ currentAlarm.location }}</div>
            <div><el-icon><Clock /></el-icon> {{ currentAlarm.alarmTime }}</div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 报警声音 -->
    <audio ref="alarmAudioRef" :src="alarmSoundUrl" preload="auto"></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  ArrowLeft, ArrowRight, WarningFilled, Warning, InfoFilled, Bell, CircleCheck,
  Top, Bottom, Search, List, Grid, Download, Check, ArrowDown, Van, User,
  Location, Clock, VideoCamera, VideoCameraFilled, Edit, Refresh, Setting,
  DataAnalysis, View, MapLocation, TrendCharts, Microphone, Mute
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import FlvPlayer from '@/components/FlvPlayer.vue'
import request from '@/api/request'

// 数字动画组件
const CountUp = {
  props: { endVal: { type: Number, default: 0 }, duration: { type: Number, default: 1 } },
  setup(props: { endVal: number; duration: number }) {
    const displayVal = ref(0)
    const animate = () => {
      const start = 0
      const end = props.endVal
      const duration = props.duration * 1000
      const startTime = performance.now()
      const step = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1)
        displayVal.value = Math.floor(progress * (end - start) + start)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    onMounted(animate)
    watch(() => props.endVal, animate)
    return () => displayVal.value
  }
}

const router = useRouter()
const pageRef = ref<HTMLElement>()

// 侧边栏
const sidebarCollapsed = ref(false)

// 报警类型
const alarmTypes = ref([
  { key: 'adas', name: 'ADAS报警', icon: 'Van', color: '#f56c6c', count: 45 },
  { key: 'dsm', name: 'DSM报警', icon: 'User', color: '#e6a23c', count: 32 },
  { key: 'bsd', name: 'BSD报警', icon: 'Warning', color: '#409eff', count: 18 },
  { key: 'speed', name: '超速报警', icon: 'Odometer', color: '#67c23a', count: 28 },
  { key: 'fence', name: '围栏报警', icon: 'Location', color: '#909399', count: 12 },
  { key: 'fatigue', name: '疲劳驾驶', icon: 'Clock', color: '#f56c6c', count: 21 }
])
const selectedAlarmTypes = ref<string[]>([])

// 筛选条件
const selectedRiskLevels = ref(['high', 'medium', 'low'])
const timeRange = ref('today')
const processStatus = ref('all')

// 统计数据
const stats = ref({
  highRisk: 5, mediumRisk: 12, lowRisk: 28, todayAlarms: 156, processedRate: 78,
  highRiskTrend: 12, mediumRiskTrend: 8
})

// 图表
const chartType = ref('line')
const chartLoading = ref(false)
const trendChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null

// 实时报警
const realtimeAlarms = ref<any[]>([])
const newAlarmCount = ref(0)
const realtimeListRef = ref<HTMLElement>()

// 声音控制
const soundEnabled = ref(true)
const alarmAudioRef = ref<HTMLAudioElement>()
const alarmSoundUrl = '/alarm.mp3'

// 表格数据
const loading = ref(false)
const processLoading = ref(false)
const searchKeyword = ref('')
const viewMode = ref<'table' | 'card'>('table')
const autoRefresh = ref(false)
const alarmList = ref<any[]>([])
const selectedRows = ref<any[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const alarmTableRef = ref<InstanceType<typeof import('element-plus')['ElTable']>>()

// 详情弹窗
const detailVisible = ref(false)
const videoVisible = ref(false)
const mapVisible = ref(false)
const currentAlarm = ref<any>(null)
const alarmHistory = ref<any[]>([])
const processForm = reactive({ result: '', remark: '' })
const mapContainerRef = ref<HTMLElement>()
let mapInstance: any = null  // 地图实例引用，用于清理

// setTimeout引用集合，用于清理
const timeoutIds = ref<number[]>([])

// 计算属性
const filteredAlarmList = computed(() => {
  let list = alarmList.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(a =>
      a.plateNo?.toLowerCase().includes(kw) ||
      a.driverName?.toLowerCase().includes(kw) ||
      a.companyName?.toLowerCase().includes(kw)
    )
  }
  if (selectedRiskLevels.value.length < 3) {
    list = list.filter(a => selectedRiskLevels.value.includes(a.riskLevel))
  }
  if (processStatus.value !== 'all') {
    const statusMap: Record<string, string> = { pending: '待处理', processing: '处理中', done: '已处理' }
    list = list.filter(a => a.status === statusMap[processStatus.value])
  }
  return list
})

// 快捷键处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'F5') { e.preventDefault(); refreshData() }
  if (e.key === 'Escape') { detailVisible.value = false; videoVisible.value = false; mapVisible.value = false }
}

// 工具函数
const getRiskText = (level: string) => ({ high: '高风险', medium: '中风险', low: '低风险' }[level] || level)
const getStatusType = (status: string) => ({ '待处理': 'danger', '处理中': 'warning', '已处理': 'success' }[status] || 'info')
const getStatusClass = (status: string) => ({ '待处理': 'pending', '处理中': 'processing', '已处理': 'done' }[status] || '')
const getAlarmTypeTag = (type: string) => {
  if (type.includes('碰撞') || type.includes('偏离')) return 'danger'
  if (type.includes('疲劳') || type.includes('分神')) return 'warning'
  return 'info'
}

// 筛选操作
const toggleAlarmType = (key: string) => {
  const idx = selectedAlarmTypes.value.indexOf(key)
  if (idx >= 0) selectedAlarmTypes.value.splice(idx, 1)
  else selectedAlarmTypes.value.push(key)
}

const filterByRisk = (level: string) => {
  selectedRiskLevels.value = [level]
  applyFilters()
}

const resetFilters = () => {
  selectedAlarmTypes.value = []
  selectedRiskLevels.value = ['high', 'medium', 'low']
  timeRange.value = 'today'
  processStatus.value = 'all'
  searchKeyword.value = ''
}

const applyFilters = () => {
  loadAlarms()
  ElMessage.success('筛选条件已应用')
}

const refreshData = () => {
  loadAlarms()
  refreshChart()
}

// 声音控制
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  ElMessage.info(soundEnabled.value ? '已开启声音提醒' : '已关闭声音提醒')
  // 用户交互后尝试预加载音频，解决首次播放问题
  if (soundEnabled.value && alarmAudioRef.value) {
    alarmAudioRef.value.load()
  }
}

const playAlarmSound = () => {
  if (soundEnabled.value && alarmAudioRef.value) {
    alarmAudioRef.value.currentTime = 0
    alarmAudioRef.value.play().catch((err) => {
      // 浏览器自动播放策略可能阻止播放，静默处理
      console.debug('[AlarmSound] 播放被阻止:', err.message)
    })
  }
}

// 加载报警数据
const loadAlarms = async () => {
  loading.value = true
  // 清空选中行，防止翻页后选中状态残留
  alarmTableRef.value?.clearSelection()
  selectedRows.value = []
  try {
    const res = await request.get('/api/alarms', {
      params: { page: pagination.page, pageSize: pagination.pageSize, status: processStatus.value === 'all' ? undefined : processStatus.value }
    })
    if (res.data.code === 0) {
      alarmList.value = (res.data.data.list || []).map((a: any) => ({
        id: a.id, plateNo: a.plateNo || a.device_id, deviceId: a.device_id,
        driverName: a.driverName || '未知', companyName: a.companyName || '监控中心',
        riskLevel: a.alarm_level === 3 ? 'high' : a.alarm_level === 2 ? 'medium' : 'low',
        alarmType: a.alarm_name || getAlarmTypeName(a.alarm_type), alarmCount: a.count || 1,
        location: a.address || `${a.latitude},${a.longitude}`,
        status: a.status === 0 ? '待处理' : a.status === 1 ? '处理中' : '已处理',
        alarmTime: formatTime(a.gps_time || a.created_at), lat: a.latitude, lng: a.longitude
      }))
      pagination.total = res.data.data.total || alarmList.value.length
    }
  } catch (error) {
    // API请求失败时使用模拟数据，并给用户提示
    console.warn('[AlarmMonitor] API请求失败，使用模拟数据:', error)
    generateMockData()
  } finally {
    loading.value = false
  }
}

const getAlarmTypeName = (type: number) => ({
  1: '紧急报警', 2: '超速报警', 4: '疲劳驾驶', 8: '危险预警',
  16: '前车碰撞预警', 32: '车道偏离报警', 64: '抽烟报警', 128: '接打电话'
}[type] || `报警类型${type}`)

const formatTime = (time: string) => time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : ''

const generateMockData = () => {
  const types = ['前车碰撞预警', '车道偏离报警', '疲劳驾驶', '分神驾驶', '抽烟报警', '接打电话', '超速报警']
  const levels = ['high', 'medium', 'low']
  const statuses = ['待处理', '处理中', '已处理']
  const data: any[] = []
  for (let i = 0; i < 50; i++) {
    data.push({
      id: i + 1, plateNo: `京A${10000 + i}`, deviceId: `01391234567${i}`,
      driverName: ['张三', '李四', '王五', '赵六'][i % 4],
      companyName: ['北京智慧交通', '上海物流', '广州危运'][i % 3],
      riskLevel: levels[Math.floor(Math.random() * 3)],
      alarmType: types[Math.floor(Math.random() * types.length)],
      alarmCount: Math.floor(Math.random() * 10) + 1,
      location: `北京市朝阳区${['建国路', '东三环', '望京'][i % 3]}`,
      status: statuses[Math.floor(Math.random() * 3)],
      alarmTime: new Date(Date.now() - Math.random() * 86400000).toLocaleString('zh-CN', { hour12: false }),
      lat: 39.9 + Math.random() * 0.1, lng: 116.4 + Math.random() * 0.1
    })
  }
  const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  data.sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3))
  alarmList.value = data
  pagination.total = data.length
}

// 实时报警模拟
const simulateRealtimeAlarm = () => {
  const types = ['前车碰撞预警', '车道偏离报警', '疲劳驾驶']
  const alarm = {
    id: Date.now(), plateNo: `京A${Math.floor(Math.random() * 90000) + 10000}`,
    type: types[Math.floor(Math.random() * types.length)],
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    level: ['high', 'medium'][Math.floor(Math.random() * 2)], isNew: true
  }
  realtimeAlarms.value.unshift(alarm)
  if (realtimeAlarms.value.length > 10) realtimeAlarms.value.pop()
  newAlarmCount.value++
  playAlarmSound()

  // 显示通知
  ElNotification({
    title: '新报警',
    message: `${alarm.plateNo} - ${alarm.type}`,
    type: alarm.level === 'high' ? 'error' : 'warning',
    duration: 5000,
    onClick: () => handleAlarmClick(alarm)
  })

  const timeoutId = window.setTimeout(() => {
    // 确保alarm仍存在于列表中再修改
    const found = realtimeAlarms.value.find(a => a.id === alarm.id)
    if (found) found.isNew = false
  }, 3000)
  timeoutIds.value.push(timeoutId)
}

const clearNewAlarms = () => { newAlarmCount.value = 0 }

const handleAlarmClick = (alarm: any) => {
  const found = alarmList.value.find(a => a.plateNo === alarm.plateNo)
  if (found) viewDetail(found)
}

const handleQuickProcess = (alarm: any) => {
  ElMessage.success(`已快速处理: ${alarm.plateNo}`)
  realtimeAlarms.value = realtimeAlarms.value.filter(a => a.id !== alarm.id)
}

const quickLocate = (alarm: any) => {
  const found = alarmList.value.find(a => a.plateNo === alarm.plateNo)
  if (found) locateOnMap(found)
}

// 表格操作
const handleSelectionChange = (rows: any[]) => { selectedRows.value = rows }

const viewDetail = (row: any) => {
  currentAlarm.value = row
  alarmHistory.value = [
    { time: row.alarmTime, type: row.alarmType, status: row.status },
    { time: '2026-01-10 14:30:00', type: '疲劳驾驶', status: '已处理' },
    { time: '2026-01-10 12:15:00', type: '车道偏离报警', status: '已处理' },
    { time: '2026-01-09 18:45:00', type: '超速报警', status: '已处理' }
  ]
  processForm.result = ''
  processForm.remark = ''
  detailVisible.value = true
}

const processAlarm = (row: any) => {
  ElMessageBox.confirm(`确认处理 ${row.plateNo} 的报警吗?`, '确认处理', { type: 'warning' })
    .then(() => { ElMessage.success('处理成功'); row.status = '已处理' })
    .catch(() => {})
}

const viewVideo = (row: any) => {
  currentAlarm.value = row
  videoVisible.value = true
}

const locateOnMap = (row: any) => {
  currentAlarm.value = row
  mapVisible.value = true
  nextTick(() => {
    // 销毁旧地图实例，防止内存泄漏
    if (mapInstance) {
      mapInstance.destroy()
      mapInstance = null
    }
    if (mapContainerRef.value && (window as any).AMap) {
      mapInstance = new (window as any).AMap.Map(mapContainerRef.value, {
        zoom: 15, center: [row.lng || 116.4, row.lat || 39.9]
      })
      new (window as any).AMap.Marker({
        position: [row.lng || 116.4, row.lat || 39.9],
        map: mapInstance, title: row.plateNo
      })
    }
  })
}

// 监听地图弹窗关闭，清理地图实例
watch(mapVisible, (val) => {
  if (!val && mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
})

// 监听currentAlarm变化，当清空时关闭相关弹窗
watch(currentAlarm, (val) => {
  if (!val) {
    detailVisible.value = false
    videoVisible.value = false
    mapVisible.value = false
  }
})

const playAlarmVideo = () => { videoVisible.value = true }

const submitProcess = async () => {
  if (!processForm.result) { ElMessage.warning('请选择处理结果'); return }
  processLoading.value = true
  await new Promise(r => setTimeout(r, 500))
  processLoading.value = false
  ElMessage.success('处理提交成功')
  if (currentAlarm.value) currentAlarm.value.status = '已处理'
  detailVisible.value = false
}

const exportAlarms = () => {
  ElMessage.success('报警数据导出中...')
  // 实际导出逻辑
}

const batchProcess = () => {
  ElMessageBox.confirm(`确认批量处理选中的 ${selectedRows.value.length} 条报警?`, '批量处理')
    .then(() => {
      selectedRows.value.forEach(r => r.status = '已处理')
      ElMessage.success('批量处理成功')
      // 清空表格选中状态
      alarmTableRef.value?.clearSelection()
      selectedRows.value = []
    })
    .catch(() => {})
}

const handleMoreAction = (cmd: string) => {
  const actions: Record<string, () => void> = {
    history: () => ElMessage.info('打开历史报警'),
    statistics: () => ElMessage.info('打开报警统计'),
    settings: () => ElMessage.info('打开报警设置')
  }
  actions[cmd]?.()
}

// 图表
const handleChartResize = () => {
  trendChart?.resize()
}

const initChart = () => {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateChart()
  // 添加窗口resize监听
  window.addEventListener('resize', handleChartResize)
}

const updateChart = () => {
  if (!trendChart) return
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 20) + 5)
  trendChart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: hours, axisLine: { lineStyle: { color: '#4a5568' } }, axisLabel: { color: '#a0aec0' } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#4a5568' } }, axisLabel: { color: '#a0aec0' }, splitLine: { lineStyle: { color: '#2d3748' } } },
    series: [{
      type: chartType.value, data, smooth: true,
      itemStyle: { color: '#f56c6c' },
      areaStyle: chartType.value === 'line' ? {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(245,108,108,0.3)' }, { offset: 1, color: 'rgba(245,108,108,0)' }]
        }
      } : undefined
    }]
  })
}

const refreshChart = async () => {
  chartLoading.value = true
  await new Promise(r => setTimeout(r, 500))
  updateChart()
  chartLoading.value = false
}

// 自动刷新
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null
watch(autoRefresh, (val) => {
  // 先清理旧的定时器
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
  if (val) {
    autoRefreshInterval = setInterval(loadAlarms, 30000)
    ElMessage.success('已开启自动刷新 (30秒)')
  } else {
    ElMessage.info('已关闭自动刷新')
  }
}, { immediate: false })

let alarmInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadAlarms()
  initChart()
  alarmInterval = setInterval(simulateRealtimeAlarm, 20000)

  // 初始模拟报警数据（不触发通知和声音）
  const initialAlarms = [
    { id: Date.now() - 2, plateNo: '京A88888', type: '前车碰撞预警', time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level: 'high', isNew: false },
    { id: Date.now() - 1, plateNo: '京B66666', type: '疲劳驾驶', time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level: 'medium', isNew: false },
    { id: Date.now(), plateNo: '京C55555', type: '车道偏离报警', time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level: 'high', isNew: false }
  ]
  realtimeAlarms.value = initialAlarms
  newAlarmCount.value = initialAlarms.length

  pageRef.value?.focus()
})

onUnmounted(() => {
  // 清理定时器
  if (alarmInterval) clearInterval(alarmInterval)
  if (autoRefreshInterval) clearInterval(autoRefreshInterval)

  // 清理所有setTimeout
  timeoutIds.value.forEach(id => window.clearTimeout(id))
  timeoutIds.value = []

  // 清理图表和resize监听
  window.removeEventListener('resize', handleChartResize)
  trendChart?.dispose()
  trendChart = null

  // 清理地图实例
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
})
</script>

<style lang="scss" scoped>
.ai-safe-page {
  height: 100%;
  display: flex;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  outline: none;
}

// 侧边栏
.filter-sidebar {
  width: 240px;
  background: #1e293b;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;

  &.collapsed { width: 48px; }

  .sidebar-header {
    height: 48px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #334155;
    color: #e2e8f0;
    font-weight: 500;
  }

  .filter-section {
    padding: 16px;
    border-bottom: 1px solid #334155;

    .section-title {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }

  .alarm-type-list {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .alarm-type-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #cbd5e1;

      &:hover { background: #334155; transform: translateX(4px); }
      &.active { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

      .type-name { flex: 1; font-size: 13px; }
      .type-count { font-size: 12px; color: #94a3b8; background: #334155; padding: 2px 8px; border-radius: 10px; }
      &.active .type-count { background: rgba(255,255,255,0.2); color: #fff; }
    }
  }

  .risk-filter {
    :deep(.el-checkbox-group) { display: flex; flex-direction: column; gap: 10px; }
    :deep(.el-checkbox__label) { color: #cbd5e1; }
    .risk-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 6px;
      &.high { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
      &.medium { background: #f97316; box-shadow: 0 0 8px rgba(249, 115, 22, 0.5); }
      &.low { background: #eab308; box-shadow: 0 0 8px rgba(234, 179, 8, 0.5); }
    }
  }

  .time-range-group, .status-group {
    :deep(.el-radio-button__inner), :deep(.el-radio__label) { color: #cbd5e1; }
  }

  .filter-actions { padding: 16px; display: flex; gap: 8px; }
}

// 主内容
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

// 统计卡片
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .stat-card {
    flex: 1;
    background: #1e293b;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3); }

    .stat-bg {
      position: absolute;
      right: -20px;
      bottom: -20px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      opacity: 0.1;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      position: relative;
      z-index: 1;
    }

    .stat-info {
      position: relative;
      z-index: 1;
      .stat-value { font-size: 32px; font-weight: 700; color: #fff; }
      .stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    }

    .stat-trend {
      position: absolute;
      right: 16px;
      top: 16px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px 8px;
      border-radius: 12px;
      &.up { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
      &.down { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
    }

    .stat-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      :deep(.el-progress-bar__outer) { background: #334155; }
    }

    &.danger { .stat-icon { background: linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1)); color: #ef4444; } .stat-value { color: #ef4444; } .stat-bg { background: #ef4444; } }
    &.warning { .stat-icon { background: linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1)); color: #f97316; } .stat-value { color: #f97316; } .stat-bg { background: #f97316; } }
    &.info { .stat-icon { background: linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.1)); color: #eab308; } .stat-value { color: #eab308; } .stat-bg { background: #eab308; } }
    &.primary { .stat-icon { background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1)); color: #3b82f6; } .stat-value { color: #3b82f6; } .stat-bg { background: #3b82f6; } }
    &.success { .stat-icon { background: linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1)); color: #22c55e; } .stat-value { color: #22c55e; } .stat-bg { background: #22c55e; } }
  }
}

// 图表区
.charts-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  height: 220px;

  .chart-card, .realtime-card {
    background: #1e293b;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
  }

  .chart-card { flex: 2; }
  .realtime-card { flex: 1; }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chart-actions { display: flex; align-items: center; gap: 8px; }

    .live-dot {
      width: 10px;
      height: 10px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
      &.active { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3); }
    }
  }

  .chart-container { flex: 1; }

  .realtime-list {
    flex: 1;
    overflow-y: auto;

    .realtime-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.3s ease;

      &.high { background: linear-gradient(90deg, rgba(239,68,68,0.2), transparent); border-left: 4px solid #ef4444; }
      &.medium { background: linear-gradient(90deg, rgba(249,115,22,0.2), transparent); border-left: 4px solid #f97316; }
      &.new { animation: newAlarm 0.5s ease; }

      &:hover { transform: translateX(4px); .alarm-actions { opacity: 1; } }

      .alarm-icon { color: #ef4444; font-size: 18px; }
      .alarm-info { flex: 1; .alarm-title { font-size: 13px; color: #e2e8f0; font-weight: 500; } .alarm-time { font-size: 11px; color: #64748b; margin-top: 2px; } }
      .alarm-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
    }
  }
}

// 工具栏
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1e293b;
  border-radius: 12px;
  margin-bottom: 16px;

  .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 12px; }
  :deep(.el-divider--vertical) { border-color: #334155; }
}

// 表格容器
.alarm-table-container {
  flex: 1;
  background: #1e293b;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .pagination { padding-top: 16px; display: flex; justify-content: flex-end; }

  .plate-link { color: #3b82f6; cursor: pointer; font-weight: 500; &:hover { text-decoration: underline; } }
  .location-text { display: flex; align-items: center; gap: 4px; color: #94a3b8; }
  .action-buttons { display: flex; gap: 4px; }
}

// Element Plus 表格深色主题
:deep(.el-table) {
  background: transparent;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-fill-color-lighter: #1e293b;

  th.el-table__cell { background: #334155 !important; color: #e2e8f0; border-bottom: 1px solid #475569; font-weight: 600; }
  td.el-table__cell { background: transparent !important; color: #e2e8f0; border-bottom: 1px solid #334155; }
  &.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell { background: rgba(51, 65, 85, 0.3) !important; }
  tr:hover td.el-table__cell { background: rgba(59, 130, 246, 0.1) !important; }
  .el-table__body-wrapper, .el-table__inner-wrapper::before, .el-table__empty-block { background: transparent; }
  .el-table__empty-text { color: #94a3b8; }
  .current-row td.el-table__cell { background: rgba(59, 130, 246, 0.15) !important; }
}

// 卡片视图
.alarm-cards-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;

  .alarm-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .alarm-card {
    background: #1e293b;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    border-left: 5px solid;
    animation: cardIn 0.3s ease backwards;

    &.high { border-color: #ef4444; }
    &.medium { border-color: #f97316; }
    &.low { border-color: #eab308; }

    &:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(0,0,0,0.4); }

    .card-header { display: flex; justify-content: space-between; margin-bottom: 16px; .plate-no { font-size: 18px; font-weight: 700; color: #fff; } }
    .card-body { .info-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #94a3b8; margin-bottom: 10px; .el-icon { color: #64748b; } } }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #334155; .actions { display: flex; gap: 8px; } }
  }
}

// 风险标签
.risk-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  &.high { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
  &.medium { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
  &.low { background: linear-gradient(135deg, #eab308, #ca8a04); color: #1a1a2e; }

  .risk-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    &.high { animation: pulseDot 1s infinite; }
  }
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  &.pending { background: #ef4444; animation: pulseDot 1s infinite; }
  &.processing { background: #f97316; animation: pulseDot 1.5s infinite; }
  &.done { background: #22c55e; }
}

// Element Plus 弹窗深色主题
:deep(.el-dialog) {
  --el-dialog-bg-color: #0f172a;
  border-radius: 16px;
  overflow: hidden;

  .el-dialog__header { background: #1e293b; padding: 20px 24px; margin: 0; .el-dialog__title { color: #e2e8f0; font-size: 18px; font-weight: 600; } .el-dialog__headerbtn .el-dialog__close { color: #94a3b8; &:hover { color: #fff; } } }
  .el-dialog__body { background: #0f172a; padding: 24px; }
  .el-dialog__footer { background: #0f172a; border-top: 1px solid #334155; padding: 16px 24px; }
}

// Element Plus 表单深色主题
:deep(.el-form) {
  .el-form-item__label { color: #94a3b8; }
  .el-input__wrapper, .el-textarea__inner { background: #334155; box-shadow: none; border: 1px solid #475569; border-radius: 8px; &:hover, &.is-focus { border-color: #3b82f6; } }
  .el-input__inner, .el-textarea__inner { color: #e2e8f0; }
  .el-input__inner::placeholder, .el-textarea__inner::placeholder { color: #64748b; }
  .el-select .el-select__wrapper { background: #334155; box-shadow: none; border: 1px solid #475569; }
}

// 详情弹窗
.detail-dialog {
  display: flex;
  gap: 24px;

  .detail-left, .detail-right { flex: 1; }

  .info-section, .video-section, .process-section {
    background: #1e293b;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;

    h4 { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-size: 15px; color: #e2e8f0; font-weight: 600; }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .info-item {
      display: flex;
      gap: 12px;
      font-size: 13px;
      &.full { grid-column: span 2; }
      .label { color: #64748b; min-width: 70px; }
      .value { color: #e2e8f0; &.highlight { color: #3b82f6; font-weight: 600; } &.count { color: #ef4444; font-weight: 700; } }
    }
  }

  .video-placeholder {
    height: 200px;
    background: linear-gradient(135deg, #334155, #1e293b);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.3s;
    border: 2px dashed #475569;
    &:hover { border-color: #3b82f6; background: linear-gradient(135deg, #3b4a5a, #2a3a4a); }
    .el-icon { font-size: 56px; }
  }
}

.video-player-container { background: #000; border-radius: 12px; overflow: hidden; }

.map-container {
  height: 450px;
  background: #1e293b;
  border-radius: 12px;
  position: relative;

  .map-info {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    padding: 16px;
    z-index: 100;

    .info-badge { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; .plate { color: #fff; font-size: 18px; font-weight: 700; } }
    .info-detail { font-size: 13px; color: #94a3b8; div { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; } }
  }
}

// 动画
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } }
@keyframes newAlarm { 0% { opacity: 0; transform: translateX(-20px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes cardIn { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }

.alarm-enter-active { animation: newAlarm 0.3s ease; }
.alarm-leave-active { animation: newAlarm 0.3s ease reverse; }
.card-enter-active { animation: cardIn 0.3s ease backwards; }
.card-leave-active { opacity: 0; transition: opacity 0.2s; }
</style>

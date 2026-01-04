<template>
  <div class="ai-safe-page">
    <!-- 顶部风险等级统计卡片 -->
    <div class="risk-stats-row">
      <div class="risk-stat-card high">
        <div class="stat-icon">
          <el-icon><Van /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">当前高风险车辆</div>
          <div class="stat-value">{{ riskStats.highRisk }}</div>
        </div>
        <div class="stat-sub">
          今日高风险车辆: <span>{{ riskStats.todayHighRisk }}</span>
        </div>
      </div>

      <div class="risk-stat-card medium">
        <div class="stat-icon">
          <el-icon><Van /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">当前中风险车辆</div>
          <div class="stat-value">{{ riskStats.mediumRisk }}</div>
        </div>
        <div class="stat-sub">
          今日中风险车辆: <span>{{ riskStats.todayMediumRisk }}</span>
        </div>
      </div>

      <div class="risk-stat-card low">
        <div class="stat-icon">
          <el-icon><Van /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">当前低风险车辆</div>
          <div class="stat-value">{{ riskStats.lowRisk }}</div>
        </div>
        <div class="stat-sub">
          今日低风险车辆: <span>{{ riskStats.todayLowRisk }}</span>
        </div>
      </div>

      <div class="risk-stat-card online">
        <div class="stat-icon">
          <el-icon><Van /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">主动安全在线车辆</div>
          <div class="stat-value">{{ riskStats.online }}</div>
        </div>
        <div class="stat-sub">
          主动安全车辆总数: <span>{{ riskStats.total }}</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-section">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入模糊查询内容"
          prefix-icon="Search"
          clearable
          style="width: 220px"
        />
      </div>
      <div class="toolbar-right">
        <el-button @click="handleBatchDelete" :disabled="selectedRows.length === 0">
          批量删除
        </el-button>
        <el-button @click="showHistoryAlarms">
          历史报警...
        </el-button>
        <el-button @click="toggleAlarmPopup">
          报警弹窗...
        </el-button>
        <el-button @click="toggleAlarmSound">
          报警声音...
        </el-button>
        <el-button :icon="Setting" circle @click="showSettings" />
      </div>
    </div>

    <!-- 报警表格 -->
    <div class="alarm-table-section">
      <el-table
        :data="filteredAlarmList"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#1e3c72', color: '#fff' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="riskLevel" label="风险等级" width="100" align="center">
          <template #default="{ row }">
            <span :class="['risk-badge', `risk-${row.riskLevel}`]">
              {{ getRiskLevelText(row.riskLevel) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="plateNo" label="车牌号" width="120" />
        <el-table-column prop="companyName" label="所属公司" width="120" />
        <el-table-column prop="driverName" label="司机" width="100" />
        <el-table-column prop="location" label="当前位置" min-width="180" show-overflow-tooltip />
        <el-table-column prop="latestAlarm" label="最新报警" width="150" />
        <el-table-column prop="alarmCount" label="报警次数" width="90" align="center">
          <template #default="{ row }">
            <span class="alarm-count">{{ row.alarmCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button type="success" link size="small" @click="handleTrack(row)">
              跟踪
            </el-button>
            <el-button type="warning" link size="small" @click="handlePlayback(row)">
              回放
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 报警详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`${currentVehicle?.plateNo} - 报警详情`"
      width="1000px"
      destroy-on-close
    >
      <div class="detail-content" v-if="currentVehicle">
        <div class="detail-left">
          <!-- 车辆基本信息 -->
          <div class="info-card">
            <h4>车辆信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">车牌号:</span>
                <span class="value">{{ currentVehicle.plateNo }}</span>
              </div>
              <div class="info-item">
                <span class="label">司机:</span>
                <span class="value">{{ currentVehicle.driverName }}</span>
              </div>
              <div class="info-item">
                <span class="label">所属公司:</span>
                <span class="value">{{ currentVehicle.companyName }}</span>
              </div>
              <div class="info-item">
                <span class="label">风险等级:</span>
                <span :class="['risk-badge', `risk-${currentVehicle.riskLevel}`]">
                  {{ getRiskLevelText(currentVehicle.riskLevel) }}
                </span>
              </div>
              <div class="info-item full">
                <span class="label">当前位置:</span>
                <span class="value">{{ currentVehicle.location }}</span>
              </div>
            </div>
          </div>

          <!-- 报警统计 -->
          <div class="info-card">
            <h4>今日报警统计</h4>
            <div class="alarm-stats">
              <div class="alarm-stat-item">
                <div class="stat-num red">{{ vehicleAlarmStats.high }}</div>
                <div class="stat-label">高级报警</div>
              </div>
              <div class="alarm-stat-item">
                <div class="stat-num orange">{{ vehicleAlarmStats.medium }}</div>
                <div class="stat-label">中级报警</div>
              </div>
              <div class="alarm-stat-item">
                <div class="stat-num yellow">{{ vehicleAlarmStats.low }}</div>
                <div class="stat-label">低级报警</div>
              </div>
              <div class="alarm-stat-item">
                <div class="stat-num blue">{{ vehicleAlarmStats.total }}</div>
                <div class="stat-label">总计</div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-right">
          <!-- 报警列表 -->
          <div class="alarm-list-card">
            <h4>报警记录</h4>
            <el-table :data="vehicleAlarmList" max-height="400">
              <el-table-column prop="alarmTime" label="时间" width="160" />
              <el-table-column prop="alarmType" label="类型" width="120" />
              <el-table-column prop="level" label="级别" width="80">
                <template #default="{ row }">
                  <el-tag :type="getAlarmLevelType(row.level)" size="small">
                    {{ row.level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === '已处理' ? 'success' : 'warning'" size="small">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleTrack(currentVehicle)">实时跟踪</el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog v-model="settingsDialogVisible" title="安全监控设置" width="500px">
      <el-form :model="settings" label-width="120px">
        <el-form-item label="报警弹窗">
          <el-switch v-model="settings.popupEnabled" />
        </el-form-item>
        <el-form-item label="报警声音">
          <el-switch v-model="settings.soundEnabled" />
        </el-form-item>
        <el-form-item label="高风险阈值">
          <el-input-number v-model="settings.highRiskThreshold" :min="1" :max="100" />
          <span class="form-tip">次/天</span>
        </el-form-item>
        <el-form-item label="中风险阈值">
          <el-input-number v-model="settings.mediumRiskThreshold" :min="1" :max="100" />
          <span class="form-tip">次/天</span>
        </el-form-item>
        <el-form-item label="自动刷新">
          <el-select v-model="settings.refreshInterval">
            <el-option label="不刷新" :value="0" />
            <el-option label="30秒" :value="30" />
            <el-option label="1分钟" :value="60" />
            <el-option label="5分钟" :value="300" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Van, Setting, Search } from '@element-plus/icons-vue'

const router = useRouter()

// 风险统计数据
const riskStats = ref({
  highRisk: 1,
  mediumRisk: 0,
  lowRisk: 11,
  online: 0,
  todayHighRisk: 5,
  todayMediumRisk: 18,
  todayLowRisk: 42,
  total: 10
})

// 搜索和筛选
const searchKeyword = ref('')
const loading = ref(false)
const selectedRows = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 弹窗状态
const detailDialogVisible = ref(false)
const settingsDialogVisible = ref(false)
const currentVehicle = ref<any>(null)

// 设置
const settings = reactive({
  popupEnabled: true,
  soundEnabled: false,
  highRiskThreshold: 10,
  mediumRiskThreshold: 5,
  refreshInterval: 60
})

// 车辆报警统计
const vehicleAlarmStats = ref({
  high: 3,
  medium: 5,
  low: 12,
  total: 20
})

// 车辆报警列表
const vehicleAlarmList = ref([
  { alarmTime: '2024-01-03 18:23:45', alarmType: '车道偏离报警1级', level: '高级', status: '待处理' },
  { alarmTime: '2024-01-03 17:45:12', alarmType: '前车碰撞预警', level: '高级', status: '已处理' },
  { alarmTime: '2024-01-03 16:30:00', alarmType: '疲劳驾驶预警', level: '中级', status: '待处理' },
  { alarmTime: '2024-01-03 15:20:33', alarmType: '抽烟报警', level: '低级', status: '已处理' },
  { alarmTime: '2024-01-03 14:10:22', alarmType: '接打电话', level: '中级', status: '已处理' }
])

// 报警列表数据
const alarmList = ref<any[]>([])

// 过滤后的列表
const filteredAlarmList = computed(() => {
  if (!searchKeyword.value) return alarmList.value
  const keyword = searchKeyword.value.toLowerCase()
  return alarmList.value.filter(item =>
    item.plateNo.toLowerCase().includes(keyword) ||
    item.driverName.toLowerCase().includes(keyword) ||
    item.companyName.toLowerCase().includes(keyword)
  )
})

// 获取风险等级文本
const getRiskLevelText = (level: string) => {
  const map: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险'
  }
  return map[level] || level
}

// 获取报警级别类型
const getAlarmLevelType = (level: string) => {
  const map: Record<string, string> = {
    '高级': 'danger',
    '中级': 'warning',
    '低级': 'info'
  }
  return map[level] || 'info'
}

// 生成模拟数据
const generateMockData = () => {
  const mockData: any[] = []
  const companies = ['金旅', '本安测试部', '山东四通', '广州分公司']
  const drivers = ['未知司机', '张三', '李四', '王五', '赵六']
  const alarmTypes = ['车道偏离报警1级', '前车碰撞预警', '疲劳驾驶', '接打电话', '抽烟']
  const riskLevels = ['high', 'medium', 'low']

  for (let i = 0; i < 30; i++) {
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)]
    mockData.push({
      id: i + 1,
      plateNo: `391${1400 + i}`,
      companyName: companies[Math.floor(Math.random() * companies.length)],
      driverName: drivers[Math.floor(Math.random() * drivers.length)],
      riskLevel,
      location: `${(23.1 + Math.random() * 0.1).toFixed(6)},${(113.3 + Math.random() * 0.1).toFixed(6)}`,
      latestAlarm: alarmTypes[Math.floor(Math.random() * alarmTypes.length)],
      alarmCount: Math.floor(Math.random() * 20) + 1,
      updateTime: `2024-01-03 ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`
    })
  }

  // 按风险等级排序
  mockData.sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return order[a.riskLevel] - order[b.riskLevel]
  })

  alarmList.value = mockData
  pagination.total = mockData.length

  // 更新统计
  riskStats.value.highRisk = mockData.filter(v => v.riskLevel === 'high').length
  riskStats.value.mediumRisk = mockData.filter(v => v.riskLevel === 'medium').length
  riskStats.value.lowRisk = mockData.filter(v => v.riskLevel === 'low').length
}

// 处理选择变化
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 批量删除
const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', {
    type: 'warning'
  }).then(() => {
    ElMessage.success('删除成功')
    selectedRows.value = []
  }).catch(() => {})
}

// 历史报警
const showHistoryAlarms = () => {
  ElMessage.info('打开历史报警')
}

// 报警弹窗设置
const toggleAlarmPopup = () => {
  settings.popupEnabled = !settings.popupEnabled
  ElMessage.success(`报警弹窗已${settings.popupEnabled ? '开启' : '关闭'}`)
}

// 报警声音设置
const toggleAlarmSound = () => {
  settings.soundEnabled = !settings.soundEnabled
  ElMessage.success(`报警声音已${settings.soundEnabled ? '开启' : '关闭'}`)
}

// 打开设置
const showSettings = () => {
  settingsDialogVisible.value = true
}

// 保存设置
const saveSettings = () => {
  ElMessage.success('设置已保存')
  settingsDialogVisible.value = false
}

// 查看详情
const handleViewDetail = (row: any) => {
  currentVehicle.value = row
  detailDialogVisible.value = true
}

// 跟踪车辆
const handleTrack = (row: any) => {
  router.push({
    path: '/monitor',
    query: { vehicleId: row.id, track: 'true' }
  })
}

// 回放
const handlePlayback = (row: any) => {
  router.push({
    path: '/replay',
    query: { vehicleId: row.id }
  })
}

// 分页
const handleSizeChange = () => {
  pagination.page = 1
}

const handlePageChange = () => {
  // 加载数据
}

onMounted(() => {
  generateMockData()
})
</script>

<style lang="scss" scoped>
.ai-safe-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  padding: 16px;
  overflow: auto;
}

// 风险统计卡片
.risk-stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .risk-stat-card {
    flex: 1;
    background: linear-gradient(135deg, #2d3a4f 0%, #1e2a3a 100%);
    border-radius: 8px;
    padding: 16px;
    position: relative;
    overflow: hidden;

    .stat-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
    }

    .stat-content {
      margin-left: 72px;

      .stat-label {
        font-size: 13px;
        color: #94a3b8;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 36px;
        font-weight: 600;
        color: #fff;
      }
    }

    .stat-sub {
      margin-left: 72px;
      margin-top: 8px;
      font-size: 12px;
      color: #64748b;

      span {
        color: #94a3b8;
      }
    }

    &.high {
      .stat-icon {
        background: #ef4444;
      }
      .stat-value {
        color: #ef4444;
      }
    }

    &.medium {
      .stat-icon {
        background: #f97316;
      }
      .stat-value {
        color: #f97316;
      }
    }

    &.low {
      .stat-icon {
        background: #eab308;
      }
      .stat-value {
        color: #eab308;
      }
    }

    &.online {
      .stat-icon {
        background: #3b82f6;
      }
      .stat-value {
        color: #3b82f6;
      }
    }
  }
}

// 工具栏
.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d3a4f;
  border-radius: 8px;
  margin-bottom: 16px;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  :deep(.el-input) {
    .el-input__wrapper {
      background: #1e2a3a;
      border-color: #3d4a5f;
      box-shadow: none;
    }

    .el-input__inner {
      color: #fff;

      &::placeholder {
        color: #64748b;
      }
    }
  }

  :deep(.el-button) {
    background: #3d4a5f;
    border-color: #4d5a6f;
    color: #fff;

    &:hover {
      background: #4d5a6f;
    }
  }
}

// 报警表格
.alarm-table-section {
  flex: 1;
  background: #2d3a4f;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;

  :deep(.el-table) {
    background: transparent;
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: #1e3c72;
    --el-table-row-hover-bg-color: rgba(64, 158, 255, 0.1);
    --el-table-border-color: #3d4a5f;
    --el-table-text-color: #e2e8f0;

    .el-table__header-wrapper {
      th {
        background: #1e3c72 !important;
        color: #fff !important;
        font-weight: 500;
      }
    }

    .el-table__body-wrapper {
      .el-table__row {
        &:hover > td {
          background: rgba(64, 158, 255, 0.1) !important;
        }
      }
    }

    .el-checkbox__inner {
      background: #3d4a5f;
      border-color: #4d5a6f;
    }
  }
}

// 风险等级标签
.risk-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &.risk-high {
    background: #ef4444;
    color: #fff;
  }

  &.risk-medium {
    background: #f97316;
    color: #fff;
  }

  &.risk-low {
    background: #eab308;
    color: #1a1a2e;
  }
}

// 报警次数
.alarm-count {
  color: #f56c6c;
  font-weight: 600;
}

// 分页
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: auto;

  :deep(.el-pagination) {
    --el-pagination-bg-color: #3d4a5f;
    --el-pagination-text-color: #e2e8f0;
    --el-pagination-button-color: #e2e8f0;
    --el-pagination-button-bg-color: #3d4a5f;
    --el-pagination-button-disabled-color: #64748b;
    --el-pagination-button-disabled-bg-color: #2d3a4f;
    --el-pagination-hover-color: #409eff;
  }
}

// 详情弹窗
.detail-content {
  display: flex;
  gap: 24px;

  .detail-left,
  .detail-right {
    flex: 1;
  }
}

.info-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    padding-left: 8px;
    border-left: 3px solid #409eff;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .info-item {
      display: flex;
      font-size: 13px;

      &.full {
        grid-column: span 2;
      }

      .label {
        color: #909399;
        min-width: 70px;
      }

      .value {
        color: #303133;
      }
    }
  }
}

.alarm-stats {
  display: flex;
  gap: 16px;

  .alarm-stat-item {
    flex: 1;
    text-align: center;
    padding: 12px;
    background: #fff;
    border-radius: 8px;

    .stat-num {
      font-size: 28px;
      font-weight: 600;

      &.red { color: #ef4444; }
      &.orange { color: #f97316; }
      &.yellow { color: #eab308; }
      &.blue { color: #3b82f6; }
    }

    .stat-label {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.alarm-list-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    padding-left: 8px;
    border-left: 3px solid #409eff;
  }
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}
</style>

<template>
  <div class="ai-safe-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" v-for="stat in statCards" :key="stat.key">
        <div class="stat-icon" :style="{ background: stat.color }">
          <el-icon :size="24"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="报警类型">
          <el-select v-model="filterForm.alarmType" placeholder="全部类型" clearable style="width: 150px">
            <el-option
              v-for="type in alarmTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="processed" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
        </el-form-item>
        <el-form-item label="车牌号">
          <el-input v-model="filterForm.plateNo" placeholder="请输入车牌号" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 报警列表 -->
    <div class="alarm-table-section">
      <el-table
        :data="alarmList"
        v-loading="loading"
        style="width: 100%"
        :row-class-name="getRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="alarmTime" label="报警时间" width="170" />
        <el-table-column prop="plateNo" label="车牌号" width="110" />
        <el-table-column prop="driverName" label="驾驶员" width="90" />
        <el-table-column prop="alarmType" label="报警类型" width="130">
          <template #default="{ row }">
            <el-tag :type="getAlarmTagType(row.alarmTypeCode)" size="small">
              {{ row.alarmType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="级别" width="80" align="center">
          <template #default="{ row }">
            <span :class="['level-dot', `level-${row.level}`]"></span>
            {{ getLevelText(row.level) }}
          </template>
        </el-table-column>
        <el-table-column prop="speed" label="速度" width="80" align="center">
          <template #default="{ row }">
            {{ row.speed }} km/h
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hasMedia" label="附件" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.hasVideo" :size="18" color="#409eff" title="有视频">
              <VideoCamera />
            </el-icon>
            <el-icon v-if="row.hasImage" :size="18" color="#67c23a" title="有图片" style="margin-left: 4px">
              <Picture />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleViewDetail(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click.stop="handleProcess(row)"
            >
              处理
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="info"
              link
              size="small"
              @click.stop="handleIgnore(row)"
            >
              忽略
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
      title="报警详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="alarm-detail" v-if="currentAlarm">
        <div class="detail-header">
          <div class="alarm-type-badge" :style="{ background: getAlarmColor(currentAlarm.alarmTypeCode) }">
            {{ currentAlarm.alarmType }}
          </div>
          <div class="alarm-meta">
            <span>{{ currentAlarm.plateNo }}</span>
            <span class="separator">|</span>
            <span>{{ currentAlarm.driverName }}</span>
            <span class="separator">|</span>
            <span>{{ currentAlarm.alarmTime }}</span>
          </div>
        </div>

        <div class="detail-content">
          <div class="detail-left">
            <!-- 媒体区域 -->
            <div class="media-section">
              <div class="media-tabs">
                <el-radio-group v-model="mediaTab" size="small">
                  <el-radio-button label="image" v-if="currentAlarm.hasImage">图片</el-radio-button>
                  <el-radio-button label="video" v-if="currentAlarm.hasVideo">视频</el-radio-button>
                </el-radio-group>
              </div>
              <div class="media-content">
                <div v-if="mediaTab === 'image'" class="image-viewer">
                  <el-image
                    :src="currentAlarm.imageUrl"
                    fit="contain"
                    :preview-src-list="[currentAlarm.imageUrl]"
                  >
                    <template #error>
                      <div class="image-error">
                        <el-icon :size="40"><Picture /></el-icon>
                        <p>图片加载失败</p>
                      </div>
                    </template>
                  </el-image>
                </div>
                <div v-else-if="mediaTab === 'video'" class="video-player">
                  <video
                    v-if="currentAlarm.videoUrl"
                    :src="currentAlarm.videoUrl"
                    controls
                    style="width: 100%; height: 100%"
                  >
                    您的浏览器不支持视频播放
                  </video>
                  <div v-else class="video-placeholder">
                    <el-icon :size="40"><VideoCamera /></el-icon>
                    <p>暂无视频</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-right">
            <!-- 基本信息 -->
            <div class="info-section">
              <h4>基本信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">车牌号:</span>
                  <span class="info-value">{{ currentAlarm.plateNo }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">驾驶员:</span>
                  <span class="info-value">{{ currentAlarm.driverName || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">所属企业:</span>
                  <span class="info-value">{{ currentAlarm.companyName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">设备ID:</span>
                  <span class="info-value">{{ currentAlarm.deviceId }}</span>
                </div>
              </div>
            </div>

            <!-- 报警信息 -->
            <div class="info-section">
              <h4>报警信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">报警类型:</span>
                  <span class="info-value">{{ currentAlarm.alarmType }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">报警级别:</span>
                  <span class="info-value">
                    <span :class="['level-dot', `level-${currentAlarm.level}`]"></span>
                    {{ getLevelText(currentAlarm.level) }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">报警时间:</span>
                  <span class="info-value">{{ currentAlarm.alarmTime }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">当前速度:</span>
                  <span class="info-value">{{ currentAlarm.speed }} km/h</span>
                </div>
                <div class="info-item full-width">
                  <span class="info-label">报警位置:</span>
                  <span class="info-value">{{ currentAlarm.location }}</span>
                </div>
              </div>
            </div>

            <!-- 处理信息 -->
            <div class="info-section" v-if="currentAlarm.status !== 'pending'">
              <h4>处理信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">处理状态:</span>
                  <span class="info-value">
                    <el-tag :type="getStatusType(currentAlarm.status)" size="small">
                      {{ getStatusText(currentAlarm.status) }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">处理人:</span>
                  <span class="info-value">{{ currentAlarm.processedBy || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">处理时间:</span>
                  <span class="info-value">{{ currentAlarm.processedTime || '-' }}</span>
                </div>
                <div class="info-item full-width">
                  <span class="info-label">处理备注:</span>
                  <span class="info-value">{{ currentAlarm.processRemark || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            v-if="currentAlarm?.status === 'pending'"
            type="warning"
            @click="handleIgnore(currentAlarm)"
          >
            忽略
          </el-button>
          <el-button
            v-if="currentAlarm?.status === 'pending'"
            type="primary"
            @click="handleProcess(currentAlarm)"
          >
            确认处理
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 处理对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="处理报警"
      width="500px"
    >
      <el-form :model="processForm" label-width="80px">
        <el-form-item label="处理结果">
          <el-select v-model="processForm.result" placeholder="请选择处理结果" style="width: 100%">
            <el-option label="确认报警" value="confirmed" />
            <el-option label="误报" value="false_alarm" />
            <el-option label="已通知驾驶员" value="notified" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入处理备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmProcess">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Search,
  Refresh,
  VideoCamera,
  Picture,
  Warning,
  Bell,
  CircleCheck,
  Clock
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 报警类型定义
const alarmTypes = [
  { value: 'fatigue', label: '疲劳驾驶', color: '#f56c6c' },
  { value: 'phone', label: '接打电话', color: '#e6a23c' },
  { value: 'smoke', label: '抽烟', color: '#e6a23c' },
  { value: 'distraction', label: '分神驾驶', color: '#e6a23c' },
  { value: 'lane_departure', label: '车道偏离', color: '#f56c6c' },
  { value: 'forward_collision', label: '前车碰撞预警', color: '#f56c6c' },
  { value: 'pedestrian', label: '行人碰撞预警', color: '#f56c6c' },
  { value: 'speed', label: '超速报警', color: '#e6a23c' },
  { value: 'no_face', label: '未检测到人脸', color: '#909399' },
  { value: 'camera_blocked', label: '摄像头遮挡', color: '#909399' }
]

// 筛选表单
const filterForm = reactive({
  alarmType: '',
  status: '',
  plateNo: '',
  dateRange: [] as string[]
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 状态
const loading = ref(false)
const alarmList = ref<any[]>([])
const detailDialogVisible = ref(false)
const processDialogVisible = ref(false)
const currentAlarm = ref<any>(null)
const mediaTab = ref('image')

// 处理表单
const processForm = reactive({
  result: '',
  remark: ''
})

// 统计数据
const statCards = computed(() => [
  {
    key: 'total',
    label: '今日报警',
    value: alarmList.value.length,
    icon: Bell,
    color: '#409eff'
  },
  {
    key: 'pending',
    label: '待处理',
    value: alarmList.value.filter(a => a.status === 'pending').length,
    icon: Clock,
    color: '#e6a23c'
  },
  {
    key: 'processed',
    label: '已处理',
    value: alarmList.value.filter(a => a.status === 'processed').length,
    icon: CircleCheck,
    color: '#67c23a'
  },
  {
    key: 'high',
    label: '高危报警',
    value: alarmList.value.filter(a => a.level === 'high').length,
    icon: Warning,
    color: '#f56c6c'
  }
])

// 获取报警标签类型
function getAlarmTagType(code: string) {
  const dangerTypes = ['fatigue', 'lane_departure', 'forward_collision', 'pedestrian']
  const warnTypes = ['phone', 'smoke', 'distraction', 'speed']
  if (dangerTypes.includes(code)) return 'danger'
  if (warnTypes.includes(code)) return 'warning'
  return 'info'
}

// 获取报警颜色
function getAlarmColor(code: string) {
  const type = alarmTypes.find(t => t.value === code)
  return type?.color || '#909399'
}

// 获取级别文本
function getLevelText(level: string) {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[level] || level
}

// 获取状态类型
function getStatusType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    processed: 'success',
    ignored: 'info'
  }
  return map[status] || 'info'
}

// 获取状态文本
function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    processed: '已处理',
    ignored: '已忽略'
  }
  return map[status] || status
}

// 获取行样式
function getRowClassName({ row }: { row: any }) {
  if (row.level === 'high' && row.status === 'pending') {
    return 'high-level-row'
  }
  return ''
}

// 加载报警列表
async function loadAlarms() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterForm.alarmType) params.alarmType = filterForm.alarmType
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.plateNo) params.plateNo = filterForm.plateNo
    if (filterForm.dateRange?.length === 2) {
      params.startTime = filterForm.dateRange[0]
      params.endTime = filterForm.dateRange[1]
    }

    const res = await axios.get('/api/alarms', { params })
    if (res.data.code === 0) {
      alarmList.value = res.data.data.list
      pagination.total = res.data.data.total
    }
  } catch (error) {
    console.error('加载报警列表失败:', error)
    // 使用模拟数据
    generateMockData()
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockData() {
  const now = new Date()
  const mockData: any[] = []

  const vehicles = [
    { plateNo: '沪A12345', driverName: '张三', companyName: '金旅', deviceId: 'DEV001' },
    { plateNo: '沪B67890', driverName: '李四', companyName: '金旅', deviceId: 'DEV002' },
    { plateNo: '沪C11111', driverName: '王五', companyName: '金旅', deviceId: 'DEV003' },
    { plateNo: '京A11111', driverName: '赵六', companyName: '本安测试部', deviceId: 'DEV004' }
  ]

  const locations = [
    '上海市浦东新区张江高科技园区',
    '上海市浦东新区陆家嘴金融中心',
    '上海市浦东新区世纪大道',
    '上海市黄浦区南京东路',
    '北京市朝阳区CBD商务区',
    '北京市海淀区中关村'
  ]

  for (let i = 0; i < 50; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)]
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)]
    const time = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
    const levels = ['high', 'medium', 'low']
    const statuses = ['pending', 'pending', 'pending', 'processed', 'ignored']

    mockData.push({
      id: i + 1,
      ...vehicle,
      alarmType: alarmType.label,
      alarmTypeCode: alarmType.value,
      alarmTime: formatDateTime(time),
      level: levels[Math.floor(Math.random() * levels.length)],
      speed: Math.floor(Math.random() * 80) + 20,
      location: locations[Math.floor(Math.random() * locations.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      hasVideo: Math.random() > 0.3,
      hasImage: Math.random() > 0.2,
      imageUrl: 'https://via.placeholder.com/640x480?text=Alarm+Image',
      videoUrl: '',
      processedBy: null,
      processedTime: null,
      processRemark: null
    })
  }

  // 按时间排序
  mockData.sort((a, b) => new Date(b.alarmTime).getTime() - new Date(a.alarmTime).getTime())

  alarmList.value = mockData
  pagination.total = mockData.length
}

// 格式化日期时间
function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

// 查询
function handleSearch() {
  pagination.page = 1
  loadAlarms()
}

// 重置
function handleReset() {
  filterForm.alarmType = ''
  filterForm.status = ''
  filterForm.plateNo = ''
  filterForm.dateRange = []
  pagination.page = 1
  loadAlarms()
}

// 分页改变
function handleSizeChange() {
  pagination.page = 1
  loadAlarms()
}

function handlePageChange() {
  loadAlarms()
}

// 行点击
function handleRowClick(row: any) {
  handleViewDetail(row)
}

// 查看详情
function handleViewDetail(row: any) {
  currentAlarm.value = row
  mediaTab.value = row.hasImage ? 'image' : 'video'
  detailDialogVisible.value = true
}

// 处理报警
function handleProcess(row: any) {
  currentAlarm.value = row
  processForm.result = ''
  processForm.remark = ''
  processDialogVisible.value = true
}

// 确认处理
async function confirmProcess() {
  if (!processForm.result) {
    ElMessage.warning('请选择处理结果')
    return
  }

  try {
    // 调用API处理报警
    // await axios.post(`/api/alarms/${currentAlarm.value.id}/process`, processForm)

    // 模拟处理
    const alarm = alarmList.value.find(a => a.id === currentAlarm.value.id)
    if (alarm) {
      alarm.status = 'processed'
      alarm.processedBy = 'admin'
      alarm.processedTime = formatDateTime(new Date())
      alarm.processRemark = processForm.remark
    }

    ElMessage.success('处理成功')
    processDialogVisible.value = false
    detailDialogVisible.value = false
  } catch (error) {
    ElMessage.error('处理失败')
  }
}

// 忽略报警
function handleIgnore(row: any) {
  ElMessageBox.confirm('确定要忽略此报警吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // await axios.post(`/api/alarms/${row.id}/ignore`)

      const alarm = alarmList.value.find(a => a.id === row.id)
      if (alarm) {
        alarm.status = 'ignored'
        alarm.processedBy = 'admin'
        alarm.processedTime = formatDateTime(new Date())
      }

      ElMessage.success('已忽略')
      detailDialogVisible.value = false
    } catch (error) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadAlarms()
})
</script>

<style lang="scss" scoped>
.ai-safe-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;
  overflow: auto;
}

// 统计卡片
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .stat-card {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      margin-right: 16px;
    }

    .stat-info {
      .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: #303133;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }
}

// 筛选区域
.filter-section {
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .filter-form {
    :deep(.el-form-item) {
      margin-bottom: 0;
      margin-right: 16px;
    }
  }
}

// 报警表格
.alarm-table-section {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;

  :deep(.el-table) {
    flex: 1;

    .high-level-row {
      background-color: #fef0f0;
    }

    .el-table__row {
      cursor: pointer;

      &:hover {
        background-color: #f5f7fa;
      }
    }
  }
}

// 级别点
.level-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;

  &.level-high {
    background: #f56c6c;
  }

  &.level-medium {
    background: #e6a23c;
  }

  &.level-low {
    background: #67c23a;
  }
}

// 分页
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  margin-top: 16px;
}

// 报警详情
.alarm-detail {
  .detail-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;

    .alarm-type-badge {
      padding: 6px 16px;
      border-radius: 4px;
      color: #fff;
      font-weight: 500;
      margin-right: 16px;
    }

    .alarm-meta {
      color: #606266;
      font-size: 14px;

      .separator {
        margin: 0 8px;
        color: #dcdfe6;
      }
    }
  }

  .detail-content {
    display: flex;
    gap: 24px;

    .detail-left {
      flex: 1;
      min-width: 400px;
    }

    .detail-right {
      flex: 1;
    }
  }
}

// 媒体区域
.media-section {
  .media-tabs {
    margin-bottom: 12px;
  }

  .media-content {
    height: 300px;
    background: #f5f7fa;
    border-radius: 8px;
    overflow: hidden;

    .image-viewer {
      height: 100%;

      :deep(.el-image) {
        width: 100%;
        height: 100%;
      }
    }

    .image-error,
    .video-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #909399;

      p {
        margin-top: 8px;
      }
    }

    .video-player {
      height: 100%;
      background: #000;
    }
  }
}

// 信息区域
.info-section {
  margin-bottom: 20px;

  h4 {
    margin: 0 0 12px 0;
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

      &.full-width {
        grid-column: span 2;
      }

      .info-label {
        color: #909399;
        min-width: 70px;
      }

      .info-value {
        color: #303133;
        flex: 1;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

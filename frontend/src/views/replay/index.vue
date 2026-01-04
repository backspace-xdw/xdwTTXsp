<template>
  <div class="replay-page">
    <!-- 左侧车辆选择 -->
    <div class="replay-sidebar">
      <div class="sidebar-header">
        <h3>选择车辆</h3>
      </div>

      <!-- 搜索框 -->
      <div class="sidebar-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索车牌号..."
          prefix-icon="Search"
          size="small"
          clearable
        />
      </div>

      <!-- 车辆列表 -->
      <div class="sidebar-list">
        <el-tree
          ref="vehicleTreeRef"
          :data="vehicleTreeData"
          :props="treeProps"
          node-key="id"
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterNode"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="custom-tree-node">
              <el-icon v-if="data.type === 'company'" class="node-icon">
                <OfficeBuilding />
              </el-icon>
              <span
                v-else
                class="vehicle-status-dot"
                :class="data.online ? 'online' : 'offline'"
              ></span>
              <span class="node-label">{{ node.label }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="replay-content">
      <!-- 顶部模式切换和查询条件 -->
      <div class="content-header">
        <div class="mode-tabs">
          <div
            class="mode-tab"
            :class="{ active: playbackMode === 'track' }"
            @click="playbackMode = 'track'"
          >
            <el-icon><Location /></el-icon>
            <span>轨迹回放</span>
          </div>
          <div
            class="mode-tab"
            :class="{ active: playbackMode === 'video' }"
            @click="playbackMode = 'video'"
          >
            <el-icon><VideoCamera /></el-icon>
            <span>视频回放</span>
          </div>
          <div
            class="mode-tab"
            :class="{ active: playbackMode === 'mixed' }"
            @click="playbackMode = 'mixed'"
          >
            <el-icon><Grid /></el-icon>
            <span>轨迹+视频</span>
          </div>
        </div>

        <div class="query-form">
          <div class="form-item">
            <label>车辆：</label>
            <el-tag v-if="selectedVehicle" type="primary" size="small">
              {{ selectedVehicle.plateNo }}
            </el-tag>
            <span v-else class="no-vehicle">请选择车辆</span>
          </div>
          <div class="form-item">
            <label>时间：</label>
            <el-date-picker
              v-model="queryParams.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              size="small"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              :shortcuts="dateShortcuts"
            />
          </div>
          <el-button type="primary" size="small" :icon="Search" @click="queryTrack" :loading="loading">
            查询
          </el-button>
          <el-button size="small" :icon="Download" @click="exportTrack">导出</el-button>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="content-main">
        <!-- 地图区域 -->
        <div class="map-section" :class="{ 'half-width': playbackMode === 'mixed' }">
          <div class="map-wrapper" ref="mapWrapperRef">
            <div id="replayMapContainer" class="map-container"></div>

            <!-- 地图控件 -->
            <div class="map-controls">
              <div class="map-control-item" :class="{ active: mapType === 'normal' }" @click="setMapType('normal')">
                <el-icon><MapLocation /></el-icon>
                <span>标准</span>
              </div>
              <div class="map-control-item" :class="{ active: mapType === 'satellite' }" @click="setMapType('satellite')">
                <el-icon><Picture /></el-icon>
                <span>卫星</span>
              </div>
            </div>

            <!-- 轨迹信息面板 -->
            <div class="track-info-panel" v-if="trackData.length > 0">
              <div class="info-row">
                <div class="info-item">
                  <span class="label">轨迹点</span>
                  <span class="value">{{ trackData.length }}</span>
                </div>
                <div class="info-item">
                  <span class="label">总里程</span>
                  <span class="value">{{ totalMileage }} km</span>
                </div>
                <div class="info-item">
                  <span class="label">时长</span>
                  <span class="value">{{ totalDuration }}</span>
                </div>
                <div class="info-item">
                  <span class="label">均速</span>
                  <span class="value">{{ avgSpeed }} km/h</span>
                </div>
              </div>
            </div>

            <!-- 全屏按钮 -->
            <div class="fullscreen-btn" @click="toggleFullScreen">
              <el-icon><FullScreen /></el-icon>
            </div>
          </div>
        </div>

        <!-- 视频区域 -->
        <div class="video-section" v-if="playbackMode === 'video' || playbackMode === 'mixed'">
          <div class="video-grid" :class="videoGridClass">
            <div
              v-for="(channel, index) in videoChannels"
              :key="index"
              class="video-cell"
              :class="{ active: activeChannel === index }"
              @click="activeChannel = index"
            >
              <div class="video-player">
                <div class="video-placeholder">
                  <el-icon><VideoCameraFilled /></el-icon>
                  <span>{{ channel.name }}</span>
                </div>
                <div class="video-label">CH{{ channel.id }}</div>
              </div>
            </div>
          </div>

          <!-- 视频网格切换 -->
          <div class="video-controls">
            <div class="grid-switch">
              <el-icon
                v-for="grid in [1, 4, 9]"
                :key="grid"
                :class="{ active: videoGrid === grid }"
                @click="videoGrid = grid"
              >
                <component :is="getGridIcon(grid)" />
              </el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 播放控制区 -->
      <div class="content-player" v-if="trackData.length > 0 || playbackMode !== 'track'">
        <!-- 时间轴 -->
        <div class="timeline-section">
          <div class="progress-info">
            <span class="progress-text">进度: {{ currentIndex + 1 }} / {{ trackData.length }}</span>
            <span class="progress-percent">{{ playProgress }}%</span>
          </div>
          <div class="timeline-track">
            <div class="time-display start">{{ currentTimeStr }}</div>
            <div class="timeline-slider">
              <el-slider
                v-model="currentIndex"
                :min="0"
                :max="Math.max(trackData.length - 1, 100)"
                :show-tooltip="false"
                @change="handleSliderChange"
              />
              <!-- 报警标记 -->
              <div class="alarm-markers">
                <div
                  v-for="(alarm, index) in alarmPoints"
                  :key="index"
                  class="alarm-marker"
                  :style="{ left: `${(alarm.index / trackData.length) * 100}%` }"
                  :title="alarm.type"
                >
                  <el-icon><Warning /></el-icon>
                </div>
              </div>
            </div>
            <div class="time-display end">{{ endTimeStr }}</div>
          </div>
        </div>

        <!-- 播放控制按钮 -->
        <div class="player-controls">
          <div class="control-left">
            <el-button-group class="play-buttons">
              <el-button size="small" @click="skipBackward" title="后退10秒">
                <el-icon><DArrowLeft /></el-icon>
              </el-button>
              <el-button
                size="small"
                class="play-btn"
                :class="{ playing: isPlaying }"
                @click="togglePlay"
              >
                <el-icon><component :is="isPlaying ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                {{ isPlaying ? '暂停' : '播放' }}
              </el-button>
              <el-button size="small" @click="skipForward" title="前进10秒">
                <el-icon><DArrowRight /></el-icon>
              </el-button>
            </el-button-group>
            <el-button size="small" @click="resetPlayback" title="重新开始">
              <el-icon><RefreshLeft /></el-icon>
            </el-button>
          </div>

          <div class="control-center">
            <div class="speed-control">
              <span class="label">速度:</span>
              <div class="speed-buttons">
                <span
                  v-for="speed in [0.5, 1, 2, 4, 8, 16]"
                  :key="speed"
                  class="speed-btn"
                  :class="{ active: playSpeed === speed }"
                  @click="playSpeed = speed"
                >
                  {{ speed }}x
                </span>
              </div>
            </div>
          </div>

          <div class="control-right">
            <div class="current-info">
              <div class="info-group">
                <span class="info-label">速度</span>
                <span class="info-value">{{ currentPoint?.speed || 0 }} <small>km/h</small></span>
              </div>
              <div class="info-group">
                <span class="info-label">方向</span>
                <span class="info-value">{{ getDirection(currentPoint?.direction) }}</span>
              </div>
              <div class="info-group location">
                <span class="info-label">位置</span>
                <span class="info-value">{{ currentPoint?.address || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部数据面板 -->
      <div class="content-data-panel" v-if="trackData.length > 0" :class="{ collapsed: dataPanelCollapsed }">
        <div class="panel-header" @click="dataPanelCollapsed = !dataPanelCollapsed">
          <div class="panel-tabs">
            <span
              class="panel-tab"
              :class="{ active: dataPanelTab === 'track' }"
              @click.stop="dataPanelTab = 'track'"
            >
              <el-icon><Location /></el-icon>
              轨迹点 ({{ trackData.length }})
            </span>
            <span
              class="panel-tab"
              :class="{ active: dataPanelTab === 'alarm' }"
              @click.stop="dataPanelTab = 'alarm'"
            >
              <el-icon><Warning /></el-icon>
              报警事件 ({{ alarmPoints.length }})
            </span>
            <span
              class="panel-tab"
              :class="{ active: dataPanelTab === 'stop' }"
              @click.stop="dataPanelTab = 'stop'"
            >
              <el-icon><Clock /></el-icon>
              停车记录 ({{ stopPoints.length }})
            </span>
          </div>
          <div class="panel-toggle">
            <el-icon><component :is="dataPanelCollapsed ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
          </div>
        </div>
        <div class="panel-content" v-show="!dataPanelCollapsed">
          <!-- 轨迹点列表 -->
          <div v-if="dataPanelTab === 'track'" class="track-list">
            <el-table
              :data="paginatedTrackData"
              height="180"
              size="small"
              highlight-current-row
              @row-click="handleTrackRowClick"
              :row-class-name="getTrackRowClass"
            >
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="time" label="时间" width="150">
                <template #default="{ row }">
                  <span class="time-cell">{{ row.time?.substring(11) || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="speed" label="速度" width="80">
                <template #default="{ row }">
                  <el-tag :type="getSpeedTagType(row.speed)" size="small">
                    {{ row.speed }} km/h
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="direction" label="方向" width="60">
                <template #default="{ row }">{{ getDirection(row.direction) }}</template>
              </el-table-column>
              <el-table-column prop="address" label="位置" min-width="200" show-overflow-tooltip />
            </el-table>
            <div class="table-pagination">
              <el-pagination
                v-model:current-page="trackTablePage"
                :page-size="trackTablePageSize"
                :total="trackData.length"
                layout="total, prev, pager, next"
                size="small"
              />
            </div>
          </div>

          <!-- 报警事件列表 -->
          <div v-else-if="dataPanelTab === 'alarm'" class="alarm-list">
            <el-table :data="alarmPoints" height="180" size="small" @row-click="handleAlarmRowClick">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="time" label="时间" width="100" />
              <el-table-column prop="type" label="报警类型" width="120">
                <template #default="{ row }">
                  <el-tag type="danger" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="speed" label="速度" width="80">
                <template #default="{ row }">{{ row.speed || '-' }} km/h</template>
              </el-table-column>
              <el-table-column label="位置" min-width="200">
                <template #default="{ row }">
                  {{ trackData[row.index]?.address || '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click.stop="jumpToPoint(row.index)">
                    定位
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="alarmPoints.length === 0" class="empty-data">
              <el-icon><CircleCheck /></el-icon>
              <span>本时段无报警事件</span>
            </div>
          </div>

          <!-- 停车记录列表 -->
          <div v-else-if="dataPanelTab === 'stop'" class="stop-list">
            <el-table :data="stopPoints" height="180" size="small" @row-click="handleStopRowClick">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="startTime" label="开始时间" width="100" />
              <el-table-column prop="endTime" label="结束时间" width="100" />
              <el-table-column prop="duration" label="停车时长" width="100">
                <template #default="{ row }">
                  <el-tag type="info" size="small">{{ row.duration }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="address" label="停车位置" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click.stop="jumpToPoint(row.index)">
                    定位
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="stopPoints.length === 0" class="empty-data">
              <el-icon><Van /></el-icon>
              <span>本时段无停车记录</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 无轨迹提示 -->
      <div class="no-track-tip" v-if="trackData.length === 0 && playbackMode === 'track'">
        <el-empty description="请选择车辆并查询轨迹">
          <template #image>
            <el-icon style="font-size: 60px; color: #909399;"><Location /></el-icon>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  Search,
  Download,
  FullScreen,
  MapLocation,
  Picture,
  VideoPlay,
  VideoPause,
  DArrowLeft,
  DArrowRight,
  RefreshLeft,
  OfficeBuilding,
  Location,
  VideoCamera,
  Grid,
  VideoCameraFilled,
  Warning,
  Menu,
  Expand,
  MoreFilled,
  Clock,
  ArrowUp,
  ArrowDown,
  CircleCheck,
  Van
} from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { ElMessage } from 'element-plus'

const route = useRoute()

// 地图相关
let map: any = null
let polyline: any = null
let marker: any = null
let passedPolyline: any = null
let AMapInstance: any = null

const mapWrapperRef = ref<HTMLElement>()
const mapType = ref('normal')

// 回放模式
const playbackMode = ref<'track' | 'video' | 'mixed'>('track')

// 视频相关
const videoGrid = ref(4)
const activeChannel = ref(0)
const videoChannels = ref([
  { id: 1, name: '前方摄像头' },
  { id: 2, name: '后方摄像头' },
  { id: 3, name: '驾驶室' },
  { id: 4, name: 'DSM摄像头' },
  { id: 5, name: 'ADAS摄像头' },
  { id: 6, name: '备用1' },
  { id: 7, name: '备用2' },
  { id: 8, name: '备用3' },
  { id: 9, name: '备用4' }
])

const videoGridClass = computed(() => {
  const gridMap: Record<number, string> = {
    1: 'grid-1x1',
    4: 'grid-2x2',
    9: 'grid-3x3'
  }
  return gridMap[videoGrid.value] || 'grid-2x2'
})

const getGridIcon = (grid: number) => {
  const iconMap: Record<number, string> = {
    1: 'Expand',
    4: 'Grid',
    9: 'Menu'
  }
  return iconMap[grid] || 'Grid'
}

// 车辆树
const vehicleTreeRef = ref()
const searchKeyword = ref('')
const treeProps = {
  children: 'children',
  label: 'label'
}

// 日期快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      return [start, end]
    }
  },
  {
    text: '昨天',
    value: () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0)
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      return [start, end]
    }
  },
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      return [start, end]
    }
  }
]

// 模拟车辆树数据
const vehicleTreeData = ref([
  {
    id: 'company-1',
    label: '监控中心 (151/4558)',
    type: 'company',
    children: [
      {
        id: 'company-3',
        label: '金旅 (144/4187)',
        type: 'company',
        children: [
          { id: 'v-1', label: '沪A12345', type: 'vehicle', plateNo: '沪A12345', online: true },
          { id: 'v-2', label: '沪B67890', type: 'vehicle', plateNo: '沪B67890', online: true },
          { id: 'v-3', label: '沪C11111', type: 'vehicle', plateNo: '沪C11111', online: false }
        ]
      },
      {
        id: 'company-4',
        label: '本安测试部 (0/89)',
        type: 'company',
        children: [
          { id: 'v-4', label: '京A11111', type: 'vehicle', plateNo: '京A11111', online: true },
          { id: 'v-5', label: '粤A22222', type: 'vehicle', plateNo: '粤A22222', online: false }
        ]
      }
    ]
  }
])

// 选中的车辆
const selectedVehicle = ref<any>(null)

// 根据车牌号在树中查找车辆
const findVehicleByPlateNo = (nodes: any[], plateNo: string): any => {
  for (const node of nodes) {
    if (node.type === 'vehicle' && node.plateNo === plateNo) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findVehicleByPlateNo(node.children, plateNo)
      if (found) return found
    }
  }
  return null
}

// 自动选择车辆（从URL参数）
const autoSelectVehicle = () => {
  const plateNo = route.query.plateNo as string
  if (plateNo) {
    // 设置搜索关键字
    searchKeyword.value = plateNo

    // 在树中查找车辆
    const vehicle = findVehicleByPlateNo(vehicleTreeData.value, plateNo)
    if (vehicle) {
      selectedVehicle.value = vehicle

      // 设置默认时间范围（今天）
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      queryParams.value.dateRange = [
        formatDateTime(start),
        formatDateTime(end)
      ]

      // 高亮树节点
      nextTick(() => {
        vehicleTreeRef.value?.setCurrentKey(vehicle.id)
      })

      ElMessage.success(`已选择车辆: ${plateNo}`)
    } else {
      ElMessage.warning(`未找到车辆: ${plateNo}`)
    }
  }
}

// 查询参数
const queryParams = ref<{ dateRange: [string, string] | null }>({
  dateRange: null
})

// 加载状态
const loading = ref(false)

// 轨迹数据
const trackData = ref<any[]>([])

// 报警点
const alarmPoints = ref<any[]>([])

// 停车点
const stopPoints = ref<any[]>([])

// 数据面板状态
const dataPanelCollapsed = ref(false)
const dataPanelTab = ref<'track' | 'alarm' | 'stop'>('track')
const trackTablePage = ref(1)
const trackTablePageSize = 20

// 分页后的轨迹数据
const paginatedTrackData = computed(() => {
  const start = (trackTablePage.value - 1) * trackTablePageSize
  const end = start + trackTablePageSize
  return trackData.value.slice(start, end).map((item, idx) => ({
    ...item,
    _index: start + idx
  }))
})

// 播放进度百分比
const playProgress = computed(() => {
  if (trackData.value.length === 0) return 0
  return Math.round((currentIndex.value / (trackData.value.length - 1)) * 100)
})

// 播放相关
const isPlaying = ref(false)
const currentIndex = ref(0)
const playSpeed = ref(1)
let playTimer: any = null

// 计算属性
const currentPoint = computed(() => trackData.value[currentIndex.value])

const currentTimeStr = computed(() => {
  if (trackData.value.length === 0) return '--:--:--'
  return trackData.value[currentIndex.value]?.time || '--:--:--'
})

const endTimeStr = computed(() => {
  if (trackData.value.length === 0) return '--:--:--'
  return trackData.value[trackData.value.length - 1]?.time || '--:--:--'
})

const totalMileage = computed(() => {
  if (trackData.value.length === 0) return '0'
  let total = 0
  for (let i = 1; i < trackData.value.length; i++) {
    const p1 = trackData.value[i - 1]
    const p2 = trackData.value[i]
    total += calculateDistance(p1.lng, p1.lat, p2.lng, p2.lat)
  }
  return total.toFixed(2)
})

const totalDuration = computed(() => {
  if (trackData.value.length < 2) return '0分'
  const start = new Date(trackData.value[0].time).getTime()
  const end = new Date(trackData.value[trackData.value.length - 1].time).getTime()
  const minutes = Math.floor((end - start) / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h${mins}m`
  }
  return `${mins}m`
})

const avgSpeed = computed(() => {
  if (trackData.value.length === 0) return '0'
  const total = trackData.value.reduce((sum, p) => sum + (p.speed || 0), 0)
  return (total / trackData.value.length).toFixed(1)
})

// 获取方向文字
function getDirection(angle: number | undefined): string {
  if (angle === undefined) return '-'
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const index = Math.round(angle / 45) % 8
  return directions[index]
}

// 获取速度标签类型
function getSpeedTagType(speed: number): 'success' | 'warning' | 'danger' | 'info' {
  if (speed === 0) return 'info'
  if (speed < 40) return 'success'
  if (speed < 80) return 'warning'
  return 'danger'
}

// 获取轨迹行样式
function getTrackRowClass({ row }: { row: any }) {
  if (row._index === currentIndex.value) {
    return 'current-row'
  }
  return ''
}

// 点击轨迹行
function handleTrackRowClick(row: any) {
  currentIndex.value = row._index
  jumpToPoint(row._index)
}

// 点击报警行
function handleAlarmRowClick(row: any) {
  jumpToPoint(row.index)
}

// 点击停车行
function handleStopRowClick(row: any) {
  jumpToPoint(row.index)
}

// 跳转到指定点
function jumpToPoint(index: number) {
  currentIndex.value = index
  updatePlayPosition(index)
}

// 计算两点间距离（km）
function calculateDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 筛选树节点
const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.label.toLowerCase().includes(value.toLowerCase())
}

// 监听搜索
watch(searchKeyword, (val) => {
  vehicleTreeRef.value?.filter(val)
})

// 处理节点点击
const handleNodeClick = (data: any) => {
  if (data.type === 'vehicle') {
    selectedVehicle.value = data
    // 设置默认时间范围（今天）
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    queryParams.value.dateRange = [formatDateTime(start), formatDateTime(end)]
  }
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

// 查询轨迹
const queryTrack = async () => {
  if (!selectedVehicle.value) {
    ElMessage.warning('请先选择车辆')
    return
  }
  if (!queryParams.value.dateRange) {
    ElMessage.warning('请选择时间范围')
    return
  }

  loading.value = true
  stopPlayback()

  try {
    // 模拟API请求 - 生成模拟轨迹数据
    await new Promise(resolve => setTimeout(resolve, 500))
    trackData.value = generateMockTrackData()
    alarmPoints.value = generateMockAlarms()
    stopPoints.value = generateMockStopPoints()
    currentIndex.value = 0
    trackTablePage.value = 1

    // 绘制轨迹
    drawTrack()

    ElMessage.success(`查询到 ${trackData.value.length} 个轨迹点`)
  } catch (error) {
    ElMessage.error('查询轨迹失败')
  } finally {
    loading.value = false
  }
}

// 生成模拟轨迹数据
function generateMockTrackData() {
  const points = []
  // 上海市区模拟轨迹
  const baseLng = 121.4737
  const baseLat = 31.2304
  const startTime = queryParams.value.dateRange
    ? new Date(queryParams.value.dateRange[0]).getTime()
    : Date.now()

  for (let i = 0; i < 100; i++) {
    const time = new Date(startTime + i * 60000) // 每分钟一个点
    points.push({
      lng: baseLng + (Math.random() - 0.3) * 0.1 + i * 0.001,
      lat: baseLat + (Math.random() - 0.5) * 0.05 + i * 0.0005,
      speed: Math.floor(Math.random() * 80) + 20,
      direction: Math.floor(Math.random() * 360),
      time: formatDateTime(time),
      address: `上海市浦东新区${['张江', '金桥', '陆家嘴', '世纪公园'][i % 4]}路${100 + i}号`
    })
  }
  return points
}

// 生成模拟报警点
function generateMockAlarms() {
  return [
    { index: 15, type: '超速报警', time: '10:15:00', speed: 95 },
    { index: 42, type: '疲劳驾驶', time: '10:42:00', speed: 65 },
    { index: 78, type: '急刹车', time: '11:18:00', speed: 45 }
  ]
}

// 生成模拟停车点
function generateMockStopPoints() {
  return [
    { index: 25, startTime: '10:25:00', endTime: '10:32:00', duration: '7分钟', address: '上海市浦东新区张江路125号' },
    { index: 55, startTime: '10:55:00', endTime: '11:05:00', duration: '10分钟', address: '上海市浦东新区金桥路155号' },
    { index: 88, startTime: '11:28:00', endTime: '11:35:00', duration: '7分钟', address: '上海市浦东新区陆家嘴路188号' }
  ]
}

// 绘制轨迹
function drawTrack() {
  if (!map || !AMapInstance || trackData.value.length === 0) return

  // 清除旧轨迹
  if (polyline) map.remove(polyline)
  if (passedPolyline) map.remove(passedPolyline)
  if (marker) map.remove(marker)

  const path = trackData.value.map(p => [p.lng, p.lat])

  // 绘制完整轨迹（蓝色）
  polyline = new AMapInstance.Polyline({
    path: path,
    strokeColor: '#3388ff',
    strokeWeight: 4,
    strokeOpacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  })
  map.add(polyline)

  // 绘制已走过的轨迹（绿色）
  passedPolyline = new AMapInstance.Polyline({
    path: [],
    strokeColor: '#00cc00',
    strokeWeight: 6,
    strokeOpacity: 1,
    lineJoin: 'round',
    lineCap: 'round'
  })
  map.add(passedPolyline)

  // 创建车辆标记
  marker = new AMapInstance.Marker({
    position: path[0],
    icon: new AMapInstance.Icon({
      size: new AMapInstance.Size(40, 40),
      image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
      imageSize: new AMapInstance.Size(40, 40)
    }),
    offset: new AMapInstance.Pixel(-20, -40),
    angle: trackData.value[0].direction || 0
  })
  map.add(marker)

  // 添加起点标记
  const startMarker = new AMapInstance.Marker({
    position: path[0],
    content: '<div style="background:#52c41a;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;">起点</div>',
    offset: new AMapInstance.Pixel(-20, -30)
  })
  map.add(startMarker)

  // 添加终点标记
  const endMarker = new AMapInstance.Marker({
    position: path[path.length - 1],
    content: '<div style="background:#ff4d4f;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;">终点</div>',
    offset: new AMapInstance.Pixel(-20, -30)
  })
  map.add(endMarker)

  // 调整地图视野
  map.setFitView()
}

// 更新播放位置
function updatePlayPosition(index: number) {
  if (!marker || !passedPolyline || trackData.value.length === 0) return

  const point = trackData.value[index]
  if (!point) return

  // 更新车辆位置
  marker.setPosition([point.lng, point.lat])
  marker.setAngle(point.direction || 0)

  // 更新已走过的轨迹
  const passedPath = trackData.value.slice(0, index + 1).map(p => [p.lng, p.lat])
  passedPolyline.setPath(passedPath)

  // 地图跟随
  map.setCenter([point.lng, point.lat])
}

// 监听当前索引变化
watch(currentIndex, (newIndex) => {
  updatePlayPosition(newIndex)
})

// 切换播放/暂停
const togglePlay = () => {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

// 开始播放
function startPlayback() {
  if (trackData.value.length === 0) return
  if (currentIndex.value >= trackData.value.length - 1) {
    currentIndex.value = 0
  }

  isPlaying.value = true
  playTimer = setInterval(() => {
    if (currentIndex.value < trackData.value.length - 1) {
      currentIndex.value++
    } else {
      stopPlayback()
    }
  }, 1000 / playSpeed.value)
}

// 停止播放
function stopPlayback() {
  isPlaying.value = false
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

// 监听播放速度变化
watch(playSpeed, () => {
  if (isPlaying.value) {
    stopPlayback()
    startPlayback()
  }
})

// 跳过控制
const skipForward = () => {
  const newIndex = Math.min(currentIndex.value + 10, trackData.value.length - 1)
  currentIndex.value = newIndex
}

const skipBackward = () => {
  const newIndex = Math.max(currentIndex.value - 10, 0)
  currentIndex.value = newIndex
}

// 重置播放
const resetPlayback = () => {
  stopPlayback()
  currentIndex.value = 0
}

// 滑块变化
const handleSliderChange = (val: number) => {
  updatePlayPosition(val)
}

// 导出轨迹
const exportTrack = () => {
  if (trackData.value.length === 0) {
    ElMessage.warning('没有轨迹数据可导出')
    return
  }
  ElMessage.success('轨迹导出功能开发中...')
}

// 全屏
const toggleFullScreen = () => {
  if (!mapWrapperRef.value) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    mapWrapperRef.value.requestFullscreen()
  }
}

// 设置地图类型
const setMapType = (type: string) => {
  mapType.value = type
  if (!map) return
  if (type === 'satellite') {
    map.setLayers([new AMapInstance.TileLayer.Satellite()])
  } else {
    map.setLayers([new AMapInstance.TileLayer()])
  }
}

// 初始化地图
const initMap = async () => {
  try {
    AMapInstance = await AMapLoader.load({
      key: '0236671cfb04ddf41d952d0a47b78106',
      version: '1.4.15',
      plugins: ['AMap.Scale', 'AMap.ToolBar']
    })

    map = new AMapInstance.Map('replayMapContainer', {
      zoom: 12,
      center: [121.4737, 31.2304],
      mapStyle: 'amap://styles/normal'
    })

    map.addControl(new AMapInstance.Scale())
    map.addControl(new AMapInstance.ToolBar({ position: 'RT' }))
  } catch (error) {
    console.error('Map init error:', error)
  }
}

onMounted(() => {
  nextTick(() => {
    initMap()
    // 检查URL参数，自动选择车辆
    autoSelectVehicle()
  })
})

onUnmounted(() => {
  stopPlayback()
  if (map) {
    map.destroy()
  }
})
</script>

<style lang="scss" scoped>
.replay-page {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.replay-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #1a237e 0%, #283593 100%);

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
    }
  }

  .sidebar-search {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  .sidebar-list {
    flex: 1;
    overflow: auto;
    padding: 8px;

    .custom-tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;

      .node-icon {
        color: #409eff;
      }

      .vehicle-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.online {
          background: #52c41a;
        }
        &.offline {
          background: #d9d9d9;
        }
      }
    }
  }
}

.replay-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #1a1e2e;

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #252a3d;
    border-bottom: 1px solid #353b50;

    .mode-tabs {
      display: flex;
      gap: 4px;

      .mode-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        color: #8b8fa4;
        font-size: 13px;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        &.active {
          background: #409eff;
          color: #fff;
        }

        .el-icon {
          font-size: 16px;
        }
      }
    }

    .query-form {
      display: flex;
      align-items: center;
      gap: 16px;

      .form-item {
        display: flex;
        align-items: center;
        gap: 8px;

        label {
          font-size: 13px;
          color: #8b8fa4;
          white-space: nowrap;
        }

        .no-vehicle {
          color: #666;
          font-size: 13px;
        }
      }
    }
  }

  .content-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    padding: 12px;
    gap: 12px;

    .map-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      &.half-width {
        flex: 1;
      }

      .map-wrapper {
        flex: 1;
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;

        .map-container {
          width: 100%;
          height: 100%;
        }

        .map-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 4px;
          background: #fff;
          padding: 4px;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

          .map-control-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 6px 10px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 11px;
            color: #666;

            &:hover, &.active {
              background: #e6f7ff;
              color: #1890ff;
            }

            .el-icon {
              font-size: 16px;
              margin-bottom: 2px;
            }
          }
        }

        .track-info-panel {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(26, 30, 46, 0.9);
          padding: 12px 16px;
          border-radius: 6px;

          .info-row {
            display: flex;
            gap: 16px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .label {
              font-size: 11px;
              color: #8b8fa4;
            }

            .value {
              font-size: 14px;
              color: #fff;
              font-weight: 500;
            }
          }
        }

        .fullscreen-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          color: #666;

          &:hover {
            color: #1890ff;
          }
        }
      }
    }

    .video-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      .video-grid {
        flex: 1;
        display: grid;
        gap: 4px;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        padding: 4px;

        &.grid-1x1 {
          grid-template-columns: 1fr;
        }
        &.grid-2x2 {
          grid-template-columns: repeat(2, 1fr);
        }
        &.grid-3x3 {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      .video-cell {
        position: relative;
        background: #1a1e2e;
        aspect-ratio: 16/9;
        border: 2px solid transparent;
        border-radius: 4px;
        overflow: hidden;

        &.active {
          border-color: #409eff;
        }

        .video-player {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;

          .video-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: #666;

            .el-icon {
              font-size: 40px;
            }

            span {
              font-size: 12px;
            }
          }

          .video-label {
            position: absolute;
            top: 4px;
            left: 4px;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
          }
        }
      }

      .video-controls {
        display: flex;
        justify-content: center;
        padding: 8px;

        .grid-switch {
          display: flex;
          gap: 8px;

          .el-icon {
            font-size: 20px;
            color: #666;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;

            &:hover {
              color: #409eff;
            }

            &.active {
              color: #409eff;
              background: rgba(64, 158, 255, 0.1);
            }
          }
        }
      }
    }
  }

  .content-player {
    background: #252a3d;
    padding: 12px 16px;
    border-top: 1px solid #353b50;

    .timeline-section {
      margin-bottom: 12px;

      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .progress-text {
          font-size: 12px;
          color: #8b8fa4;
        }

        .progress-percent {
          font-size: 14px;
          font-weight: 600;
          color: #409eff;
          background: rgba(64, 158, 255, 0.15);
          padding: 2px 10px;
          border-radius: 10px;
        }
      }

      .timeline-track {
        display: flex;
        align-items: center;
        gap: 12px;

        .time-display {
          font-size: 12px;
          color: #8b8fa4;
          font-family: monospace;
          min-width: 60px;

          &.end {
            text-align: right;
          }
        }

        .timeline-slider {
          flex: 1;
          position: relative;

          :deep(.el-slider__runway) {
            background: #353b50;
          }

          :deep(.el-slider__bar) {
            background: #409eff;
          }

          .alarm-markers {
            position: absolute;
            top: -8px;
            left: 0;
            right: 0;
            height: 20px;
            pointer-events: none;

            .alarm-marker {
              position: absolute;
              transform: translateX(-50%);
              color: #ff4d4f;
              font-size: 14px;
              cursor: pointer;
              pointer-events: auto;

              &:hover {
                color: #ff7875;
              }
            }
          }
        }
      }
    }

    .player-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .control-left {
        display: flex;
        gap: 8px;

        .play-buttons {
          .el-button {
            background: #353b50;
            border-color: #353b50;
            color: #fff;

            &:hover {
              background: #454c66;
            }
          }

          .play-btn {
            padding: 8px 16px;

            &.playing {
              background: #ff4d4f;
              border-color: #ff4d4f;
            }
          }
        }
      }

      .control-center {
        .speed-control {
          display: flex;
          align-items: center;
          gap: 8px;

          .label {
            font-size: 12px;
            color: #8b8fa4;
          }

          .speed-buttons {
            display: flex;
            gap: 4px;

            .speed-btn {
              padding: 4px 8px;
              background: #353b50;
              color: #8b8fa4;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s;

              &:hover {
                color: #fff;
              }

              &.active {
                background: #409eff;
                color: #fff;
              }
            }
          }
        }
      }

      .control-right {
        .current-info {
          display: flex;
          gap: 20px;

          .info-group {
            display: flex;
            flex-direction: column;
            gap: 2px;

            .info-label {
              font-size: 11px;
              color: #666;
            }

            .info-value {
              font-size: 13px;
              color: #fff;

              small {
                color: #8b8fa4;
                font-size: 11px;
              }
            }

            &.location {
              max-width: 200px;

              .info-value {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }
          }
        }
      }
    }
  }

  .no-track-tip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1e2e;
    margin: 12px;
    border-radius: 8px;

    :deep(.el-empty__description) {
      color: #8b8fa4;
    }
  }

  .content-data-panel {
    background: #252a3d;
    border-top: 1px solid #353b50;
    transition: all 0.3s ease;

    &.collapsed {
      .panel-content {
        display: none;
      }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 1px solid #353b50;

      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }

      .panel-tabs {
        display: flex;
        gap: 16px;

        .panel-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 13px;
          color: #8b8fa4;
          cursor: pointer;
          transition: all 0.2s;

          .el-icon {
            font-size: 14px;
          }

          &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
          }

          &.active {
            color: #409eff;
            background: rgba(64, 158, 255, 0.15);
          }
        }
      }

      .panel-toggle {
        color: #8b8fa4;
        padding: 4px;

        .el-icon {
          font-size: 16px;
        }
      }
    }

    .panel-content {
      padding: 12px 16px;

      .track-list,
      .alarm-list,
      .stop-list {
        :deep(.el-table) {
          background: transparent;

          .el-table__header-wrapper {
            th {
              background: #1a1e2e !important;
              color: #8b8fa4;
              border-bottom: 1px solid #353b50;
              font-weight: 500;
            }
          }

          .el-table__body-wrapper {
            tr {
              background: transparent;

              &:hover > td {
                background: rgba(64, 158, 255, 0.1) !important;
              }

              &.current-row > td {
                background: rgba(64, 158, 255, 0.2) !important;
              }

              td {
                border-bottom: 1px solid #353b50;
                color: #c9cdd4;
              }
            }
          }

          &::before {
            display: none;
          }

          .time-cell {
            font-family: monospace;
            color: #67c23a;
          }
        }

        .table-pagination {
          display: flex;
          justify-content: flex-end;
          padding-top: 12px;

          :deep(.el-pagination) {
            --el-pagination-bg-color: transparent;
            --el-pagination-text-color: #8b8fa4;
            --el-pagination-button-disabled-bg-color: transparent;

            .el-pager li {
              background: transparent;
              color: #8b8fa4;

              &.is-active {
                color: #409eff;
              }
            }

            button {
              background: transparent;
              color: #8b8fa4;
            }
          }
        }

        .empty-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #8b8fa4;
          gap: 8px;

          .el-icon {
            font-size: 40px;
            color: #67c23a;
          }

          span {
            font-size: 13px;
          }
        }
      }
    }
  }
}
</style>

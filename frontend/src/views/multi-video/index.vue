<template>
  <div class="multi-track-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 返回按钮 -->
        <button class="back-button" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>

        <el-divider direction="vertical" />

        <!-- 时间选择 -->
        <div class="time-picker-group">
          <span class="label">开始时间：</span>
          <el-date-picker
            v-model="queryParams.startTime"
            type="datetime"
            placeholder="开始时间"
            size="small"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </div>
        <div class="time-picker-group">
          <span class="label">结束时间：</span>
          <el-date-picker
            v-model="queryParams.endTime"
            type="datetime"
            placeholder="结束时间"
            size="small"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </div>

        <!-- 选择车辆按钮 -->
        <el-button size="small" @click="showVehicleDialog = true">
          <el-icon><Van /></el-icon>
          {{ selectedVehicles.length > 0 ? `已选择：${selectedVehicles.length}` : '选择车辆' }}
        </el-button>

        <!-- 查询按钮 -->
        <el-button type="primary" size="small" :loading="loading" @click="queryAllTracks">
          <el-icon><Search /></el-icon>
          查询
        </el-button>

        <!-- 停止按钮 -->
        <el-button size="small" :disabled="!isPlaying" @click="stopAllPlayback">
          <el-icon><VideoPause /></el-icon>
          停止
        </el-button>
      </div>

      <div class="toolbar-center">
        <div class="status-info">
          <span class="info-item">
            <el-icon><Monitor /></el-icon>
            <span>{{ trackWindows.length }} 个窗口</span>
          </span>
          <span class="info-item playing" v-if="playingCount > 0">
            <span class="status-dot"></span>
            <span>{{ playingCount }} 播放中</span>
          </span>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- 布局选择 -->
        <el-button-group class="layout-group">
          <el-tooltip v-for="layout in layouts" :key="layout.value" :content="layout.label" placement="bottom">
            <el-button
              :type="currentLayout === layout.value ? 'primary' : 'default'"
              size="small"
              @click="setLayout(layout.value)"
            >
              <el-icon><component :is="layout.icon" /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <el-divider direction="vertical" />

        <!-- 播放控制 -->
        <el-button-group>
          <el-tooltip content="全部播放" placement="bottom">
            <el-button size="small" :icon="VideoPlay" @click="playAllTracks" :disabled="trackWindows.length === 0" />
          </el-tooltip>
          <el-tooltip content="全部暂停" placement="bottom">
            <el-button size="small" :icon="VideoPause" @click="pauseAllTracks" :disabled="!isPlaying" />
          </el-tooltip>
        </el-button-group>

        <el-divider direction="vertical" />

        <!-- 播放速度 -->
        <div class="speed-control">
          <span class="label">速度:</span>
          <el-select v-model="playSpeed" size="small" style="width: 80px">
            <el-option v-for="s in [0.5, 1, 2, 4, 8, 16]" :key="s" :label="`${s}x`" :value="s" />
          </el-select>
        </div>

        <el-divider direction="vertical" />

        <el-tooltip content="清空全部" placement="bottom">
          <el-button size="small" :icon="Delete" @click="clearAll" />
        </el-tooltip>
      </div>
    </div>

    <!-- 地图网格 -->
    <div class="map-grid-container">
      <div class="map-grid" :class="`grid-${currentLayout}`">
        <div
          v-for="(window, index) in gridWindows"
          :key="index"
          class="map-cell"
          :class="{
            active: selectedWindowIndex === index,
            'has-track': window.vehicle,
            'is-playing': window.isPlaying,
            'is-loading': window.loading
          }"
          @click="selectWindow(index)"
        >
          <!-- 有轨迹的窗口 -->
          <template v-if="window.vehicle">
            <div class="map-wrapper">
              <!-- 地图容器 -->
              <div :id="`mapContainer-${index}`" class="map-container"></div>

              <!-- 加载状态 -->
              <div class="loading-overlay" v-if="window.loading">
                <div class="loading-spinner"></div>
                <span>加载轨迹中...</span>
              </div>

              <!-- 顶部信息栏 -->
              <div class="window-header">
                <div class="header-left">
                  <span class="plate-no">{{ window.vehicle.plateNo || window.vehicle.deviceId }}</span>
                  <el-tag size="small" type="info" effect="dark">{{ window.mileage }} km</el-tag>
                </div>
                <div class="header-right">
                  <el-tooltip content="最大化" placement="bottom">
                    <el-button size="small" circle :icon="FullScreen" @click.stop="maximizeWindow(index)" />
                  </el-tooltip>
                  <el-tooltip content="最佳视角" placement="bottom">
                    <el-button size="small" circle :icon="Aim" @click.stop="fitView(index)" />
                  </el-tooltip>
                  <el-tooltip content="关闭" placement="bottom">
                    <el-button size="small" circle :icon="Close" type="danger" @click.stop="closeWindow(index)" />
                  </el-tooltip>
                </div>
              </div>

              <!-- 播放进度条 -->
              <div class="playback-bar" v-if="window.trackData.length > 0">
                <div class="progress-info">
                  <span>{{ window.currentIndex + 1 }} / {{ window.trackData.length }}</span>
                  <span>{{ formatTime(window.trackData[window.currentIndex]?.time) }}</span>
                </div>
                <el-slider
                  v-model="window.currentIndex"
                  :min="0"
                  :max="Math.max(window.trackData.length - 1, 0)"
                  :show-tooltip="false"
                  size="small"
                  @change="(val: number) => handleSliderChange(index, val)"
                />
                <div class="playback-controls">
                  <el-button
                    size="small"
                    circle
                    :icon="window.isPlaying ? VideoPause : VideoPlay"
                    :type="window.isPlaying ? 'danger' : 'primary'"
                    @click.stop="toggleWindowPlayback(index)"
                  />
                </div>
              </div>

              <!-- 窗口序号 -->
              <div class="window-number">{{ index + 1 }}</div>
            </div>
          </template>

          <!-- 空窗口 -->
          <template v-else>
            <div class="empty-cell">
              <el-icon class="add-icon"><Plus /></el-icon>
              <span class="add-text">请选择车辆后查询</span>
              <span class="cell-number">{{ index + 1 }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 车辆选择对话框 -->
    <el-dialog
      v-model="showVehicleDialog"
      title="选择车辆"
      width="500px"
      :close-on-click-modal="false"
      class="vehicle-dialog"
    >
      <div class="vehicle-dialog-content">
        <div class="search-box">
          <el-input
            v-model="vehicleSearchKeyword"
            placeholder="请输入名称或编号"
            prefix-icon="Search"
            clearable
            @input="handleVehicleSearch"
          />
        </div>

        <div class="tree-container">
          <el-tree
            ref="vehicleTreeRef"
            :data="vehicleTreeData"
            :props="treeProps"
            node-key="id"
            show-checkbox
            default-expand-all
            :filter-node-method="filterVehicleNode"
            @check-change="handleTreeCheckChange"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon v-if="data.children" class="node-icon">
                  <OfficeBuilding />
                </el-icon>
                <template v-else>
                  <span class="status-dot" :class="data.online ? 'online' : 'offline'"></span>
                </template>
                <span class="node-label">{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>

        <div class="selected-info">
          <span>已选择 {{ selectedVehicles.length }} 辆车</span>
          <el-button link type="primary" @click="clearVehicleSelection">清空选择</el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="showVehicleDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmVehicleSelection">
          <el-icon><Check /></el-icon>
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  ArrowLeft,
  Van,
  Monitor,
  VideoPlay,
  VideoPause,
  Delete,
  Plus,
  Close,
  FullScreen,
  Aim,
  Check,
  OfficeBuilding,
  MoreFilled,
  Grid,
  Menu
} from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getVehicles, getVehicleTrack } from '@/api/vehicle'
import carMarkerIcon from '@/assets/images/car-marker.svg'

const router = useRouter()

// 布局配置
const layouts = [
  { label: '单画面 (1x1)', value: 1, icon: 'FullScreen' },
  { label: '四画面 (2x2)', value: 4, icon: 'Grid' },
  { label: '九画面 (3x3)', value: 9, icon: 'Menu' },
  { label: '十六画面 (4x4)', value: 16, icon: 'Grid' }
]

const currentLayout = ref(4)
const selectedWindowIndex = ref<number | null>(null)
const loading = ref(false)
const playSpeed = ref(1)
const isPlaying = ref(false)
let AMapInstance: any = null

// 查询参数
const queryParams = ref({
  startTime: getDefaultStartTime(),
  endTime: getDefaultEndTime()
})

function getDefaultStartTime() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return formatDateTime(today)
}

function getDefaultEndTime() {
  const today = new Date()
  today.setHours(23, 59, 59, 0)
  return formatDateTime(today)
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '--:--:--'
  return timeStr.substring(11) || '--:--:--'
}

// 轨迹窗口数据
interface TrackWindow {
  vehicle: any | null
  map: any | null
  polyline: any | null
  passedPolyline: any | null
  marker: any | null
  trackData: any[]
  currentIndex: number
  isPlaying: boolean
  loading: boolean
  mileage: string
  playTimer: any | null
}

const trackWindows = ref<TrackWindow[]>([])

// 计算网格窗口 - 根据实际轨迹窗口数量动态显示
const gridWindows = computed(() => {
  return trackWindows.value
})

// 播放中的数量
const playingCount = computed(() => trackWindows.value.filter(w => w.isPlaying).length)

function createEmptyWindow(): TrackWindow {
  return {
    vehicle: null,
    map: null,
    polyline: null,
    passedPolyline: null,
    marker: null,
    trackData: [],
    currentIndex: 0,
    isPlaying: false,
    loading: false,
    mileage: '0',
    playTimer: null
  }
}

// 车辆选择
const showVehicleDialog = ref(false)
const vehicleSearchKeyword = ref('')
const vehicleTreeRef = ref()
const selectedVehicles = ref<any[]>([])
const tempSelectedVehicles = ref<any[]>([])

const treeProps = {
  children: 'children',
  label: 'label'
}

const vehicleTreeData = ref<any[]>([])

// 加载车辆列表
const loadVehicles = async () => {
  try {
    const res = await getVehicles({ pageSize: 1000 })
    if (res.code === 0 && res.data.list) {
      const groupMap = new Map<string, any[]>()
      res.data.list.forEach((v: any) => {
        const groupName = v.groupName || 'JT808设备'
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, [])
        }
        groupMap.get(groupName)!.push({
          id: `v-${v.id}`,
          label: v.plateNo,
          plateNo: v.plateNo,
          deviceId: v.deviceId,
          online: v.online
        })
      })

      const treeData: any[] = []
      let groupIndex = 1
      let totalOnline = 0
      let total = 0

      groupMap.forEach((vehicles, groupName) => {
        const onlineCount = vehicles.filter(v => v.online).length
        totalOnline += onlineCount
        total += vehicles.length
        treeData.push({
          id: `g-${groupIndex++}`,
          label: `${groupName} (${onlineCount}/${vehicles.length})`,
          children: vehicles
        })
      })

      vehicleTreeData.value = [{
        id: 'root',
        label: `监控中心 (${totalOnline}/${total})`,
        children: treeData
      }]
    }
  } catch (error) {
    console.error('加载车辆列表失败:', error)
  }
}

// 过滤车辆节点
const filterVehicleNode = (value: string, data: any) => {
  if (!value) return true
  return data.label.toLowerCase().includes(value.toLowerCase())
}

// 搜索车辆
const handleVehicleSearch = () => {
  vehicleTreeRef.value?.filter(vehicleSearchKeyword.value)
}

// 树节点选中变化
const handleTreeCheckChange = () => {
  const checkedNodes = vehicleTreeRef.value?.getCheckedNodes(true) || []
  tempSelectedVehicles.value = checkedNodes.filter((n: any) => !n.children)
}

// 清空车辆选择
const clearVehicleSelection = () => {
  vehicleTreeRef.value?.setCheckedKeys([])
  tempSelectedVehicles.value = []
}

// 确认车辆选择
const confirmVehicleSelection = () => {
  selectedVehicles.value = [...tempSelectedVehicles.value]
  showVehicleDialog.value = false
  ElMessage.success(`已选择 ${selectedVehicles.value.length} 辆车`)
}

// 返回
const goBack = () => {
  router.back()
}

// 设置布局
const setLayout = (layout: number) => {
  currentLayout.value = layout
}

// 选择窗口
const selectWindow = (index: number) => {
  selectedWindowIndex.value = index
}

// 初始化AMap
const initAMap = async () => {
  try {
    AMapInstance = await AMapLoader.load({
      key: '0236671cfb04ddf41d952d0a47b78106',
      version: '1.4.15',
      plugins: ['AMap.Scale', 'AMap.ToolBar']
    })
  } catch (error) {
    console.error('AMap init error:', error)
  }
}

// 初始化窗口地图
const initWindowMap = async (index: number) => {
  if (!AMapInstance) return null

  await nextTick()
  const containerId = `mapContainer-${index}`
  const container = document.getElementById(containerId)
  if (!container) return null

  const map = new AMapInstance.Map(containerId, {
    zoom: 12,
    center: [121.4737, 31.2304],
    mapStyle: 'amap://styles/normal'
  })

  map.addControl(new AMapInstance.Scale())

  return map
}

// 根据车辆数量自动计算最佳布局
function calculateOptimalLayout(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 4
  if (count <= 9) return 9
  if (count <= 16) return 16
  return 16 // 最多16个窗口
}

// 查询所有轨迹
const queryAllTracks = async () => {
  if (selectedVehicles.value.length === 0) {
    ElMessage.warning('请先选择车辆')
    return
  }

  if (!queryParams.value.startTime || !queryParams.value.endTime) {
    ElMessage.warning('请选择时间范围')
    return
  }

  loading.value = true
  stopAllPlayback()

  // 清空现有窗口
  trackWindows.value.forEach(w => {
    if (w.map) {
      w.map.destroy()
    }
    if (w.playTimer) {
      clearInterval(w.playTimer)
    }
  })
  trackWindows.value = []

  // 根据选中车辆数量自动调整布局
  const vehicleCount = selectedVehicles.value.length
  currentLayout.value = calculateOptimalLayout(vehicleCount)

  // 为每个选中的车辆创建窗口并查询轨迹（最多16个）
  const maxWindows = Math.min(vehicleCount, 16)
  for (let i = 0; i < maxWindows; i++) {
    const vehicle = selectedVehicles.value[i]
    const window = createEmptyWindow()
    window.vehicle = vehicle
    window.loading = true
    trackWindows.value.push(window)
  }

  // 等待DOM更新后初始化地图
  await nextTick()

  // 并行查询所有轨迹
  const queryPromises = trackWindows.value.map(async (window, index) => {
    try {
      // 初始化地图
      window.map = await initWindowMap(index)

      // 查询轨迹
      const res = await getVehicleTrack(window.vehicle.deviceId, {
        startTime: queryParams.value.startTime,
        endTime: queryParams.value.endTime
      })

      if (res.code === 0 && res.data && res.data.track && res.data.track.length > 0) {
        window.trackData = res.data.track.map((p: any) => ({
          lng: p.lng,
          lat: p.lat,
          speed: p.speed,
          direction: p.direction,
          time: p.time
        }))
        window.mileage = calculateMileage(window.trackData)
        drawTrack(index)
      } else {
        window.trackData = []
        window.mileage = '0'
      }
    } catch (error) {
      console.error(`查询车辆 ${window.vehicle.plateNo} 轨迹失败:`, error)
      window.trackData = []
    } finally {
      window.loading = false
    }
  })

  await Promise.all(queryPromises)
  loading.value = false

  const successCount = trackWindows.value.filter(w => w.trackData.length > 0).length
  ElMessage.success(`查询完成，${successCount}/${trackWindows.value.length} 辆车有轨迹数据`)
}

// 计算里程
function calculateMileage(trackData: any[]): string {
  if (trackData.length < 2) return '0'
  let total = 0
  for (let i = 1; i < trackData.length; i++) {
    const p1 = trackData[i - 1]
    const p2 = trackData[i]
    total += calculateDistance(p1.lng, p1.lat, p2.lng, p2.lat)
  }
  return total.toFixed(2)
}

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

// 绘制轨迹
function drawTrack(index: number) {
  const window = trackWindows.value[index]
  if (!window || !window.map || !AMapInstance || window.trackData.length === 0) return

  const map = window.map
  const path = window.trackData.map(p => [p.lng, p.lat])

  // 清除旧轨迹
  if (window.polyline) map.remove(window.polyline)
  if (window.passedPolyline) map.remove(window.passedPolyline)
  if (window.marker) map.remove(window.marker)

  // 绘制完整轨迹（蓝色）
  window.polyline = new AMapInstance.Polyline({
    path: path,
    strokeColor: '#3388ff',
    strokeWeight: 4,
    strokeOpacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  })
  map.add(window.polyline)

  // 绘制已走过的轨迹（绿色）
  window.passedPolyline = new AMapInstance.Polyline({
    path: [],
    strokeColor: '#00cc00',
    strokeWeight: 6,
    strokeOpacity: 1,
    lineJoin: 'round',
    lineCap: 'round'
  })
  map.add(window.passedPolyline)

  // 创建车辆标记
  window.marker = new AMapInstance.Marker({
    position: path[0],
    icon: new AMapInstance.Icon({
      size: new AMapInstance.Size(40, 40),
      image: carMarkerIcon,
      imageSize: new AMapInstance.Size(40, 40)
    }),
    offset: new AMapInstance.Pixel(-20, -20),
    angle: window.trackData[0].direction || 0
  })
  map.add(window.marker)

  // 添加起点标记
  const startMarker = new AMapInstance.Marker({
    position: path[0],
    content: '<div style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;">起</div>',
    offset: new AMapInstance.Pixel(-12, -24)
  })
  map.add(startMarker)

  // 添加终点标记
  const endMarker = new AMapInstance.Marker({
    position: path[path.length - 1],
    content: '<div style="background:#ff4d4f;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;">终</div>',
    offset: new AMapInstance.Pixel(-12, -24)
  })
  map.add(endMarker)

  // 调整地图视野
  map.setFitView()
}

// 更新播放位置
function updatePlayPosition(index: number) {
  const window = trackWindows.value[index]
  if (!window || !window.marker || !window.passedPolyline || window.trackData.length === 0) return

  const point = window.trackData[window.currentIndex]
  if (!point) return

  // 更新车辆位置
  window.marker.setPosition([point.lng, point.lat])
  window.marker.setAngle(point.direction || 0)

  // 更新已走过的轨迹
  const passedPath = window.trackData.slice(0, window.currentIndex + 1).map(p => [p.lng, p.lat])
  window.passedPolyline.setPath(passedPath)

  // 地图跟随
  window.map?.setCenter([point.lng, point.lat])
}

// 滑块变化
function handleSliderChange(index: number, val: number) {
  const window = trackWindows.value[index]
  if (window) {
    window.currentIndex = val
    updatePlayPosition(index)
  }
}

// 切换窗口播放
function toggleWindowPlayback(index: number) {
  const window = trackWindows.value[index]
  if (!window || window.trackData.length === 0) return

  if (window.isPlaying) {
    // 暂停
    if (window.playTimer) {
      clearInterval(window.playTimer)
      window.playTimer = null
    }
    window.isPlaying = false
  } else {
    // 播放
    if (window.currentIndex >= window.trackData.length - 1) {
      window.currentIndex = 0
    }
    window.isPlaying = true
    window.playTimer = setInterval(() => {
      if (window.currentIndex < window.trackData.length - 1) {
        window.currentIndex++
        updatePlayPosition(index)
      } else {
        if (window.playTimer) {
          clearInterval(window.playTimer)
          window.playTimer = null
        }
        window.isPlaying = false
      }
    }, 1000 / playSpeed.value)
  }
  updateIsPlaying()
}

// 全部播放
function playAllTracks() {
  trackWindows.value.forEach((window, index) => {
    if (window.trackData.length > 0 && !window.isPlaying) {
      toggleWindowPlayback(index)
    }
  })
}

// 全部暂停
function pauseAllTracks() {
  trackWindows.value.forEach((window, index) => {
    if (window.isPlaying) {
      toggleWindowPlayback(index)
    }
  })
}

// 停止所有播放
function stopAllPlayback() {
  trackWindows.value.forEach((window, index) => {
    if (window.playTimer) {
      clearInterval(window.playTimer)
      window.playTimer = null
    }
    window.isPlaying = false
    window.currentIndex = 0
    updatePlayPosition(index)
  })
  isPlaying.value = false
}

// 更新全局播放状态
function updateIsPlaying() {
  isPlaying.value = trackWindows.value.some(w => w.isPlaying)
}

// 监听播放速度变化
watch(playSpeed, () => {
  trackWindows.value.forEach((window, index) => {
    if (window.isPlaying && window.playTimer) {
      clearInterval(window.playTimer)
      window.playTimer = setInterval(() => {
        if (window.currentIndex < window.trackData.length - 1) {
          window.currentIndex++
          updatePlayPosition(index)
        } else {
          if (window.playTimer) {
            clearInterval(window.playTimer)
            window.playTimer = null
          }
          window.isPlaying = false
          updateIsPlaying()
        }
      }, 1000 / playSpeed.value)
    }
  })
})

// 最大化窗口
function maximizeWindow(index: number) {
  const window = trackWindows.value[index]
  if (!window) return

  // 保存当前窗口，切换到单画面
  const temp = { ...window }
  setLayout(1)
  trackWindows.value = [temp]

  nextTick(() => {
    initWindowMap(0).then(map => {
      if (trackWindows.value[0]) {
        trackWindows.value[0].map = map
        drawTrack(0)
      }
    })
  })
}

// 最佳视角
function fitView(index: number) {
  const window = trackWindows.value[index]
  if (window && window.map) {
    window.map.setFitView()
  }
}

// 关闭窗口
function closeWindow(index: number) {
  const window = trackWindows.value[index]
  if (window) {
    if (window.playTimer) {
      clearInterval(window.playTimer)
    }
    if (window.map) {
      window.map.destroy()
    }
    trackWindows.value.splice(index, 1)
  }
}

// 清空全部
function clearAll() {
  trackWindows.value.forEach(window => {
    if (window.playTimer) {
      clearInterval(window.playTimer)
    }
    if (window.map) {
      window.map.destroy()
    }
  })
  trackWindows.value = []
  selectedVehicles.value = []
  isPlaying.value = false
  ElMessage.success('已清空所有轨迹')
}

onMounted(async () => {
  await initAMap()
  await loadVehicles()
})

onUnmounted(() => {
  trackWindows.value.forEach(window => {
    if (window.playTimer) {
      clearInterval(window.playTimer)
    }
    if (window.map) {
      window.map.destroy()
    }
  })
})
</script>

<style lang="scss" scoped>
.multi-track-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

// 工具栏
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  gap: 16px;
  flex-shrink: 0;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-center {
    flex: 1;
    display: flex;
    justify-content: center;

    .status-info {
      display: flex;
      align-items: center;
      gap: 20px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #94a3b8;

        &.playing {
          color: #22c55e;

          .status-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          }
        }
      }
    }
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
    font-family: inherit;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .time-picker-group {
    display: flex;
    align-items: center;
    gap: 6px;

    .label {
      color: #94a3b8;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  .speed-control {
    display: flex;
    align-items: center;
    gap: 6px;

    .label {
      color: #94a3b8;
      font-size: 13px;
    }
  }

  :deep(.el-divider--vertical) {
    border-color: #334155;
    height: 24px;
  }
}

// 地图网格
.map-grid-container {
  flex: 1;
  padding: 8px;
  overflow: hidden;
}

.map-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 6px;

  &.grid-1 { grid-template-columns: 1fr; }
  &.grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
  &.grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.grid-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
}

.map-cell {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
  }

  &.active {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  &.is-playing {
    border-color: #22c55e;
  }

  &.is-loading {
    border-color: #f59e0b;
  }
}

.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  .map-container {
    width: 100%;
    height: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(15, 23, 42, 0.9);
    color: #94a3b8;
    z-index: 100;

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  .window-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
    z-index: 10;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .plate-no {
        color: #fff;
        font-weight: 600;
        font-size: 13px;
      }
    }

    .header-right {
      display: flex;
      gap: 4px;

      :deep(.el-button) {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        color: #fff;

        &:hover {
          background: rgba(59, 130, 246, 0.8);
        }

        &.el-button--danger:hover {
          background: rgba(239, 68, 68, 0.8);
        }
      }
    }
  }

  .playback-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 12px;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
    z-index: 10;

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    :deep(.el-slider) {
      margin: 4px 0;

      .el-slider__runway {
        background: rgba(255, 255, 255, 0.2);
        height: 4px;
      }

      .el-slider__bar {
        background: #3b82f6;
        height: 4px;
      }

      .el-slider__button-wrapper {
        top: -14px;
      }

      .el-slider__button {
        width: 12px;
        height: 12px;
        border-color: #3b82f6;
      }
    }

    .playback-controls {
      display: flex;
      justify-content: center;
      margin-top: 4px;
    }
  }

  .window-number {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 4px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    z-index: 5;
  }
}

.empty-cell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #64748b;

  .add-icon {
    font-size: 36px;
    color: #475569;
  }

  .add-text {
    font-size: 13px;
  }

  .cell-number {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }
}

// 车辆选择对话框
.vehicle-dialog {
  :deep(.el-dialog) {
    background: #1e293b;
    border-radius: 12px;

    .el-dialog__header {
      background: #0f172a;
      padding: 16px 20px;
      margin: 0;
      border-radius: 12px 12px 0 0;

      .el-dialog__title {
        color: #e2e8f0;
      }
    }

    .el-dialog__body {
      padding: 20px;
    }

    .el-dialog__footer {
      background: #0f172a;
      padding: 16px 20px;
      border-radius: 0 0 12px 12px;
    }
  }
}

.vehicle-dialog-content {
  .search-box {
    margin-bottom: 16px;
  }

  .tree-container {
    height: 350px;
    overflow-y: auto;
    background: #0f172a;
    border-radius: 8px;
    padding: 8px;

    :deep(.el-tree) {
      background: transparent;
      color: #e2e8f0;

      .el-tree-node__content {
        &:hover {
          background: rgba(59, 130, 246, 0.1);
        }
      }

      .el-checkbox__inner {
        background: transparent;
        border-color: #475569;
      }

      .el-checkbox__input.is-checked .el-checkbox__inner {
        background: #3b82f6;
        border-color: #3b82f6;
      }
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 8px;

      .node-icon {
        color: #60a5fa;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.online {
          background: #22c55e;
        }
        &.offline {
          background: #64748b;
        }
      }
    }
  }

  .selected-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #334155;
    color: #94a3b8;
    font-size: 13px;
  }
}

// 动画
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

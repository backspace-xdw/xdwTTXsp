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
      <!-- 顶部查询条件 -->
      <div class="content-header">
        <div class="query-form">
          <div class="form-item">
            <label>选中车辆：</label>
            <el-tag v-if="selectedVehicle" type="primary" size="small">
              {{ selectedVehicle.plateNo }}
            </el-tag>
            <span v-else class="no-vehicle">请选择车辆</span>
          </div>
          <div class="form-item">
            <label>开始时间：</label>
            <el-date-picker
              v-model="queryParams.startTime"
              type="datetime"
              placeholder="选择开始时间"
              size="small"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </div>
          <div class="form-item">
            <label>结束时间：</label>
            <el-date-picker
              v-model="queryParams.endTime"
              type="datetime"
              placeholder="选择结束时间"
              size="small"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </div>
          <el-button type="primary" size="small" :icon="Search" @click="queryTrack" :loading="loading">
            查询轨迹
          </el-button>
          <el-button size="small" :icon="Refresh" @click="resetQuery">
            重置
          </el-button>
        </div>

        <div class="toolbar-right">
          <el-button size="small" :icon="Download" @click="exportTrack">导出轨迹</el-button>
          <el-button size="small" :icon="FullScreen" @click="toggleFullScreen">全屏</el-button>
        </div>
      </div>

      <!-- 地图区域 -->
      <div class="content-map" ref="mapWrapperRef">
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
          <div class="info-item">
            <span class="label">轨迹点数：</span>
            <span class="value">{{ trackData.length }}</span>
          </div>
          <div class="info-item">
            <span class="label">总里程：</span>
            <span class="value">{{ totalMileage }} km</span>
          </div>
          <div class="info-item">
            <span class="label">总时长：</span>
            <span class="value">{{ totalDuration }}</span>
          </div>
          <div class="info-item">
            <span class="label">平均速度：</span>
            <span class="value">{{ avgSpeed }} km/h</span>
          </div>
        </div>
      </div>

      <!-- 播放控制区 -->
      <div class="content-player" v-if="trackData.length > 0">
        <!-- 时间轴 -->
        <div class="timeline-wrapper">
          <div class="current-time">{{ currentTimeStr }}</div>
          <el-slider
            v-model="currentIndex"
            :min="0"
            :max="trackData.length - 1"
            :show-tooltip="false"
            @change="handleSliderChange"
          />
          <div class="end-time">{{ endTimeStr }}</div>
        </div>

        <!-- 播放控制按钮 -->
        <div class="player-controls">
          <div class="control-left">
            <el-button-group>
              <el-button size="small" :icon="DArrowLeft" @click="skipBackward" title="后退10秒" />
              <el-button size="small" :icon="isPlaying ? VideoPause : VideoPlay" @click="togglePlay">
                {{ isPlaying ? '暂停' : '播放' }}
              </el-button>
              <el-button size="small" :icon="DArrowRight" @click="skipForward" title="前进10秒" />
            </el-button-group>
            <el-button size="small" :icon="RefreshLeft" @click="resetPlayback" title="重新开始" />
          </div>

          <div class="control-center">
            <div class="speed-control">
              <span class="label">播放速度：</span>
              <el-select v-model="playSpeed" size="small" style="width: 100px">
                <el-option label="0.5x" :value="0.5" />
                <el-option label="1x" :value="1" />
                <el-option label="2x" :value="2" />
                <el-option label="4x" :value="4" />
                <el-option label="8x" :value="8" />
                <el-option label="16x" :value="16" />
              </el-select>
            </div>
          </div>

          <div class="control-right">
            <div class="current-info">
              <span class="info-label">当前速度：</span>
              <span class="info-value">{{ currentPoint?.speed || 0 }} km/h</span>
              <span class="info-label" style="margin-left: 16px;">位置：</span>
              <span class="info-value">{{ currentPoint?.address || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 无轨迹提示 -->
      <div class="no-track-tip" v-else>
        <el-empty description="请选择车辆并查询轨迹" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  Search,
  Refresh,
  Download,
  FullScreen,
  MapLocation,
  Picture,
  VideoPlay,
  VideoPause,
  DArrowLeft,
  DArrowRight,
  RefreshLeft,
  OfficeBuilding
} from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { ElMessage } from 'element-plus'

// 地图相关
let map: any = null
let polyline: any = null
let marker: any = null
let passedPolyline: any = null
let AMapInstance: any = null

const mapWrapperRef = ref<HTMLElement>()
const mapType = ref('normal')

// 车辆树
const vehicleTreeRef = ref()
const searchKeyword = ref('')
const treeProps = {
  children: 'children',
  label: 'label'
}

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

// 查询参数
const queryParams = ref({
  startTime: '',
  endTime: ''
})

// 加载状态
const loading = ref(false)

// 轨迹数据
const trackData = ref<any[]>([])

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
  // 简单计算总里程
  let total = 0
  for (let i = 1; i < trackData.value.length; i++) {
    const p1 = trackData.value[i - 1]
    const p2 = trackData.value[i]
    total += calculateDistance(p1.lng, p1.lat, p2.lng, p2.lat)
  }
  return total.toFixed(2)
})

const totalDuration = computed(() => {
  if (trackData.value.length < 2) return '0分钟'
  const start = new Date(trackData.value[0].time).getTime()
  const end = new Date(trackData.value[trackData.value.length - 1].time).getTime()
  const minutes = Math.floor((end - start) / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
})

const avgSpeed = computed(() => {
  if (trackData.value.length === 0) return '0'
  const total = trackData.value.reduce((sum, p) => sum + (p.speed || 0), 0)
  return (total / trackData.value.length).toFixed(1)
})

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
    queryParams.value.startTime = formatDateTime(start)
    queryParams.value.endTime = formatDateTime(end)
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
  if (!queryParams.value.startTime || !queryParams.value.endTime) {
    ElMessage.warning('请选择时间范围')
    return
  }

  loading.value = true
  stopPlayback()

  try {
    // 模拟API请求 - 生成模拟轨迹数据
    await new Promise(resolve => setTimeout(resolve, 500))
    trackData.value = generateMockTrackData()
    currentIndex.value = 0

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
  const startTime = new Date(queryParams.value.startTime).getTime()

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

// 绘制轨迹
function drawTrack() {
  if (!map || !AMapInstance || trackData.value.length === 0) return

  // 清除旧轨迹
  if (polyline) {
    map.remove(polyline)
  }
  if (passedPolyline) {
    map.remove(passedPolyline)
  }
  if (marker) {
    map.remove(marker)
  }

  const path = trackData.value.map(p => [p.lng, p.lat])

  // 绘制完整轨迹（灰色）
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

// 重置查询
const resetQuery = () => {
  selectedVehicle.value = null
  queryParams.value = {
    startTime: '',
    endTime: ''
  }
  trackData.value = []
  stopPlayback()

  // 清除地图上的轨迹
  if (polyline) {
    map.remove(polyline)
    polyline = null
  }
  if (passedPolyline) {
    map.remove(passedPolyline)
    passedPolyline = null
  }
  if (marker) {
    map.remove(marker)
    marker = null
  }
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
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
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
  background: #f5f5f5;

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    .query-form {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .form-item {
        display: flex;
        align-items: center;
        gap: 8px;

        label {
          font-size: 13px;
          color: #666;
          white-space: nowrap;
        }

        .no-vehicle {
          color: #999;
          font-size: 13px;
        }
      }
    }

    .toolbar-right {
      display: flex;
      gap: 8px;
    }
  }

  .content-map {
    flex: 1;
    position: relative;
    margin: 12px;
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
      gap: 8px;
      background: #fff;
      padding: 8px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

      .map-control-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 12px;
        color: #666;

        &:hover, &.active {
          background: #e6f7ff;
          color: #1890ff;
        }

        .el-icon {
          font-size: 18px;
          margin-bottom: 4px;
        }
      }
    }

    .track-info-panel {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.95);
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

      .info-item {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 13px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          color: #666;
        }

        .value {
          color: #333;
          font-weight: 500;
        }
      }
    }
  }

  .content-player {
    background: #fff;
    padding: 16px;
    border-top: 1px solid #e8e8e8;

    .timeline-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .current-time, .end-time {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
      }

      .el-slider {
        flex: 1;
      }
    }

    .player-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .control-left {
        display: flex;
        gap: 12px;
      }

      .control-center {
        .speed-control {
          display: flex;
          align-items: center;
          gap: 8px;

          .label {
            font-size: 13px;
            color: #666;
          }
        }
      }

      .control-right {
        .current-info {
          font-size: 13px;

          .info-label {
            color: #666;
          }

          .info-value {
            color: #333;
            font-weight: 500;
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
    background: #fff;
    margin: 12px;
    border-radius: 8px;
  }
}
</style>

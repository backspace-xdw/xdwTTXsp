<template>
  <div class="multi-video-page">
    <!-- 左侧车辆列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索车牌号"
          prefix-icon="Search"
          size="small"
          clearable
        />
      </div>
      <div class="sidebar-content">
        <el-tree
          ref="treeRef"
          :data="vehicleTreeData"
          :props="treeProps"
          node-key="id"
          :filter-node-method="filterNode"
          highlight-current
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="tree-node">
              <el-icon v-if="data.children" class="node-icon">
                <OfficeBuilding />
              </el-icon>
              <span v-else class="status-dot" :class="{ online: data.online }"></span>
              <span class="node-label">{{ node.label }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧视频区域 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button
              v-for="layout in layouts"
              :key="layout.value"
              :type="currentLayout === layout.value ? 'primary' : 'default'"
              size="small"
              @click="setLayout(layout.value)"
            >
              {{ layout.label }}
            </el-button>
          </el-button-group>
        </div>
        <div class="toolbar-center">
          <span class="info-text">已选择 {{ activeCount }} 个视频</span>
        </div>
        <div class="toolbar-right">
          <el-button size="small" :icon="Camera" @click="screenshotAll">全部截图</el-button>
          <el-button size="small" :icon="VideoCamera" :type="isRecordingAll ? 'danger' : 'default'" @click="recordAll">
            {{ isRecordingAll ? '停止录像' : '全部录像' }}
          </el-button>
          <el-button size="small" :icon="FullScreen" @click="toggleFullscreen">全屏</el-button>
          <el-button size="small" :icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </div>

      <!-- 视频网格 -->
      <div class="video-grid-container" ref="gridContainerRef">
        <div class="video-grid" :class="`grid-${currentLayout}`">
          <div
            v-for="(cell, index) in gridCells"
            :key="index"
            class="video-cell"
            :class="{ active: selectedIndex === index, 'has-video': cell.vehicle }"
            @click="selectCell(index)"
          >
            <!-- 有视频 -->
            <template v-if="cell.vehicle">
              <div class="video-wrapper">
                <FlvPlayer
                  v-if="cell.vehicle.deviceId"
                  :ref="(el: any) => setPlayerRef(index, el)"
                  :device-id="cell.vehicle.deviceId"
                  :channel="cell.channel"
                  :autoplay="true"
                  :muted="cell.muted"
                  :show-controls="false"
                  class="video-player"
                />
                <div v-else class="no-stream">
                  <el-icon><VideoCamera /></el-icon>
                  <span>无设备ID</span>
                </div>

                <!-- 录像指示器 -->
                <div v-if="cell.recording" class="recording-indicator">
                  <span class="rec-dot"></span>
                  <span class="rec-text">REC</span>
                </div>

                <!-- 视频信息覆盖 -->
                <div class="video-overlay">
                  <div class="overlay-top">
                    <span class="plate">{{ cell.vehicle.plateNo }}</span>
                    <span class="channel">CH{{ cell.channel }}</span>
                  </div>
                  <div class="overlay-bottom">
                    <span class="time">{{ currentTime }}</span>
                  </div>
                </div>

                <!-- 悬停控制 -->
                <div class="video-controls">
                  <el-button size="small" :icon="Camera" circle @click.stop="screenshot(index)" />
                  <el-button size="small" :icon="VideoCamera" :type="cell.recording ? 'danger' : 'default'" circle @click.stop="toggleRecord(index)" />
                  <el-button size="small" :icon="cell.muted ? Mute : Microphone" circle @click.stop="toggleMute(index)" />
                  <el-button size="small" :icon="FullScreen" circle @click.stop="fullscreenCell(index)" />
                  <el-button size="small" :icon="Close" circle @click.stop="removeVideo(index)" />
                </div>
              </div>
            </template>

            <!-- 空单元格 -->
            <template v-else>
              <div class="empty-cell">
                <el-icon class="add-icon"><Plus /></el-icon>
                <span>点击车辆添加</span>
                <span class="cell-number">{{ index + 1 }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 通道选择对话框 -->
    <el-dialog v-model="channelDialogVisible" title="选择通道" width="300px">
      <el-radio-group v-model="selectedChannel" class="channel-group">
        <el-radio v-for="ch in 4" :key="ch" :value="ch" border>通道{{ ch }}</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="channelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddVideo">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  OfficeBuilding,
  Camera,
  VideoCamera,
  FullScreen,
  Delete,
  Plus,
  Mute,
  Microphone,
  Close
} from '@element-plus/icons-vue'
import FlvPlayer from '@/components/FlvPlayer.vue'
import { getVehicles } from '@/api/vehicle'

// 布局选项
const layouts = [
  { label: '1x1', value: 1 },
  { label: '2x2', value: 4 },
  { label: '3x3', value: 9 },
  { label: '4x4', value: 16 }
]

// 状态
const currentLayout = ref(9)
const selectedIndex = ref<number | null>(null)
const searchKeyword = ref('')
const treeRef = ref()
const gridContainerRef = ref<HTMLElement>()
const currentTime = ref('')
let timeTimer: any = null

// 通道选择
const channelDialogVisible = ref(false)
const selectedChannel = ref(1)
const pendingVehicle = ref<any>(null)

// 树形配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 单元格数据
interface GridCell {
  vehicle: any | null
  channel: number
  muted: boolean
  recording: boolean
}

const gridCells = ref<GridCell[]>([])

// Player refs for screenshot/control
const playerRefs = ref<Map<number, any>>(new Map())

const setPlayerRef = (index: number, el: any) => {
  if (el) {
    playerRefs.value.set(index, el)
  } else {
    playerRefs.value.delete(index)
  }
}

// 车辆树数据
const vehicleTreeData = ref<any[]>([])

// 计算属性
const activeCount = computed(() => gridCells.value.filter(c => c.vehicle).length)

// 初始化网格
const initGrid = (size: number) => {
  const newCells: GridCell[] = []
  for (let i = 0; i < size; i++) {
    const existingCell = gridCells.value[i]
    if (existingCell) {
      newCells.push(existingCell)
    } else {
      newCells.push({ vehicle: null, channel: 1, muted: true, recording: false })
    }
  }
  gridCells.value = newCells
}

// 设置布局
const setLayout = (layout: number) => {
  currentLayout.value = layout
  initGrid(layout)
}

// 加载车辆
const loadVehicles = async () => {
  try {
    const res = await getVehicles()
    if ((res.code === 0 || res.code === 200) && res.data) {
      const vehicleList = res.data.list || res.data
      const companyMap = new Map<string, any[]>()

      vehicleList.forEach((v: any) => {
        const companyName = v.companyName || '监控中心'
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, [])
        }
        companyMap.get(companyName)!.push({
          id: `v${v.id}`,
          label: v.plateNo,
          plateNo: v.plateNo,
          deviceId: v.deviceId,
          online: v.online,
          speed: v.speed || 0
        })
      })

      const treeData: any[] = []
      let groupIndex = 1
      companyMap.forEach((vehicles, companyName) => {
        treeData.push({
          id: `g${groupIndex++}`,
          label: companyName,
          children: vehicles
        })
      })
      vehicleTreeData.value = treeData
    }
  } catch (error) {
    console.error('[MultiVideo] Failed to load vehicles:', error)
    // Fallback
    vehicleTreeData.value = [{
      id: 'g1',
      label: '监控中心',
      children: [
        { id: 'v1', label: '京A12345', plateNo: '京A12345', deviceId: '013912345678', online: true }
      ]
    }]
  }
}

// 过滤节点
const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.label.toLowerCase().includes(value.toLowerCase())
}

// 监听搜索
watch(searchKeyword, (val) => {
  treeRef.value?.filter(val)
})

// 节点点击
const handleNodeClick = (data: any) => {
  if (!data.children) {
    pendingVehicle.value = data
    channelDialogVisible.value = true
  }
}

// 确认添加视频
const confirmAddVideo = () => {
  if (!pendingVehicle.value) return

  // 找到第一个空单元格或选中的单元格
  let targetIndex = selectedIndex.value
  const selectedCell = targetIndex !== null ? gridCells.value[targetIndex] : null
  if (targetIndex === null || selectedCell?.vehicle) {
    targetIndex = gridCells.value.findIndex(c => !c.vehicle)
  }

  if (targetIndex === -1) {
    ElMessage.warning('没有空闲窗口')
    return
  }

  gridCells.value[targetIndex] = {
    vehicle: pendingVehicle.value,
    channel: selectedChannel.value,
    muted: true,
    recording: false
  }

  channelDialogVisible.value = false
  selectedChannel.value = 1
  ElMessage.success(`已添加 ${pendingVehicle.value.plateNo}`)
}

// 选择单元格
const selectCell = (index: number) => {
  selectedIndex.value = index
}

// 移除视频
const removeVideo = (index: number) => {
  gridCells.value[index] = { vehicle: null, channel: 1, muted: true, recording: false }
}

// 截图
const screenshot = (index: number) => {
  const player = playerRefs.value.get(index)
  const cell = gridCells.value[index]
  if (player && player.downloadScreenshot && cell) {
    const filename = `screenshot_${cell.vehicle?.plateNo || 'unknown'}_CH${cell.channel}_${Date.now()}.png`
    const success = player.downloadScreenshot(filename)
    if (success) {
      ElMessage.success(`窗口 ${index + 1} 截图已保存`)
    } else {
      ElMessage.warning(`窗口 ${index + 1} 截图失败，视频可能未连接`)
    }
  } else {
    ElMessage.warning(`窗口 ${index + 1} 无可用视频`)
  }
}

// 全部截图
const screenshotAll = () => {
  let successCount = 0
  let failCount = 0

  gridCells.value.forEach((cell, index) => {
    if (cell.vehicle) {
      const player = playerRefs.value.get(index)
      if (player && player.downloadScreenshot) {
        const filename = `screenshot_${cell.vehicle?.plateNo || 'unknown'}_CH${cell.channel}_${Date.now()}.png`
        if (player.downloadScreenshot(filename)) {
          successCount++
        } else {
          failCount++
        }
      } else {
        failCount++
      }
    }
  })

  if (successCount > 0) {
    ElMessage.success(`已保存 ${successCount} 张截图${failCount > 0 ? `，${failCount} 张失败` : ''}`)
  } else if (failCount > 0) {
    ElMessage.warning('截图失败，请确保视频已连接')
  } else {
    ElMessage.warning('没有可用的视频')
  }
}

// 录像
const toggleRecord = (index: number) => {
  const player = playerRefs.value.get(index)
  const cell = gridCells.value[index]

  if (!player || !cell) {
    ElMessage.warning(`窗口 ${index + 1} 无可用视频`)
    return
  }

  if (cell.recording) {
    // 停止录像
    player.stopRecording(true) // 自动下载
    cell.recording = false
    ElMessage.success(`窗口 ${index + 1} 录像已保存`)
  } else {
    // 开始录像
    if (player.startRecording()) {
      cell.recording = true
      ElMessage.success(`窗口 ${index + 1} 开始录像`)
    } else {
      ElMessage.warning(`窗口 ${index + 1} 录像失败，视频可能未连接`)
    }
  }
}

// 全部录像
const isRecordingAll = ref(false)

const recordAll = () => {
  if (isRecordingAll.value) {
    // 停止所有录像
    let stoppedCount = 0
    gridCells.value.forEach((cell, index) => {
      if (cell.recording) {
        const player = playerRefs.value.get(index)
        if (player) {
          player.stopRecording(true)
          cell.recording = false
          stoppedCount++
        }
      }
    })
    isRecordingAll.value = false
    if (stoppedCount > 0) {
      ElMessage.success(`已停止 ${stoppedCount} 个录像并保存`)
    } else {
      ElMessage.info('没有正在进行的录像')
    }
  } else {
    // 开始所有录像
    let startedCount = 0
    let failedCount = 0
    gridCells.value.forEach((cell, index) => {
      if (cell.vehicle && !cell.recording) {
        const player = playerRefs.value.get(index)
        if (player && player.startRecording()) {
          cell.recording = true
          startedCount++
        } else {
          failedCount++
        }
      }
    })
    if (startedCount > 0) {
      isRecordingAll.value = true
      ElMessage.success(`已开始 ${startedCount} 个录像${failedCount > 0 ? `，${failedCount} 个失败` : ''}`)
    } else if (failedCount > 0) {
      ElMessage.warning('录像失败，请确保视频已连接')
    } else {
      ElMessage.warning('没有可用的视频')
    }
  }
}

// 静音
const toggleMute = (index: number) => {
  const cell = gridCells.value[index]
  if (cell) cell.muted = !cell.muted
}

// 单元格全屏
const fullscreenCell = (index: number) => {
  const cell = gridCells.value[index]
  if (cell?.vehicle) {
    setLayout(1)
    gridCells.value[0] = cell
  }
}

// 全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    gridContainerRef.value?.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// 清空
const clearAll = () => {
  gridCells.value = gridCells.value.map(() => ({
    vehicle: null,
    channel: 1,
    muted: true,
    recording: false
  }))
  ElMessage.success('已清空所有视频')
}

// 更新时间
const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  initGrid(currentLayout.value)
  loadVehicles()
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer)
})
</script>

<style lang="scss" scoped>
.multi-video-page {
  height: 100%;
  display: flex;
  background: #1a1a2e;
}

.sidebar {
  width: 260px;
  background: #16213e;
  border-right: 1px solid #2d3a4f;
  display: flex;
  flex-direction: column;

  .sidebar-header {
    padding: 12px;
    border-bottom: 1px solid #2d3a4f;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #e8e8e8;

      .node-icon {
        color: #409eff;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;

        &.online {
          background: #52c41a;
        }
      }

      .node-label {
        font-size: 13px;
      }
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #16213e;
  border-bottom: 1px solid #2d3a4f;

  .info-text {
    color: #94a3b8;
    font-size: 13px;
  }
}

.video-grid-container {
  flex: 1;
  padding: 8px;
  overflow: hidden;
}

.video-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 4px;

  &.grid-1 { grid-template-columns: 1fr; }
  &.grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
  &.grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.grid-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
}

.video-cell {
  background: #0f1629;
  border: 2px solid #2d3a4f;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #409eff;
  }

  &.active {
    border-color: #409eff;
  }
}

.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  .video-player {
    width: 100%;
    height: 100%;

    :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .no-stream {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #666;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);

    .el-icon {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .video-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 8px 12px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: #fff;
    font-size: 12px;

    .overlay-top, .overlay-bottom {
      display: flex;
      justify-content: space-between;
    }

    .overlay-top {
      margin-bottom: 4px;
      .plate { font-weight: 500; }
      .channel { color: #94a3b8; }
    }

    .overlay-bottom {
      .time { color: #94a3b8; }
    }
  }

  .video-controls {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;

    :deep(.el-button) {
      background: rgba(0, 0, 0, 0.6);
      border-color: transparent;
      color: #fff;

      &:hover {
        background: rgba(64, 158, 255, 0.8);
      }
    }
  }

  &:hover .video-controls {
    opacity: 1;
  }

  .recording-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
    z-index: 10;

    .rec-dot {
      width: 10px;
      height: 10px;
      background: #f56c6c;
      border-radius: 50%;
      animation: blink 1s infinite;
    }

    .rec-text {
      color: #f56c6c;
      font-size: 12px;
      font-weight: bold;
    }
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.empty-cell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;

  .add-icon {
    font-size: 32px;
    color: #409eff;
  }

  .cell-number {
    position: absolute;
    top: 8px;
    right: 8px;
    color: #666;
    font-size: 12px;
  }
}

.channel-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .el-radio {
    margin-right: 0;
  }
}

:fullscreen {
  .video-grid-container {
    background: #1a1a2e;
  }
}
</style>

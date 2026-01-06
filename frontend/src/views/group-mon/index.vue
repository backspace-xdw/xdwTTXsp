<template>
  <div class="group-mon-page">
    <!-- 顶部工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <!-- 布局切换按钮 -->
        <div class="layout-buttons">
          <div
            class="layout-btn"
            :class="{ active: gridLayout === 1 }"
            @click="setGridLayout(1)"
            title="1x1"
          >
            <div class="grid-icon grid-1x1">
              <span></span>
            </div>
          </div>
          <div
            class="layout-btn"
            :class="{ active: gridLayout === 4 }"
            @click="setGridLayout(4)"
            title="2x2"
          >
            <div class="grid-icon grid-2x2">
              <span></span><span></span>
              <span></span><span></span>
            </div>
          </div>
          <div
            class="layout-btn"
            :class="{ active: gridLayout === 9 }"
            @click="setGridLayout(9)"
            title="3x3"
          >
            <div class="grid-icon grid-3x3">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
          </div>
          <div
            class="layout-btn"
            :class="{ active: gridLayout === 16 }"
            @click="setGridLayout(16)"
            title="4x4"
          >
            <div class="grid-icon grid-4x4">
              <span v-for="i in 16" :key="i"></span>
            </div>
          </div>
          <div class="layout-btn" @click="toggleFullscreen" title="全屏">
            <el-icon><FullScreen /></el-icon>
          </div>
          <div class="layout-btn" @click="saveLayout" title="保存布局">
            <el-icon><FolderOpened /></el-icon>
          </div>
        </div>
      </div>
      <div class="toolbar-right">
        <span class="track-label">轨迹跟踪</span>
        <el-radio-group v-model="trackEnabled" size="small">
          <el-radio-button :value="true">开</el-radio-button>
          <el-radio-button :value="false">关</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 视频网格 -->
    <div class="video-grid-container" ref="gridContainerRef">
      <div class="video-grid" :class="gridClass">
        <div
          v-for="(cell, index) in gridCells"
          :key="index"
          class="video-cell"
          :class="{
            'has-video': cell.vehicle,
            'is-selected': selectedCellIndex === index
          }"
          @click="selectCell(index)"
        >
          <!-- 空白单元格 - 添加按钮 -->
          <template v-if="!cell.vehicle">
            <div class="empty-cell" @click="openVehicleSelector(index)">
              <div class="add-btn">
                <el-icon><Plus /></el-icon>
              </div>
            </div>
          </template>

          <!-- 已添加车辆 - 显示视频 -->
          <template v-else>
            <div class="video-wrapper">
              <!-- 视频播放区域 -->
              <div class="video-player">
                <!-- Show FlvPlayer if device has deviceId (even if offline for testing) -->
                <template v-if="cell.vehicle.deviceId">
                  <FlvPlayer
                    :device-id="cell.vehicle.deviceId"
                    :channel="cell.channel"
                    :autoplay="true"
                    :muted="true"
                    :show-controls="false"
                    :show-channel-label="false"
                    class="flv-player-full"
                  />
                  <!-- 实时标识 -->
                  <div class="live-badge">
                    <span class="live-dot"></span>
                    LIVE
                  </div>
                </template>
                <template v-else>
                  <div class="offline-overlay">
                    <el-icon><VideoCameraFilled /></el-icon>
                    <span>设备离线</span>
                  </div>
                </template>
              </div>

              <!-- 视频信息覆盖层 -->
              <div class="video-overlay">
                <div class="overlay-top">
                  <span class="plate-no">{{ cell.vehicle.plateNo }}</span>
                  <span class="channel">CH{{ cell.channel }}</span>
                </div>
                <div class="overlay-bottom">
                  <span class="speed" v-if="cell.vehicle.online">
                    {{ cell.vehicle.speed }} km/h
                  </span>
                  <span class="time">{{ currentTime }}</span>
                </div>
              </div>

              <!-- 控制按钮 -->
              <div class="video-controls">
                <el-button-group size="small">
                  <el-button :icon="VideoCamera" @click.stop="switchChannel(index)" title="切换通道" />
                  <el-button :icon="Aim" @click.stop="locateVehicle(cell.vehicle)" title="地图定位" />
                  <el-button :icon="FullScreen" @click.stop="fullscreenCell(index)" title="全屏" />
                  <el-button :icon="Close" @click.stop="removeVehicle(index)" title="移除" />
                </el-button-group>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 车辆选择弹窗 -->
    <el-dialog
      v-model="selectorVisible"
      title="选择车辆"
      width="600px"
      destroy-on-close
    >
      <div class="vehicle-selector">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索车牌号或司机姓名"
          prefix-icon="Search"
          clearable
          style="margin-bottom: 16px"
        />

        <!-- 车辆树/列表 -->
        <div class="vehicle-list">
          <el-tree
            :data="vehicleTreeData"
            :props="treeProps"
            node-key="id"
            :filter-node-method="filterNode"
            ref="treeRef"
            highlight-current
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon v-if="data.children">
                  <OfficeBuilding />
                </el-icon>
                <el-icon v-else :color="data.online ? '#52c41a' : '#999'">
                  <Van />
                </el-icon>
                <span class="node-label">{{ node.label }}</span>
                <el-tag
                  v-if="!data.children"
                  :type="data.online ? 'success' : 'info'"
                  size="small"
                >
                  {{ data.online ? '在线' : '离线' }}
                </el-tag>
              </div>
            </template>
          </el-tree>
        </div>

        <!-- 通道选择 -->
        <div class="channel-selector" v-if="selectedVehicle">
          <span class="label">选择通道:</span>
          <el-radio-group v-model="selectedChannel">
            <el-radio-button v-for="ch in 4" :key="ch" :value="ch">
              通道{{ ch }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <template #footer>
        <el-button @click="selectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddVehicle" :disabled="!selectedVehicle">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 通道切换弹窗 -->
    <el-dialog
      v-model="channelDialogVisible"
      title="切换通道"
      width="300px"
    >
      <el-radio-group v-model="tempChannel" class="channel-radio-group">
        <el-radio v-for="ch in 4" :key="ch" :value="ch" border>
          通道{{ ch }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="channelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSwitchChannel">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Plus,
  FullScreen,
  FolderOpened,
  VideoCamera,
  VideoCameraFilled,
  Aim,
  Close,
  OfficeBuilding,
  Van,
  Search
} from '@element-plus/icons-vue'
import FlvPlayer from '@/components/FlvPlayer.vue'
import { getVehicles } from '@/api/vehicle'

const router = useRouter()

// 网格布局
const gridLayout = ref(4) // 1, 4, 9, 16
const trackEnabled = ref(false)
const selectedCellIndex = ref<number | null>(null)
const gridContainerRef = ref<HTMLElement>()

// 车辆选择
const selectorVisible = ref(false)
const searchKeyword = ref('')
const selectedVehicle = ref<any>(null)
const selectedChannel = ref(1)
const currentAddIndex = ref(0)
const treeRef = ref()

// 通道切换
const channelDialogVisible = ref(false)
const tempChannel = ref(1)
const currentChannelIndex = ref(0)

// 当前时间
const currentTime = ref('')
let timeTimer: any = null

// 树形配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 网格单元格数据
interface GridCell {
  vehicle: any | null
  channel: number
}

const gridCells = ref<GridCell[]>([])

// 初始化网格
const initGrid = (size: number) => {
  const newCells: GridCell[] = []
  for (let i = 0; i < size; i++) {
    // 保留已有数据
    const existingCell = gridCells.value[i]
    if (existingCell) {
      newCells.push(existingCell)
    } else {
      newCells.push({ vehicle: null, channel: 1 })
    }
  }
  gridCells.value = newCells
}

// 网格类名
const gridClass = computed(() => {
  switch (gridLayout.value) {
    case 1: return 'grid-1'
    case 4: return 'grid-4'
    case 9: return 'grid-9'
    case 16: return 'grid-16'
    default: return 'grid-4'
  }
})

// 车辆树数据 - 从API加载
const vehicleTreeData = ref<any[]>([])

// 加载车辆数据
const loadVehicles = async () => {
  try {
    const res = await getVehicles()
    if ((res.code === 0 || res.code === 200) && res.data) {
      const vehicleList = res.data.list || res.data
      // 按公司分组
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
          speed: v.speed || 0,
          driverName: v.driverName || ''
        })
      })

      // 转换为树形结构
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
      console.log('[GroupMon] Loaded vehicles:', treeData)
    }
  } catch (error) {
    console.error('[GroupMon] Failed to load vehicles:', error)
    // Fallback to mock data
    vehicleTreeData.value = [
      {
        id: 'g1',
        label: '监控中心',
        children: [
          { id: 'v1', label: '京A12345', plateNo: '京A12345', deviceId: '013912345678', online: true, speed: 65, driverName: '张三' }
        ]
      }
    ]
  }
}

// 设置网格布局
const setGridLayout = (layout: number) => {
  gridLayout.value = layout
  initGrid(layout)
}

// 全屏切换
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    gridContainerRef.value?.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// 保存布局
const saveLayout = () => {
  const layoutData = {
    gridLayout: gridLayout.value,
    cells: gridCells.value.map(cell => ({
      vehicleId: cell.vehicle?.id || null,
      channel: cell.channel
    }))
  }
  localStorage.setItem('groupMonLayout', JSON.stringify(layoutData))
  ElMessage.success('布局已保存')
}

// 加载布局
const loadLayout = () => {
  const saved = localStorage.getItem('groupMonLayout')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      gridLayout.value = data.gridLayout || 4
      // 恢复车辆数据需要根据ID查找
      initGrid(gridLayout.value)
    } catch (e) {
      initGrid(4)
    }
  } else {
    initGrid(4)
  }
}

// 选择单元格
const selectCell = (index: number) => {
  selectedCellIndex.value = index
}

// 打开车辆选择器
const openVehicleSelector = (index: number) => {
  currentAddIndex.value = index
  selectedVehicle.value = null
  selectedChannel.value = 1
  searchKeyword.value = ''
  selectorVisible.value = true
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
    selectedVehicle.value = data
  }
}

// 确认添加车辆
const confirmAddVehicle = () => {
  if (!selectedVehicle.value) return

  gridCells.value[currentAddIndex.value] = {
    vehicle: selectedVehicle.value,
    channel: selectedChannel.value
  }
  selectorVisible.value = false
  ElMessage.success(`已添加 ${selectedVehicle.value.plateNo}`)
}

// 切换通道
const switchChannel = (index: number) => {
  currentChannelIndex.value = index
  const cell = gridCells.value[index]
  if (cell) tempChannel.value = cell.channel
  channelDialogVisible.value = true
}

// 确认切换通道
const confirmSwitchChannel = () => {
  const cell = gridCells.value[currentChannelIndex.value]
  if (cell) cell.channel = tempChannel.value
  channelDialogVisible.value = false
  ElMessage.success(`已切换到通道${tempChannel.value}`)
}

// 定位车辆
const locateVehicle = (vehicle: any) => {
  router.push({
    path: '/monitor',
    query: { vehicleId: vehicle.id }
  })
}

// 单元格全屏
const fullscreenCell = (index: number) => {
  // 临时切换到1x1布局显示该车辆
  const cell = gridCells.value[index]
  if (cell?.vehicle) {
    setGridLayout(1)
    gridCells.value[0] = cell
  }
}

// 移除车辆
const removeVehicle = (index: number) => {
  if (gridCells.value[index]) {
    gridCells.value[index] = { vehicle: null, channel: 1 }
  }
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  loadLayout()
  loadVehicles()
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeTimer) {
    clearInterval(timeTimer)
  }
})
</script>

<style lang="scss" scoped>
.group-mon-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #16213e;
  border-bottom: 1px solid #2d3a4f;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .layout-buttons {
    display: flex;
    gap: 4px;

    .layout-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #2d3a4f;
      border: 1px solid #3d4a5f;
      border-radius: 4px;
      cursor: pointer;
      color: #94a3b8;
      transition: all 0.2s;

      &:hover {
        background: #3d4a5f;
        color: #fff;
      }

      &.active {
        background: #409eff;
        border-color: #409eff;
        color: #fff;
      }

      .grid-icon {
        display: grid;
        gap: 2px;

        span {
          background: currentColor;
          border-radius: 1px;
        }

        &.grid-1x1 {
          grid-template-columns: 1fr;
          width: 14px;
          height: 14px;

          span {
            width: 14px;
            height: 14px;
          }
        }

        &.grid-2x2 {
          grid-template-columns: repeat(2, 1fr);
          width: 14px;
          height: 14px;

          span {
            width: 6px;
            height: 6px;
          }
        }

        &.grid-3x3 {
          grid-template-columns: repeat(3, 1fr);
          width: 14px;
          height: 14px;

          span {
            width: 4px;
            height: 4px;
          }
        }

        &.grid-4x4 {
          grid-template-columns: repeat(4, 1fr);
          width: 14px;
          height: 14px;

          span {
            width: 3px;
            height: 3px;
          }
        }
      }
    }
  }

  .track-label {
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

  &.grid-1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  &.grid-4 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }

  &.grid-9 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  &.grid-16 {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}

.video-cell {
  background: #0f1629;
  border: 2px solid #2d3a4f;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s;

  &:hover {
    border-color: #409eff;
  }

  &.is-selected {
    border-color: #409eff;
  }

  &.has-video {
    border-color: #3d4a5f;
  }
}

.empty-cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .add-btn {
    width: 60px;
    height: 60px;
    border: 2px solid #409eff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #409eff;
    font-size: 32px;
    transition: all 0.3s;

    &:hover {
      background: rgba(64, 158, 255, 0.1);
      transform: scale(1.05);
    }
  }
}

.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  .video-player {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    .video-stream {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      .video-icon {
        font-size: 48px;
        color: rgba(255, 255, 255, 0.3);
      }

      .no-device {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }
    }

    .flv-player-full {
      width: 100%;
      height: 100%;

      :deep(video) {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .live-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(245, 34, 45, 0.9);
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      font-weight: 500;

      .live-dot {
        width: 6px;
        height: 6px;
        background: #fff;
        border-radius: 50%;
        animation: blink 1.5s infinite;
      }
    }

    .offline-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 13px;

      .el-icon {
        font-size: 40px;
      }
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

    .overlay-top,
    .overlay-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .overlay-top {
      margin-bottom: 4px;

      .plate-no {
        font-weight: 500;
      }

      .channel {
        color: #94a3b8;
      }
    }

    .overlay-bottom {
      .speed {
        color: #52c41a;
      }

      .time {
        color: #94a3b8;
      }
    }
  }

  .video-controls {
    position: absolute;
    top: 8px;
    left: 8px;
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
}

// 车辆选择弹窗
.vehicle-selector {
  .vehicle-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    margin-bottom: 16px;

    .tree-node {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;

      .node-label {
        flex: 1;
      }
    }
  }

  .channel-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;

    .label {
      color: #666;
      font-size: 13px;
    }
  }
}

// 通道切换弹窗
.channel-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .el-radio {
    margin-right: 0;
    width: 100%;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

// 全屏样式
:fullscreen {
  .video-grid-container {
    background: #1a1a2e;
  }
}
</style>

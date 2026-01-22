<template>
  <div class="group-mon-page">
    <!-- 左侧车辆列表 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed">车辆列表</span>
        <el-button link @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon><ArrowLeft v-if="!sidebarCollapsed" /><ArrowRight v-else /></el-icon>
        </el-button>
      </div>
      <template v-if="!sidebarCollapsed">
        <div class="sidebar-search">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索车辆..."
            :prefix-icon="Search"
            clearable
            size="small"
          />
        </div>
        <div class="sidebar-stats">
          <span class="stat-item">
            <span class="dot online"></span>在线 {{ onlineCount }}
          </span>
          <span class="stat-item">
            <span class="dot offline"></span>离线 {{ offlineCount }}
          </span>
        </div>
        <div class="vehicle-tree">
          <el-tree
            :data="filteredVehicleTree"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            @node-click="handleTreeNodeClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node" :class="{ 'is-vehicle': !data.children }">
                <el-icon v-if="data.children" class="folder-icon">
                  <FolderOpened />
                </el-icon>
                <template v-else>
                  <span class="status-dot" :class="getStatusClass(data)"></span>
                  <span class="vehicle-name">{{ data.plateNo }}</span>
                  <el-tag v-if="data.alarm" type="danger" size="small" effect="dark">报警</el-tag>
                </template>
                <span v-if="data.children" class="node-label">{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>
        <div class="sidebar-actions">
          <el-button size="small" @click="addAllOnline" :disabled="!hasEmptyCell">
            <el-icon><Plus /></el-icon>添加全部在线
          </el-button>
          <el-button size="small" @click="clearAllCells">
            <el-icon><Delete /></el-icon>清空全部
          </el-button>
        </div>
      </template>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部工具栏 -->
      <div class="page-toolbar">
        <div class="toolbar-left">
          <!-- 布局切换 -->
          <div class="layout-buttons">
            <div
              v-for="layout in layoutOptions"
              :key="layout.value"
              class="layout-btn"
              :class="{ active: gridLayout === layout.value }"
              @click="setGridLayout(layout.value)"
              :title="layout.title"
            >
              <div class="grid-icon" :class="layout.class">
                <span v-for="i in layout.value" :key="i"></span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="layout-btn" @click="toggleFullscreen" title="全屏">
              <el-icon><FullScreen /></el-icon>
            </div>
            <div class="layout-btn" @click="saveLayout" title="保存布局">
              <el-icon><FolderOpened /></el-icon>
            </div>
          </div>
        </div>
        <div class="toolbar-center">
          <!-- 轮询控制 -->
          <div class="polling-control">
            <span class="control-label">轮询播放</span>
            <el-switch v-model="pollingEnabled" size="small" />
            <el-select
              v-if="pollingEnabled"
              v-model="pollingInterval"
              size="small"
              style="width: 80px; margin-left: 8px"
            >
              <el-option label="5秒" :value="5000" />
              <el-option label="10秒" :value="10000" />
              <el-option label="30秒" :value="30000" />
              <el-option label="60秒" :value="60000" />
            </el-select>
          </div>
        </div>
        <div class="toolbar-right">
          <span class="current-time">{{ currentTime }}</span>
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
              'is-selected': selectedCellIndex === index,
              'is-alarm': cell.vehicle?.alarm
            }"
            @click="selectCell(index)"
            @dragover.prevent
            @drop="handleDrop($event, index)"
          >
            <!-- 单元格序号 -->
            <div class="cell-index">{{ index + 1 }}</div>

            <!-- 空白单元格 -->
            <template v-if="!cell.vehicle">
              <div class="empty-cell" @click="openVehicleSelector(index)">
                <div class="add-btn">
                  <el-icon><Plus /></el-icon>
                  <span>点击添加</span>
                </div>
              </div>
            </template>

            <!-- 视频单元格 -->
            <template v-else>
              <div class="video-wrapper">
                <!-- 视频播放区 -->
                <div class="video-player">
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
                  </template>
                  <template v-else>
                    <div class="no-signal">
                      <el-icon><VideoCameraFilled /></el-icon>
                      <span>无信号</span>
                    </div>
                  </template>
                </div>

                <!-- 状态标识 -->
                <div class="status-badges">
                  <span v-if="cell.vehicle.online" class="badge live">
                    <span class="dot"></span>LIVE
                  </span>
                  <span v-else class="badge offline">离线</span>
                  <span v-if="cell.vehicle.alarm" class="badge alarm">
                    <el-icon><WarningFilled /></el-icon>
                  </span>
                </div>

                <!-- 信息覆盖层 -->
                <div class="info-overlay">
                  <div class="info-top">
                    <span class="plate-no">{{ cell.vehicle.plateNo }}</span>
                    <span class="channel-tag">CH{{ cell.channel }}</span>
                  </div>
                  <div class="info-bottom">
                    <span class="speed" v-if="cell.vehicle.online">
                      <el-icon><Odometer /></el-icon>
                      {{ cell.vehicle.speed || 0 }} km/h
                    </span>
                    <span class="direction" v-if="cell.vehicle.direction !== undefined">
                      <el-icon><Compass /></el-icon>
                      {{ getDirectionText(cell.vehicle.direction) }}
                    </span>
                  </div>
                </div>

                <!-- 控制按钮组 -->
                <div class="control-buttons">
                  <el-tooltip content="截图" placement="top">
                    <el-button circle size="small" @click.stop="captureSnapshot(index)">
                      <el-icon><Camera /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="切换通道" placement="top">
                    <el-button circle size="small" @click.stop="switchChannel(index)">
                      <el-icon><VideoCamera /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="地图定位" placement="top">
                    <el-button circle size="small" @click.stop="locateVehicle(cell.vehicle)">
                      <el-icon><Location /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="单屏放大" placement="top">
                    <el-button circle size="small" @click.stop="fullscreenCell(index)">
                      <el-icon><FullScreen /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="移除" placement="top">
                    <el-button circle size="small" type="danger" @click.stop="removeVehicle(index)">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 车辆选择弹窗 -->
    <el-dialog v-model="selectorVisible" title="选择车辆" width="500px" destroy-on-close>
      <div class="vehicle-selector-dialog">
        <el-input
          v-model="dialogSearchKeyword"
          placeholder="搜索车牌号..."
          :prefix-icon="Search"
          clearable
          style="margin-bottom: 12px"
        />
        <div class="vehicle-list">
          <div
            v-for="vehicle in dialogFilteredVehicles"
            :key="vehicle.id"
            class="vehicle-item"
            :class="{ selected: dialogSelectedVehicle?.id === vehicle.id }"
            @click="dialogSelectedVehicle = vehicle"
          >
            <span class="status-dot" :class="getStatusClass(vehicle)"></span>
            <span class="plate">{{ vehicle.plateNo }}</span>
            <span class="device-id">{{ vehicle.deviceId }}</span>
            <el-tag :type="vehicle.online ? 'success' : 'info'" size="small">
              {{ vehicle.online ? '在线' : '离线' }}
            </el-tag>
          </div>
          <el-empty v-if="!dialogFilteredVehicles.length" description="暂无车辆" :image-size="60" />
        </div>
        <div class="channel-select" v-if="dialogSelectedVehicle">
          <span class="label">选择通道：</span>
          <el-radio-group v-model="dialogSelectedChannel" size="small">
            <el-radio-button v-for="ch in 4" :key="ch" :value="ch">CH{{ ch }}</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="selectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddVehicle" :disabled="!dialogSelectedVehicle">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 通道切换弹窗 -->
    <el-dialog v-model="channelDialogVisible" title="切换通道" width="320px">
      <div class="channel-switch-dialog">
        <el-radio-group v-model="tempChannel">
          <el-radio v-for="ch in 8" :key="ch" :value="ch" border>通道 {{ ch }}</el-radio>
        </el-radio-group>
      </div>
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
  Plus, Search, Delete, FullScreen, FolderOpened,
  VideoCamera, VideoCameraFilled, Camera, Location, Close,
  ArrowLeft, ArrowRight, WarningFilled, Odometer, Compass
} from '@element-plus/icons-vue'
import FlvPlayer from '@/components/FlvPlayer.vue'
import { getVehicles } from '@/api/vehicle'

const router = useRouter()

// 侧边栏
const sidebarCollapsed = ref(false)
const searchKeyword = ref('')

// 网格布局
const gridLayout = ref(4)
const selectedCellIndex = ref<number | null>(null)
const gridContainerRef = ref<HTMLElement>()

// 布局选项
const layoutOptions = [
  { value: 1, title: '1x1', class: 'grid-1x1' },
  { value: 4, title: '2x2', class: 'grid-2x2' },
  { value: 9, title: '3x3', class: 'grid-3x3' },
  { value: 16, title: '4x4', class: 'grid-4x4' }
]

// 轮询控制
const pollingEnabled = ref(false)
const pollingInterval = ref(10000)
let pollingTimer: any = null

// 车辆选择弹窗
const selectorVisible = ref(false)
const dialogSearchKeyword = ref('')
const dialogSelectedVehicle = ref<any>(null)
const dialogSelectedChannel = ref(1)
const currentAddIndex = ref(0)

// 通道切换弹窗
const channelDialogVisible = ref(false)
const tempChannel = ref(1)
const currentChannelIndex = ref(0)

// 当前时间
const currentTime = ref('')
let timeTimer: any = null

// 树形配置
const treeProps = { children: 'children', label: 'label' }

// 车辆数据
const allVehicles = ref<any[]>([])
const vehicleTreeData = ref<any[]>([])

// 网格单元格
interface GridCell {
  vehicle: any | null
  channel: number
}
const gridCells = ref<GridCell[]>([])

// 计算属性
const onlineCount = computed(() => allVehicles.value.filter(v => v.online).length)
const offlineCount = computed(() => allVehicles.value.filter(v => !v.online).length)
const hasEmptyCell = computed(() => gridCells.value.some(c => !c.vehicle))

const filteredVehicleTree = computed(() => {
  if (!searchKeyword.value) return vehicleTreeData.value
  const keyword = searchKeyword.value.toLowerCase()
  return vehicleTreeData.value.map(group => ({
    ...group,
    children: group.children?.filter((v: any) =>
      v.plateNo?.toLowerCase().includes(keyword) ||
      v.deviceId?.toLowerCase().includes(keyword)
    )
  })).filter(group => group.children?.length > 0)
})

const dialogFilteredVehicles = computed(() => {
  if (!dialogSearchKeyword.value) return allVehicles.value
  const keyword = dialogSearchKeyword.value.toLowerCase()
  return allVehicles.value.filter(v =>
    v.plateNo?.toLowerCase().includes(keyword) ||
    v.deviceId?.toLowerCase().includes(keyword)
  )
})

const gridClass = computed(() => {
  const classMap: Record<number, string> = { 1: 'grid-1', 4: 'grid-4', 9: 'grid-9', 16: 'grid-16' }
  return classMap[gridLayout.value] || 'grid-4'
})

// 初始化网格
const initGrid = (size: number) => {
  const newCells: GridCell[] = []
  for (let i = 0; i < size; i++) {
    newCells.push(gridCells.value[i] || { vehicle: null, channel: 1 })
  }
  gridCells.value = newCells
}

// 加载车辆数据
const loadVehicles = async () => {
  try {
    const res = await getVehicles()
    if ((res.code === 0 || res.code === 200) && res.data) {
      const list = res.data.list || res.data
      allVehicles.value = list.map((v: any) => ({
        id: v.id,
        plateNo: v.plateNo,
        deviceId: v.deviceId,
        online: v.online,
        speed: v.speed || 0,
        direction: v.direction || 0,
        alarm: v.alarmFlag > 0,
        companyName: v.companyName || '监控中心'
      }))

      // 构建树形结构
      const companyMap = new Map<string, any[]>()
      allVehicles.value.forEach(v => {
        if (!companyMap.has(v.companyName)) companyMap.set(v.companyName, [])
        companyMap.get(v.companyName)!.push(v)
      })

      vehicleTreeData.value = Array.from(companyMap.entries()).map(([name, vehicles], idx) => ({
        id: `g${idx}`,
        label: `${name} (${vehicles.length})`,
        children: vehicles
      }))
    }
  } catch (error) {
    console.error('[GroupMon] Failed to load vehicles:', error)
  }
}

// 获取状态类
const getStatusClass = (vehicle: any) => {
  if (vehicle.alarm) return 'alarm'
  return vehicle.online ? 'online' : 'offline'
}

// 获取方向文本
const getDirectionText = (direction: number) => {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const index = Math.round(direction / 45) % 8
  return directions[index]
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
  const data = {
    gridLayout: gridLayout.value,
    cells: gridCells.value.map(c => ({
      vehicleId: c.vehicle?.id,
      channel: c.channel
    }))
  }
  localStorage.setItem('groupMonLayout', JSON.stringify(data))
  ElMessage.success('布局已保存')
}

// 加载布局
const loadLayout = () => {
  const saved = localStorage.getItem('groupMonLayout')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      gridLayout.value = data.gridLayout || 4
    } catch (e) {}
  }
  initGrid(gridLayout.value)
}

// 选择单元格
const selectCell = (index: number) => {
  selectedCellIndex.value = index
}

// 树节点点击
const handleTreeNodeClick = (data: any) => {
  if (!data.children) {
    addVehicleToFirstEmpty(data)
  }
}

// 添加车辆到第一个空单元格
const addVehicleToFirstEmpty = (vehicle: any) => {
  const emptyIndex = gridCells.value.findIndex(c => !c.vehicle)
  if (emptyIndex >= 0) {
    gridCells.value[emptyIndex] = { vehicle, channel: 1 }
    ElMessage.success(`已添加 ${vehicle.plateNo}`)
  } else {
    ElMessage.warning('没有空余位置')
  }
}

// 添加全部在线车辆
const addAllOnline = () => {
  const onlineVehicles = allVehicles.value.filter(v => v.online)
  let added = 0
  for (const vehicle of onlineVehicles) {
    const emptyIndex = gridCells.value.findIndex(c => !c.vehicle)
    if (emptyIndex >= 0) {
      gridCells.value[emptyIndex] = { vehicle, channel: 1 }
      added++
    } else break
  }
  ElMessage.success(`已添加 ${added} 辆在线车辆`)
}

// 清空全部
const clearAllCells = () => {
  gridCells.value = gridCells.value.map(() => ({ vehicle: null, channel: 1 }))
  ElMessage.success('已清空全部')
}

// 打开选择弹窗
const openVehicleSelector = (index: number) => {
  currentAddIndex.value = index
  dialogSelectedVehicle.value = null
  dialogSelectedChannel.value = 1
  dialogSearchKeyword.value = ''
  selectorVisible.value = true
}

// 确认添加
const confirmAddVehicle = () => {
  if (!dialogSelectedVehicle.value) return
  gridCells.value[currentAddIndex.value] = {
    vehicle: dialogSelectedVehicle.value,
    channel: dialogSelectedChannel.value
  }
  selectorVisible.value = false
  ElMessage.success(`已添加 ${dialogSelectedVehicle.value.plateNo}`)
}

// 拖放处理
const handleDrop = (event: DragEvent, index: number) => {
  const vehicleId = event.dataTransfer?.getData('vehicleId')
  if (vehicleId) {
    const vehicle = allVehicles.value.find(v => v.id === vehicleId)
    if (vehicle) {
      gridCells.value[index] = { vehicle, channel: 1 }
    }
  }
}

// 截图
const captureSnapshot = (index: number) => {
  const cell = gridCells.value[index]
  if (cell?.vehicle) {
    ElMessage.success(`已截图: ${cell.vehicle.plateNo}`)
    // 实际截图逻辑需要调用FlvPlayer的截图方法
  }
}

// 切换通道
const switchChannel = (index: number) => {
  currentChannelIndex.value = index
  tempChannel.value = gridCells.value[index]?.channel || 1
  channelDialogVisible.value = true
}

const confirmSwitchChannel = () => {
  const cell = gridCells.value[currentChannelIndex.value]
  if (cell) {
    cell.channel = tempChannel.value
  }
  channelDialogVisible.value = false
  ElMessage.success(`已切换到通道 ${tempChannel.value}`)
}

// 定位车辆
const locateVehicle = (vehicle: any) => {
  router.push({ path: '/monitor', query: { vehicleId: vehicle.id } })
}

// 单屏放大
const fullscreenCell = (index: number) => {
  const cell = gridCells.value[index]
  if (cell?.vehicle) {
    setGridLayout(1)
    gridCells.value[0] = cell
  }
}

// 移除车辆
const removeVehicle = (index: number) => {
  gridCells.value[index] = { vehicle: null, channel: 1 }
}

// 轮询逻辑
const startPolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)
  const onlineVehicles = allVehicles.value.filter(v => v.online)
  if (onlineVehicles.length === 0) return

  let currentIndex = 0
  pollingTimer = setInterval(() => {
    gridCells.value = gridCells.value.map((_, i) => ({
      vehicle: onlineVehicles[(currentIndex + i) % onlineVehicles.length],
      channel: 1
    }))
    currentIndex = (currentIndex + gridLayout.value) % onlineVehicles.length
  }, pollingInterval.value)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

watch(pollingEnabled, (enabled) => {
  enabled ? startPolling() : stopPolling()
})

watch(pollingInterval, () => {
  if (pollingEnabled.value) {
    stopPolling()
    startPolling()
  }
})

// 更新时间
const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  loadLayout()
  loadVehicles()
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer)
  stopPolling()
})
</script>

<style lang="scss" scoped>
.group-mon-page {
  height: 100%;
  display: flex;
  background: #0d1117;
}

// 侧边栏
.sidebar {
  width: 260px;
  background: #161b22;
  border-right: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;

  &.collapsed {
    width: 40px;
  }

  .sidebar-header {
    height: 44px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #30363d;
    color: #c9d1d9;
    font-weight: 500;
  }

  .sidebar-search {
    padding: 12px;
  }

  .sidebar-stats {
    display: flex;
    gap: 16px;
    padding: 0 12px 12px;
    font-size: 12px;
    color: #8b949e;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      &.online { background: #3fb950; }
      &.offline { background: #6e7681; }
    }
  }

  .vehicle-tree {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;

    :deep(.el-tree) {
      background: transparent;
      color: #c9d1d9;

      .el-tree-node__content {
        height: 32px;
        &:hover { background: #21262d; }
      }

      .el-tree-node.is-current > .el-tree-node__content {
        background: #1f6feb33;
      }
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;

      .folder-icon { color: #8b949e; }
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        &.online { background: #3fb950; }
        &.offline { background: #6e7681; }
        &.alarm { background: #f85149; animation: pulse 1s infinite; }
      }
    }
  }

  .sidebar-actions {
    padding: 12px;
    border-top: 1px solid #30363d;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

// 主内容区
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 工具栏
.page-toolbar {
  height: 48px;
  padding: 0 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .toolbar-left, .toolbar-center, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .layout-buttons {
    display: flex;
    align-items: center;
    gap: 4px;

    .divider {
      width: 1px;
      height: 20px;
      background: #30363d;
      margin: 0 8px;
    }

    .layout-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      cursor: pointer;
      color: #8b949e;
      transition: all 0.2s;

      &:hover { background: #30363d; color: #c9d1d9; }
      &.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }

      .grid-icon {
        display: grid;
        gap: 1px;
        span { background: currentColor; border-radius: 1px; }

        &.grid-1x1 { grid-template-columns: 1fr; span { width: 12px; height: 12px; } }
        &.grid-2x2 { grid-template-columns: repeat(2, 1fr); span { width: 5px; height: 5px; } }
        &.grid-3x3 { grid-template-columns: repeat(3, 1fr); span { width: 3px; height: 3px; } }
        &.grid-4x4 { grid-template-columns: repeat(4, 1fr); span { width: 2px; height: 2px; } }
      }
    }
  }

  .polling-control {
    display: flex;
    align-items: center;
    gap: 8px;
    .control-label { color: #8b949e; font-size: 13px; }
  }

  .current-time {
    color: #8b949e;
    font-size: 14px;
    font-family: monospace;
  }
}

// 视频网格
.video-grid-container {
  flex: 1;
  padding: 8px;
  overflow: hidden;
}

.video-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 6px;

  &.grid-1 { grid-template-columns: 1fr; }
  &.grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
  &.grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.grid-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
}

.video-cell {
  background: #0d1117;
  border: 2px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: all 0.2s;

  &:hover { border-color: #1f6feb; }
  &.is-selected { border-color: #1f6feb; box-shadow: 0 0 0 2px #1f6feb33; }
  &.is-alarm { border-color: #f85149; animation: alarmPulse 2s infinite; }

  .cell-index {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 20px;
    height: 20px;
    background: rgba(0,0,0,0.6);
    border-radius: 4px;
    color: #8b949e;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #30363d;
    font-size: 13px;
    transition: all 0.3s;

    .el-icon { font-size: 36px; }
    &:hover { color: #1f6feb; transform: scale(1.05); }
  }
}

.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  .video-player {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0d1117, #161b22);

    .flv-player-full {
      width: 100%;
      height: 100%;
      :deep(video) { width: 100%; height: 100%; object-fit: cover; }
    }

    .no-signal {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #484f58;
      .el-icon { font-size: 40px; }
    }
  }

  .status-badges {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    z-index: 10;

    .badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;

      &.live { background: #238636; color: #fff; .dot { width: 5px; height: 5px; background: #fff; border-radius: 50%; animation: blink 1.5s infinite; } }
      &.offline { background: #21262d; color: #8b949e; }
      &.alarm { background: #f85149; color: #fff; }
    }
  }

  .info-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 24px 12px 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    color: #fff;
    font-size: 12px;

    .info-top, .info-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .info-top {
      margin-bottom: 4px;
      .plate-no { font-weight: 600; font-size: 13px; }
      .channel-tag { color: #8b949e; }
    }

    .info-bottom {
      color: #8b949e;
      .speed, .direction { display: flex; align-items: center; gap: 3px; }
      .speed { color: #3fb950; }
    }
  }

  .control-buttons {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;

    .el-button {
      background: rgba(0,0,0,0.7);
      border: none;
      color: #fff;
      &:hover { background: #1f6feb; }
    }
  }

  &:hover .control-buttons { opacity: 1; }
}

// 弹窗样式
.vehicle-selector-dialog {
  .vehicle-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    margin-bottom: 16px;

    .vehicle-item {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;

      &:hover { background: #f5f7fa; }
      &.selected { background: #ecf5ff; }
      &:last-child { border-bottom: none; }

      .status-dot { width: 8px; height: 8px; border-radius: 50%; &.online { background: #52c41a; } &.offline { background: #d9d9d9; } &.alarm { background: #ff4d4f; } }
      .plate { font-weight: 500; flex: 1; }
      .device-id { color: #909399; font-size: 12px; }
    }
  }

  .channel-select {
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 12px;
    .label { color: #606266; font-size: 13px; }
  }
}

.channel-switch-dialog {
  .el-radio-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    .el-radio { margin: 0; }
  }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes alarmPulse { 0%, 100% { border-color: #f85149; } 50% { border-color: #f8514980; } }

:fullscreen .video-grid-container { background: #0d1117; padding: 16px; }
</style>

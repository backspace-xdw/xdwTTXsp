<template>
  <div class="monitor-page">
    <!-- 左侧车辆树 -->
    <div class="monitor-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- 筛选条件 -->
      <div class="sidebar-filters">
        <el-select v-model="filters.type" placeholder="全部类型" size="small" clearable>
          <el-option label="全部类型" value="" />
          <el-option label="客车" value="bus" />
          <el-option label="货车" value="truck" />
          <el-option label="轿车" value="car" />
        </el-select>
        <el-select v-model="filters.status" placeholder="全部状态" size="small" clearable>
          <el-option label="全部状态" value="" />
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="行驶" value="driving" />
          <el-option label="报警" value="alarm" />
        </el-select>
        <el-select v-model="filters.device" placeholder="全部设备" size="small" clearable>
          <el-option label="全部设备" value="" />
          <el-option label="MDVR" value="mdvr" />
          <el-option label="GPS" value="gps" />
        </el-select>
      </div>

      <!-- 搜索框 -->
      <div class="sidebar-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索"
          prefix-icon="Search"
          size="small"
          clearable
        />
        <el-button size="small" type="primary" :icon="Setting" />
      </div>

      <!-- 车辆树 -->
      <div class="sidebar-tree">
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
              <span class="node-label">
                <el-icon v-if="data.type === 'company'" class="node-icon">
                  <OfficeBuilding />
                </el-icon>
                <span
                  v-else
                  class="vehicle-status-dot"
                  :class="getVehicleStatusClass(data.data)"
                ></span>
                <span>{{ node.label }}</span>
              </span>
            </div>
          </template>
        </el-tree>
      </div>

      <!-- 底部Tab切换 -->
      <div class="sidebar-tabs">
        <el-tabs v-model="activeTab" type="card" class="tabs-card">
          <el-tab-pane label="状态" name="status" />
          <el-tab-pane label="云台" name="ptz" />
          <el-tab-pane label="色彩" name="color" />
          <el-tab-pane label="语音" name="voice" />
        </el-tabs>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="monitor-content">
      <!-- 顶部工具栏 -->
      <div class="content-toolbar">
        <div class="toolbar-left">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button label="video">视频模式</el-radio-button>
            <el-radio-button label="map">地图模式</el-radio-button>
            <el-radio-button label="poll">视频轮询</el-radio-button>
          </el-radio-group>
          <el-button type="primary" size="small" :icon="Aim">我的地图</el-button>
          <el-button size="small" :icon="FullScreen">全屏地图</el-button>
        </div>
        <div class="toolbar-right">
          <el-dropdown trigger="click">
            <el-button size="small">
              搜索车辆 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>按车牌号</el-dropdown-item>
                <el-dropdown-item>按设备ID</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click">
            <el-button size="small">
              绘制工具 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>圆形</el-dropdown-item>
                <el-dropdown-item>矩形</el-dropdown-item>
                <el-dropdown-item>多边形</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click">
            <el-button size="small">
              地图工具 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>测距</el-dropdown-item>
                <el-dropdown-item>测面积</el-dropdown-item>
                <el-dropdown-item>清除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 主内容区 - 地图模式 -->
      <div v-show="viewMode === 'map'" class="content-main">
        <div class="map-wrapper">
          <div id="mapContainer" class="map-container"></div>
          <!-- 地图控件 -->
          <div class="map-controls">
            <div class="map-control-item" @click="handleMapType('normal')">
              <el-icon><MapLocation /></el-icon>
              <span>标准</span>
            </div>
            <div class="map-control-item" @click="handleMapType('satellite')">
              <el-icon><Picture /></el-icon>
              <span>卫星</span>
            </div>
            <div class="map-control-item" @click="handleMapType('traffic')">
              <el-icon><Van /></el-icon>
              <span>路况</span>
            </div>
            <div class="map-control-item" @click="toggleCluster">
              <el-icon><Grid /></el-icon>
              <span>聚合</span>
            </div>
          </div>
          <!-- 比例尺和缩放 -->
          <div class="map-zoom">
            <span class="scale">300 km</span>
            <div class="zoom-level">{{ zoomLevel }}</div>
            <div class="zoom-btns">
              <el-button size="small" @click="zoomIn">+</el-button>
              <el-button size="small" @click="zoomOut">-</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区 - 视频模式 -->
      <div v-show="viewMode === 'video'" class="content-main video-mode">
        <!-- 视频工具栏 -->
        <div class="video-toolbar">
          <div class="toolbar-left">
            <el-button-group>
              <el-button
                v-for="layout in videoLayouts"
                :key="layout.value"
                :type="videoLayout === layout.value ? 'primary' : 'default'"
                size="small"
                @click="videoLayout = layout.value"
              >
                {{ layout.label }}
              </el-button>
            </el-button-group>
          </div>
          <div class="toolbar-center">
            <span class="video-info">已选择 {{ activeVideoWindows.length }} 个通道</span>
          </div>
          <div class="toolbar-right">
            <el-button size="small" :icon="Camera" @click="handleScreenshot">截图</el-button>
            <el-button size="small" :icon="VideoCamera" @click="handleRecord">录像</el-button>
            <el-button size="small" :icon="Microphone" @click="handleTalk">对讲</el-button>
            <el-button size="small" :icon="FullScreen" @click="handleFullScreen">全屏</el-button>
          </div>
        </div>

        <!-- 视频网格 -->
        <div class="video-grid" :class="`grid-${videoLayout}`">
          <div
            v-for="(window, index) in videoWindows"
            :key="index"
            class="video-window"
            :class="{
              active: selectedVideoWindow === index,
              'has-video': window.vehicle !== null
            }"
            @click="selectVideoWindow(index)"
            @dblclick="handleVideoWindowDblClick(index)"
          >
            <!-- 有视频时显示 -->
            <template v-if="window.vehicle">
              <div class="video-header">
                <span class="vehicle-plate">{{ window.vehicle.plateNo }}</span>
                <span class="channel-name">通道{{ window.channel }}</span>
                <el-dropdown trigger="click" @command="(cmd: string) => handleVideoCommand(cmd, index)">
                  <el-icon class="more-btn"><MoreFilled /></el-icon>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="close">关闭视频</el-dropdown-item>
                      <el-dropdown-item command="fullscreen">全屏播放</el-dropdown-item>
                      <el-dropdown-item command="screenshot">截图</el-dropdown-item>
                      <el-dropdown-item command="record">开始录像</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div class="video-content">
                <!-- 实时视频播放 -->
                <FlvPlayer
                  :device-id="window.vehicle.deviceId"
                  :channel="window.channel"
                  :autoplay="true"
                  :muted="window.muted"
                  :show-controls="true"
                  :show-channel-label="false"
                  :show-retry="true"
                  @connected="() => handleVideoConnected(index)"
                  @disconnected="() => handleVideoDisconnected(index)"
                  @error="(err) => handleVideoError(index, err)"
                />
              </div>
              <div class="video-footer">
                <div class="video-stats">
                  <span><el-icon><Connection /></el-icon> {{ window.bitrate || 0 }} kbps</span>
                  <span><el-icon><Timer /></el-icon> {{ window.fps || 0 }} fps</span>
                </div>
                <div class="video-controls">
                  <el-icon class="control-btn" @click.stop="toggleVideoMute(index)">
                    <Mute v-if="window.muted" />
                    <Microphone v-else />
                  </el-icon>
                  <el-icon class="control-btn" @click.stop="toggleVideoPlay(index)">
                    <VideoPause v-if="window.playing" />
                    <VideoPlay v-else />
                  </el-icon>
                </div>
              </div>
            </template>

            <!-- 空窗口 -->
            <template v-else>
              <div class="empty-window">
                <el-icon class="empty-icon"><Plus /></el-icon>
                <span>双击车辆添加视频</span>
                <span class="window-number">窗口 {{ index + 1 }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 主内容区 - 视频轮询模式 -->
      <div v-show="viewMode === 'poll'" class="content-main poll-mode">
        <div class="poll-container">
          <div class="poll-video">
            <div v-if="pollCurrentVehicle" class="video-placeholder large">
              <el-icon class="video-icon"><VideoCamera /></el-icon>
              <div class="video-status">
                <span class="playing">
                  <span class="live-dot"></span>
                  轮询播放中
                </span>
              </div>
              <div class="video-info-overlay">
                <span>{{ pollCurrentVehicle.plateNo }} - 通道1</span>
                <span>{{ currentTime }}</span>
              </div>
            </div>
            <div v-else class="empty-window large">
              <el-icon class="empty-icon"><VideoCamera /></el-icon>
              <span>请选择车辆开始轮询</span>
            </div>
          </div>
          <div class="poll-controls">
            <el-button :icon="pollPlaying ? VideoPause : VideoPlay" @click="togglePoll">
              {{ pollPlaying ? '暂停轮询' : '开始轮询' }}
            </el-button>
            <span class="poll-info">
              轮询间隔:
              <el-select v-model="pollInterval" size="small" style="width: 100px">
                <el-option label="10秒" :value="10" />
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
              </el-select>
            </span>
            <span class="poll-progress">
              {{ pollIndex + 1 }} / {{ pollVehicleList.length || 0 }}
            </span>
          </div>
          <div class="poll-list">
            <div class="poll-list-header">轮询列表</div>
            <div class="poll-list-content">
              <div
                v-for="(v, idx) in pollVehicleList"
                :key="v.id"
                class="poll-item"
                :class="{ active: idx === pollIndex }"
              >
                <span class="poll-item-no">{{ idx + 1 }}</span>
                <span class="poll-item-plate">{{ v.plateNo }}</span>
                <el-icon class="poll-item-remove" @click="removePollVehicle(idx)"><Close /></el-icon>
              </div>
              <div v-if="pollVehicleList.length === 0" class="poll-empty">
                双击车辆添加到轮询列表
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部数据表格 -->
      <div class="content-table">
        <el-tabs v-model="tableTab" type="card">
          <el-tab-pane label="GPS监控" name="gps">
            <div class="table-toolbar">
              <el-button size="small" :icon="Edit">编辑列</el-button>
              <el-button size="small" :icon="Download">导出Excel</el-button>
            </div>
            <el-table
              :data="gpsTableData"
              size="small"
              height="200"
              border
              stripe
            >
              <el-table-column type="selection" width="40" />
              <el-table-column label="操作" width="80">
                <template #default>
                  <el-button type="primary" link size="small">跟踪</el-button>
                </template>
              </el-table-column>
              <el-table-column prop="plateNo" label="车牌号" width="120" />
              <el-table-column prop="companyName" label="所属公司" width="150" />
              <el-table-column prop="groupName" label="分组" width="120" />
              <el-table-column prop="status" label="运营状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)" size="small">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="speed" label="速度" width="80" />
              <el-table-column prop="gpsTime" label="GPS时间" width="160" />
              <el-table-column prop="address" label="位置" min-width="200" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="媒体文件" name="media">
            <div class="media-panel">
              <!-- 媒体文件筛选工具栏 -->
              <div class="media-toolbar">
                <div class="toolbar-filters">
                  <el-select v-model="mediaFilters.type" placeholder="文件类型" size="small" style="width: 100px">
                    <el-option label="全部" value="" />
                    <el-option label="视频" value="video" />
                    <el-option label="图片" value="image" />
                    <el-option label="音频" value="audio" />
                  </el-select>
                  <el-select v-model="mediaFilters.source" placeholder="来源" size="small" style="width: 100px">
                    <el-option label="全部来源" value="" />
                    <el-option label="报警抓拍" value="alarm" />
                    <el-option label="手动抓拍" value="manual" />
                    <el-option label="定时抓拍" value="scheduled" />
                  </el-select>
                  <el-date-picker
                    v-model="mediaFilters.dateRange"
                    type="daterange"
                    range-separator="-"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    size="small"
                    style="width: 220px"
                  />
                  <el-input
                    v-model="mediaFilters.plateNo"
                    placeholder="车牌号"
                    size="small"
                    style="width: 120px"
                    clearable
                  />
                  <el-button type="primary" size="small" :icon="Search">查询</el-button>
                </div>
                <div class="toolbar-actions">
                  <el-button size="small" :icon="Download">批量下载</el-button>
                  <el-button size="small" :icon="Delete" type="danger">批量删除</el-button>
                </div>
              </div>
              <!-- 媒体文件表格 -->
              <el-table :data="mediaTableData" size="small" height="160" border stripe>
                <el-table-column type="selection" width="40" />
                <el-table-column label="预览" width="80">
                  <template #default="{ row }">
                    <div class="media-preview" @click="handleMediaPreview(row)">
                      <el-icon v-if="row.type === 'video'" class="preview-icon video"><VideoCamera /></el-icon>
                      <el-icon v-else-if="row.type === 'image'" class="preview-icon image"><Picture /></el-icon>
                      <el-icon v-else class="preview-icon audio"><Microphone /></el-icon>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="plateNo" label="车牌号" width="100" />
                <el-table-column prop="channel" label="通道" width="70" />
                <el-table-column prop="source" label="来源" width="90">
                  <template #default="{ row }">
                    <el-tag :type="getMediaSourceType(row.source)" size="small">
                      {{ row.source }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="size" label="大小" width="80" />
                <el-table-column prop="duration" label="时长" width="70" />
                <el-table-column prop="createTime" label="创建时间" width="150" />
                <el-table-column label="操作" width="150" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="handleMediaPreview(row)">预览</el-button>
                    <el-button type="success" link size="small" @click="handleMediaDownload(row)">下载</el-button>
                    <el-button type="danger" link size="small" @click="handleMediaDelete(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="系统" name="system">
            <div class="system-panel">
              <!-- 系统信息工具栏 -->
              <div class="system-toolbar">
                <div class="toolbar-filters">
                  <el-select v-model="systemFilters.type" placeholder="消息类型" size="small" style="width: 100px">
                    <el-option label="全部" value="" />
                    <el-option label="设备状态" value="device" />
                    <el-option label="通信状态" value="comm" />
                    <el-option label="系统日志" value="log" />
                  </el-select>
                  <el-select v-model="systemFilters.level" placeholder="级别" size="small" style="width: 100px">
                    <el-option label="全部级别" value="" />
                    <el-option label="正常" value="info" />
                    <el-option label="警告" value="warning" />
                    <el-option label="错误" value="error" />
                  </el-select>
                  <el-input
                    v-model="systemFilters.keyword"
                    placeholder="关键词搜索"
                    size="small"
                    style="width: 150px"
                    clearable
                    :prefix-icon="Search"
                  />
                </div>
                <div class="toolbar-actions">
                  <el-button size="small" :icon="Refresh" @click="refreshSystemData">刷新</el-button>
                  <el-button size="small" :icon="Download">导出日志</el-button>
                </div>
              </div>
              <!-- 系统状态概览 -->
              <div class="system-stats">
                <div class="stat-card online">
                  <div class="stat-icon"><el-icon><Connection /></el-icon></div>
                  <div class="stat-info">
                    <div class="stat-value">{{ systemStats.onlineDevices }}</div>
                    <div class="stat-label">在线设备</div>
                  </div>
                </div>
                <div class="stat-card offline">
                  <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
                  <div class="stat-info">
                    <div class="stat-value">{{ systemStats.offlineDevices }}</div>
                    <div class="stat-label">离线设备</div>
                  </div>
                </div>
                <div class="stat-card warning">
                  <div class="stat-icon"><el-icon><Warning /></el-icon></div>
                  <div class="stat-info">
                    <div class="stat-value">{{ systemStats.warnings }}</div>
                    <div class="stat-label">警告数</div>
                  </div>
                </div>
                <div class="stat-card error">
                  <div class="stat-icon"><el-icon><CircleCloseFilled /></el-icon></div>
                  <div class="stat-info">
                    <div class="stat-value">{{ systemStats.errors }}</div>
                    <div class="stat-label">错误数</div>
                  </div>
                </div>
              </div>
              <!-- 系统消息表格 -->
              <el-table :data="systemTableData" size="small" height="100" border stripe>
                <el-table-column prop="time" label="时间" width="150" />
                <el-table-column prop="type" label="类型" width="90">
                  <template #default="{ row }">
                    <el-tag :type="getSystemTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="level" label="级别" width="80">
                  <template #default="{ row }">
                    <span :class="['level-badge', row.level]">
                      <el-icon v-if="row.level === 'error'"><CircleCloseFilled /></el-icon>
                      <el-icon v-else-if="row.level === 'warning'"><Warning /></el-icon>
                      <el-icon v-else><SuccessFilled /></el-icon>
                      {{ getLevelText(row.level) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="device" label="设备/车辆" width="120" />
                <el-table-column prop="message" label="消息内容" min-width="250" show-overflow-tooltip />
                <el-table-column label="操作" width="80" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="handleSystemDetail(row)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getVehicles, getVehicleStats, type VehicleData } from '@/api/vehicle'
import {
  Search,
  Setting,
  OfficeBuilding,
  Aim,
  FullScreen,
  ArrowDown,
  MapLocation,
  Picture,
  Van,
  Grid,
  Edit,
  Download,
  Camera,
  VideoCamera,
  Microphone,
  MoreFilled,
  Loading,
  Connection,
  Timer,
  Mute,
  VideoPause,
  VideoPlay,
  Plus,
  Close,
  Delete,
  Refresh,
  Warning,
  CircleClose,
  CircleCloseFilled,
  SuccessFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useVehicleStore } from '@/stores/vehicle'
import { getSocket } from '@/utils/websocket'
import type { VehicleTreeNode } from '@/types'
import FlvPlayer from '@/components/FlvPlayer.vue'

const router = useRouter()
const vehicleStore = useVehicleStore()

// 侧边栏状态
const sidebarCollapsed = ref(false)
const searchKeyword = ref('')
const filters = ref({
  type: '',
  status: '',
  device: ''
})
const activeTab = ref('status')

// 视图模式
const viewMode = ref('map')
const tableTab = ref('gps')

// 视频模式相关
interface VideoWindow {
  vehicle: any | null
  channel: number
  status: 'idle' | 'connecting' | 'playing' | 'offline'
  playing: boolean
  muted: boolean
  bitrate: number
  fps: number
}

const videoLayout = ref<number>(4)  // 默认2x2布局
const videoLayouts = [
  { label: '1x1', value: 1 },
  { label: '2x2', value: 4 },
  { label: '3x3', value: 9 },
  { label: '4x4', value: 16 }
]

const selectedVideoWindow = ref(0)
const videoWindows = ref<VideoWindow[]>([])

// 初始化视频窗口
const initVideoWindows = (count: number) => {
  const windows: VideoWindow[] = []
  for (let i = 0; i < count; i++) {
    windows.push({
      vehicle: null,
      channel: 1,
      status: 'idle',
      playing: false,
      muted: true,
      bitrate: 0,
      fps: 0
    })
  }
  videoWindows.value = windows
}

// 监听布局变化
watch(videoLayout, (newVal) => {
  initVideoWindows(newVal)
}, { immediate: true })

// 已激活的视频窗口
const activeVideoWindows = computed(() => {
  return videoWindows.value.filter(w => w.vehicle !== null)
})

// 当前时间
const currentTime = ref('')
let timeTimer: any = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 视频轮询相关
const pollPlaying = ref(false)
const pollInterval = ref(30)
const pollIndex = ref(0)
const pollVehicleList = ref<any[]>([])
let pollTimer: any = null

const pollCurrentVehicle = computed(() => {
  return pollVehicleList.value[pollIndex.value] || null
})

// 选择视频窗口
const selectVideoWindow = (index: number) => {
  selectedVideoWindow.value = index
}

// 双击视频窗口
const handleVideoWindowDblClick = (index: number) => {
  const window = videoWindows.value[index]
  if (window?.vehicle) {
    // 全屏播放
    handleVideoFullscreen(index)
  }
}

// 添加车辆视频到窗口
const addVehicleToVideoWindow = (vehicle: any, channel: number = 1) => {
  const targetIndex = selectedVideoWindow.value
  if (targetIndex >= videoWindows.value.length) return

  videoWindows.value[targetIndex] = {
    vehicle,
    channel,
    status: 'connecting',
    playing: true,
    muted: true,
    bitrate: 0,
    fps: 0
  }

  // FlvPlayer will handle the real connection via events

  // 自动选择下一个空窗口
  const nextEmpty = videoWindows.value.findIndex((w, i) => i > targetIndex && !w.vehicle)
  if (nextEmpty !== -1) {
    selectedVideoWindow.value = nextEmpty
  }
}

// 视频命令处理
const handleVideoCommand = (command: string, index: number) => {
  switch (command) {
    case 'close':
      closeVideoWindow(index)
      break
    case 'fullscreen':
      handleVideoFullscreen(index)
      break
    case 'screenshot':
      handleVideoScreenshot(index)
      break
    case 'record':
      handleVideoRecord(index)
      break
  }
}

// 关闭视频窗口
const closeVideoWindow = (index: number) => {
  videoWindows.value[index] = {
    vehicle: null,
    channel: 1,
    status: 'idle',
    playing: false,
    muted: true,
    bitrate: 0,
    fps: 0
  }
}

// 视频全屏
const handleVideoFullscreen = (index: number) => {
  console.log('全屏播放窗口:', index)
}

// 视频截图
const handleVideoScreenshot = (index: number) => {
  const window = videoWindows.value[index]
  if (window?.vehicle) {
    console.log('截图:', window.vehicle.plateNo)
  }
}

// 视频录像
const handleVideoRecord = (index: number) => {
  console.log('开始录像窗口:', index)
}

// 切换静音
const toggleVideoMute = (index: number) => {
  const window = videoWindows.value[index]
  if (window) window.muted = !window.muted
}

// 切换播放
const toggleVideoPlay = (index: number) => {
  const window = videoWindows.value[index]
  if (window) window.playing = !window.playing
}

// FlvPlayer 事件处理
const handleVideoConnected = (index: number) => {
  console.log(`[Monitor] Video window ${index} connected`)
  const window = videoWindows.value[index]
  if (window) {
    window.status = 'playing'
    window.playing = true
  }
}

const handleVideoDisconnected = (index: number) => {
  console.log(`[Monitor] Video window ${index} disconnected`)
  const window = videoWindows.value[index]
  if (window) {
    window.status = 'offline'
    window.playing = false
  }
}

const handleVideoError = (index: number, error: string) => {
  console.log(`[Monitor] Video window ${index} error:`, error)
  const window = videoWindows.value[index]
  if (window) {
    window.status = 'offline'
    window.playing = false
  }
}

// 视频工具栏操作
const handleScreenshot = () => {
  console.log('全局截图')
}

const handleRecord = () => {
  console.log('全局录像')
}

const handleTalk = () => {
  console.log('对讲')
}

const handleFullScreen = () => {
  console.log('全屏')
}

// 轮询控制
const togglePoll = () => {
  pollPlaying.value = !pollPlaying.value
  if (pollPlaying.value) {
    startPoll()
  } else {
    stopPoll()
  }
}

const startPoll = () => {
  if (pollVehicleList.value.length === 0) {
    pollPlaying.value = false
    return
  }
  pollTimer = setInterval(() => {
    pollIndex.value = (pollIndex.value + 1) % pollVehicleList.value.length
  }, pollInterval.value * 1000)
}

const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 添加车辆到轮询列表
const addVehicleToPoll = (vehicle: any) => {
  if (!pollVehicleList.value.find(v => v.id === vehicle.id)) {
    pollVehicleList.value.push(vehicle)
  }
}

// 移除轮询车辆
const removePollVehicle = (index: number) => {
  pollVehicleList.value.splice(index, 1)
  if (pollIndex.value >= pollVehicleList.value.length) {
    pollIndex.value = Math.max(0, pollVehicleList.value.length - 1)
  }
}

// 地图相关
let map: any = null
let AMapInstance: any = null
let markers: any[] = []
let markerMap: Record<string, any> = {}  // 按车辆ID存储marker
let currentInfoWindow: any = null  // 当前信息窗体
const zoomLevel = ref(5)
const clusterEnabled = ref(false)
const selectedVehicleId = ref<string | null>(null)  // 当前选中的车辆

// 树形组件
const vehicleTreeRef = ref()
const treeProps = {
  children: 'children',
  label: 'label'
}

// 车辆详细数据（包含位置信息）- 从API获取
const vehicleDataMap = ref<Record<string, any>>({})

// 加载中状态
const loading = ref(false)

// 从API获取车辆数据
const fetchVehicles = async () => {
  try {
    loading.value = true
    const res = await getVehicles({ pageSize: 1000 })
    if (res.code === 0 && res.data.list) {
      // 转换为vehicleDataMap格式
      const newMap: Record<string, any> = {}
      res.data.list.forEach((v: VehicleData) => {
        const key = `v-${v.id}`
        newMap[key] = {
          id: key,
          plateNo: v.plateNo,
          driverName: v.driverName || '',
          driverPhone: '',
          companyName: v.companyName,
          groupName: v.groupName,
          deviceId: v.deviceId,
          online: v.online,
          status: v.status,
          speed: v.speed,
          direction: v.direction,
          lng: v.lng,
          lat: v.lat,
          gpsTime: v.gpsTime,
          address: '',  // 需要逆地理编码
          mileage: v.mileage,
          todayMileage: 0,
          alarmFlag: v.alarmFlag,
          accOn: v.accOn,
          manufacturer: v.manufacturer,
          terminalModel: v.terminalModel
        }
      })
      vehicleDataMap.value = newMap
      console.log('[Monitor] Loaded', Object.keys(newMap).length, 'vehicles from API')

      // 更新地图标记
      if (AMapInstance && map) {
        addVehicleMarkers(AMapInstance)
      }
    }
  } catch (error) {
    console.error('[Monitor] Failed to fetch vehicles:', error)
  } finally {
    loading.value = false
  }
}

// 监听WebSocket GPS更新
const handleGpsUpdate = (data: any) => {
  // 查找并更新对应的车辆
  for (const [key, vehicle] of Object.entries(vehicleDataMap.value)) {
    if (vehicle.deviceId === data.deviceId) {
      vehicleDataMap.value[key] = {
        ...vehicle,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        direction: data.direction,
        gpsTime: data.gpsTime,
        online: true,
        accOn: data.accOn,
        alarmFlag: data.alarmFlag,
        status: data.speed > 0 ? 'driving' : (data.accOn ? 'parking_acc_on' : 'acc_off')
      }

      // 更新地图上的标记位置
      if (markerMap[key] && AMapInstance) {
        markerMap[key].setPosition([data.lng, data.lat])
        markerMap[key].setIcon(getMarkerIcon(AMapInstance, vehicleDataMap.value[key].status))
      }

      console.log('[Monitor] GPS update for', vehicle.plateNo, ':', data.lat.toFixed(4), data.lng.toFixed(4), data.speed + 'km/h')
      break
    }
  }
}

// 车辆树数据 - 根据vehicleDataMap动态计算
const vehicleTreeData = computed(() => {
  const vehicles = Object.values(vehicleDataMap.value)
  const onlineCount = vehicles.filter((v: any) => v.online).length
  const totalCount = vehicles.length

  // 按公司分组
  const companyMap: Record<string, any[]> = {}
  vehicles.forEach((v: any) => {
    const companyName = v.companyName || 'JT808设备'
    if (!companyMap[companyName]) {
      companyMap[companyName] = []
    }
    companyMap[companyName].push(v)
  })

  // 构建子节点
  const children: any[] = Object.entries(companyMap).map(([companyName, vList], index) => {
    const companyOnline = vList.filter((v: any) => v.online).length
    return {
      id: `company-${index + 2}`,
      label: `${companyName} (${companyOnline}/${vList.length})`,
      type: 'company',
      children: vList.map((v: any) => ({
        id: v.id,
        label: v.plateNo,
        type: 'vehicle',
        data: v
      }))
    }
  })

  return [{
    id: 'company-1',
    label: `监控中心 (${onlineCount}/${totalCount})`,
    type: 'company',
    children
  }]
})

// GPS表格数据 - 从vehicleDataMap生成
const gpsTableData = computed(() => {
  return Object.values(vehicleDataMap.value).map((v: any) => ({
    id: v.id,
    plateNo: v.plateNo,
    companyName: v.companyName,
    groupName: v.groupName,
    status: getStatusText(v.status),
    speed: `${v.speed} km/h`,
    gpsTime: v.gpsTime,
    address: v.address
  }))
})

// ============ 媒体文件模块 ============
const mediaFilters = ref({
  type: '',
  source: '',
  dateRange: null as any,
  plateNo: ''
})

// 媒体文件表格数据
const mediaTableData = ref([
  { id: 1, type: 'video', fileName: 'CH1_20240103_180000.mp4', plateNo: '沪A12345', channel: 'CH1', source: '报警抓拍', size: '25.6MB', duration: '00:30', createTime: '2024-01-03 18:00:00' },
  { id: 2, type: 'image', fileName: 'CH2_20240103_175530.jpg', plateNo: '沪A12345', channel: 'CH2', source: '手动抓拍', size: '512KB', duration: '-', createTime: '2024-01-03 17:55:30' },
  { id: 3, type: 'video', fileName: 'CH1_20240103_173000.mp4', plateNo: '沪B67890', channel: 'CH1', source: '定时抓拍', size: '18.2MB', duration: '00:20', createTime: '2024-01-03 17:30:00' },
  { id: 4, type: 'image', fileName: 'CH3_20240103_165000.jpg', plateNo: '京A11111', channel: 'CH3', source: '报警抓拍', size: '480KB', duration: '-', createTime: '2024-01-03 16:50:00' },
  { id: 5, type: 'audio', fileName: 'CH1_20240103_160000.wav', plateNo: '沪C11111', channel: 'CH1', source: '手动抓拍', size: '2.1MB', duration: '00:45', createTime: '2024-01-03 16:00:00' },
  { id: 6, type: 'video', fileName: 'CH2_20240103_150000.mp4', plateNo: '粤A22222', channel: 'CH2', source: '报警抓拍', size: '32.5MB', duration: '00:40', createTime: '2024-01-03 15:00:00' }
])

// 获取媒体来源标签类型
const getMediaSourceType = (source: string) => {
  const map: Record<string, string> = {
    '报警抓拍': 'danger',
    '手动抓拍': 'primary',
    '定时抓拍': 'success'
  }
  return map[source] || 'info'
}

// 媒体预览
const handleMediaPreview = (row: any) => {
  ElMessage.info(`预览文件: ${row.fileName}`)
}

// 媒体下载
const handleMediaDownload = (row: any) => {
  ElMessage.success(`开始下载: ${row.fileName}`)
}

// 媒体删除
const handleMediaDelete = (row: any) => {
  ElMessage.warning(`确认删除: ${row.fileName}`)
}

// ============ 系统模块 ============
const systemFilters = ref({
  type: '',
  level: '',
  keyword: ''
})

// 系统统计数据
const systemStats = ref({
  onlineDevices: 145,
  offlineDevices: 12,
  warnings: 8,
  errors: 2
})

// 系统消息表格数据
const systemTableData = ref([
  { id: 1, time: '2024-01-03 18:05:23', type: '设备状态', level: 'info', device: '沪A12345', message: '设备上线，信号强度良好' },
  { id: 2, time: '2024-01-03 18:03:15', type: '通信状态', level: 'warning', device: '沪B67890', message: 'GPS信号弱，定位精度降低' },
  { id: 3, time: '2024-01-03 18:01:00', type: '系统日志', level: 'error', device: '服务器', message: '视频服务连接超时，正在重试...' },
  { id: 4, time: '2024-01-03 17:58:42', type: '设备状态', level: 'info', device: '京A11111', message: '设备固件升级成功 v2.3.1' },
  { id: 5, time: '2024-01-03 17:55:30', type: '通信状态', level: 'warning', device: '粤A22222', message: '设备离线超过10分钟' },
  { id: 6, time: '2024-01-03 17:50:00', type: '系统日志', level: 'info', device: '系统', message: '定时备份任务执行完成' }
])

// 获取系统类型标签
const getSystemTypeTag = (type: string) => {
  const map: Record<string, string> = {
    '设备状态': 'primary',
    '通信状态': 'warning',
    '系统日志': 'info'
  }
  return map[type] || 'info'
}

// 获取级别文字
const getLevelText = (level: string) => {
  const map: Record<string, string> = {
    'info': '正常',
    'warning': '警告',
    'error': '错误'
  }
  return map[level] || level
}

// 刷新系统数据
const refreshSystemData = () => {
  ElMessage.success('数据已刷新')
}

// 查看系统消息详情
const handleSystemDetail = (row: any) => {
  ElMessage.info(`查看详情: ${row.message}`)
}

// 获取车辆状态样式
const getVehicleStatusClass = (data: any) => {
  if (!data) return 'offline'
  if (!data.online) return 'offline'
  return data.status || 'online'
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    '行驶中': 'success',
    '停车': 'warning',
    '离线': 'info',
    '报警': 'danger'
  }
  return map[status] || 'info'
}

// 筛选树节点
const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.label.toLowerCase().includes(value.toLowerCase())
}

// 监听搜索关键词
watch(searchKeyword, (val) => {
  vehicleTreeRef.value?.filter(val)
})

// 获取状态文字
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'driving': '行驶中',
    'parking_acc_on': '停车(ACC开)',
    'parking_acc_off': '停车(ACC关)',
    'offline': '离线',
    'alarm': '报警'
  }
  return statusMap[status] || status
}

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'driving': '#52c41a',
    'parking_acc_on': '#faad14',
    'parking_acc_off': '#d9d9d9',
    'offline': '#999999',
    'alarm': '#ff4d4f'
  }
  return colorMap[status] || '#1890ff'
}

// 创建车辆信息窗体内容
const createInfoWindowContent = (vehicle: any) => {
  const statusColor = getStatusColor(vehicle.status)
  const statusText = getStatusText(vehicle.status)

  return `
    <div class="vehicle-info-window" style="min-width: 280px; padding: 12px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        <span style="font-size: 16px; font-weight: 600; color: #333;">${vehicle.plateNo}</span>
        <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #fff; background: ${statusColor};">${statusText}</span>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; color: #666;">
        <span style="color: #999;">驾驶员:</span>
        <span>${vehicle.driverName} ${vehicle.driverPhone}</span>
        <span style="color: #999;">所属公司:</span>
        <span>${vehicle.companyName}</span>
        <span style="color: #999;">当前速度:</span>
        <span style="color: ${vehicle.speed > 0 ? '#1890ff' : '#666'};">${vehicle.speed} km/h</span>
        <span style="color: #999;">GPS时间:</span>
        <span>${vehicle.gpsTime}</span>
        <span style="color: #999;">当前位置:</span>
        <span style="color: #333;">${vehicle.address}</span>
        <span style="color: #999;">今日里程:</span>
        <span>${vehicle.todayMileage} km</span>
        <span style="color: #999;">总里程:</span>
        <span>${vehicle.mileage} km</span>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee;">
        <button onclick="window.handleVehicleAction('track', '${vehicle.id}')" style="flex: 1; padding: 6px 12px; border: none; border-radius: 4px; background: #409eff; color: #fff; cursor: pointer;">跟踪</button>
        <button onclick="window.handleVehicleAction('video', '${vehicle.id}')" style="flex: 1; padding: 6px 12px; border: none; border-radius: 4px; background: #67c23a; color: #fff; cursor: pointer;">视频</button>
        <button onclick="window.handleVehicleAction('replay', '${vehicle.id}')" style="flex: 1; padding: 6px 12px; border: none; border-radius: 4px; background: #e6a23c; color: #fff; cursor: pointer;">回放</button>
      </div>
    </div>
  `
}

// 显示车辆信息窗体
const showVehicleInfoWindow = (vehicle: any) => {
  if (!map || !AMapInstance) return

  // 关闭之前的信息窗体
  if (currentInfoWindow) {
    currentInfoWindow.close()
  }

  // 创建新的信息窗体
  currentInfoWindow = new AMapInstance.InfoWindow({
    content: createInfoWindowContent(vehicle),
    offset: new AMapInstance.Pixel(0, -30),
    closeWhenClickMap: true
  })

  // 打开信息窗体
  currentInfoWindow.open(map, [vehicle.lng, vehicle.lat])
}

// 处理节点点击
const handleNodeClick = (data: any) => {
  if (data.type === 'vehicle' && data.data) {
    const vehicle = data.data
    selectedVehicleId.value = data.id

    // 根据当前模式处理
    if (viewMode.value === 'map') {
      // 地图模式 - 定位到车辆位置
      if (!map) {
        console.warn('地图尚未初始化')
        return
      }
      map.setZoomAndCenter(15, [vehicle.lng, vehicle.lat])
      showVehicleInfoWindow(vehicle)

      const marker = markerMap[data.id]
      if (marker) {
        marker.setAnimation('AMAP_ANIMATION_BOUNCE')
        setTimeout(() => {
          marker.setAnimation('AMAP_ANIMATION_NONE')
        }, 1500)
      }
    } else if (viewMode.value === 'video') {
      // 视频模式 - 添加到视频窗口
      addVehicleToVideoWindow(vehicle)
    } else if (viewMode.value === 'poll') {
      // 轮询模式 - 添加到轮询列表
      addVehicleToPoll(vehicle)
    }
  }
}

// 地图类型切换
const handleMapType = (type: string) => {
  if (!map) return
  switch (type) {
    case 'normal':
      map.setMapStyle('amap://styles/normal')
      break
    case 'satellite':
      map.setMapStyle('amap://styles/satellite')
      break
    case 'traffic':
      // 切换路况图层
      break
  }
}

// 切换聚合
const toggleCluster = () => {
  clusterEnabled.value = !clusterEnabled.value
}

// 缩放
const zoomIn = () => {
  if (map) {
    map.zoomIn()
    zoomLevel.value = map.getZoom()
  }
}

const zoomOut = () => {
  if (map) {
    map.zoomOut()
    zoomLevel.value = map.getZoom()
  }
}

// 初始化地图
const initMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: '0236671cfb04ddf41d952d0a47b78106', // 高德地图API密钥
      version: '1.4.15', // 使用1.4版本，不需要安全码
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MarkerClusterer', 'AMap.InfoWindow']
    })

    // 保存AMap实例供后续使用
    AMapInstance = AMap

    map = new AMap.Map('mapContainer', {
      zoom: 5,
      center: [116.397428, 39.90923],
      mapStyle: 'amap://styles/normal'
    })

    // 添加控件
    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar({ position: 'RT' }))

    // 监听缩放
    map.on('zoomchange', () => {
      zoomLevel.value = Math.round(map.getZoom())
    })

    // 添加车辆标记
    addVehicleMarkers(AMap)

    // 注册全局车辆操作处理函数
    ;(window as any).handleVehicleAction = (action: string, vehicleId: string) => {
      const vehicle = vehicleDataMap.value[vehicleId]
      if (!vehicle) return

      switch (action) {
        case 'track':
          console.log('开始跟踪车辆:', vehicle.plateNo)
          // 定位并跟踪车辆
          if (map) {
            map.setZoomAndCenter(16, [vehicle.lng, vehicle.lat])
          }
          ElMessage.success(`开始跟踪: ${vehicle.plateNo}`)
          break
        case 'video':
          console.log('打开视频:', vehicle.plateNo)
          // 切换到视频模式并添加车辆视频
          viewMode.value = 'video'
          addVehicleToVideoWindow(vehicle)
          ElMessage.success(`已添加视频: ${vehicle.plateNo}`)
          break
        case 'replay':
          // 跳转到轨迹回放页面，带上车牌号参数
          router.push({
            path: '/replay',
            query: { plateNo: vehicle.plateNo }
          })
          break
      }
    }
  } catch (error) {
    console.error('Map init error:', error)
  }
}

// 获取marker图标
const getMarkerIcon = (AMap: any, status: string) => {
  const iconUrls: Record<string, string> = {
    'driving': 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',  // 蓝色 - 行驶
    'parking_acc_on': 'https://webapi.amap.com/theme/v1.3/markers/n/mark_y.png',  // 黄色 - 停车ACC开
    'parking_acc_off': 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',  // 绿色 - 停车ACC关
    'offline': 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',  // 红色 - 离线
    'alarm': 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'  // 红色 - 报警
  }

  return new AMap.Icon({
    size: new AMap.Size(32, 32),
    image: iconUrls[status] || iconUrls['offline'],
    imageSize: new AMap.Size(32, 32)
  })
}

// 添加车辆标记
const addVehicleMarkers = (AMap: any) => {
  // 清除旧的markers
  markers.forEach(m => m.setMap(null))
  markers = []
  markerMap = {}

  // 遍历所有车辆数据
  Object.entries(vehicleDataMap.value).forEach(([vehicleId, vehicle]) => {
    const marker = new AMap.Marker({
      position: [vehicle.lng, vehicle.lat],
      title: vehicle.plateNo,
      icon: getMarkerIcon(AMap, vehicle.status),
      extData: { vehicleId, vehicle }  // 存储车辆数据
    })

    // 点击marker显示信息窗体
    marker.on('click', () => {
      selectedVehicleId.value = vehicleId
      showVehicleInfoWindow(vehicle)
    })

    marker.setMap(map)
    markers.push(marker)
    markerMap[vehicleId] = marker
  })
}

onMounted(async () => {
  // 获取车辆数据
  await fetchVehicles()

  nextTick(() => {
    initMap()
  })

  // 更新时间
  updateTime()
  timeTimer = setInterval(updateTime, 1000)

  // 监听WebSocket GPS更新
  const socket = getSocket()
  if (socket) {
    socket.on('gps:update', handleGpsUpdate)
    console.log('[Monitor] Subscribed to GPS updates')
  }

  // 定时刷新数据 (每30秒)
  const refreshTimer = setInterval(fetchVehicles, 30000)
  onUnmounted(() => clearInterval(refreshTimer))
})

onUnmounted(() => {
  if (map) {
    map.destroy()
  }
  if (timeTimer) {
    clearInterval(timeTimer)
  }
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<style lang="scss" scoped>
.monitor-page {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.monitor-sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s;

  &.collapsed {
    width: 0;
    overflow: hidden;
  }

  .sidebar-filters {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .el-select {
      flex: 1;
    }
  }

  .sidebar-search {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .el-input {
      flex: 1;
    }
  }

  .sidebar-tree {
    flex: 1;
    overflow: auto;
    padding: 8px;

    .custom-tree-node {
      flex: 1;
      display: flex;
      align-items: center;

      .node-label {
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
          background: #d9d9d9;

          &.driving {
            background: #52c41a;
          }
          &.parking_acc_on {
            background: #faad14;
          }
          &.online {
            background: #1890ff;
          }
          &.alarm {
            background: #ff4d4f;
          }
          &.offline {
            background: #d9d9d9;
          }
        }
      }
    }
  }

  .sidebar-tabs {
    border-top: 1px solid #f0f0f0;

    :deep(.el-tabs__header) {
      margin: 0;
    }

    :deep(.el-tabs__nav) {
      width: 100%;
      display: flex;

      .el-tabs__item {
        flex: 1;
        text-align: center;
        padding: 0;
        height: 36px;
        line-height: 36px;
      }
    }
  }
}

.monitor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .content-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .content-main {
    flex: 1;
    position: relative;
    overflow: hidden;

    .map-wrapper {
      width: 100%;
      height: 100%;
      position: relative;

      .map-container {
        width: 100%;
        height: 100%;
      }

      .map-controls {
        position: absolute;
        right: 10px;
        top: 10px;
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

          &:hover {
            background: #f5f5f5;
            color: #409eff;
          }

          .el-icon {
            font-size: 20px;
            margin-bottom: 4px;
          }
        }
      }

      .map-zoom {
        position: absolute;
        left: 10px;
        bottom: 30px;
        background: #fff;
        padding: 8px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

        .scale {
          font-size: 12px;
          color: #666;
        }

        .zoom-level {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          margin: 8px 0;
        }

        .zoom-btns {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      }
    }
  }

  .content-table {
    height: 280px;
    background: #fff;
    border-top: 1px solid #e8e8e8;

    .table-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    :deep(.el-tabs__header) {
      margin: 0;
      padding: 0 12px;
    }
  }

  // 视频模式样式
  .content-main.video-mode {
    display: flex;
    flex-direction: column;
    background: #1a1a2e;

    .video-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;

      .toolbar-left,
      .toolbar-center,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .video-info {
        color: #94a3b8;
        font-size: 13px;
      }
    }

    .video-grid {
      flex: 1;
      display: grid;
      gap: 4px;
      padding: 4px;
      background: #0f0f23;

      &.grid-1 {
        grid-template-columns: 1fr;
      }

      &.grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }

      &.grid-9 {
        grid-template-columns: repeat(3, 1fr);
      }

      &.grid-16 {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .video-window {
      background: #1a1a2e;
      border: 2px solid transparent;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s;

      &:hover {
        border-color: #334155;
      }

      &.active {
        border-color: #409eff;
      }

      &.has-video {
        .video-header {
          display: flex;
        }
      }

      .video-header {
        display: none;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 12px;

        .vehicle-plate {
          font-weight: 500;
        }

        .channel-name {
          color: #94a3b8;
          margin-left: 8px;
        }

        .more-btn {
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }

      .video-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .video-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        position: relative;

        .video-icon {
          font-size: 48px;
          color: #334155;
          margin-bottom: 12px;
        }

        .video-status {
          .connecting {
            color: #f59e0b;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .playing {
            color: #22c55e;
            display: flex;
            align-items: center;
            gap: 6px;

            .live-dot {
              width: 8px;
              height: 8px;
              background: #22c55e;
              border-radius: 50%;
              animation: pulse 1.5s infinite;
            }
          }

          .offline {
            color: #6b7280;
          }
        }

        .video-info-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px 12px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          display: flex;
          justify-content: space-between;
          color: #fff;
          font-size: 12px;
        }

        &.large {
          .video-icon {
            font-size: 80px;
          }
        }
      }

      .video-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.6);
        color: #94a3b8;
        font-size: 11px;

        .video-stats {
          display: flex;
          gap: 12px;

          span {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }

        .video-controls {
          display: flex;
          gap: 8px;

          .control-btn {
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            font-size: 16px;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }
          }
        }
      }

      .empty-window {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #475569;
        font-size: 13px;

        .empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
          color: #334155;
        }

        .window-number {
          margin-top: 8px;
          font-size: 12px;
          color: #334155;
        }

        &.large {
          .empty-icon {
            font-size: 60px;
          }
        }
      }
    }
  }

  // 轮询模式样式
  .content-main.poll-mode {
    background: #1a1a2e;

    .poll-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 12px;

      .poll-video {
        flex: 1;
        background: #16213e;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .poll-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: #16213e;
        border-radius: 8px;

        .poll-info {
          color: #94a3b8;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .poll-progress {
          color: #409eff;
          font-weight: 500;
          margin-left: auto;
        }
      }

      .poll-list {
        height: 200px;
        background: #16213e;
        border-radius: 8px;
        overflow: hidden;

        .poll-list-header {
          padding: 10px 16px;
          background: #0f3460;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }

        .poll-list-content {
          padding: 8px;
          max-height: 150px;
          overflow-y: auto;

          .poll-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 4px;
            color: #94a3b8;
            font-size: 13px;
            cursor: pointer;

            &:hover {
              background: rgba(255, 255, 255, 0.05);
            }

            &.active {
              background: #409eff;
              color: #fff;
            }

            .poll-item-no {
              width: 24px;
              height: 24px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              font-size: 12px;
            }

            .poll-item-plate {
              flex: 1;
            }

            .poll-item-remove {
              opacity: 0;
              cursor: pointer;

              &:hover {
                color: #f56c6c;
              }
            }

            &:hover .poll-item-remove {
              opacity: 1;
            }
          }

          .poll-empty {
            text-align: center;
            color: #475569;
            padding: 24px;
            font-size: 13px;
          }
        }
      }
    }
  }
}

// 媒体文件面板样式
.media-panel {
  padding: 8px 12px;

  .media-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .toolbar-filters {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }

  .media-preview {
    width: 50px;
    height: 36px;
    background: #f0f2f5;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e6f7ff;
    }

    .preview-icon {
      font-size: 20px;

      &.video {
        color: #409eff;
      }
      &.image {
        color: #67c23a;
      }
      &.audio {
        color: #e6a23c;
      }
    }
  }
}

// 系统面板样式
.system-panel {
  padding: 8px 12px;

  .system-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .toolbar-filters {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }

  .system-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;

    .stat-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid;

      &.online {
        border-color: #67c23a;
        .stat-icon { color: #67c23a; }
      }
      &.offline {
        border-color: #909399;
        .stat-icon { color: #909399; }
      }
      &.warning {
        border-color: #e6a23c;
        .stat-icon { color: #e6a23c; }
      }
      &.error {
        border-color: #f56c6c;
        .stat-icon { color: #f56c6c; }
      }

      .stat-icon {
        font-size: 28px;
      }

      .stat-info {
        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #303133;
        }
        .stat-label {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .level-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;

    &.info {
      color: #67c23a;
    }
    &.warning {
      color: #e6a23c;
    }
    &.error {
      color: #f56c6c;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

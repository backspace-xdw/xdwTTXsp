<template>
  <div class="group-mon-page">
    <!-- 顶部工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索分组或车辆"
          prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select v-model="filterStatus" placeholder="车辆状态" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="报警" value="alarm" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="card">卡片视图</el-radio-button>
          <el-radio-button label="video">视频视图</el-radio-button>
        </el-radio-group>
        <el-button :icon="Refresh" @click="refreshData">刷新</el-button>
      </div>
    </div>

    <!-- 面包屑导航 -->
    <div class="breadcrumb-nav" v-if="selectedGroup">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item @click="goBack" class="clickable">
          <el-icon><HomeFilled /></el-icon>
          全部分组
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ selectedGroup.name }}</el-breadcrumb-item>
      </el-breadcrumb>
      <span class="group-stats">
        在线: <span class="online">{{ selectedGroup.online }}</span> /
        总数: {{ selectedGroup.total }}
      </span>
    </div>

    <!-- 主内容区 -->
    <div class="page-content">
      <!-- 分组卡片视图 -->
      <div v-if="!selectedGroup && viewMode === 'card'" class="group-cards">
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="group-card"
          @click="selectGroup(group)"
        >
          <div class="card-header">
            <el-icon class="group-icon"><OfficeBuilding /></el-icon>
            <span class="group-name">{{ group.name }}</span>
          </div>
          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-value online">{{ group.online }}</span>
              <span class="stat-label">在线</span>
            </div>
            <div class="stat-item">
              <span class="stat-value offline">{{ group.offline }}</span>
              <span class="stat-label">离线</span>
            </div>
            <div class="stat-item">
              <span class="stat-value alarm">{{ group.alarm }}</span>
              <span class="stat-label">报警</span>
            </div>
            <div class="stat-item">
              <span class="stat-value total">{{ group.total }}</span>
              <span class="stat-label">总数</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="online-rate">在线率: {{ getOnlineRate(group) }}%</span>
            <el-button type="primary" size="small" link>
              进入监控 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分组视频视图 -->
      <div v-if="!selectedGroup && viewMode === 'video'" class="group-video-grid">
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="video-group-card"
        >
          <div class="video-group-header">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ group.online }}/{{ group.total }}</span>
          </div>
          <div class="video-preview-grid">
            <div
              v-for="(vehicle, idx) in group.vehicles.slice(0, 4)"
              :key="vehicle.id"
              class="video-preview-item"
              @click="openVehicleVideo(vehicle)"
            >
              <div v-if="vehicle.online" class="video-preview">
                <el-icon class="video-icon"><VideoCamera /></el-icon>
                <span class="vehicle-plate">{{ vehicle.plateNo }}</span>
                <span class="live-badge" v-if="vehicle.online">LIVE</span>
              </div>
              <div v-else class="video-offline">
                <el-icon><VideoCameraFilled /></el-icon>
                <span>{{ vehicle.plateNo }}</span>
                <span class="offline-text">离线</span>
              </div>
            </div>
            <div v-if="group.vehicles.length > 4" class="video-more" @click="selectGroup(group)">
              <span>+{{ group.vehicles.length - 4 }}</span>
              <span>更多</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分组详情 - 车辆列表 -->
      <div v-if="selectedGroup" class="group-detail">
        <!-- 车辆网格 -->
        <div class="vehicle-grid">
          <div
            v-for="vehicle in filteredVehicles"
            :key="vehicle.id"
            class="vehicle-card"
            :class="{ offline: !vehicle.online, alarm: vehicle.hasAlarm }"
          >
            <div class="vehicle-video" @click="openVehicleVideo(vehicle)">
              <template v-if="vehicle.online">
                <div class="video-placeholder">
                  <el-icon class="play-icon"><VideoPlay /></el-icon>
                </div>
                <span class="live-indicator">
                  <span class="dot"></span>
                  实时
                </span>
              </template>
              <template v-else>
                <div class="offline-placeholder">
                  <el-icon><VideoCameraFilled /></el-icon>
                  <span>设备离线</span>
                </div>
              </template>
            </div>
            <div class="vehicle-info">
              <div class="info-header">
                <span class="plate-no">{{ vehicle.plateNo }}</span>
                <el-tag
                  :type="getStatusType(vehicle)"
                  size="small"
                >
                  {{ getStatusText(vehicle) }}
                </el-tag>
              </div>
              <div class="info-details">
                <div class="detail-row">
                  <el-icon><User /></el-icon>
                  <span>{{ vehicle.driverName }}</span>
                </div>
                <div class="detail-row">
                  <el-icon><Location /></el-icon>
                  <span class="address">{{ vehicle.address }}</span>
                </div>
                <div class="detail-row">
                  <el-icon><Timer /></el-icon>
                  <span>{{ vehicle.gpsTime }}</span>
                </div>
              </div>
              <div class="info-actions">
                <el-button size="small" :icon="Aim" @click="locateVehicle(vehicle)">定位</el-button>
                <el-button size="small" :icon="VideoCamera" @click="openVehicleVideo(vehicle)">视频</el-button>
                <el-button size="small" :icon="Refresh" @click="openReplay(vehicle)">回放</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty v-if="filteredVehicles.length === 0" description="暂无车辆数据" />
      </div>
    </div>

    <!-- 视频弹窗 -->
    <el-dialog
      v-model="videoDialogVisible"
      :title="currentVideoVehicle?.plateNo + ' - 实时视频'"
      width="800px"
      destroy-on-close
    >
      <div class="video-dialog-content">
        <div class="video-main">
          <div class="video-player">
            <el-icon class="video-icon"><VideoCamera /></el-icon>
            <div class="video-status">
              <span v-if="currentVideoVehicle?.online" class="playing">
                <span class="live-dot"></span>
                实时视频
              </span>
              <span v-else class="offline">设备离线</span>
            </div>
            <div class="video-overlay">
              <span>{{ currentVideoVehicle?.plateNo }} - 通道1</span>
              <span>{{ currentTime }}</span>
            </div>
          </div>
        </div>
        <div class="video-channels">
          <div class="channel-title">通道选择</div>
          <div class="channel-list">
            <div
              v-for="ch in 4"
              :key="ch"
              class="channel-item"
              :class="{ active: selectedChannel === ch }"
              @click="selectedChannel = ch"
            >
              <el-icon><VideoCamera /></el-icon>
              <span>通道{{ ch }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button :icon="Camera" @click="handleScreenshot">截图</el-button>
          <el-button :icon="Download" @click="handleDownload">录像</el-button>
          <el-button :icon="FullScreen" @click="handleFullscreen">全屏</el-button>
          <el-button @click="videoDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  OfficeBuilding,
  ArrowRight,
  VideoCamera,
  VideoCameraFilled,
  VideoPlay,
  User,
  Location,
  Timer,
  Aim,
  Camera,
  Download,
  FullScreen,
  HomeFilled
} from '@element-plus/icons-vue'

const router = useRouter()

// 搜索和筛选
const searchKeyword = ref('')
const filterStatus = ref('')
const viewMode = ref('card')

// 选中的分组
const selectedGroup = ref<any>(null)

// 视频弹窗
const videoDialogVisible = ref(false)
const currentVideoVehicle = ref<any>(null)
const selectedChannel = ref(1)

// 当前时间
const currentTime = ref('')
let timeTimer: any = null

// 模拟分组数据
const groupsData = ref([
  {
    id: 'g1',
    name: '金旅',
    online: 144,
    offline: 43,
    alarm: 12,
    total: 187,
    vehicles: [
      { id: 'v1', plateNo: '沪A12345', driverName: '张三', online: true, hasAlarm: false, status: 'driving', speed: 65, address: '上海市浦东新区张江高科技园区', gpsTime: '2024-01-03 18:00:00' },
      { id: 'v2', plateNo: '沪B67890', driverName: '李四', online: true, hasAlarm: false, status: 'parking', speed: 0, address: '上海市黄浦区南京东路', gpsTime: '2024-01-03 17:55:00' },
      { id: 'v3', plateNo: '沪C11111', driverName: '王五', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '上海市浦东新区世纪大道', gpsTime: '2024-01-03 12:30:00' },
      { id: 'v4', plateNo: '沪D22222', driverName: '赵六', online: true, hasAlarm: true, status: 'alarm', speed: 45, address: '上海市静安区南京西路', gpsTime: '2024-01-03 18:02:00' },
      { id: 'v5', plateNo: '沪E33333', driverName: '钱七', online: true, hasAlarm: false, status: 'driving', speed: 55, address: '上海市徐汇区漕溪北路', gpsTime: '2024-01-03 18:01:00' },
      { id: 'v6', plateNo: '沪F44444', driverName: '孙八', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '上海市长宁区延安西路', gpsTime: '2024-01-02 20:00:00' }
    ]
  },
  {
    id: 'g2',
    name: '本安测试部',
    online: 6,
    offline: 83,
    alarm: 2,
    total: 89,
    vehicles: [
      { id: 'v7', plateNo: '京A11111', driverName: '周九', online: true, hasAlarm: false, status: 'driving', speed: 45, address: '北京市朝阳区CBD商务区', gpsTime: '2024-01-03 18:05:00' },
      { id: 'v8', plateNo: '京B22222', driverName: '吴十', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '北京市海淀区中关村', gpsTime: '2024-01-03 10:00:00' }
    ]
  },
  {
    id: 'g3',
    name: '山东四通',
    online: 6,
    offline: 14,
    alarm: 1,
    total: 20,
    vehicles: [
      { id: 'v9', plateNo: '鲁A11111', driverName: '郑一', online: true, hasAlarm: false, status: 'parking', speed: 0, address: '济南市历下区泉城路', gpsTime: '2024-01-03 17:30:00' },
      { id: 'v10', plateNo: '鲁B22222', driverName: '王二', online: true, hasAlarm: true, status: 'alarm', speed: 70, address: '青岛市市南区香港中路', gpsTime: '2024-01-03 18:03:00' }
    ]
  },
  {
    id: 'g4',
    name: '808测试',
    online: 0,
    offline: 5,
    alarm: 0,
    total: 5,
    vehicles: [
      { id: 'v11', plateNo: '测试001', driverName: '测试员A', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '-', gpsTime: '-' },
      { id: 'v12', plateNo: '测试002', driverName: '测试员B', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '-', gpsTime: '-' }
    ]
  },
  {
    id: 'g5',
    name: '广州分公司',
    online: 28,
    offline: 12,
    alarm: 3,
    total: 40,
    vehicles: [
      { id: 'v13', plateNo: '粤A11111', driverName: '陈三', online: true, hasAlarm: false, status: 'driving', speed: 50, address: '广州市天河区珠江新城', gpsTime: '2024-01-03 18:04:00' },
      { id: 'v14', plateNo: '粤A22222', driverName: '林四', online: true, hasAlarm: false, status: 'parking', speed: 0, address: '广州市越秀区北京路', gpsTime: '2024-01-03 17:45:00' },
      { id: 'v15', plateNo: '粤A33333', driverName: '黄五', online: false, hasAlarm: false, status: 'offline', speed: 0, address: '广州市白云区机场路', gpsTime: '2024-01-03 08:00:00' }
    ]
  },
  {
    id: 'g6',
    name: '深圳分公司',
    online: 35,
    offline: 15,
    alarm: 5,
    total: 50,
    vehicles: [
      { id: 'v16', plateNo: '粤B11111', driverName: '刘六', online: true, hasAlarm: true, status: 'alarm', speed: 80, address: '深圳市福田区深南大道', gpsTime: '2024-01-03 18:06:00' },
      { id: 'v17', plateNo: '粤B22222', driverName: '张七', online: true, hasAlarm: false, status: 'driving', speed: 60, address: '深圳市南山区科技园', gpsTime: '2024-01-03 18:05:00' }
    ]
  }
])

// 过滤后的分组
const filteredGroups = computed(() => {
  let result = groupsData.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(g => g.name.toLowerCase().includes(keyword))
  }
  return result
})

// 过滤后的车辆
const filteredVehicles = computed(() => {
  if (!selectedGroup.value) return []
  let vehicles = selectedGroup.value.vehicles || []

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    vehicles = vehicles.filter((v: any) =>
      v.plateNo.toLowerCase().includes(keyword) ||
      v.driverName.toLowerCase().includes(keyword)
    )
  }

  if (filterStatus.value) {
    switch (filterStatus.value) {
      case 'online':
        vehicles = vehicles.filter((v: any) => v.online)
        break
      case 'offline':
        vehicles = vehicles.filter((v: any) => !v.online)
        break
      case 'alarm':
        vehicles = vehicles.filter((v: any) => v.hasAlarm)
        break
    }
  }

  return vehicles
})

// 计算在线率
const getOnlineRate = (group: any) => {
  if (group.total === 0) return 0
  return ((group.online / group.total) * 100).toFixed(1)
}

// 获取状态类型
const getStatusType = (vehicle: any) => {
  if (!vehicle.online) return 'info'
  if (vehicle.hasAlarm) return 'danger'
  if (vehicle.status === 'parking') return 'warning'
  return 'success'
}

// 获取状态文字
const getStatusText = (vehicle: any) => {
  if (!vehicle.online) return '离线'
  if (vehicle.hasAlarm) return '报警'
  if (vehicle.status === 'parking') return '停车'
  return '行驶中'
}

// 选择分组
const selectGroup = (group: any) => {
  selectedGroup.value = group
}

// 返回分组列表
const goBack = () => {
  selectedGroup.value = null
}

// 刷新数据
const refreshData = () => {
  ElMessage.success('数据已刷新')
}

// 打开车辆视频
const openVehicleVideo = (vehicle: any) => {
  currentVideoVehicle.value = vehicle
  selectedChannel.value = 1
  videoDialogVisible.value = true
}

// 定位车辆
const locateVehicle = (vehicle: any) => {
  router.push({
    path: '/monitor',
    query: { vehicleId: vehicle.id }
  })
}

// 打开回放
const openReplay = (vehicle: any) => {
  router.push({
    path: '/replay',
    query: { vehicleId: vehicle.id }
  })
}

// 视频操作
const handleScreenshot = () => {
  ElMessage.success('截图成功')
}

const handleDownload = () => {
  ElMessage.info('开始录像...')
}

const handleFullscreen = () => {
  ElMessage.info('全屏播放')
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}

onMounted(() => {
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
  background: #f0f2f5;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.breadcrumb-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;

  .clickable {
    cursor: pointer;
    &:hover {
      color: #409eff;
    }
  }

  .group-stats {
    font-size: 13px;
    color: #666;

    .online {
      color: #52c41a;
      font-weight: 500;
    }
  }
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

// 分组卡片视图
.group-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  .group-card {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s;
    border: 1px solid #e8e8e8;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;

      .group-icon {
        font-size: 24px;
        color: #409eff;
      }

      .group-name {
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }
    }

    .card-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;

      .stat-item {
        text-align: center;

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;

          &.online { color: #52c41a; }
          &.offline { color: #999; }
          &.alarm { color: #f5222d; }
          &.total { color: #1890ff; }
        }

        .stat-label {
          font-size: 12px;
          color: #999;
        }
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;

      .online-rate {
        font-size: 13px;
        color: #666;
      }
    }
  }
}

// 分组视频视图
.group-video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;

  .video-group-card {
    background: #1a1a2e;
    border-radius: 8px;
    overflow: hidden;

    .video-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #16213e;
      color: #fff;

      .group-name {
        font-weight: 500;
      }

      .group-count {
        font-size: 13px;
        color: #94a3b8;
      }
    }

    .video-preview-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      padding: 4px;

      .video-preview-item {
        aspect-ratio: 16/9;
        cursor: pointer;

        .video-preview,
        .video-offline {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          position: relative;
          color: #fff;
          font-size: 12px;

          .video-icon {
            font-size: 24px;
            margin-bottom: 4px;
          }

          .live-badge {
            position: absolute;
            top: 4px;
            right: 4px;
            padding: 2px 6px;
            background: #f5222d;
            border-radius: 2px;
            font-size: 10px;
          }
        }

        .video-offline {
          background: #2d2d44;
          color: #666;

          .offline-text {
            color: #999;
            margin-top: 4px;
          }
        }
      }

      .video-more {
        aspect-ratio: 16/9;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #16213e;
        color: #94a3b8;
        cursor: pointer;
        font-size: 14px;

        &:hover {
          background: #1e3c72;
          color: #fff;
        }
      }
    }
  }
}

// 分组详情 - 车辆网格
.group-detail {
  .vehicle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;

    .vehicle-card {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e8e8e8;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.offline {
        opacity: 0.7;
      }

      &.alarm {
        border-color: #f5222d;

        .vehicle-video {
          border-bottom-color: #f5222d;
        }
      }

      .vehicle-video {
        aspect-ratio: 16/9;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        border-bottom: 3px solid #52c41a;

        .video-placeholder {
          .play-icon {
            font-size: 48px;
            color: rgba(255, 255, 255, 0.8);
            transition: transform 0.3s;
          }

          &:hover .play-icon {
            transform: scale(1.1);
          }
        }

        .live-indicator {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          color: #fff;
          font-size: 12px;

          .dot {
            width: 6px;
            height: 6px;
            background: #52c41a;
            border-radius: 50%;
            animation: blink 1.5s infinite;
          }
        }

        .offline-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #666;
          font-size: 13px;

          .el-icon {
            font-size: 40px;
            margin-bottom: 8px;
          }
        }
      }

      &.offline .vehicle-video {
        background: #2d2d44;
        border-bottom-color: #999;
      }

      &.alarm .vehicle-video {
        border-bottom-color: #f5222d;
      }

      .vehicle-info {
        padding: 12px;

        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .plate-no {
            font-size: 16px;
            font-weight: 600;
            color: #333;
          }
        }

        .info-details {
          margin-bottom: 12px;

          .detail-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            font-size: 13px;
            color: #666;

            .el-icon {
              color: #999;
            }

            .address {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }

        .info-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }
}

// 视频弹窗
.video-dialog-content {
  display: flex;
  gap: 16px;

  .video-main {
    flex: 1;

    .video-player {
      aspect-ratio: 16/9;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      color: #fff;

      .video-icon {
        font-size: 60px;
        color: #334155;
        margin-bottom: 12px;
      }

      .video-status {
        .playing {
          color: #52c41a;
          display: flex;
          align-items: center;
          gap: 6px;

          .live-dot {
            width: 8px;
            height: 8px;
            background: #52c41a;
            border-radius: 50%;
            animation: blink 1.5s infinite;
          }
        }

        .offline {
          color: #999;
        }
      }

      .video-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 12px 16px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        display: flex;
        justify-content: space-between;
        font-size: 13px;
      }
    }
  }

  .video-channels {
    width: 160px;

    .channel-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
      color: #333;
    }

    .channel-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .channel-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #f5f5f5;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;

        &:hover {
          background: #e8e8e8;
        }

        &.active {
          background: #409eff;
          color: #fff;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 8px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

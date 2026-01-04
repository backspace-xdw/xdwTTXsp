<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <header class="layout-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">&#x1F6E1;</span>
          <span class="logo-text">主动安全云平台</span>
        </div>
        <el-icon class="collapse-btn" @click="toggleSidebar">
          <Fold v-if="!sidebarCollapsed" />
          <Expand v-else />
        </el-icon>
      </div>

      <!-- 主导航菜单 -->
      <nav class="header-nav">
        <div
          v-for="item in navMenus"
          :key="item.path"
          :class="['nav-item', { active: currentRoute === item.path }]"
          @click="handleNavClick(item)"
        >
          <div class="nav-icon">
            <component :is="item.icon" />
          </div>
          <span class="nav-label">{{ item.label }}</span>
          <el-badge
            v-if="item.badge"
            :value="item.badge"
            :max="999"
            class="nav-badge"
          />
          <el-icon v-if="activeTab === item.path" class="close-btn" @click.stop="closeTab(item.path)">
            <Close />
          </el-icon>
        </div>
      </nav>

      <!-- 右侧工具栏 -->
      <div class="header-right">
        <div class="toolbar-item" @click="handleDownload">
          <el-icon><Download /></el-icon>
        </div>
        <div class="toolbar-item" @click="handleReport">
          <el-icon><Document /></el-icon>
        </div>
        <div class="toolbar-item">
          <el-icon><Grid /></el-icon>
        </div>
        <div class="toolbar-item" @click="handleMessage">
          <el-badge :value="messageCount" :max="99">
            <el-icon><Message /></el-icon>
          </el-badge>
        </div>
        <div class="toolbar-item" @click="handleNotification">
          <el-icon><Bell /></el-icon>
        </div>

        <!-- 用户信息 -->
        <el-dropdown class="user-dropdown" @command="handleUserCommand">
          <div class="user-info">
            <span class="username">{{ userStore.user?.username || 'admin' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主体内容 -->
    <div class="layout-body">
      <router-view />
    </div>

    <!-- 底部状态栏 -->
    <footer class="layout-footer">
      <div class="footer-left">
        <span class="version">7.34.0.4_20241104</span>
      </div>
      <div class="footer-center">
        <span class="stat-item alarm">
          <span class="label">存储报警:</span>
          <span class="value">{{ stats.storageAlarm }}</span>
        </span>
        <span class="stat-item online">
          <span class="label">在线:</span>
          <span class="value">{{ vehicleStore.stats.online }}</span>
        </span>
        <span class="stat-item driving">
          <span class="label">行驶:</span>
          <span class="value">{{ vehicleStore.stats.driving }}</span>
        </span>
        <span class="stat-item alarm-count">
          <span class="label">报警:</span>
          <span class="value">{{ vehicleStore.stats.alarm }}</span>
        </span>
        <span class="stat-item parking">
          <span class="label">停车ACC开:</span>
          <span class="value">{{ vehicleStore.stats.parkingAccOn }}</span>
        </span>
        <span class="stat-item offline">
          <span class="label">ACC关:</span>
          <span class="value">{{ vehicleStore.stats.accOff }}</span>
        </span>
        <span class="stat-item total">
          <span class="label">总数:</span>
          <span class="value">{{ vehicleStore.stats.total }}</span>
        </span>
        <span class="stat-item rate">
          <span class="label">在线率:</span>
          <span class="value">{{ vehicleStore.stats.onlineRate }}%</span>
        </span>
      </div>
      <div class="footer-right"></div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold,
  Expand,
  Download,
  Document,
  Grid,
  Message,
  Bell,
  ArrowDown,
  Close,
  Monitor,
  DataAnalysis,
  VideoCamera,
  Warning,
  Refresh,
  Film,
  Cpu,
  Setting,
  Reading,
  Tickets,
  Operation,
  List,
  Connection
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useVehicleStore } from '@/stores/vehicle'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const vehicleStore = useVehicleStore()

const sidebarCollapsed = ref(false)
const activeTab = ref('')
const messageCount = ref(130)

// 导航菜单配置
const navMenus = [
  { path: '/dashboard', label: '仪表盘', icon: DataAnalysis },
  { path: '/monitor', label: '实时监控', icon: Monitor, badge: 134 },
  { path: '/group-mon', label: '分组监控', icon: Grid },
  { path: '/ai-safe', label: 'AI安全', icon: Warning },
  { path: '/replay', label: '轨迹回放', icon: Refresh },
  { path: '/multi-video', label: '多视频', icon: VideoCamera },
  { path: '/safety-cal', label: '安全计算', icon: Cpu },
  { path: '/ai-manage', label: 'AI管理', icon: Setting },
  { path: '/safety-edu', label: '安全教育', icon: Reading },
  { path: '/reports', label: '报表统计', icon: Tickets },
  { path: '/operations', label: '运营管理', icon: Operation },
  { path: '/rules', label: '规则设置', icon: List },
  { path: '/server', label: '服务管理', icon: Connection }
]

// 统计数据
const stats = ref({
  storageAlarm: 27
})

// 当前路由
const currentRoute = computed(() => route.path)

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 导航点击
const handleNavClick = (item: any) => {
  activeTab.value = item.path
  router.push(item.path)
}

// 关闭Tab
const closeTab = (path: string) => {
  if (path === currentRoute.value) {
    router.push('/monitor')
  }
}

// 下载
const handleDownload = () => {
  ElMessage.info('下载客户端')
}

// 报表
const handleReport = () => {
  ElMessage.info('报表中心')
}

// 消息
const handleMessage = () => {
  ElMessage.info('消息中心')
}

// 通知
const handleNotification = () => {
  ElMessage.info('通知中心')
}

// 用户操作
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料')
      break
    case 'password':
      ElMessage.info('修改密码')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          type: 'warning'
        })
        userStore.logout()
        router.push('/login')
        ElMessage.success('已退出登录')
      } catch {
        // 取消
      }
      break
  }
}
</script>

<style lang="scss" scoped>
.main-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  height: 60px;
  background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: #fff;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;

      .logo-icon {
        font-size: 24px;
      }

      .logo-text {
        font-size: 16px;
        font-weight: 600;
        white-space: nowrap;
      }
    }

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      opacity: 0.8;

      &:hover {
        opacity: 1;
      }
    }
  }

  .header-nav {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 0 20px;
    overflow-x: auto;

    &::-webkit-scrollbar {
      height: 0;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 4px;
      position: relative;
      min-width: 70px;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        background: rgba(255, 255, 255, 0.2);

        .close-btn {
          display: block;
        }
      }

      .nav-icon {
        font-size: 20px;
        margin-bottom: 4px;
      }

      .nav-label {
        font-size: 12px;
        white-space: nowrap;
      }

      .nav-badge {
        position: absolute;
        top: 4px;
        right: 8px;
      }

      .close-btn {
        display: none;
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 12px;
        padding: 2px;
        border-radius: 50%;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .toolbar-item {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
      font-size: 18px;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .user-dropdown {
      margin-left: 8px;

      .user-info {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        color: #fff;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .username {
          font-size: 14px;
        }
      }
    }
  }
}

.layout-body {
  flex: 1;
  overflow: hidden;
  background: #f0f2f5;
}

.layout-footer {
  height: 30px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 12px;
  flex-shrink: 0;

  .footer-left {
    .version {
      color: #666;
    }
  }

  .footer-center {
    display: flex;
    align-items: center;
    gap: 16px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;

      .label {
        color: #666;
      }

      .value {
        font-weight: 500;
      }

      &.alarm .value,
      &.alarm-count .value {
        color: #f56c6c;
      }

      &.online .value {
        color: #67c23a;
      }

      &.driving .value {
        color: #409eff;
      }
    }
  }

  .footer-right {
    width: 100px;
  }
}

// 响应式
@media (max-width: 1200px) {
  .layout-header {
    .header-left .logo .logo-text {
      display: none;
    }

    .header-nav .nav-item {
      padding: 8px 12px;
      min-width: 60px;
    }
  }
}
</style>

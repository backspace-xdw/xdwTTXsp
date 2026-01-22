<template>
  <div class="safety-manage-page">
    <!-- 左侧菜单 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed" class="title">安全管理</span>
        <el-button
          class="collapse-btn"
          :icon="sidebarCollapsed ? 'Expand' : 'Fold'"
          link
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
      </div>

      <el-scrollbar class="sidebar-menu">
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          @select="handleMenuSelect"
        >
          <!-- 1. 主动安全报警处理 -->
          <el-sub-menu index="alarm">
            <template #title>
              <el-icon><Bell /></el-icon>
              <span>主动安全报警处理</span>
            </template>
            <el-menu-item index="alarm-handle">主动安全报警处理</el-menu-item>
            <el-menu-item index="alarm-appeal">主动安全报警申诉</el-menu-item>
            <el-menu-item index="alarm-appeal-audit">主动安全报警申诉审核</el-menu-item>
            <el-menu-item index="alarm-key-report">综合重点报警报表</el-menu-item>
            <el-menu-item index="alarm-evidence">主动安全证据查询</el-menu-item>
            <el-menu-item index="alarm-false">报警误报查询</el-menu-item>
            <el-menu-item index="ticket-handle">罚单处理</el-menu-item>
            <el-menu-item index="ticket-archive">罚单档案</el-menu-item>
          </el-sub-menu>

          <!-- 2. 驾驶员身份识别报表 -->
          <el-sub-menu index="driver">
            <template #title>
              <el-icon><User /></el-icon>
              <span>驾驶员身份识别报表</span>
            </template>
            <el-menu-item index="driver-identify">驾驶员身份识别报表</el-menu-item>
            <el-menu-item index="driver-evidence">驾驶员身份识别证据查询</el-menu-item>
          </el-sub-menu>

          <!-- 3. 主动安全证据中心 -->
          <el-sub-menu index="evidence">
            <template #title>
              <el-icon><Folder /></el-icon>
              <span>主动安全证据中心</span>
            </template>
            <el-menu-item index="evidence-adas">驾驶辅助证据中心</el-menu-item>
            <el-menu-item index="evidence-abnormal">异常行驶证据中心</el-menu-item>
            <el-menu-item index="evidence-tire">胎压报警证据中心</el-menu-item>
            <el-menu-item index="evidence-bsd">盲点监测证据中心</el-menu-item>
            <el-menu-item index="evidence-driving">激烈驾驶证据中心</el-menu-item>
            <el-menu-item index="evidence-gps">卫星定位证据中心</el-menu-item>
            <el-menu-item index="evidence-smart">智能检测证据中心</el-menu-item>
            <el-menu-item index="evidence-driver-id">驾驶员身份识别证据中心</el-menu-item>
            <el-menu-item index="evidence-vehicle">车辆运行监测证据中心</el-menu-item>
            <el-menu-item index="evidence-device">设备失效监测证据中心</el-menu-item>
            <el-menu-item index="evidence-io">IO报警证据中心</el-menu-item>
          </el-sub-menu>

          <!-- 4. 主动安全警报分析 -->
          <el-sub-menu index="analysis">
            <template #title>
              <el-icon><DataAnalysis /></el-icon>
              <span>主动安全警报分析</span>
            </template>
            <el-menu-item index="analysis-company">企业警报分析</el-menu-item>
            <el-menu-item index="analysis-vehicle">车辆警报分析</el-menu-item>
            <el-menu-item index="analysis-driver">司机警报分析</el-menu-item>
            <el-menu-item index="analysis-type">车辆类型报警分析</el-menu-item>
            <el-menu-item index="analysis-unreported">未上报附件报警分析</el-menu-item>
            <el-menu-item index="analysis-mileage">未报警里程分析</el-menu-item>
          </el-sub-menu>

          <!-- 5. 主动安全风险画像 -->
          <el-sub-menu index="risk">
            <template #title>
              <el-icon><Warning /></el-icon>
              <span>主动安全风险画像</span>
            </template>
            <el-menu-item index="risk-vehicle">车辆风险画像</el-menu-item>
            <el-menu-item index="risk-company">企业风险画像</el-menu-item>
            <el-menu-item index="risk-driver">司机风险画像</el-menu-item>
            <el-menu-item index="risk-driver-score">驾驶员评分报表</el-menu-item>
            <el-menu-item index="risk-vehicle-score">车辆评分报表</el-menu-item>
            <el-menu-item index="risk-company-score">企业评分报表</el-menu-item>
            <el-menu-item index="risk-standard">评分标准</el-menu-item>
          </el-sub-menu>

          <!-- 6. 安全报告 -->
          <el-sub-menu index="report">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>安全报告</span>
            </template>
            <el-menu-item index="report-connect">企业联网联控报告</el-menu-item>
            <el-menu-item index="report-company-safety">企业主动安全报告</el-menu-item>
            <el-menu-item index="report-vehicle-safety">车辆主动安全报告</el-menu-item>
            <el-menu-item index="report-company-all">企业综合报告</el-menu-item>
          </el-sub-menu>

          <!-- 7. 定制运营报告 -->
          <el-sub-menu index="custom">
            <template #title>
              <el-icon><Calendar /></el-icon>
              <span>定制运营报告</span>
            </template>
            <el-menu-item index="custom-daily">定制日报表</el-menu-item>
            <el-menu-item index="custom-weekly">定制周报表</el-menu-item>
            <el-menu-item index="custom-monthly">定制月报表</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </div>

    <!-- 右侧内容区域 -->
    <div class="main-content">
      <!-- 顶部面包屑 -->
      <div class="content-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>安全管理</el-breadcrumb-item>
          <el-breadcrumb-item>{{ currentMenuTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 内容区域 -->
      <div class="content-body">
        <component :is="currentComponent" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, watch } from 'vue'
import {
  Bell,
  User,
  Folder,
  DataAnalysis,
  Warning,
  Document,
  Calendar,
  Expand,
  Fold
} from '@element-plus/icons-vue'

// 子组件
import AlarmHandle from './components/AlarmHandle.vue'
import AlarmAppeal from './components/AlarmAppeal.vue'
import AlarmAppealAudit from './components/AlarmAppealAudit.vue'
import AlarmKeyReport from './components/AlarmKeyReport.vue'
import AlarmEvidence from './components/AlarmEvidence.vue'
import AlarmFalse from './components/AlarmFalse.vue'
import TicketHandle from './components/TicketHandle.vue'
import TicketArchive from './components/TicketArchive.vue'
import DriverIdentify from './components/DriverIdentify.vue'
import DriverEvidence from './components/DriverEvidence.vue'
import EvidenceCenter from './components/EvidenceCenter.vue'
import AnalysisReport from './components/AnalysisReport.vue'
import RiskProfile from './components/RiskProfile.vue'
import SafetyReport from './components/SafetyReport.vue'
import CustomReport from './components/CustomReport.vue'

const sidebarCollapsed = ref(false)
const activeMenu = ref('alarm-handle')

// 菜单配置
const menuConfig: Record<string, { title: string; component: any }> = {
  // 主动安全报警处理
  'alarm-handle': { title: '主动安全报警处理', component: AlarmHandle },
  'alarm-appeal': { title: '主动安全报警申诉', component: AlarmAppeal },
  'alarm-appeal-audit': { title: '主动安全报警申诉审核', component: AlarmAppealAudit },
  'alarm-key-report': { title: '综合重点报警报表', component: AlarmKeyReport },
  'alarm-evidence': { title: '主动安全证据查询', component: AlarmEvidence },
  'alarm-false': { title: '报警误报查询', component: AlarmFalse },
  'ticket-handle': { title: '罚单处理', component: TicketHandle },
  'ticket-archive': { title: '罚单档案', component: TicketArchive },
  // 驾驶员身份识别报表
  'driver-identify': { title: '驾驶员身份识别报表', component: DriverIdentify },
  'driver-evidence': { title: '驾驶员身份识别证据查询', component: DriverEvidence },
  // 主动安全证据中心
  'evidence-adas': { title: '驾驶辅助证据中心', component: EvidenceCenter },
  'evidence-abnormal': { title: '异常行驶证据中心', component: EvidenceCenter },
  'evidence-tire': { title: '胎压报警证据中心', component: EvidenceCenter },
  'evidence-bsd': { title: '盲点监测证据中心', component: EvidenceCenter },
  'evidence-driving': { title: '激烈驾驶证据中心', component: EvidenceCenter },
  'evidence-gps': { title: '卫星定位证据中心', component: EvidenceCenter },
  'evidence-smart': { title: '智能检测证据中心', component: EvidenceCenter },
  'evidence-driver-id': { title: '驾驶员身份识别证据中心', component: EvidenceCenter },
  'evidence-vehicle': { title: '车辆运行监测证据中心', component: EvidenceCenter },
  'evidence-device': { title: '设备失效监测证据中心', component: EvidenceCenter },
  'evidence-io': { title: 'IO报警证据中心', component: EvidenceCenter },
  // 主动安全警报分析
  'analysis-company': { title: '企业警报分析', component: AnalysisReport },
  'analysis-vehicle': { title: '车辆警报分析', component: AnalysisReport },
  'analysis-driver': { title: '司机警报分析', component: AnalysisReport },
  'analysis-type': { title: '车辆类型报警分析', component: AnalysisReport },
  'analysis-unreported': { title: '未上报附件报警分析', component: AnalysisReport },
  'analysis-mileage': { title: '未报警里程分析', component: AnalysisReport },
  // 主动安全风险画像
  'risk-vehicle': { title: '车辆风险画像', component: RiskProfile },
  'risk-company': { title: '企业风险画像', component: RiskProfile },
  'risk-driver': { title: '司机风险画像', component: RiskProfile },
  'risk-driver-score': { title: '驾驶员评分报表', component: RiskProfile },
  'risk-vehicle-score': { title: '车辆评分报表', component: RiskProfile },
  'risk-company-score': { title: '企业评分报表', component: RiskProfile },
  'risk-standard': { title: '评分标准', component: RiskProfile },
  // 安全报告
  'report-connect': { title: '企业联网联控报告', component: SafetyReport },
  'report-company-safety': { title: '企业主动安全报告', component: SafetyReport },
  'report-vehicle-safety': { title: '车辆主动安全报告', component: SafetyReport },
  'report-company-all': { title: '企业综合报告', component: SafetyReport },
  // 定制运营报告
  'custom-daily': { title: '定制日报表', component: CustomReport },
  'custom-weekly': { title: '定制周报表', component: CustomReport },
  'custom-monthly': { title: '定制月报表', component: CustomReport }
}

const currentMenuTitle = computed(() => menuConfig[activeMenu.value]?.title || '')
const currentComponent = shallowRef(menuConfig['alarm-handle']!.component)

const handleMenuSelect = (index: string) => {
  activeMenu.value = index
  if (menuConfig[index]) {
    currentComponent.value = menuConfig[index].component
  }
}

watch(activeMenu, (val) => {
  if (menuConfig[val]) {
    currentComponent.value = menuConfig[val].component
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.safety-manage-page {
  height: 100%;
  display: flex;
  background: #f0f2f5;
}

// 侧边栏
.sidebar {
  width: 240px;
  background: #001529;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;

  &.collapsed {
    width: 64px;

    .sidebar-header {
      justify-content: center;
      padding: 16px 8px;

      .title {
        display: none;
      }
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .title {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
    }

    .collapse-btn {
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        color: #fff;
      }
    }
  }

  .sidebar-menu {
    flex: 1;

    :deep(.el-menu) {
      border-right: none;
      background: transparent;

      .el-menu-item,
      .el-sub-menu__title {
        color: rgba(255, 255, 255, 0.65);

        &:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .el-icon {
          color: inherit;
        }
      }

      .el-menu-item.is-active {
        color: #fff;
        background: #1890ff;
      }

      .el-sub-menu.is-opened > .el-sub-menu__title {
        color: #fff;
      }

      .el-sub-menu .el-menu {
        background: rgba(0, 0, 0, 0.2);
      }
    }
  }
}

// 主内容区
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;

  .content-header {
    padding: 16px 24px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    :deep(.el-breadcrumb) {
      font-size: 14px;

      .el-breadcrumb__item:last-child .el-breadcrumb__inner {
        color: #1890ff;
        font-weight: 500;
      }
    }
  }

  .content-body {
    flex: 1;
    padding: 24px;
    overflow: auto;
  }
}
</style>

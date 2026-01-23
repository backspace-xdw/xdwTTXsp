<template>
  <div class="monitor-page">
    <!-- 全局加载遮罩 -->
    <div v-if="pageLoading" class="loading-overlay">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span class="loading-text">{{ loadingText }}</span>
      </div>
    </div>

    <!-- 网络断开提示 -->
    <div v-if="!isNetworkOnline" class="network-offline-banner">
      <el-icon><Warning /></el-icon>
      <span>网络连接已断开，部分功能可能不可用</span>
      <el-button size="small" type="primary" @click="retryConnection">重新连接</el-button>
    </div>

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
        <!-- 骨架屏加载状态 -->
        <div v-if="loading" class="tree-skeleton">
          <el-skeleton :rows="8" animated />
        </div>

        <!-- 空状态 -->
        <div v-else-if="Object.keys(vehicleDataMap).length === 0" class="tree-empty">
          <el-empty description="暂无车辆数据" :image-size="80">
            <el-button type="primary" size="small" @click="fetchVehicles">
              刷新数据
            </el-button>
          </el-empty>
        </div>

        <!-- 车辆树 -->
        <el-tree
          v-else
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

        <!-- 云台控制面板 -->
        <div v-show="activeTab === 'ptz'" class="ptz-control-panel">
          <div class="ptz-direction">
            <div class="ptz-btn-row">
              <div class="ptz-btn-placeholder"></div>
              <el-button
                class="ptz-btn"
                circle
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('up')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><Top /></el-icon>
              </el-button>
              <div class="ptz-btn-placeholder"></div>
            </div>
            <div class="ptz-btn-row">
              <el-button
                class="ptz-btn"
                circle
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('left')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><Back /></el-icon>
              </el-button>
              <el-button
                class="ptz-btn ptz-btn-stop"
                circle
                :disabled="!selectedVehicleId"
                @click="stopPtzControl"
              >
                <el-icon><VideoPause /></el-icon>
              </el-button>
              <el-button
                class="ptz-btn"
                circle
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('right')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><Right /></el-icon>
              </el-button>
            </div>
            <div class="ptz-btn-row">
              <div class="ptz-btn-placeholder"></div>
              <el-button
                class="ptz-btn"
                circle
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('down')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><Bottom /></el-icon>
              </el-button>
              <div class="ptz-btn-placeholder"></div>
            </div>
          </div>

          <div class="ptz-zoom">
            <div class="ptz-zoom-label">变倍</div>
            <div class="ptz-zoom-btns">
              <el-button
                size="small"
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('zoom_in')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><ZoomIn /></el-icon> 放大
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('zoom_out')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                <el-icon><ZoomOut /></el-icon> 缩小
              </el-button>
            </div>
          </div>

          <div class="ptz-focus">
            <div class="ptz-focus-label">焦距</div>
            <div class="ptz-focus-btns">
              <el-button
                size="small"
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('focus_near')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                近焦
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedVehicleId"
                @mousedown="startPtzControl('focus_far')"
                @mouseup="stopPtzControl"
                @mouseleave="stopPtzControl"
              >
                远焦
              </el-button>
            </div>
          </div>

          <div class="ptz-speed">
            <span class="ptz-speed-label">速度:</span>
            <el-slider
              v-model="ptzSpeed"
              :min="1"
              :max="10"
              :step="1"
              :disabled="!selectedVehicleId"
              show-stops
              style="flex: 1; margin-left: 10px;"
            />
            <span class="ptz-speed-value">{{ ptzSpeed }}</span>
          </div>
        </div>
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
          <el-dropdown trigger="click" @command="handleDrawCommand">
            <el-button size="small" :type="drawingMode ? 'primary' : 'default'">
              绘制围栏 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="circle">圆形围栏</el-dropdown-item>
                <el-dropdown-item command="rectangle">矩形围栏</el-dropdown-item>
                <el-dropdown-item command="polygon">多边形围栏</el-dropdown-item>
                <el-dropdown-item command="stop" divided>停止绘制</el-dropdown-item>
                <el-dropdown-item command="clear">清除围栏</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" @command="handleMapToolCommand">
            <el-button size="small">
              地图工具 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="distance">测距</el-dropdown-item>
                <el-dropdown-item command="area">测面积</el-dropdown-item>
                <el-dropdown-item command="clear" divided>清除</el-dropdown-item>
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

    <!-- 报警弹窗 -->
    <el-dialog
      v-model="alarmDialogVisible"
      title="实时报警"
      width="500px"
      :close-on-click-modal="false"
      class="alarm-dialog"
    >
      <div v-if="currentAlarm" class="alarm-content">
        <div class="alarm-header" :class="getAlarmLevelClass(currentAlarm.alarmLevel)">
          <el-icon class="alarm-icon"><Bell /></el-icon>
          <span class="alarm-type">{{ currentAlarm.alarmName }}</span>
          <el-tag :type="getAlarmTagType(currentAlarm.alarmLevel)" size="small">
            {{ getAlarmLevelText(currentAlarm.alarmLevel) }}
          </el-tag>
        </div>

        <div class="alarm-info">
          <div class="info-row">
            <span class="label">车牌号:</span>
            <span class="value">{{ currentAlarm.plateNo || currentAlarm.deviceId }}</span>
          </div>
          <div class="info-row">
            <span class="label">报警时间:</span>
            <span class="value">{{ currentAlarm.alarmTime }}</span>
          </div>
          <div class="info-row" v-if="currentAlarm.lat && currentAlarm.lng">
            <span class="label">位置:</span>
            <span class="value">
              <el-button type="primary" link size="small" @click="locateAlarmVehicle">
                <el-icon><Location /></el-icon> 定位查看
              </el-button>
            </span>
          </div>
          <div class="info-row" v-if="currentAlarm.speed !== undefined">
            <span class="label">速度:</span>
            <span class="value">{{ currentAlarm.speed }} km/h</span>
          </div>
        </div>

        <div class="alarm-actions">
          <el-button type="primary" @click="handleAlarmConfirm">确认处理</el-button>
          <el-button @click="handleAlarmIgnore">忽略</el-button>
          <el-button type="warning" @click="handleAlarmTransfer">转派</el-button>
        </div>
      </div>

      <!-- 报警队列 -->
      <div v-if="alarmQueue.length > 1" class="alarm-queue">
        <div class="queue-header">
          待处理报警 ({{ alarmQueue.length - 1 }})
        </div>
        <div class="queue-list">
          <div
            v-for="(alarm, index) in alarmQueue.slice(1)"
            :key="alarm.id"
            class="queue-item"
            @click="switchToAlarm(index + 1)"
          >
            <span class="queue-item-type">{{ alarm.alarmName }}</span>
            <span class="queue-item-vehicle">{{ alarm.plateNo || alarm.deviceId }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
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
  SuccessFilled,
  Top,
  Bottom,
  Back,
  Right,
  ZoomIn,
  ZoomOut,
  Bell,
  Location
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

// ============ 加载状态管理 ============
const pageLoading = ref(false)
const loadingText = ref('加载中...')
const isNetworkOnline = ref(navigator.onLine)

// 监听网络状态
const setupNetworkListeners = () => {
  window.addEventListener('online', () => {
    isNetworkOnline.value = true
    ElMessage.success('网络已恢复')
    // 自动重连
    retryConnection()
  })

  window.addEventListener('offline', () => {
    isNetworkOnline.value = false
    ElMessage.warning('网络连接已断开')
  })
}

// 重试连接
const retryConnection = () => {
  const socket = getSocket()
  if (socket && !socket.connected) {
    socket.connect()
  }
  // 重新获取车辆数据
  fetchVehicles()
}

// 显示加载状态
const showLoading = (text: string = '加载中...') => {
  pageLoading.value = true
  loadingText.value = text
}

// 隐藏加载状态
const hideLoading = () => {
  pageLoading.value = false
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

// ============ 云台控制模块 ============
const ptzSpeed = ref(5)  // 云台速度 1-10
let ptzControlTimer: ReturnType<typeof setInterval> | null = null

// 云台控制命令类型
type PtzCommand = 'up' | 'down' | 'left' | 'right' | 'stop' | 'zoom_in' | 'zoom_out' | 'focus_near' | 'focus_far'

// 发送云台控制命令
const sendPtzCommand = (command: PtzCommand) => {
  if (!selectedVehicleId.value) {
    ElMessage.warning('请先选择车辆')
    return
  }

  const vehicle = vehicleDataMap.value[selectedVehicleId.value]
  if (!vehicle) return

  const socket = getSocket()
  if (socket) {
    socket.emit('ptz:control', {
      deviceId: vehicle.deviceId,
      command,
      speed: ptzSpeed.value
    })
    console.log('[Monitor] PTZ command sent:', command, 'speed:', ptzSpeed.value)
  } else {
    ElMessage.error('WebSocket未连接')
  }
}

// 开始云台控制 (按住按钮持续发送命令)
const startPtzControl = (command: PtzCommand) => {
  // 立即发送一次
  sendPtzCommand(command)

  // 持续发送
  ptzControlTimer = setInterval(() => {
    sendPtzCommand(command)
  }, 200)  // 每200ms发送一次
}

// 停止云台控制
const stopPtzControl = () => {
  if (ptzControlTimer) {
    clearInterval(ptzControlTimer)
    ptzControlTimer = null
  }
  sendPtzCommand('stop')
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
let markerCluster: any = null  // 聚合器实例

// ============ 车辆跟踪模块 ============
interface TrackingState {
  vehicleId: string | null
  isTracking: boolean
  polyline: any | null          // 轨迹线
  trackPoints: [number, number][]  // 轨迹点
  startTime: string | null
}

const trackingState = reactive<TrackingState>({
  vehicleId: null,
  isTracking: false,
  polyline: null,
  trackPoints: [],
  startTime: null
})

// 开始跟踪车辆
const startTrackingVehicle = (vehicleId: string) => {
  if (!map || !AMapInstance) return

  const vehicle = vehicleDataMap.value[vehicleId]
  if (!vehicle) {
    ElMessage.warning('未找到车辆信息')
    return
  }

  // 如果已在跟踪其他车辆，先停止
  if (trackingState.isTracking && trackingState.vehicleId !== vehicleId) {
    stopTrackingVehicle()
  }

  // 设置跟踪状态
  trackingState.vehicleId = vehicleId
  trackingState.isTracking = true
  trackingState.startTime = new Date().toISOString()
  trackingState.trackPoints = [[vehicle.lng, vehicle.lat]]

  // 创建轨迹线
  trackingState.polyline = new AMapInstance.Polyline({
    path: trackingState.trackPoints,
    strokeColor: '#409eff',
    strokeWeight: 4,
    strokeOpacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  })
  map.add(trackingState.polyline)

  // 定位到车辆
  map.setZoomAndCenter(15, [vehicle.lng, vehicle.lat])

  ElMessage.success(`开始跟踪: ${vehicle.plateNo}`)
  console.log('[Monitor] Started tracking:', vehicle.plateNo)
}

// 停止跟踪车辆
const stopTrackingVehicle = () => {
  if (!trackingState.isTracking) return

  // 移除轨迹线
  if (trackingState.polyline && map) {
    map.remove(trackingState.polyline)
  }

  // 重置状态
  trackingState.vehicleId = null
  trackingState.isTracking = false
  trackingState.polyline = null
  trackingState.trackPoints = []
  trackingState.startTime = null

  ElMessage.info('已停止跟踪')
  console.log('[Monitor] Stopped tracking')
}

// 更新跟踪轨迹 (在GPS更新时调用)
const updateTrackingPath = (vehicleId: string, lng: number, lat: number) => {
  if (!trackingState.isTracking || trackingState.vehicleId !== vehicleId) return
  if (!map || !AMapInstance) return

  // 添加新点到轨迹
  trackingState.trackPoints.push([lng, lat])

  // 限制轨迹点数量 (防止内存溢出)
  if (trackingState.trackPoints.length > 1000) {
    trackingState.trackPoints.shift()
  }

  // 更新轨迹线
  if (trackingState.polyline) {
    trackingState.polyline.setPath(trackingState.trackPoints)
  }

  // 地图跟随
  map.setCenter([lng, lat])
}

// 切换跟踪状态
const toggleTracking = () => {
  if (trackingState.isTracking) {
    stopTrackingVehicle()
  } else if (selectedVehicleId.value) {
    startTrackingVehicle(selectedVehicleId.value)
  } else {
    ElMessage.warning('请先选择要跟踪的车辆')
  }
}

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

// GPS 更新批量处理队列
const gpsUpdateQueue = ref<Map<string, any>>(new Map())
let gpsUpdateTimer: ReturnType<typeof setTimeout> | null = null
const GPS_UPDATE_INTERVAL = 100  // 100ms 批量更新间隔

// 处理GPS更新队列
const processGpsUpdateQueue = () => {
  if (gpsUpdateQueue.value.size === 0) return

  const updates = new Map(gpsUpdateQueue.value)
  gpsUpdateQueue.value.clear()

  updates.forEach((data, deviceId) => {
    // 查找并更新对应的车辆
    for (const [key, vehicle] of Object.entries(vehicleDataMap.value)) {
      if (vehicle.deviceId === deviceId) {
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

        // 更新跟踪轨迹
        updateTrackingPath(key, data.lng, data.lat)
        break
      }
    }
  })

  if (updates.size > 0) {
    console.log(`[Monitor] Batch processed ${updates.size} GPS updates`)
  }
}

// 监听WebSocket GPS更新 - 使用防抖队列
const handleGpsUpdate = (data: any) => {
  // 添加到更新队列 (相同设备ID会被覆盖，自动去重)
  gpsUpdateQueue.value.set(data.deviceId, data)

  // 如果没有定时器在运行，启动批量处理
  if (!gpsUpdateTimer) {
    gpsUpdateTimer = setTimeout(() => {
      processGpsUpdateQueue()
      gpsUpdateTimer = null
    }, GPS_UPDATE_INTERVAL)
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
  if (!map || !AMapInstance) return

  clusterEnabled.value = !clusterEnabled.value

  if (clusterEnabled.value) {
    // 启用聚合
    enableCluster()
    ElMessage.success('已启用聚合显示')
  } else {
    // 禁用聚合
    disableCluster()
    ElMessage.info('已关闭聚合显示')
  }
}

// 启用聚合
const enableCluster = () => {
  if (!AMapInstance || !map) return

  // 如果已有聚合器，先清除
  if (markerCluster) {
    markerCluster.setMap(null)
    markerCluster = null
  }

  // 隐藏普通markers
  markers.forEach(m => m.hide())

  // 创建聚合器
  const clusterStyles = [
    {
      url: 'https://a.amap.com/jsapi_demos/static/images/blue.png',
      size: new AMapInstance.Size(32, 32),
      offset: new AMapInstance.Pixel(-16, -16),
      textColor: '#fff',
      textSize: 12
    },
    {
      url: 'https://a.amap.com/jsapi_demos/static/images/green.png',
      size: new AMapInstance.Size(32, 32),
      offset: new AMapInstance.Pixel(-16, -16),
      textColor: '#fff',
      textSize: 12
    },
    {
      url: 'https://a.amap.com/jsapi_demos/static/images/orange.png',
      size: new AMapInstance.Size(36, 36),
      offset: new AMapInstance.Pixel(-18, -18),
      textColor: '#fff',
      textSize: 14
    }
  ]

  markerCluster = new AMapInstance.MarkerClusterer(map, markers, {
    gridSize: 60,
    styles: clusterStyles,
    renderClusterMarker: (context: any) => {
      const count = context.count
      let bgColor = '#409eff'
      if (count >= 50) {
        bgColor = '#f56c6c'
      } else if (count >= 20) {
        bgColor = '#e6a23c'
      } else if (count >= 10) {
        bgColor = '#67c23a'
      }

      const div = document.createElement('div')
      div.style.cssText = `
        width: ${Math.min(40 + count * 0.5, 60)}px;
        height: ${Math.min(40 + count * 0.5, 60)}px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `
      div.innerHTML = count

      context.marker.setContent(div)
      context.marker.setOffset(new AMapInstance.Pixel(-20, -20))
    }
  })

  // 点击聚合点展开
  markerCluster.on('click', (cluster: any) => {
    const markers = cluster.clusterData
    if (markers.length > 1) {
      // 缩放到聚合范围
      const bounds = new AMapInstance.Bounds()
      markers.forEach((m: any) => {
        bounds.extend(m.getPosition())
      })
      map.setBounds(bounds)
    }
  })
}

// 禁用聚合
const disableCluster = () => {
  if (markerCluster) {
    markerCluster.setMap(null)
    markerCluster = null
  }

  // 显示普通markers
  markers.forEach(m => m.show())
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

// ============ 电子围栏绘制模块 ============
const drawingMode = ref<string | null>(null)  // 'circle' | 'rectangle' | 'polygon' | null
let mouseTool: any = null
let drawnFences: any[] = []  // 存储已绘制的围栏
let ruleTool: any = null     // 测量工具

// 围栏绘制命令处理
const handleDrawCommand = (command: string) => {
  if (!map || !AMapInstance) {
    ElMessage.warning('地图尚未初始化')
    return
  }

  switch (command) {
    case 'circle':
    case 'rectangle':
    case 'polygon':
      startDrawFence(command)
      break
    case 'stop':
      stopDrawFence()
      break
    case 'clear':
      clearAllFences()
      break
  }
}

// 开始绘制围栏
const startDrawFence = (type: string) => {
  if (!mouseTool) {
    mouseTool = new AMapInstance.MouseTool(map)
  }

  drawingMode.value = type
  ElMessage.info(`开始绘制${type === 'circle' ? '圆形' : type === 'rectangle' ? '矩形' : '多边形'}围栏，点击地图进行绘制`)

  const drawOptions = {
    strokeColor: '#409eff',
    strokeWeight: 2,
    strokeOpacity: 0.8,
    fillColor: '#409eff',
    fillOpacity: 0.2,
    strokeStyle: 'solid'
  }

  // 设置绘制完成回调
  mouseTool.on('draw', (e: any) => {
    console.log('[Monitor] Fence drawn:', type, e.obj)

    // 保存围栏
    const fence = {
      id: Date.now(),
      type,
      overlay: e.obj,
      name: `围栏${drawnFences.length + 1}`,
      createdAt: new Date().toISOString()
    }
    drawnFences.push(fence)

    // 添加右键菜单
    e.obj.on('rightclick', () => {
      showFenceContextMenu(fence)
    })

    ElMessage.success('围栏绘制完成')

    // 弹出围栏设置对话框
    showFenceSettingsDialog(fence)
  })

  // 根据类型开始绘制
  switch (type) {
    case 'circle':
      mouseTool.circle(drawOptions)
      break
    case 'rectangle':
      mouseTool.rectangle(drawOptions)
      break
    case 'polygon':
      mouseTool.polygon(drawOptions)
      break
  }
}

// 停止绘制围栏
const stopDrawFence = () => {
  if (mouseTool) {
    mouseTool.close(false)  // false表示不清除已绘制的图形
  }
  drawingMode.value = null
  ElMessage.info('已停止绘制')
}

// 清除所有围栏
const clearAllFences = () => {
  drawnFences.forEach(fence => {
    if (fence.overlay) {
      map.remove(fence.overlay)
    }
  })
  drawnFences = []
  ElMessage.success('已清除所有围栏')
}

// 显示围栏右键菜单
const showFenceContextMenu = (fence: any) => {
  // TODO: 实现右键菜单
  console.log('[Monitor] Fence context menu:', fence)
}

// 显示围栏设置对话框
const showFenceSettingsDialog = (fence: any) => {
  // TODO: 实现围栏设置对话框（名称、报警规则等）
  console.log('[Monitor] Fence settings:', fence)
}

// 地图工具命令处理
const handleMapToolCommand = (command: string) => {
  if (!map || !AMapInstance) {
    ElMessage.warning('地图尚未初始化')
    return
  }

  if (!ruleTool) {
    ruleTool = new AMapInstance.MouseTool(map)
  }

  switch (command) {
    case 'distance':
      ruleTool.rule({
        startMarkerOptions: { icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png' },
        endMarkerOptions: { icon: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png' },
        lineOptions: { strokeColor: '#ff6600', strokeWeight: 3 }
      })
      ElMessage.info('点击地图开始测距')
      break
    case 'area':
      ruleTool.measureArea({
        strokeColor: '#ff6600',
        strokeWeight: 2,
        fillColor: '#ff6600',
        fillOpacity: 0.2
      })
      ElMessage.info('点击地图开始测面积')
      break
    case 'clear':
      ruleTool.close(true)  // true表示清除已绘制的图形
      ElMessage.info('已清除测量结果')
      break
  }
}

// 初始化地图
const initMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: '0236671cfb04ddf41d952d0a47b78106', // 高德地图API密钥
      version: '1.4.15', // 使用1.4版本，不需要安全码
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MarkerClusterer', 'AMap.InfoWindow', 'AMap.MouseTool', 'AMap.CircleEditor', 'AMap.PolyEditor', 'AMap.RectangleEditor']
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
          // 使用跟踪功能
          startTrackingVehicle(vehicleId)
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

// 存储定时器引用
let refreshTimer: ReturnType<typeof setInterval> | null = null

// ============ 报警弹窗模块 ============
interface AlarmInfo {
  id: number
  deviceId: string
  plateNo?: string
  alarmType: number
  alarmName: string
  alarmLevel: number
  lat?: number
  lng?: number
  speed?: number
  alarmTime: string
}

const alarmDialogVisible = ref(false)
const alarmQueue = ref<AlarmInfo[]>([])
const currentAlarm = computed(() => alarmQueue.value[0] || null)
let alarmSoundEnabled = true
let alarmSound: HTMLAudioElement | null = null

// 初始化报警提示音
const initAlarmSound = () => {
  alarmSound = new Audio('/audio/alarm.mp3')
  alarmSound.loop = false
}

// 播放报警提示音
const playAlarmSound = () => {
  if (alarmSoundEnabled && alarmSound) {
    alarmSound.currentTime = 0
    alarmSound.play().catch(e => console.log('Sound play blocked:', e))
  }
}

// 报警处理函数
const handleAlarmNew = (data: AlarmInfo) => {
  console.log('[Monitor] New alarm received:', data)

  // 添加到报警队列
  alarmQueue.value.push(data)

  // 如果弹窗未显示，显示弹窗
  if (!alarmDialogVisible.value) {
    alarmDialogVisible.value = true
  }

  // 播放提示音
  playAlarmSound()

  // 显示通知
  ElMessage({
    message: `${data.plateNo || data.deviceId}: ${data.alarmName}`,
    type: 'warning',
    duration: 5000
  })
}

// 获取报警级别样式类
const getAlarmLevelClass = (level: number): string => {
  if (level >= 3) return 'level-critical'
  if (level >= 2) return 'level-warning'
  return 'level-info'
}

// 获取报警标签类型
const getAlarmTagType = (level: number): string => {
  if (level >= 3) return 'danger'
  if (level >= 2) return 'warning'
  return 'info'
}

// 获取报警级别文本
const getAlarmLevelText = (level: number): string => {
  if (level >= 3) return '紧急'
  if (level >= 2) return '警告'
  return '提示'
}

// 定位报警车辆
const locateAlarmVehicle = () => {
  if (!currentAlarm.value || !map) return

  const { lat, lng, deviceId } = currentAlarm.value
  if (lat && lng) {
    map.setZoomAndCenter(15, [lng, lat])

    // 查找对应车辆并高亮
    for (const [key, vehicle] of Object.entries(vehicleDataMap.value)) {
      if (vehicle.deviceId === deviceId) {
        selectedVehicleId.value = key
        showVehicleInfoWindow(vehicle)
        break
      }
    }
  }

  alarmDialogVisible.value = false
}

// 确认处理报警
const handleAlarmConfirm = () => {
  if (currentAlarm.value) {
    console.log('[Monitor] Alarm confirmed:', currentAlarm.value.id)

    // 发送确认事件到服务器
    const socket = getSocket()
    if (socket) {
      socket.emit('alarm:handle', {
        alarmId: currentAlarm.value.id,
        action: 'confirm'
      })
    }

    // 从队列中移除
    alarmQueue.value.shift()

    // 如果队列为空，关闭弹窗
    if (alarmQueue.value.length === 0) {
      alarmDialogVisible.value = false
    }

    ElMessage.success('报警已确认处理')
  }
}

// 忽略报警
const handleAlarmIgnore = () => {
  if (currentAlarm.value) {
    console.log('[Monitor] Alarm ignored:', currentAlarm.value.id)

    // 发送忽略事件到服务器
    const socket = getSocket()
    if (socket) {
      socket.emit('alarm:handle', {
        alarmId: currentAlarm.value.id,
        action: 'ignore'
      })
    }

    // 从队列中移除
    alarmQueue.value.shift()

    // 如果队列为空，关闭弹窗
    if (alarmQueue.value.length === 0) {
      alarmDialogVisible.value = false
    }
  }
}

// 转派报警
const handleAlarmTransfer = () => {
  if (currentAlarm.value) {
    ElMessage.info('转派功能开发中...')
  }
}

// 切换到指定报警
const switchToAlarm = (index: number) => {
  if (index < alarmQueue.value.length) {
    // 将指定报警移到队首
    const alarm = alarmQueue.value.splice(index, 1)[0]
    alarmQueue.value.unshift(alarm)
  }
}

onMounted(async () => {
  // 设置网络监听器
  setupNetworkListeners()

  // 显示加载状态
  showLoading('正在加载车辆数据...')

  try {
    // 获取车辆数据
    await fetchVehicles()
  } finally {
    hideLoading()
  }

  nextTick(() => {
    initMap()
  })

  // 更新时间
  updateTime()
  timeTimer = setInterval(updateTime, 1000)

  // 初始化报警提示音
  initAlarmSound()

  // 监听WebSocket GPS更新和报警
  const socket = getSocket()
  if (socket) {
    socket.on('gps:update', handleGpsUpdate)
    socket.on('alarm:new', handleAlarmNew)
    console.log('[Monitor] Subscribed to GPS updates and alarms')
  }

  // 定时刷新数据 (每30秒)
  refreshTimer = setInterval(fetchVehicles, 30000)
})

onUnmounted(() => {
  // 清理WebSocket事件监听
  const socket = getSocket()
  if (socket) {
    socket.off('gps:update', handleGpsUpdate)
    socket.off('alarm:new', handleAlarmNew)
    console.log('[Monitor] Unsubscribed from GPS updates and alarms')
  }

  // 清理地图实例
  if (map) {
    map.destroy()
    map = null
  }

  // 清理所有定时器
  if (timeTimer) {
    clearInterval(timeTimer)
    timeTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (gpsUpdateTimer) {
    clearTimeout(gpsUpdateTimer)
    gpsUpdateTimer = null
  }
  if (ptzControlTimer) {
    clearInterval(ptzControlTimer)
    ptzControlTimer = null
  }

  // 清理报警提示音
  if (alarmSound) {
    alarmSound.pause()
    alarmSound = null
  }

  // 停止车辆跟踪
  stopTrackingVehicle()

  // 清理围栏绘制工具
  if (mouseTool) {
    mouseTool.close(true)
    mouseTool = null
  }
  if (ruleTool) {
    ruleTool.close(true)
    ruleTool = null
  }
  drawnFences = []

  // 清理全局事件处理函数
  if ((window as any).handleVehicleAction) {
    delete (window as any).handleVehicleAction
  }

  // 清理marker引用
  markers = []
  markerMap = {}
  currentInfoWindow = null
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

    // 云台控制面板样式
    .ptz-control-panel {
      padding: 12px;
      background: #fafafa;

      .ptz-direction {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin-bottom: 16px;

        .ptz-btn-row {
          display: flex;
          gap: 4px;
          align-items: center;

          .ptz-btn-placeholder {
            width: 40px;
            height: 40px;
          }

          .ptz-btn {
            width: 40px;
            height: 40px;

            &.ptz-btn-stop {
              background: #f56c6c;
              border-color: #f56c6c;
              color: #fff;

              &:hover {
                background: #f78989;
                border-color: #f78989;
              }
            }
          }
        }
      }

      .ptz-zoom,
      .ptz-focus {
        margin-bottom: 12px;

        &-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 6px;
        }

        &-btns {
          display: flex;
          gap: 8px;

          .el-button {
            flex: 1;
          }
        }
      }

      .ptz-speed {
        display: flex;
        align-items: center;
        gap: 8px;

        &-label {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        &-value {
          font-size: 14px;
          font-weight: 500;
          color: #409eff;
          min-width: 20px;
          text-align: right;
        }
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

// ============ 加载和错误状态 ============
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .loading-icon {
      font-size: 48px;
      color: #409eff;
      animation: rotate 1s linear infinite;
    }

    .loading-text {
      font-size: 16px;
      color: #606266;
    }
  }
}

.network-offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #fef0f0;
  border-bottom: 1px solid #f56c6c;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 14px;
  z-index: 1000;

  .el-icon {
    font-size: 18px;
  }

  .el-button {
    margin-left: 12px;
  }
}

.tree-skeleton {
  padding: 12px;
}

.tree-empty {
  padding: 40px 20px;
  text-align: center;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ============ 响应式布局 ============
@media screen and (max-width: 1024px) {
  .monitor-page {
    .monitor-sidebar {
      width: 240px;

      .sidebar-filters {
        flex-wrap: wrap;

        .el-select {
          width: 100%;
        }
      }
    }

    .monitor-content {
      .content-toolbar {
        flex-wrap: wrap;
        gap: 8px;

        .toolbar-left,
        .toolbar-right {
          flex-wrap: wrap;
        }
      }

      .content-table {
        height: 200px;
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .monitor-page {
    flex-direction: column;

    .monitor-sidebar {
      width: 100%;
      max-height: 300px;
      border-right: none;
      border-bottom: 1px solid #e8e8e8;

      &.collapsed {
        max-height: 0;
        padding: 0;
        border-bottom: none;
      }

      .sidebar-filters {
        padding: 8px;
        gap: 4px;
      }

      .sidebar-search {
        padding: 8px;
      }

      .sidebar-tree {
        max-height: 150px;
      }
    }

    .monitor-content {
      .content-toolbar {
        padding: 6px 8px;

        .toolbar-left {
          .el-radio-group {
            .el-radio-button__inner {
              padding: 6px 10px;
              font-size: 12px;
            }
          }
        }
      }

      .content-main.video-mode {
        .video-grid {
          &.grid-4 {
            grid-template-columns: 1fr;
          }

          &.grid-9 {
            grid-template-columns: repeat(2, 1fr);
          }

          &.grid-16 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      }

      .content-table {
        height: 150px;

        .table-toolbar {
          padding: 4px 8px;
        }
      }
    }
  }
}

// 侧边栏折叠按钮
.sidebar-toggle {
  position: fixed;
  left: 280px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-left: none;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: left 0.3s;

  &:hover {
    background: #f5f5f5;
  }

  .collapsed & {
    left: 0;
  }

  @media screen and (max-width: 768px) {
    display: none;
  }
}

// 报警弹窗样式
.alarm-dialog {
  :deep(.el-dialog__header) {
    background: #f56c6c;
    color: #fff;
    margin: 0;
    padding: 12px 20px;

    .el-dialog__title {
      color: #fff;
    }

    .el-dialog__headerbtn .el-dialog__close {
      color: #fff;
    }
  }

  .alarm-content {
    .alarm-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;

      &.level-critical {
        background: #fef0f0;
        color: #f56c6c;
      }

      &.level-warning {
        background: #fdf6ec;
        color: #e6a23c;
      }

      &.level-info {
        background: #f4f4f5;
        color: #909399;
      }

      .alarm-icon {
        font-size: 32px;
      }

      .alarm-type {
        flex: 1;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .alarm-info {
      padding: 0 16px;
      margin-bottom: 20px;

      .info-row {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px dashed #eee;

        &:last-child {
          border-bottom: none;
        }

        .label {
          width: 80px;
          color: #909399;
          font-size: 13px;
        }

        .value {
          flex: 1;
          color: #303133;
          font-size: 13px;
        }
      }
    }

    .alarm-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
  }

  .alarm-queue {
    margin-top: 16px;
    border-top: 1px solid #eee;
    padding-top: 12px;

    .queue-header {
      font-size: 12px;
      color: #909399;
      margin-bottom: 8px;
    }

    .queue-list {
      max-height: 120px;
      overflow-y: auto;

      .queue-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f5f7fa;
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: pointer;
        font-size: 12px;

        &:hover {
          background: #e6f7ff;
        }

        .queue-item-type {
          color: #f56c6c;
          font-weight: 500;
        }

        .queue-item-vehicle {
          color: #606266;
        }
      }
    }
  }
}
</style>

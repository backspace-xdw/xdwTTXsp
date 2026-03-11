<template>
  <div class="operations-page">
    <!-- 顶部标签页 -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="车辆管理" name="vehicle" />
        <el-tab-pane label="驾驶员管理" name="driver" />
        <el-tab-pane label="设备管理" name="device" />
        <el-tab-pane label="企业管理" name="company" />
        <el-tab-pane label="用户管理" name="user" />
        <el-tab-pane label="角色管理" name="role" />
      </el-tabs>
    </div>

    <!-- 统计卡片区 -->
    <div class="stats-cards">
      <div class="stat-card" v-if="activeTab === 'vehicle'">
        <div class="stat-icon vehicle"><el-icon><Van /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.vehicle.total }}</div>
          <div class="stat-label">车辆总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'vehicle'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.vehicle.online }}</div>
          <div class="stat-label">在线车辆</div>
        </div>
      </div>
      <div class="stat-card warning" v-if="activeTab === 'vehicle'">
        <div class="stat-icon offline"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.vehicle.offline }}</div>
          <div class="stat-label">离线车辆</div>
        </div>
      </div>
      <div class="stat-card info" v-if="activeTab === 'vehicle'">
        <div class="stat-icon new"><el-icon><Plus /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.vehicle.todayNew }}</div>
          <div class="stat-label">今日新增</div>
        </div>
      </div>

      <div class="stat-card" v-if="activeTab === 'driver'">
        <div class="stat-icon driver"><el-icon><User /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.driver.total }}</div>
          <div class="stat-label">驾驶员总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'driver'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.driver.active }}</div>
          <div class="stat-label">正常状态</div>
        </div>
      </div>
      <div class="stat-card warning" v-if="activeTab === 'driver'">
        <div class="stat-icon offline"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.driver.inactive }}</div>
          <div class="stat-label">停用状态</div>
        </div>
      </div>
      <div class="stat-card info" v-if="activeTab === 'driver'">
        <div class="stat-icon new"><el-icon><Plus /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.driver.todayNew }}</div>
          <div class="stat-label">今日新增</div>
        </div>
      </div>

      <div class="stat-card" v-if="activeTab === 'device'">
        <div class="stat-icon device"><el-icon><Monitor /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.device.total }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'device'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.device.online }}</div>
          <div class="stat-label">在线设备</div>
        </div>
      </div>
      <div class="stat-card warning" v-if="activeTab === 'device'">
        <div class="stat-icon offline"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.device.offline }}</div>
          <div class="stat-label">离线设备</div>
        </div>
      </div>

      <div class="stat-card" v-if="activeTab === 'company'">
        <div class="stat-icon company"><el-icon><OfficeBuilding /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.company.total }}</div>
          <div class="stat-label">企业总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'company'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.company.active }}</div>
          <div class="stat-label">正常状态</div>
        </div>
      </div>
      <div class="stat-card warning" v-if="activeTab === 'company'">
        <div class="stat-icon offline"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.company.inactive }}</div>
          <div class="stat-label">停用状态</div>
        </div>
      </div>

      <div class="stat-card" v-if="activeTab === 'user'">
        <div class="stat-icon user"><el-icon><Avatar /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.user.total }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'user'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.user.active }}</div>
          <div class="stat-label">正常状态</div>
        </div>
      </div>
      <div class="stat-card warning" v-if="activeTab === 'user'">
        <div class="stat-icon offline"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.user.inactive }}</div>
          <div class="stat-label">禁用状态</div>
        </div>
      </div>

      <div class="stat-card" v-if="activeTab === 'role'">
        <div class="stat-icon role"><el-icon><Key /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.role.total }}</div>
          <div class="stat-label">角色总数</div>
        </div>
      </div>
      <div class="stat-card success" v-if="activeTab === 'role'">
        <div class="stat-icon online"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.role.active }}</div>
          <div class="stat-label">启用角色</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="search-area">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索..."
            style="width: 240px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-if="activeTab === 'vehicle' || activeTab === 'driver' || activeTab === 'user'"
            v-model="filterCompanyId"
            placeholder="选择企业"
            clearable
            style="width: 180px; margin-left: 12px"
          >
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
          <el-select
            v-if="activeTab === 'user'"
            v-model="filterRoleId"
            placeholder="选择角色"
            clearable
            style="width: 140px; margin-left: 12px"
          >
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
          <el-select
            v-if="activeTab === 'device'"
            v-model="filterOnline"
            placeholder="在线状态"
            clearable
            style="width: 120px; margin-left: 12px"
          >
            <el-option label="在线" :value="true" />
            <el-option label="离线" :value="false" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px; margin-left: 12px"
            clearable
          />
          <el-button type="primary" @click="handleSearch" style="margin-left: 12px">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleResetFilter">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
        <div class="action-area">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
          <el-upload
            ref="uploadRef"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls"
            :on-change="handleImport"
            style="display: inline-block; margin: 0 8px"
          >
            <el-button type="success">
              <el-icon><Upload /></el-icon>
              导入
            </el-button>
          </el-upload>
          <el-button type="warning" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="danger" :disabled="!selectedRows.length" @click="handleBatchDelete">
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
        <!-- 车辆表格 -->
        <el-table
          v-if="activeTab === 'vehicle'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="plateNo" label="车牌号" width="120" />
          <el-table-column prop="deviceId" label="设备ID" width="140" />
          <el-table-column prop="companyName" label="所属企业" min-width="150" />
          <el-table-column prop="driverName" label="驾驶员" width="100" />
          <el-table-column label="在线状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.online ? 'success' : 'info'" size="small">
                {{ row.online ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="运营状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastHeartbeat" label="最后通讯" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="primary" link @click="handleViewLocation(row)">定位</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 驾驶员表格 -->
        <el-table
          v-else-if="activeTab === 'driver'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column prop="idCard" label="身份证号" width="180" />
          <el-table-column prop="licenseNo" label="驾驶证号" width="180" />
          <el-table-column prop="licenseType" label="准驾车型" width="100" />
          <el-table-column prop="companyName" label="所属企业" min-width="150" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 设备表格 -->
        <el-table
          v-else-if="activeTab === 'device'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="deviceId" label="设备ID" width="140" />
          <el-table-column prop="simNo" label="SIM卡号" width="140" />
          <el-table-column prop="plateNo" label="绑定车辆" width="120" />
          <el-table-column prop="terminalModel" label="终端型号" width="120" />
          <el-table-column prop="protocolVersion" label="协议版本" width="100" />
          <el-table-column label="在线状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isOnline ? 'success' : 'info'" size="small">
                {{ row.isOnline ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastHeartbeat" label="最后心跳" width="160" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="warning" link @click="handleSendCommand(row)" :disabled="!row.isOnline">指令</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 企业表格 -->
        <el-table
          v-else-if="activeTab === 'company'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          row-key="id"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="name" label="企业名称" min-width="200" />
          <el-table-column prop="shortName" label="简称" width="120" />
          <el-table-column prop="contactName" label="联系人" width="100" />
          <el-table-column prop="contactPhone" label="联系电话" width="130" />
          <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 用户表格 -->
        <el-table
          v-else-if="activeTab === 'user'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
          <el-table-column prop="companyName" label="所属企业" min-width="150" />
          <el-table-column prop="roleName" label="角色" width="100" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="warning" link @click="handleResetPassword(row)">重置密码</el-button>
              <el-button type="danger" link @click="handleDelete(row)" :disabled="row.username === 'admin'">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 角色表格 -->
        <el-table
          v-else-if="activeTab === 'role'"
          v-loading="loading"
          :data="tableData"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="name" label="角色名称" width="150" />
          <el-table-column prop="code" label="角色编码" width="150" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="info" link @click="handleConfigPermission(row)">权限配置</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 车辆编辑弹窗 -->
    <el-dialog
      v-model="vehicleDialogVisible"
      :title="isEdit ? '编辑车辆' : '新增车辆'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="vehicleFormRef" :model="vehicleForm" :rules="vehicleRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车牌号" prop="plateNo">
              <el-input v-model="vehicleForm.plateNo" placeholder="请输入车牌号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备ID" prop="deviceId">
              <el-input v-model="vehicleForm.deviceId" placeholder="请输入设备ID" :disabled="isEdit" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属企业" prop="companyId">
              <el-select v-model="vehicleForm.companyId" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="company in companies"
                  :key="company.id"
                  :label="company.name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="驾驶员" prop="driverId">
              <el-select v-model="vehicleForm.driverId" placeholder="请选择" clearable style="width: 100%">
                <el-option
                  v-for="driver in drivers"
                  :key="driver.id"
                  :label="driver.name"
                  :value="driver.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="SIM卡号" prop="simNo">
              <el-input v-model="vehicleForm.simNo" placeholder="请输入SIM卡号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车牌颜色" prop="plateColor">
              <el-select v-model="vehicleForm.plateColor" placeholder="请选择" style="width: 100%">
                <el-option label="蓝色" :value="1" />
                <el-option label="黄色" :value="2" />
                <el-option label="黑色" :value="3" />
                <el-option label="白色" :value="4" />
                <el-option label="绿色" :value="5" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="vehicleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitVehicle">确定</el-button>
      </template>
    </el-dialog>

    <!-- 驾驶员编辑弹窗 -->
    <el-dialog
      v-model="driverDialogVisible"
      :title="isEdit ? '编辑驾驶员' : '新增驾驶员'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="driverFormRef" :model="driverForm" :rules="driverRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="driverForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="driverForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="driverForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="驾驶证号" prop="licenseNo">
              <el-input v-model="driverForm.licenseNo" placeholder="请输入驾驶证号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="准驾车型" prop="licenseType">
              <el-select v-model="driverForm.licenseType" placeholder="请选择" style="width: 100%">
                <el-option label="A1" value="A1" />
                <el-option label="A2" value="A2" />
                <el-option label="A3" value="A3" />
                <el-option label="B1" value="B1" />
                <el-option label="B2" value="B2" />
                <el-option label="C1" value="C1" />
                <el-option label="C2" value="C2" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属企业" prop="companyId">
              <el-select v-model="driverForm.companyId" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="company in companies"
                  :key="company.id"
                  :label="company.name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IC卡号" prop="icCardNo">
              <el-input v-model="driverForm.icCardNo" placeholder="请输入IC卡号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="driverForm.status">
                <el-radio :label="1">正常</el-radio>
                <el-radio :label="0">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="driverDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDriver">确定</el-button>
      </template>
    </el-dialog>

    <!-- 设备编辑弹窗 -->
    <el-dialog
      v-model="deviceDialogVisible"
      :title="isEdit ? '编辑设备' : '新增设备'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="deviceFormRef" :model="deviceForm" :rules="deviceRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备ID" prop="deviceId">
              <el-input v-model="deviceForm.deviceId" placeholder="请输入设备ID" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIM卡号" prop="simNo">
              <el-input v-model="deviceForm.simNo" placeholder="请输入SIM卡号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车牌号" prop="plateNo">
              <el-input v-model="deviceForm.plateNo" placeholder="请输入车牌号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="终端型号" prop="terminalModel">
              <el-input v-model="deviceForm.terminalModel" placeholder="请输入终端型号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="协议版本" prop="protocolVersion">
              <el-select v-model="deviceForm.protocolVersion" placeholder="请选择" style="width: 100%">
                <el-option label="JT/T 808-2011" value="2011" />
                <el-option label="JT/T 808-2013" value="2013" />
                <el-option label="JT/T 808-2019" value="2019" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="制造商ID" prop="manufacturerId">
              <el-input v-model="deviceForm.manufacturerId" placeholder="请输入制造商ID" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="deviceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDevice">确定</el-button>
      </template>
    </el-dialog>

    <!-- 企业编辑弹窗 -->
    <el-dialog
      v-model="companyDialogVisible"
      :title="isEdit ? '编辑企业' : '新增企业'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="companyFormRef" :model="companyForm" :rules="companyRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="企业名称" prop="name">
              <el-input v-model="companyForm.name" placeholder="请输入企业名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="简称" prop="shortName">
              <el-input v-model="companyForm.shortName" placeholder="请输入简称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="上级企业" prop="parentId">
              <el-select v-model="companyForm.parentId" placeholder="请选择" clearable style="width: 100%">
                <el-option
                  v-for="company in companies.filter(c => c.id !== companyForm.id)"
                  :key="company.id"
                  :label="company.name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="companyForm.status">
                <el-radio :label="1">正常</el-radio>
                <el-radio :label="0">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="companyForm.contactName" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="companyForm.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址" prop="address">
          <el-input v-model="companyForm.address" placeholder="请输入地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="companyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCompany">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户编辑弹窗 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password" v-if="!isEdit">
              <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="userForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="userForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属企业" prop="companyId">
              <el-select v-model="userForm.companyId" placeholder="请选择" clearable style="width: 100%">
                <el-option
                  v-for="company in companies"
                  :key="company.id"
                  :label="company.name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId">
              <el-select v-model="userForm.roleId" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="role in roles"
                  :key="role.id"
                  :label="role.name"
                  :value="role.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="userForm.status">
                <el-radio :label="1">正常</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitUser">确定</el-button>
      </template>
    </el-dialog>

    <!-- 角色编辑弹窗 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="isEdit ? '编辑角色' : '新增角色'"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="name">
              <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色编码" prop="code">
              <el-input v-model="roleForm.code" placeholder="请输入角色编码" :disabled="isEdit" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="roleForm.status">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRole">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限配置弹窗 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限配置"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item label="角色">
          <el-input :value="currentRole?.name" disabled />
        </el-form-item>
        <el-form-item label="权限">
          <el-checkbox-group v-model="selectedPermissions">
            <el-checkbox v-for="perm in permissionList" :key="perm.value" :label="perm.value">
              {{ perm.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="savePermissions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设备指令下发弹窗 -->
    <el-dialog
      v-model="commandDialogVisible"
      title="设备指令下发"
      width="500px"
    >
      <el-form label-width="100px">
        <el-form-item label="设备ID">
          <el-input :value="currentDevice?.deviceId" disabled />
        </el-form-item>
        <el-form-item label="车牌号">
          <el-input :value="currentDevice?.plateNo || '-'" disabled />
        </el-form-item>
        <el-form-item label="指令类型" required>
          <el-select v-model="commandType" placeholder="请选择指令" style="width: 100%">
            <el-option label="远程锁车" value="lock" />
            <el-option label="远程解锁" value="unlock" />
            <el-option label="断油断电" value="cut_oil" />
            <el-option label="恢复油电" value="restore_oil" />
            <el-option label="设置上报间隔" value="set_interval" />
            <el-option label="设置限速" value="set_speed_limit" />
            <el-option label="位置查询" value="query_location" />
            <el-option label="终端复位" value="reset" />
            <el-option label="文本消息" value="text_message" />
          </el-select>
        </el-form-item>
        <el-form-item label="上报间隔(秒)" v-if="commandType === 'set_interval'">
          <el-input-number v-model="commandParams.interval" :min="5" :max="3600" />
        </el-form-item>
        <el-form-item label="限速值(km/h)" v-if="commandType === 'set_speed_limit'">
          <el-input-number v-model="commandParams.speed" :min="0" :max="200" />
        </el-form-item>
        <el-form-item label="消息内容" v-if="commandType === 'text_message'">
          <el-input v-model="commandParams.message" type="textarea" :rows="3" placeholder="请输入要下发的消息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commandDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="sendCommand">确认下发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Refresh, Delete, Van, User, Monitor, OfficeBuilding, CircleCheck, CircleClose, RefreshLeft, Upload, Download, Avatar, Key } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useRouter } from 'vue-router'
import request from '@/api/request'

const router = useRouter()

// 当前激活的标签页
const activeTab = ref('vehicle')

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 搜索和筛选
const searchKeyword = ref('')
const filterCompanyId = ref<number | undefined>()
const filterOnline = ref<boolean | undefined>()
const dateRange = ref<[string, string] | null>(null)

// 统计数据
const statistics = reactive({
  vehicle: { total: 0, online: 0, offline: 0, todayNew: 0 },
  driver: { total: 0, active: 0, inactive: 0, todayNew: 0 },
  device: { total: 0, online: 0, offline: 0 },
  company: { total: 0, active: 0, inactive: 0 },
  user: { total: 0, active: 0, inactive: 0 },
  role: { total: 0, active: 0 }
})

// 表格数据
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 企业、驾驶员、角色列表 (用于下拉选择)
const companies = ref<any[]>([])
const drivers = ref<any[]>([])
const roles = ref<any[]>([])
const filterRoleId = ref<number | undefined>()

// 弹窗控制
const isEdit = ref(false)
const vehicleDialogVisible = ref(false)
const driverDialogVisible = ref(false)
const deviceDialogVisible = ref(false)
const companyDialogVisible = ref(false)
const userDialogVisible = ref(false)
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const currentRole = ref<any>(null)
const selectedPermissions = ref<string[]>([])

// 权限列表
const permissionList = [
  { label: '仪表盘', value: 'dashboard' },
  { label: '实时监控', value: 'monitor' },
  { label: '轨迹回放', value: 'replay' },
  { label: '报警管理', value: 'alarm' },
  { label: '运营管理', value: 'operations' },
  { label: '报表统计', value: 'reports' },
  { label: '系统设置', value: 'settings' }
]

// 设备指令相关
const commandDialogVisible = ref(false)
const currentDevice = ref<any>(null)
const commandType = ref('')
const commandParams = reactive({
  interval: 30,
  speed: 120,
  message: ''
})

// 表单引用
const vehicleFormRef = ref<FormInstance>()
const driverFormRef = ref<FormInstance>()
const deviceFormRef = ref<FormInstance>()
const companyFormRef = ref<FormInstance>()
const userFormRef = ref<FormInstance>()
const roleFormRef = ref<FormInstance>()

// 表单数据
const vehicleForm = reactive({
  id: undefined as number | undefined,
  plateNo: '',
  deviceId: '',
  companyId: undefined as number | undefined,
  driverId: undefined as number | undefined,
  simNo: '',
  plateColor: 1
})

const driverForm = reactive({
  id: undefined as number | undefined,
  name: '',
  phone: '',
  idCard: '',
  licenseNo: '',
  licenseType: '',
  companyId: undefined as number | undefined,
  icCardNo: '',
  status: 1
})

const deviceForm = reactive({
  id: undefined as number | undefined,
  deviceId: '',
  simNo: '',
  plateNo: '',
  terminalModel: '',
  protocolVersion: '2019',
  manufacturerId: ''
})

const companyForm = reactive({
  id: undefined as number | undefined,
  name: '',
  shortName: '',
  parentId: undefined as number | undefined,
  contactName: '',
  contactPhone: '',
  address: '',
  status: 1
})

const userForm = reactive({
  id: undefined as number | undefined,
  username: '',
  password: '',
  name: '',
  phone: '',
  email: '',
  companyId: undefined as number | undefined,
  roleId: undefined as number | undefined,
  status: 1
})

const roleForm = reactive({
  id: undefined as number | undefined,
  name: '',
  code: '',
  description: '',
  status: 1
})

// 表单验证规则
const vehicleRules: FormRules = {
  plateNo: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
  deviceId: [{ required: true, message: '请输入设备ID', trigger: 'blur' }]
}

const driverRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

const deviceRules: FormRules = {
  deviceId: [{ required: true, message: '请输入设备ID', trigger: 'blur' }]
}

const companyRules: FormRules = {
  name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }]
}

const userRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const roleRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

// 获取状态类型
function getStatusType(status: string) {
  const types: Record<string, string> = {
    driving: 'success',
    parking_acc_on: 'warning',
    acc_off: 'info',
    alarm: 'danger',
    offline: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
function getStatusText(status: string) {
  const texts: Record<string, string> = {
    driving: '行驶中',
    parking_acc_on: '停车ACC开',
    acc_off: 'ACC关',
    alarm: '报警',
    offline: '离线'
  }
  return texts[status] || status
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    let url = ''
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value || undefined
    }

    // 日期范围筛选
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    switch (activeTab.value) {
      case 'vehicle':
        url = '/vehicles'
        if (filterCompanyId.value) params.companyId = filterCompanyId.value
        break
      case 'driver':
        url = '/operations/drivers'
        if (filterCompanyId.value) params.companyId = filterCompanyId.value
        break
      case 'device':
        url = '/operations/devices'
        if (filterOnline.value !== undefined) params.online = filterOnline.value
        break
      case 'company':
        url = '/operations/companies'
        break
      case 'user':
        url = '/operations/users'
        if (filterCompanyId.value) params.companyId = filterCompanyId.value
        if (filterRoleId.value) params.roleId = filterRoleId.value
        break
      case 'role':
        url = '/operations/roles'
        break
    }

    const res = await request.get(url, { params }) as any
    if (res.code === 0) {
      tableData.value = res.data.list || res.data
      pagination.total = res.data.total || tableData.value.length
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 加载企业列表
async function loadCompanies() {
  try {
    const res = await request.get('/operations/companies') as any
    if (res.code === 0) {
      companies.value = res.data.list || res.data || []
    }
  } catch (error) {
    console.error('加载企业列表失败:', error)
  }
}

// 加载驾驶员列表
async function loadDrivers() {
  try {
    const res = await request.get('/operations/drivers') as any
    if (res.code === 0) {
      drivers.value = res.data.list || res.data || []
    }
  } catch (error) {
    console.error('加载驾驶员列表失败:', error)
  }
}

// 加载统计数据
async function loadStatistics() {
  try {
    const res = await request.get('/operations/statistics') as any
    if (res.code === 0) {
      Object.assign(statistics, res.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载角色列表
async function loadRoles() {
  try {
    const res = await request.get('/operations/roles/all') as any
    if (res.code === 0) {
      roles.value = res.data || []
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
  }
}

// 重置筛选
function handleResetFilter() {
  searchKeyword.value = ''
  filterCompanyId.value = undefined
  filterOnline.value = undefined
  filterRoleId.value = undefined
  dateRange.value = null
  pagination.page = 1
  loadData()
}

// 导出Excel
async function handleExport() {
  try {
    loading.value = true
    // 获取全部数据用于导出
    let url = ''
    switch (activeTab.value) {
      case 'vehicle':
        url = '/vehicles'
        break
      case 'driver':
        url = '/operations/drivers'
        break
      case 'device':
        url = '/operations/devices'
        break
      case 'company':
        url = '/operations/companies'
        break
    }

    const res = await request.get(url, { params: { pageSize: 10000 } }) as any
    if (res.code !== 0) {
      ElMessage.error('获取数据失败')
      return
    }

    const data = res.data.list || res.data || []
    if (data.length === 0) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    // 根据类型生成不同的表头和数据
    let headers: string[] = []
    let exportData: any[] = []
    const tabNames: Record<string, string> = {
      vehicle: '车辆',
      driver: '驾驶员',
      device: '设备',
      company: '企业'
    }

    switch (activeTab.value) {
      case 'vehicle':
        headers = ['车牌号', '设备ID', '所属企业', '驾驶员', '在线状态', '运营状态', '最后通讯']
        exportData = data.map((item: any) => ({
          '车牌号': item.plateNo || '',
          '设备ID': item.deviceId || '',
          '所属企业': item.companyName || '',
          '驾驶员': item.driverName || '',
          '在线状态': item.online ? '在线' : '离线',
          '运营状态': getStatusText(item.status),
          '最后通讯': item.lastHeartbeat || ''
        }))
        break
      case 'driver':
        headers = ['姓名', '手机号', '身份证号', '驾驶证号', '准驾车型', '所属企业', '状态']
        exportData = data.map((item: any) => ({
          '姓名': item.name || '',
          '手机号': item.phone || '',
          '身份证号': item.idCard || '',
          '驾驶证号': item.licenseNo || '',
          '准驾车型': item.licenseType || '',
          '所属企业': item.companyName || '',
          '状态': item.status === 1 ? '正常' : '停用'
        }))
        break
      case 'device':
        headers = ['设备ID', 'SIM卡号', '绑定车辆', '终端型号', '协议版本', '在线状态', '最后心跳']
        exportData = data.map((item: any) => ({
          '设备ID': item.deviceId || '',
          'SIM卡号': item.simNo || '',
          '绑定车辆': item.plateNo || '',
          '终端型号': item.terminalModel || '',
          '协议版本': item.protocolVersion || '',
          '在线状态': item.isOnline ? '在线' : '离线',
          '最后心跳': item.lastHeartbeat || ''
        }))
        break
      case 'company':
        headers = ['企业名称', '简称', '联系人', '联系电话', '地址', '状态']
        exportData = data.map((item: any) => ({
          '企业名称': item.name || '',
          '简称': item.shortName || '',
          '联系人': item.contactName || '',
          '联系电话': item.contactPhone || '',
          '地址': item.address || '',
          '状态': item.status === 1 ? '正常' : '停用'
        }))
        break
    }

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tabNames[activeTab.value] + '列表')

    // 下载文件
    const fileName = `${tabNames[activeTab.value]}数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    loading.value = false
  }
}

// 导入Excel
async function handleImport(file: any) {
  if (!file.raw) return

  try {
    loading.value = true
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]!
        const worksheet = workbook.Sheets[sheetName]!
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          ElMessage.warning('Excel文件中没有数据')
          return
        }

        // 根据类型转换数据格式
        let importData: any[] = []
        let url = ''

        switch (activeTab.value) {
          case 'vehicle':
            url = '/operations/vehicles/import'
            importData = jsonData.map((row: any) => ({
              device_id: row['设备ID'] || row['deviceId'] || '',
              plate_no: row['车牌号'] || row['plateNo'] || '',
              sim_no: row['SIM卡号'] || row['simNo'] || ''
            }))
            break
          case 'driver':
            url = '/operations/drivers/import'
            importData = jsonData.map((row: any) => ({
              name: row['姓名'] || row['name'] || '',
              phone: row['手机号'] || row['phone'] || '',
              id_card: row['身份证号'] || row['idCard'] || '',
              license_no: row['驾驶证号'] || row['licenseNo'] || '',
              license_type: row['准驾车型'] || row['licenseType'] || ''
            }))
            break
          case 'device':
            url = '/operations/devices/import'
            importData = jsonData.map((row: any) => ({
              device_id: row['设备ID'] || row['deviceId'] || '',
              sim_no: row['SIM卡号'] || row['simNo'] || '',
              plate_no: row['车牌号'] || row['plateNo'] || '',
              terminal_model: row['终端型号'] || row['terminalModel'] || ''
            }))
            break
          case 'company':
            url = '/operations/companies/import'
            importData = jsonData.map((row: any) => ({
              name: row['企业名称'] || row['name'] || '',
              short_name: row['简称'] || row['shortName'] || '',
              contact_name: row['联系人'] || row['contactName'] || '',
              contact_phone: row['联系电话'] || row['contactPhone'] || '',
              address: row['地址'] || row['address'] || ''
            }))
            break
        }

        // 过滤无效数据
        importData = importData.filter((item: any) => {
          if (activeTab.value === 'vehicle' || activeTab.value === 'device') {
            return item.device_id
          }
          if (activeTab.value === 'driver') {
            return item.name
          }
          if (activeTab.value === 'company') {
            return item.name
          }
          return false
        })

        if (importData.length === 0) {
          ElMessage.warning('没有有效的数据可导入')
          return
        }

        // 发送到后端
        const res = await request.post(url, { data: importData }) as any
        if (res.code === 0) {
          ElMessage.success(`成功导入 ${res.data?.count || importData.length} 条数据`)
          loadData()
          loadStatistics()
        } else {
          ElMessage.error(res.message || '导入失败')
        }
      } catch (err) {
        console.error('解析Excel失败:', err)
        ElMessage.error('解析Excel文件失败')
      } finally {
        loading.value = false
      }
    }

    reader.readAsArrayBuffer(file.raw)
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败')
    loading.value = false
  }
}

// 标签页切换
function handleTabChange() {
  pagination.page = 1
  searchKeyword.value = ''
  filterCompanyId.value = undefined
  filterOnline.value = undefined
  filterRoleId.value = undefined
  selectedRows.value = []
  loadData()
}

// 搜索
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 刷新
function handleRefresh() {
  loadData()
}

// 分页
function handleSizeChange() {
  pagination.page = 1
  loadData()
}

function handlePageChange() {
  loadData()
}

// 选择行
function handleSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

// 新增
function handleAdd() {
  isEdit.value = false
  switch (activeTab.value) {
    case 'vehicle':
      Object.assign(vehicleForm, { id: undefined, plateNo: '', deviceId: '', companyId: undefined, driverId: undefined, simNo: '', plateColor: 1 })
      vehicleDialogVisible.value = true
      break
    case 'driver':
      Object.assign(driverForm, { id: undefined, name: '', phone: '', idCard: '', licenseNo: '', licenseType: '', companyId: undefined, icCardNo: '', status: 1 })
      driverDialogVisible.value = true
      break
    case 'device':
      Object.assign(deviceForm, { id: undefined, deviceId: '', simNo: '', plateNo: '', terminalModel: '', protocolVersion: '2019', manufacturerId: '' })
      deviceDialogVisible.value = true
      break
    case 'company':
      Object.assign(companyForm, { id: undefined, name: '', shortName: '', parentId: undefined, contactName: '', contactPhone: '', address: '', status: 1 })
      companyDialogVisible.value = true
      break
    case 'user':
      Object.assign(userForm, { id: undefined, username: '', password: '', name: '', phone: '', email: '', companyId: undefined, roleId: undefined, status: 1 })
      userDialogVisible.value = true
      break
    case 'role':
      Object.assign(roleForm, { id: undefined, name: '', code: '', description: '', status: 1 })
      roleDialogVisible.value = true
      break
  }
}

// 编辑
function handleEdit(row: any) {
  isEdit.value = true
  switch (activeTab.value) {
    case 'vehicle':
      Object.assign(vehicleForm, {
        id: row.id,
        plateNo: row.plateNo,
        deviceId: row.deviceId,
        companyId: row.companyId,
        driverId: row.driverId,
        simNo: row.simNo || '',
        plateColor: row.plateColor || 1
      })
      vehicleDialogVisible.value = true
      break
    case 'driver':
      Object.assign(driverForm, {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        idCard: row.idCard || '',
        licenseNo: row.licenseNo || '',
        licenseType: row.licenseType || '',
        companyId: row.companyId,
        icCardNo: row.icCardNo || '',
        status: row.status
      })
      driverDialogVisible.value = true
      break
    case 'device':
      Object.assign(deviceForm, {
        id: row.id,
        deviceId: row.deviceId,
        simNo: row.simNo || '',
        plateNo: row.plateNo || '',
        terminalModel: row.terminalModel || '',
        protocolVersion: row.protocolVersion || '2019',
        manufacturerId: row.manufacturerId || ''
      })
      deviceDialogVisible.value = true
      break
    case 'company':
      Object.assign(companyForm, {
        id: row.id,
        name: row.name,
        shortName: row.shortName || '',
        parentId: row.parentId,
        contactName: row.contactName || '',
        contactPhone: row.contactPhone || '',
        address: row.address || '',
        status: row.status
      })
      companyDialogVisible.value = true
      break
    case 'user':
      Object.assign(userForm, {
        id: row.id,
        username: row.username,
        password: '',
        name: row.name || '',
        phone: row.phone || '',
        email: row.email || '',
        companyId: row.companyId,
        roleId: row.roleId,
        status: row.status
      })
      userDialogVisible.value = true
      break
    case 'role':
      Object.assign(roleForm, {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description || '',
        status: row.status
      })
      roleDialogVisible.value = true
      break
  }
}

// 删除
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '提示', { type: 'warning' })

    let url = ''
    switch (activeTab.value) {
      case 'vehicle':
        url = `/operations/vehicles/${row.id}`
        break
      case 'driver':
        url = `/operations/drivers/${row.id}`
        break
      case 'device':
        url = `/operations/devices/${row.id}`
        break
      case 'company':
        url = `/operations/companies/${row.id}`
        break
      case 'user':
        url = `/operations/users/${row.id}`
        break
      case 'role':
        url = `/operations/roles/${row.id}`
        break
    }

    const res = await request.delete(url) as any
    if (res.code === 0) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedRows.value.length) return

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', { type: 'warning' })

    const ids = selectedRows.value.map(r => r.id)
    let url = ''
    switch (activeTab.value) {
      case 'vehicle':
        url = '/operations/vehicles/batch'
        break
      case 'driver':
        url = '/operations/drivers/batch'
        break
      case 'device':
        url = '/operations/devices/batch'
        break
      case 'company':
        url = '/operations/companies/batch'
        break
      case 'user':
        url = '/operations/users/batch'
        break
      case 'role':
        url = '/operations/roles/batch'
        break
    }

    const res = await request.delete(url, { data: { ids } }) as any
    if (res.code === 0) {
      ElMessage.success('批量删除成功')
      selectedRows.value = []
      loadData()
    } else {
      ElMessage.error(res.message || '批量删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 查看位置
function handleViewLocation(row: any) {
  router.push({ name: 'Monitor', query: { deviceId: row.deviceId } })
}

// 重置表单
function resetForm() {
  vehicleFormRef.value?.resetFields()
  driverFormRef.value?.resetFields()
  deviceFormRef.value?.resetFields()
  companyFormRef.value?.resetFields()
  userFormRef.value?.resetFields()
  roleFormRef.value?.resetFields()
}

// 提交车辆
async function submitVehicle() {
  try {
    await vehicleFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/vehicles/${vehicleForm.id}` : '/operations/vehicles'
    const method = isEdit.value ? 'put' : 'post'

    const res = await (request as any)[method](url, {
      plate_no: vehicleForm.plateNo,
      device_id: vehicleForm.deviceId,
      company_id: vehicleForm.companyId,
      driver_id: vehicleForm.driverId,
      sim_no: vehicleForm.simNo,
      plate_color: vehicleForm.plateColor
    })

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      vehicleDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交驾驶员
async function submitDriver() {
  try {
    await driverFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/drivers/${driverForm.id}` : '/operations/drivers'
    const method = isEdit.value ? 'put' : 'post'

    const res = await (request as any)[method](url, {
      name: driverForm.name,
      phone: driverForm.phone,
      id_card: driverForm.idCard,
      license_no: driverForm.licenseNo,
      license_type: driverForm.licenseType,
      company_id: driverForm.companyId,
      ic_card_no: driverForm.icCardNo,
      status: driverForm.status
    })

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      driverDialogVisible.value = false
      loadData()
      loadDrivers()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交设备
async function submitDevice() {
  try {
    await deviceFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/devices/${deviceForm.id}` : '/operations/devices'
    const method = isEdit.value ? 'put' : 'post'

    const res = await (request as any)[method](url, {
      device_id: deviceForm.deviceId,
      sim_no: deviceForm.simNo,
      plate_no: deviceForm.plateNo,
      terminal_model: deviceForm.terminalModel,
      protocol_version: deviceForm.protocolVersion,
      manufacturer_id: deviceForm.manufacturerId
    })

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      deviceDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交企业
async function submitCompany() {
  try {
    await companyFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/companies/${companyForm.id}` : '/operations/companies'
    const method = isEdit.value ? 'put' : 'post'

    const res = await (request as any)[method](url, {
      name: companyForm.name,
      short_name: companyForm.shortName,
      parent_id: companyForm.parentId,
      contact_name: companyForm.contactName,
      contact_phone: companyForm.contactPhone,
      address: companyForm.address,
      status: companyForm.status
    })

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      companyDialogVisible.value = false
      loadData()
      loadCompanies()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交用户
async function submitUser() {
  try {
    await userFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/users/${userForm.id}` : '/operations/users'
    const method = isEdit.value ? 'put' : 'post'

    const data: any = {
      name: userForm.name,
      phone: userForm.phone,
      email: userForm.email,
      company_id: userForm.companyId,
      role_id: userForm.roleId,
      status: userForm.status
    }

    if (!isEdit.value) {
      data.username = userForm.username
      data.password = userForm.password
    }

    const res = await (request as any)[method](url, data)

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      userDialogVisible.value = false
      loadData()
      loadStatistics()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交角色
async function submitRole() {
  try {
    await roleFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/operations/roles/${roleForm.id}` : '/operations/roles'
    const method = isEdit.value ? 'put' : 'post'

    const res = await (request as any)[method](url, {
      name: roleForm.name,
      code: roleForm.code,
      description: roleForm.description,
      status: roleForm.status
    })

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      roleDialogVisible.value = false
      loadData()
      loadRoles()
      loadStatistics()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 重置密码
async function handleResetPassword(row: any) {
  try {
    await ElMessageBox.confirm('确定要重置该用户的密码吗？重置后密码将变为：123456', '提示', { type: 'warning' })

    const res = await request.put(`/operations/users/${row.id}`, {
      password: '123456'
    }) as any

    if (res.code === 0) {
      ElMessage.success('密码重置成功，新密码为：123456')
    } else {
      ElMessage.error(res.message || '重置失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置密码失败')
    }
  }
}

// 权限配置
function handleConfigPermission(row: any) {
  currentRole.value = row
  selectedPermissions.value = row.permissions || []
  permissionDialogVisible.value = true
}

// 保存权限
async function savePermissions() {
  if (!currentRole.value) return

  try {
    submitting.value = true

    const res = await request.put(`/operations/roles/${currentRole.value.id}`, {
      permissions: selectedPermissions.value
    }) as any

    if (res.code === 0) {
      ElMessage.success('权限配置保存成功')
      permissionDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error('保存权限失败')
  } finally {
    submitting.value = false
  }
}

// 打开指令下发弹窗
function handleSendCommand(row: any) {
  currentDevice.value = row
  commandType.value = ''
  commandParams.interval = 30
  commandParams.speed = 120
  commandParams.message = ''
  commandDialogVisible.value = true
}

// 发送指令
async function sendCommand() {
  if (!commandType.value) {
    ElMessage.warning('请选择指令类型')
    return
  }

  if (!currentDevice.value) return

  try {
    submitting.value = true

    const params: any = {}
    if (commandType.value === 'set_interval') {
      params.interval = commandParams.interval
    } else if (commandType.value === 'set_speed_limit') {
      params.speed = commandParams.speed
    } else if (commandType.value === 'text_message') {
      if (!commandParams.message.trim()) {
        ElMessage.warning('请输入消息内容')
        submitting.value = false
        return
      }
      params.message = commandParams.message
    }

    const res = await request.post(`/operations/devices/${currentDevice.value.id}/command`, {
      command: commandType.value,
      params
    }) as any

    if (res.code === 0) {
      ElMessage.success('指令下发成功')
      commandDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '指令下发失败')
    }
  } catch (error) {
    console.error('指令下发失败:', error)
    ElMessage.error('指令下发失败')
  } finally {
    submitting.value = false
  }
}

// 初始化
onMounted(() => {
  loadData()
  loadCompanies()
  loadDrivers()
  loadRoles()
  loadStatistics()
})
</script>

<style lang="scss" scoped>
.operations-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  .stats-cards {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    .stat-card {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: #fff;

      &.success {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      }

      &.warning {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      &.info {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        margin-right: 16px;

        .el-icon {
          font-size: 24px;
        }
      }

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
        }
      }
    }
  }

  .tabs-header {
    background: #fff;
    padding: 0 24px;
    border-bottom: 1px solid #e8e8e8;

    :deep(.el-tabs__header) {
      margin: 0;
    }

    :deep(.el-tabs__nav-wrap::after) {
      display: none;
    }

    :deep(.el-tabs__item) {
      height: 50px;
      line-height: 50px;
      font-size: 15px;
    }
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    overflow: hidden;

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 16px;
      background: #fff;
      border-radius: 4px;

      .search-area {
        display: flex;
        align-items: center;
      }

      .action-area {
        display: flex;
        gap: 8px;
      }
    }

    .table-container {
      flex: 1;
      background: #fff;
      border-radius: 4px;
      padding: 16px;
      overflow: auto;

      :deep(.el-table) {
        height: 100%;
      }
    }

    .pagination {
      display: flex;
      justify-content: flex-end;
      padding: 16px;
      background: #fff;
      border-radius: 0 0 4px 4px;
      margin-top: -1px;
    }
  }
}
</style>

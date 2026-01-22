<template>
  <div class="operations-page">
    <!-- 顶部标签页 -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="车辆管理" name="vehicle" />
        <el-tab-pane label="驾驶员管理" name="driver" />
        <el-tab-pane label="设备管理" name="device" />
        <el-tab-pane label="企业管理" name="company" />
      </el-tabs>
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
            v-if="activeTab === 'vehicle' || activeTab === 'driver'"
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
            v-if="activeTab === 'device'"
            v-model="filterOnline"
            placeholder="在线状态"
            clearable
            style="width: 120px; margin-left: 12px"
          >
            <el-option label="在线" :value="true" />
            <el-option label="离线" :value="false" />
          </el-select>
          <el-button type="primary" @click="handleSearch" style="margin-left: 12px">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
        <div class="action-area">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增
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
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Refresh, Delete } from '@element-plus/icons-vue'
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

// 表格数据
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 企业和驾驶员列表 (用于下拉选择)
const companies = ref<any[]>([])
const drivers = ref<any[]>([])

// 弹窗控制
const isEdit = ref(false)
const vehicleDialogVisible = ref(false)
const driverDialogVisible = ref(false)
const deviceDialogVisible = ref(false)
const companyDialogVisible = ref(false)

// 表单引用
const vehicleFormRef = ref<FormInstance>()
const driverFormRef = ref<FormInstance>()
const deviceFormRef = ref<FormInstance>()
const companyFormRef = ref<FormInstance>()

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

    switch (activeTab.value) {
      case 'vehicle':
        url = '/api/vehicles'
        if (filterCompanyId.value) params.companyId = filterCompanyId.value
        break
      case 'driver':
        url = '/api/operations/drivers'
        if (filterCompanyId.value) params.companyId = filterCompanyId.value
        break
      case 'device':
        url = '/api/operations/devices'
        if (filterOnline.value !== undefined) params.online = filterOnline.value
        break
      case 'company':
        url = '/api/operations/companies'
        break
    }

    const res = await request.get(url, { params })
    if (res.data.code === 0) {
      tableData.value = res.data.data.list || res.data.data
      pagination.total = res.data.data.total || tableData.value.length
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
    const res = await request.get('/api/operations/companies')
    if (res.data.code === 0) {
      companies.value = res.data.data.list || res.data.data || []
    }
  } catch (error) {
    console.error('加载企业列表失败:', error)
  }
}

// 加载驾驶员列表
async function loadDrivers() {
  try {
    const res = await request.get('/api/operations/drivers')
    if (res.data.code === 0) {
      drivers.value = res.data.data.list || res.data.data || []
    }
  } catch (error) {
    console.error('加载驾驶员列表失败:', error)
  }
}

// 标签页切换
function handleTabChange() {
  pagination.page = 1
  searchKeyword.value = ''
  filterCompanyId.value = undefined
  filterOnline.value = undefined
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
  }
}

// 删除
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '提示', { type: 'warning' })

    let url = ''
    switch (activeTab.value) {
      case 'vehicle':
        url = `/api/operations/vehicles/${row.id}`
        break
      case 'driver':
        url = `/api/operations/drivers/${row.id}`
        break
      case 'device':
        url = `/api/operations/devices/${row.id}`
        break
      case 'company':
        url = `/api/operations/companies/${row.id}`
        break
    }

    const res = await request.delete(url)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(res.data.message || '删除失败')
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
        url = '/api/operations/vehicles/batch'
        break
      case 'driver':
        url = '/api/operations/drivers/batch'
        break
      case 'device':
        url = '/api/operations/devices/batch'
        break
      case 'company':
        url = '/api/operations/companies/batch'
        break
    }

    const res = await request.delete(url, { data: { ids } })
    if (res.data.code === 0) {
      ElMessage.success('批量删除成功')
      selectedRows.value = []
      loadData()
    } else {
      ElMessage.error(res.data.message || '批量删除失败')
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
}

// 提交车辆
async function submitVehicle() {
  try {
    await vehicleFormRef.value?.validate()
    submitting.value = true

    const url = isEdit.value ? `/api/operations/vehicles/${vehicleForm.id}` : '/api/operations/vehicles'
    const method = isEdit.value ? 'put' : 'post'

    const res = await request[method](url, {
      plate_no: vehicleForm.plateNo,
      device_id: vehicleForm.deviceId,
      company_id: vehicleForm.companyId,
      driver_id: vehicleForm.driverId,
      sim_no: vehicleForm.simNo,
      plate_color: vehicleForm.plateColor
    })

    if (res.data.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      vehicleDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.data.message || '操作失败')
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

    const url = isEdit.value ? `/api/operations/drivers/${driverForm.id}` : '/api/operations/drivers'
    const method = isEdit.value ? 'put' : 'post'

    const res = await request[method](url, {
      name: driverForm.name,
      phone: driverForm.phone,
      id_card: driverForm.idCard,
      license_no: driverForm.licenseNo,
      license_type: driverForm.licenseType,
      company_id: driverForm.companyId,
      ic_card_no: driverForm.icCardNo,
      status: driverForm.status
    })

    if (res.data.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      driverDialogVisible.value = false
      loadData()
      loadDrivers()
    } else {
      ElMessage.error(res.data.message || '操作失败')
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

    const url = isEdit.value ? `/api/operations/devices/${deviceForm.id}` : '/api/operations/devices'
    const method = isEdit.value ? 'put' : 'post'

    const res = await request[method](url, {
      device_id: deviceForm.deviceId,
      sim_no: deviceForm.simNo,
      plate_no: deviceForm.plateNo,
      terminal_model: deviceForm.terminalModel,
      protocol_version: deviceForm.protocolVersion,
      manufacturer_id: deviceForm.manufacturerId
    })

    if (res.data.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      deviceDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.data.message || '操作失败')
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

    const url = isEdit.value ? `/api/operations/companies/${companyForm.id}` : '/api/operations/companies'
    const method = isEdit.value ? 'put' : 'post'

    const res = await request[method](url, {
      name: companyForm.name,
      short_name: companyForm.shortName,
      parent_id: companyForm.parentId,
      contact_name: companyForm.contactName,
      contact_phone: companyForm.contactPhone,
      address: companyForm.address,
      status: companyForm.status
    })

    if (res.data.code === 0) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
      companyDialogVisible.value = false
      loadData()
      loadCompanies()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

// 初始化
onMounted(() => {
  loadData()
  loadCompanies()
  loadDrivers()
})
</script>

<style lang="scss" scoped>
.operations-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

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

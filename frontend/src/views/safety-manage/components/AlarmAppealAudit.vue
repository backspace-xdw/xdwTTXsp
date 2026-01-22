<template>
  <div class="alarm-appeal-audit">
    <!-- 查询条件 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="企业">
          <el-tree-select
            v-model="searchForm.companyId"
            :data="companyTree"
            placeholder="请选择企业"
            check-strictly
            filterable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="车牌号">
          <el-input v-model="searchForm.plateNo" placeholder="请输入车牌号" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="审核状态">
          <el-select v-model="searchForm.auditStatus" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="0" />
            <el-option label="已通过" value="1" />
            <el-option label="已驳回" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="申诉时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>申诉审核列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Check" @click="handleBatchAudit">批量审核</el-button>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="appealNo" label="申诉编号" width="150" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="alarmTypeName" label="报警类型" width="100" align="center" />
        <el-table-column prop="alarmTime" label="报警时间" width="160" align="center" />
        <el-table-column prop="appealReason" label="申诉原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="appealTime" label="申诉时间" width="160" align="center" />
        <el-table-column prop="status" label="审核状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 0" type="success" link size="small" @click="handleAudit(row, true)">通过</el-button>
            <el-button v-if="row.status === 0" type="danger" link size="small" @click="handleAudit(row, false)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" :title="auditType ? '通过申诉' : '驳回申诉'" width="500px">
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="审核意见">
          <el-input
            v-model="auditForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="auditType ? '请输入审核意见（选填）' : '请输入驳回原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button :type="auditType ? 'success' : 'danger'" @click="submitAudit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Check, Download } from '@element-plus/icons-vue'

const searchForm = reactive({
  companyId: '',
  plateNo: '',
  auditStatus: '',
  dateRange: [] as string[]
})

const companyTree = ref([
  {
    value: '1',
    label: '总公司',
    children: [
      { value: '1-1', label: '分公司A' },
      { value: '1-2', label: '分公司B' }
    ]
  }
])

const tableData = ref<any[]>([])
const loading = ref(false)
const selectedRows = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const auditDialogVisible = ref(false)
const auditType = ref(true) // true: 通过, false: 驳回
const auditForm = reactive({
  remark: ''
})
const currentRow = ref<any>(null)

const getStatusTag = (status: number) => {
  const map: Record<number, string> = { 0: 'warning', 1: 'success', 2: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' }
  return map[status] || '未知'
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    plateNo: '',
    auditStatus: '',
    dateRange: []
  })
  handleSearch()
}

const fetchData = async () => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    tableData.value = [
      {
        id: 1,
        appealNo: 'AP202401200001',
        plateNo: '京A12345',
        companyName: '北京运输公司',
        alarmTypeName: '疲劳驾驶',
        alarmTime: '2024-01-20 10:30:25',
        appealReason: '驾驶员当时处于休息状态，设备误报',
        appealTime: '2024-01-20 11:00:00',
        status: 0
      },
      {
        id: 2,
        appealNo: 'AP202401200002',
        plateNo: '京B67890',
        companyName: '北京货运公司',
        alarmTypeName: '接打电话',
        alarmTime: '2024-01-20 09:15:30',
        appealReason: '使用蓝牙耳机，并非手持电话',
        appealTime: '2024-01-20 10:00:00',
        status: 0
      }
    ]
    pagination.total = 50
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = () => {
  fetchData()
}

const handleView = (row: any) => {
  ElMessage.info(`查看申诉详情: ${row.appealNo}`)
}

const handleAudit = (row: any, pass: boolean) => {
  currentRow.value = row
  auditType.value = pass
  auditForm.remark = ''
  auditDialogVisible.value = true
}

const handleBatchAudit = () => {
  const pendingRows = selectedRows.value.filter(r => r.status === 0)
  if (pendingRows.length === 0) {
    ElMessage.warning('请选择待审核的申诉记录')
    return
  }
  auditType.value = true
  auditForm.remark = ''
  auditDialogVisible.value = true
}

const submitAudit = () => {
  ElMessage.success(auditType.value ? '审核通过' : '已驳回')
  auditDialogVisible.value = false
  fetchData()
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.alarm-appeal-audit {
  .search-card {
    margin-bottom: 16px;
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

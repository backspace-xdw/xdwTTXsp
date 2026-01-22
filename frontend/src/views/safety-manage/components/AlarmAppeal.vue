<template>
  <div class="alarm-appeal">
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
        <el-form-item label="申诉状态">
          <el-select v-model="searchForm.appealStatus" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="0" />
            <el-option label="已通过" value="1" />
            <el-option label="已驳回" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="报警时间">
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
          <span>申诉列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Plus" @click="handleAdd">新建申诉</el-button>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="appealNo" label="申诉编号" width="150" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="alarmTypeName" label="报警类型" width="100" align="center" />
        <el-table-column prop="alarmTime" label="报警时间" width="160" align="center" />
        <el-table-column prop="appealReason" label="申诉原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="appealTime" label="申诉时间" width="160" align="center" />
        <el-table-column prop="status" label="申诉状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditRemark" label="审核意见" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 0" type="danger" link size="small" @click="handleCancel(row)">撤销</el-button>
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

    <!-- 新建申诉弹窗 -->
    <el-dialog v-model="appealDialogVisible" title="新建申诉" width="600px">
      <el-form ref="appealFormRef" :model="appealForm" :rules="appealRules" label-width="100px">
        <el-form-item label="选择报警" prop="alarmId">
          <el-select v-model="appealForm.alarmId" placeholder="请选择要申诉的报警" style="width: 100%">
            <el-option v-for="item in alarmList" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="申诉原因" prop="reason">
          <el-input
            v-model="appealForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入申诉原因"
          />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            action="/api/upload"
            :limit="5"
            :file-list="appealForm.files"
            list-type="picture-card"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appealDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAppeal">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Download } from '@element-plus/icons-vue'

const searchForm = reactive({
  companyId: '',
  plateNo: '',
  appealStatus: '',
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

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const appealDialogVisible = ref(false)
const appealFormRef = ref()
const appealForm = reactive({
  alarmId: '',
  reason: '',
  files: [] as any[]
})
const appealRules = {
  alarmId: [{ required: true, message: '请选择要申诉的报警', trigger: 'change' }],
  reason: [{ required: true, message: '请输入申诉原因', trigger: 'blur' }]
}
const alarmList = ref([
  { id: '1', label: '2024-01-20 10:30 疲劳驾驶 京A12345' },
  { id: '2', label: '2024-01-20 09:15 接打电话 京B67890' }
])

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
    appealStatus: '',
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
        status: 0,
        auditRemark: ''
      }
    ]
    pagination.total = 50
  } finally {
    loading.value = false
  }
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = () => {
  fetchData()
}

const handleAdd = () => {
  appealForm.alarmId = ''
  appealForm.reason = ''
  appealForm.files = []
  appealDialogVisible.value = true
}

const handleView = (row: any) => {
  ElMessage.info(`查看申诉详情: ${row.appealNo}`)
}

const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要撤销该申诉吗？', '提示', { type: 'warning' })
    ElMessage.success('撤销成功')
    fetchData()
  } catch {
    // 取消
  }
}

const submitAppeal = async () => {
  try {
    await appealFormRef.value?.validate()
    ElMessage.success('申诉提交成功')
    appealDialogVisible.value = false
    fetchData()
  } catch {
    // 验证失败
  }
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.alarm-appeal {
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

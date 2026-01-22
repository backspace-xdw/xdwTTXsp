<template>
  <div class="ticket-handle">
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
        <el-form-item label="罚单编号">
          <el-input v-model="searchForm.ticketNo" placeholder="请输入罚单编号" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="0" />
            <el-option label="处理中" value="1" />
            <el-option label="已完成" value="2" />
            <el-option label="已取消" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="违章时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
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
          <span>罚单列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Plus" @click="handleAdd">新增罚单</el-button>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="ticketNo" label="罚单编号" width="150" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="driverName" label="驾驶员" width="80" align="center" />
        <el-table-column prop="violationType" label="违章类型" width="120" align="center" />
        <el-table-column prop="violationTime" label="违章时间" width="160" align="center" />
        <el-table-column prop="location" label="违章地点" min-width="150" show-overflow-tooltip />
        <el-table-column prop="fine" label="罚款(元)" width="90" align="center">
          <template #default="{ row }">
            <span class="fine-amount">¥{{ row.fine }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="扣分" width="70" align="center">
          <template #default="{ row }">
            <el-tag type="danger" v-if="row.points > 0">-{{ row.points }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 0" type="success" link size="small" @click="handleProcess(row)">处理</el-button>
            <el-button v-if="row.status === 0" type="danger" link size="small" @click="handleCancel(row)">取消</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑罚单' : '新增罚单'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="车牌号" prop="plateNo">
          <el-input v-model="form.plateNo" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="驾驶员" prop="driverName">
          <el-input v-model="form.driverName" placeholder="请输入驾驶员姓名" />
        </el-form-item>
        <el-form-item label="违章类型" prop="violationType">
          <el-select v-model="form.violationType" placeholder="请选择" style="width: 100%">
            <el-option label="超速" value="超速" />
            <el-option label="闯红灯" value="闯红灯" />
            <el-option label="违章停车" value="违章停车" />
            <el-option label="不系安全带" value="不系安全带" />
            <el-option label="疲劳驾驶" value="疲劳驾驶" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="违章时间" prop="violationTime">
          <el-date-picker
            v-model="form.violationTime"
            type="datetime"
            placeholder="请选择违章时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="违章地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入违章地点" />
        </el-form-item>
        <el-form-item label="罚款金额" prop="fine">
          <el-input-number v-model="form.fine" :min="0" :step="50" style="width: 100%" />
        </el-form-item>
        <el-form-item label="扣分" prop="points">
          <el-input-number v-model="form.points" :min="0" :max="12" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
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
  ticketNo: '',
  status: '',
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

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({
  plateNo: '',
  driverName: '',
  violationType: '',
  violationTime: '',
  location: '',
  fine: 200,
  points: 0,
  remark: ''
})
const rules = {
  plateNo: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
  violationType: [{ required: true, message: '请选择违章类型', trigger: 'change' }],
  violationTime: [{ required: true, message: '请选择违章时间', trigger: 'change' }],
  fine: [{ required: true, message: '请输入罚款金额', trigger: 'blur' }]
}

const getStatusTag = (status: number) => {
  const map: Record<number, string> = { 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }
  return map[status] || 'info'
}

const getStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '已取消' }
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
    ticketNo: '',
    status: '',
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
        ticketNo: 'TK202401200001',
        plateNo: '京A12345',
        companyName: '北京运输公司',
        driverName: '张三',
        violationType: '超速',
        violationTime: '2024-01-20 10:30:25',
        location: '京藏高速120公里处',
        fine: 200,
        points: 3,
        status: 0
      },
      {
        id: 2,
        ticketNo: 'TK202401200002',
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        violationType: '疲劳驾驶',
        violationTime: '2024-01-20 09:15:30',
        location: '京沪高速200公里处',
        fine: 200,
        points: 6,
        status: 2
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
  isEdit.value = false
  Object.assign(form, {
    plateNo: '',
    driverName: '',
    violationType: '',
    violationTime: '',
    location: '',
    fine: 200,
    points: 0,
    remark: ''
  })
  dialogVisible.value = true
}

const handleView = (row: any) => {
  ElMessage.info(`查看罚单详情: ${row.ticketNo}`)
}

const handleProcess = (row: any) => {
  ElMessage.info(`处理罚单: ${row.ticketNo}`)
}

const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该罚单吗？', '提示', { type: 'warning' })
    ElMessage.success('取消成功')
    fetchData()
  } catch {
    // 取消
  }
}

const submitForm = async () => {
  try {
    await formRef.value?.validate()
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
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
.ticket-handle {
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

    .fine-amount {
      color: #f56c6c;
      font-weight: bold;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

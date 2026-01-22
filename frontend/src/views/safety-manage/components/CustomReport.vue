<template>
  <div class="custom-report">
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
        <el-form-item label="报告类型">
          <el-select v-model="searchForm.reportType" placeholder="请选择" style="width: 120px">
            <el-option label="日报表" value="daily" />
            <el-option label="周报表" value="weekly" />
            <el-option label="月报表" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="已发送" value="sent" />
            <el-option label="待发送" value="pending" />
            <el-option label="发送失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="生成时间">
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

    <!-- 操作栏 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>定制报告列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Plus" @click="handleAddTemplate">新建模板</el-button>
            <el-button :icon="Setting" @click="handleConfigSubscribe">订阅配置</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="reportNo" label="报告编号" width="160" align="center" />
        <el-table-column prop="reportName" label="报告名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="companyName" label="企业名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="reportType" label="报告类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReportTypeTag(row.reportTypeCode)">{{ row.reportType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reportDate" label="报告日期" width="120" align="center" />
        <el-table-column prop="createTime" label="生成时间" width="160" align="center" />
        <el-table-column prop="sendStatus" label="发送状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSendStatusTag(row.sendStatusCode)">{{ row.sendStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receivers" label="接收人" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
            <el-button type="primary" link size="small" @click="handleDownload(row)">下载</el-button>
            <el-button type="primary" link size="small" @click="handleResend(row)">重发</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新建模板弹窗 -->
    <el-dialog v-model="templateDialogVisible" title="新建报告模板" width="600px">
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="报告类型" prop="type">
          <el-select v-model="templateForm.type" placeholder="请选择" style="width: 100%">
            <el-option label="日报表" value="daily" />
            <el-option label="周报表" value="weekly" />
            <el-option label="月报表" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用企业" prop="companyIds">
          <el-tree-select
            v-model="templateForm.companyIds"
            :data="companyTree"
            placeholder="请选择企业"
            multiple
            check-strictly
            filterable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="报告内容" prop="sections">
          <el-checkbox-group v-model="templateForm.sections">
            <el-checkbox value="basic">基本信息</el-checkbox>
            <el-checkbox value="alarm">报警统计</el-checkbox>
            <el-checkbox value="vehicle">车辆情况</el-checkbox>
            <el-checkbox value="driver">驾驶员情况</el-checkbox>
            <el-checkbox value="score">安全评分</el-checkbox>
            <el-checkbox value="suggestion">改进建议</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="发送时间" prop="sendTime">
          <el-time-picker v-model="templateForm.sendTime" placeholder="请选择发送时间" format="HH:mm" />
        </el-form-item>
        <el-form-item label="接收邮箱" prop="emails">
          <el-input
            v-model="templateForm.emails"
            type="textarea"
            :rows="3"
            placeholder="请输入接收邮箱，多个邮箱用逗号分隔"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 订阅配置弹窗 -->
    <el-dialog v-model="subscribeDialogVisible" title="订阅配置" width="700px">
      <el-table :data="subscribeData" border>
        <el-table-column prop="companyName" label="企业名称" min-width="150" />
        <el-table-column prop="reportType" label="报告类型" width="100" />
        <el-table-column prop="sendTime" label="发送时间" width="100" align="center" />
        <el-table-column prop="enabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEditSubscribe(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteSubscribe(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Setting } from '@element-plus/icons-vue'

const searchForm = reactive({
  companyId: '',
  reportType: 'daily',
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

const templateDialogVisible = ref(false)
const templateFormRef = ref()
const templateForm = reactive({
  name: '',
  type: '',
  companyIds: [] as string[],
  sections: [] as string[],
  sendTime: '',
  emails: ''
})
const templateRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择报告类型', trigger: 'change' }],
  companyIds: [{ required: true, message: '请选择适用企业', trigger: 'change' }],
  sections: [{ required: true, message: '请选择报告内容', trigger: 'change' }]
}

const subscribeDialogVisible = ref(false)
const subscribeData = ref([
  { id: 1, companyName: '北京运输公司', reportType: '日报', sendTime: '08:00', enabled: true },
  { id: 2, companyName: '北京货运公司', reportType: '周报', sendTime: '08:00', enabled: true },
  { id: 3, companyName: '北京物流公司', reportType: '月报', sendTime: '08:00', enabled: false }
])

const getReportTypeTag = (type: string) => {
  const map: Record<string, string> = {
    daily: 'primary',
    weekly: 'success',
    monthly: 'warning'
  }
  return map[type] || ''
}

const getSendStatusTag = (status: string) => {
  const map: Record<string, string> = {
    sent: 'success',
    pending: 'warning',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    reportType: 'daily',
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
        reportNo: 'CR202401200001',
        reportName: '北京运输公司定制日报表',
        companyName: '北京运输公司',
        reportTypeCode: 'daily',
        reportType: '日报表',
        reportDate: '2024-01-20',
        createTime: '2024-01-20 08:00:00',
        sendStatusCode: 'sent',
        sendStatus: '已发送',
        receivers: 'admin@company.com, manager@company.com'
      },
      {
        id: 2,
        reportNo: 'CR202401190001',
        reportName: '北京货运公司定制周报表',
        companyName: '北京货运公司',
        reportTypeCode: 'weekly',
        reportType: '周报表',
        reportDate: '2024-01-19',
        createTime: '2024-01-19 08:00:00',
        sendStatusCode: 'sent',
        sendStatus: '已发送',
        receivers: 'admin@freight.com'
      },
      {
        id: 3,
        reportNo: 'CR202401180001',
        reportName: '北京物流公司定制月报表',
        companyName: '北京物流公司',
        reportTypeCode: 'monthly',
        reportType: '月报表',
        reportDate: '2024-01-18',
        createTime: '2024-01-18 08:00:00',
        sendStatusCode: 'failed',
        sendStatus: '发送失败',
        receivers: 'admin@logistics.com'
      }
    ]
    pagination.total = 100
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

const handleAddTemplate = () => {
  Object.assign(templateForm, {
    name: '',
    type: '',
    companyIds: [],
    sections: [],
    sendTime: '',
    emails: ''
  })
  templateDialogVisible.value = true
}

const submitTemplate = async () => {
  try {
    await templateFormRef.value?.validate()
    ElMessage.success('模板创建成功')
    templateDialogVisible.value = false
  } catch {
    // 验证失败
  }
}

const handleConfigSubscribe = () => {
  subscribeDialogVisible.value = true
}

const handleEditSubscribe = (row: any) => {
  ElMessage.info(`编辑订阅: ${row.companyName}`)
}

const handleDeleteSubscribe = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该订阅配置吗？', '提示', { type: 'warning' })
    subscribeData.value = subscribeData.value.filter(item => item.id !== row.id)
    ElMessage.success('删除成功')
  } catch {
    // 取消
  }
}

const handlePreview = (row: any) => {
  ElMessage.info(`预览报告: ${row.reportNo}`)
}

const handleDownload = (row: any) => {
  ElMessage.info(`下载报告: ${row.reportNo}`)
}

const handleResend = (row: any) => {
  ElMessage.success(`重新发送: ${row.reportNo}`)
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该报告吗？', '提示', { type: 'warning' })
    ElMessage.success('删除成功')
    fetchData()
  } catch {
    // 取消
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.custom-report {
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

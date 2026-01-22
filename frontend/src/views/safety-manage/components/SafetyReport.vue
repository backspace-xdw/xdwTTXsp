<template>
  <div class="safety-report">
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
          <el-select v-model="searchForm.reportType" placeholder="请选择" style="width: 150px">
            <el-option label="联网联控报告" value="connect" />
            <el-option label="企业主动安全报告" value="companySafety" />
            <el-option label="车辆主动安全报告" value="vehicleSafety" />
            <el-option label="企业综合报告" value="companyAll" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告周期">
          <el-select v-model="searchForm.period" placeholder="请选择" style="width: 120px">
            <el-option label="日报" value="day" />
            <el-option label="周报" value="week" />
            <el-option label="月报" value="month" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告日期">
          <el-date-picker
            v-model="searchForm.reportDate"
            :type="searchForm.period === 'day' ? 'date' : searchForm.period === 'week' ? 'week' : 'month'"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            style="width: 200px"
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
          <span>安全报告列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="DocumentAdd" @click="handleGenerate">生成报告</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="reportNo" label="报告编号" width="180" align="center" />
        <el-table-column prop="reportName" label="报告名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="companyName" label="企业名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="reportType" label="报告类型" width="140" align="center">
          <template #default="{ row }">
            <el-tag>{{ row.reportType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="period" label="报告周期" width="100" align="center" />
        <el-table-column prop="reportDate" label="报告日期" width="120" align="center" />
        <el-table-column prop="createTime" label="生成时间" width="160" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.statusCode)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
            <el-button type="primary" link size="small" @click="handleDownload(row)">下载</el-button>
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

    <!-- 生成报告弹窗 -->
    <el-dialog v-model="generateDialogVisible" title="生成安全报告" width="500px">
      <el-form ref="generateFormRef" :model="generateForm" :rules="generateRules" label-width="100px">
        <el-form-item label="企业" prop="companyId">
          <el-tree-select
            v-model="generateForm.companyId"
            :data="companyTree"
            placeholder="请选择企业"
            check-strictly
            filterable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="报告类型" prop="reportType">
          <el-select v-model="generateForm.reportType" placeholder="请选择" style="width: 100%">
            <el-option label="联网联控报告" value="connect" />
            <el-option label="企业主动安全报告" value="companySafety" />
            <el-option label="车辆主动安全报告" value="vehicleSafety" />
            <el-option label="企业综合报告" value="companyAll" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告周期" prop="period">
          <el-select v-model="generateForm.period" placeholder="请选择" style="width: 100%">
            <el-option label="日报" value="day" />
            <el-option label="周报" value="week" />
            <el-option label="月报" value="month" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告日期" prop="reportDate">
          <el-date-picker
            v-model="generateForm.reportDate"
            :type="generateForm.period === 'day' ? 'date' : generateForm.period === 'week' ? 'week' : 'month'"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewDialogVisible" :title="currentReport?.reportName" width="900px" top="5vh">
      <div class="report-preview">
        <div class="report-header">
          <h2>{{ currentReport?.reportName }}</h2>
          <p>报告日期: {{ currentReport?.reportDate }}</p>
          <p>企业: {{ currentReport?.companyName }}</p>
        </div>

        <el-divider />

        <div class="report-section">
          <h3>一、基本信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="车辆总数">120</el-descriptions-item>
            <el-descriptions-item label="驾驶员总数">150</el-descriptions-item>
            <el-descriptions-item label="在线率">95.8%</el-descriptions-item>
            <el-descriptions-item label="设备完好率">98.2%</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="report-section">
          <h3>二、报警统计</h3>
          <el-table :data="reportAlarmData" border size="small">
            <el-table-column prop="type" label="报警类型" />
            <el-table-column prop="count" label="报警次数" align="center" />
            <el-table-column prop="handleCount" label="已处理" align="center" />
            <el-table-column prop="rate" label="处理率" align="center" />
          </el-table>
        </div>

        <div class="report-section">
          <h3>三、安全评分</h3>
          <div class="score-display">
            <el-progress type="dashboard" :percentage="85" :color="getScoreColor(85)">
              <template #default>
                <span class="score-value">85</span>
                <span class="score-label">安全评分</span>
              </template>
            </el-progress>
          </div>
        </div>

        <div class="report-section">
          <h3>四、改进建议</h3>
          <ul class="suggestion-list">
            <li>加强驾驶员疲劳驾驶监测，建议增加休息提醒频率</li>
            <li>对高频报警车辆进行重点关注，安排专项检查</li>
            <li>定期开展安全培训，提升驾驶员安全意识</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, DocumentAdd } from '@element-plus/icons-vue'

const searchForm = reactive({
  companyId: '',
  reportType: 'connect',
  period: 'day',
  reportDate: ''
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

const generateDialogVisible = ref(false)
const generateFormRef = ref()
const generateForm = reactive({
  companyId: '',
  reportType: '',
  period: 'day',
  reportDate: ''
})
const generateRules = {
  companyId: [{ required: true, message: '请选择企业', trigger: 'change' }],
  reportType: [{ required: true, message: '请选择报告类型', trigger: 'change' }],
  period: [{ required: true, message: '请选择报告周期', trigger: 'change' }],
  reportDate: [{ required: true, message: '请选择报告日期', trigger: 'change' }]
}

const previewDialogVisible = ref(false)
const currentReport = ref<any>(null)

const reportAlarmData = [
  { type: '疲劳驾驶', count: 35, handleCount: 32, rate: '91.4%' },
  { type: '接打电话', count: 28, handleCount: 26, rate: '92.8%' },
  { type: '分神驾驶', count: 22, handleCount: 20, rate: '90.9%' },
  { type: '前向碰撞', count: 18, handleCount: 18, rate: '100%' },
  { type: '车道偏离', count: 20, handleCount: 19, rate: '95%' }
]

const getStatusTag = (status: string) => {
  const map: Record<string, string> = {
    generated: 'success',
    generating: 'warning',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    reportType: 'connect',
    period: 'day',
    reportDate: ''
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
        reportNo: 'RPT202401200001',
        reportName: '北京运输公司联网联控日报',
        companyName: '北京运输公司',
        reportType: '联网联控报告',
        period: '日报',
        reportDate: '2024-01-20',
        createTime: '2024-01-20 08:00:00',
        statusCode: 'generated',
        status: '已生成'
      },
      {
        id: 2,
        reportNo: 'RPT202401190001',
        reportName: '北京运输公司企业主动安全周报',
        companyName: '北京运输公司',
        reportType: '企业主动安全报告',
        period: '周报',
        reportDate: '2024-01-19',
        createTime: '2024-01-19 08:00:00',
        statusCode: 'generated',
        status: '已生成'
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

const handleGenerate = () => {
  Object.assign(generateForm, {
    companyId: '',
    reportType: '',
    period: 'day',
    reportDate: ''
  })
  generateDialogVisible.value = true
}

const submitGenerate = async () => {
  try {
    await generateFormRef.value?.validate()
    ElMessage.success('报告生成任务已提交')
    generateDialogVisible.value = false
    fetchData()
  } catch {
    // 验证失败
  }
}

const handlePreview = (row: any) => {
  currentReport.value = row
  previewDialogVisible.value = true
}

const handleDownload = (row: any) => {
  ElMessage.info(`下载报告: ${row.reportNo}`)
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
.safety-report {
  .search-card {
    margin-bottom: 16px;
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .report-preview {
    max-height: 70vh;
    overflow-y: auto;

    .report-header {
      text-align: center;

      h2 {
        margin-bottom: 8px;
      }

      p {
        color: #666;
        margin: 4px 0;
      }
    }

    .report-section {
      margin-bottom: 24px;

      h3 {
        margin-bottom: 12px;
        color: #333;
      }
    }

    .score-display {
      display: flex;
      justify-content: center;
      padding: 20px;

      .score-value {
        font-size: 32px;
        font-weight: bold;
        display: block;
      }

      .score-label {
        font-size: 14px;
        color: #666;
        display: block;
      }
    }

    .suggestion-list {
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        line-height: 1.6;
        color: #666;
      }
    }
  }
}
</style>

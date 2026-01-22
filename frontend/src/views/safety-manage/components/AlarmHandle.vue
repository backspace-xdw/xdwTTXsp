<template>
  <div class="alarm-handle">
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
        <el-form-item label="报警类型">
          <el-select v-model="searchForm.alarmType" placeholder="请选择" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="疲劳驾驶" value="fatigue" />
            <el-option label="接打电话" value="phone" />
            <el-option label="抽烟" value="smoking" />
            <el-option label="分神驾驶" value="distraction" />
            <el-option label="驾驶员异常" value="driverAbnormal" />
            <el-option label="前向碰撞" value="forwardCollision" />
            <el-option label="车道偏离" value="laneDeparture" />
            <el-option label="车距过近" value="tooClose" />
          </el-select>
        </el-form-item>
        <el-form-item label="报警级别">
          <el-select v-model="searchForm.alarmLevel" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="一级报警" value="1" />
            <el-option label="二级报警" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="searchForm.handleStatus" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="未处理" value="0" />
            <el-option label="已处理" value="1" />
            <el-option label="已忽略" value="2" />
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

    <!-- 操作栏 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>报警列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Check" @click="handleBatchProcess">批量处理</el-button>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="driverName" label="驾驶员" width="80" align="center" />
        <el-table-column prop="alarmType" label="报警类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getAlarmTypeTag(row.alarmType)">{{ row.alarmTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarmLevel" label="报警级别" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.alarmLevel === 1 ? 'danger' : 'warning'">
              {{ row.alarmLevel === 1 ? '一级' : '二级' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarmTime" label="报警时间" width="160" align="center" />
        <el-table-column prop="speed" label="速度(km/h)" width="90" align="center" />
        <el-table-column prop="location" label="位置" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="处理状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button type="primary" link size="small" @click="handleProcess(row)">处理</el-button>
            <el-button type="primary" link size="small" @click="handlePlayVideo(row)">视频</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 处理弹窗 -->
    <el-dialog v-model="processDialogVisible" title="报警处理" width="500px">
      <el-form :model="processForm" label-width="100px">
        <el-form-item label="处理方式">
          <el-radio-group v-model="processForm.handleType">
            <el-radio value="call">电话督办</el-radio>
            <el-radio value="message">消息通知</el-radio>
            <el-radio value="ignore">忽略</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理意见">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入处理意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProcess">确定</el-button>
      </template>
    </el-dialog>

    <!-- 视频播放弹窗 -->
    <el-dialog v-model="videoDialogVisible" title="报警视频" width="800px">
      <div class="video-container">
        <video v-if="currentVideoUrl" :src="currentVideoUrl" controls autoplay class="alarm-video"></video>
        <el-empty v-else description="暂无视频" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Check, Download } from '@element-plus/icons-vue'

// 查询表单
const searchForm = reactive({
  companyId: '',
  plateNo: '',
  alarmType: '',
  alarmLevel: '',
  handleStatus: '',
  dateRange: [] as string[]
})

// 企业树数据
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

// 表格数据
const tableData = ref<any[]>([])
const loading = ref(false)
const selectedRows = ref<any[]>([])
const tableRef = ref()

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 处理弹窗
const processDialogVisible = ref(false)
const processForm = reactive({
  handleType: 'call',
  remark: ''
})

// 视频弹窗
const videoDialogVisible = ref(false)
const currentVideoUrl = ref('')

// 获取报警类型标签颜色
const getAlarmTypeTag = (type: string) => {
  const map: Record<string, string> = {
    fatigue: 'danger',
    phone: 'warning',
    smoking: 'warning',
    distraction: 'warning',
    driverAbnormal: 'danger',
    forwardCollision: 'danger',
    laneDeparture: 'warning',
    tooClose: 'warning'
  }
  return map[type] || 'info'
}

// 获取状态标签
const getStatusTag = (status: number) => {
  const map: Record<number, string> = {
    0: 'danger',
    1: 'success',
    2: 'info'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: number) => {
  const map: Record<number, string> = {
    0: '未处理',
    1: '已处理',
    2: '已忽略'
  }
  return map[status] || '未知'
}

// 查询
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    plateNo: '',
    alarmType: '',
    alarmLevel: '',
    handleStatus: '',
    dateRange: []
  })
  handleSearch()
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    tableData.value = [
      {
        id: 1,
        plateNo: '京A12345',
        companyName: '北京运输公司',
        driverName: '张三',
        alarmType: 'fatigue',
        alarmTypeName: '疲劳驾驶',
        alarmLevel: 1,
        alarmTime: '2024-01-20 10:30:25',
        speed: 85,
        location: '北京市朝阳区建国路100号',
        status: 0
      },
      {
        id: 2,
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        alarmType: 'phone',
        alarmTypeName: '接打电话',
        alarmLevel: 2,
        alarmTime: '2024-01-20 09:15:30',
        speed: 65,
        location: '北京市海淀区中关村大街50号',
        status: 1
      }
    ]
    pagination.total = 100
  } finally {
    loading.value = false
  }
}

// 选择变化
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 分页变化
const handleSizeChange = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = () => {
  fetchData()
}

// 查看详情
const handleView = (row: any) => {
  ElMessage.info(`查看报警详情: ${row.plateNo}`)
}

// 处理报警
const handleProcess = (row: any) => {
  processForm.handleType = 'call'
  processForm.remark = ''
  processDialogVisible.value = true
}

// 批量处理
const handleBatchProcess = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要处理的报警记录')
    return
  }
  processDialogVisible.value = true
}

// 提交处理
const submitProcess = () => {
  ElMessage.success('处理成功')
  processDialogVisible.value = false
  fetchData()
}

// 播放视频
const handlePlayVideo = (row: any) => {
  currentVideoUrl.value = ''
  videoDialogVisible.value = true
}

// 导出
const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.alarm-handle {
  .search-card {
    margin-bottom: 16px;

    .search-form {
      .el-form-item {
        margin-bottom: 12px;
      }
    }
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

  .video-container {
    width: 100%;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;

    .alarm-video {
      width: 100%;
      max-height: 450px;
    }
  }
}
</style>

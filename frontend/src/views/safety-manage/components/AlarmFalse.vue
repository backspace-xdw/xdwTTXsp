<template>
  <div class="alarm-false">
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
          </el-select>
        </el-form-item>
        <el-form-item label="误报原因">
          <el-select v-model="searchForm.falseReason" placeholder="请选择" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="设备故障" value="device" />
            <el-option label="算法误判" value="algorithm" />
            <el-option label="环境干扰" value="environment" />
            <el-option label="其他" value="other" />
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

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">误报总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value device">{{ stats.device }}</div>
          <div class="stat-label">设备故障</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value algorithm">{{ stats.algorithm }}</div>
          <div class="stat-label">算法误判</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value environment">{{ stats.environment }}</div>
          <div class="stat-label">环境干扰</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>误报记录</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="alarmTypeName" label="报警类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag>{{ row.alarmTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarmTime" label="报警时间" width="160" align="center" />
        <el-table-column prop="falseReason" label="误报原因" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getFalseReasonTag(row.falseReasonCode)">{{ row.falseReason }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="confirmTime" label="确认时间" width="160" align="center" />
        <el-table-column prop="confirmUser" label="确认人" width="100" align="center" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'

const searchForm = reactive({
  companyId: '',
  plateNo: '',
  alarmType: '',
  falseReason: '',
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

const stats = reactive({
  total: 156,
  device: 42,
  algorithm: 68,
  environment: 46
})

const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const getFalseReasonTag = (code: string) => {
  const map: Record<string, string> = {
    device: 'danger',
    algorithm: 'warning',
    environment: 'info',
    other: ''
  }
  return map[code] || ''
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    plateNo: '',
    alarmType: '',
    falseReason: '',
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
        plateNo: '京A12345',
        companyName: '北京运输公司',
        alarmTypeName: '疲劳驾驶',
        alarmTime: '2024-01-20 10:30:25',
        falseReasonCode: 'algorithm',
        falseReason: '算法误判',
        description: '驾驶员佩戴墨镜，被误识别为闭眼',
        confirmTime: '2024-01-20 11:00:00',
        confirmUser: '管理员'
      },
      {
        id: 2,
        plateNo: '京B67890',
        companyName: '北京货运公司',
        alarmTypeName: '接打电话',
        alarmTime: '2024-01-20 09:15:30',
        falseReasonCode: 'environment',
        falseReason: '环境干扰',
        description: '阳光反射导致误判',
        confirmTime: '2024-01-20 10:00:00',
        confirmUser: '管理员'
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

const handleView = (row: any) => {
  ElMessage.info(`查看误报详情: ${row.plateNo}`)
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.alarm-false {
  .search-card {
    margin-bottom: 16px;
  }

  .stat-row {
    margin-bottom: 16px;

    .stat-card {
      text-align: center;
      padding: 20px;

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #409eff;

        &.device {
          color: #f56c6c;
        }

        &.algorithm {
          color: #e6a23c;
        }

        &.environment {
          color: #909399;
        }
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-top: 8px;
      }
    }
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
}
</style>

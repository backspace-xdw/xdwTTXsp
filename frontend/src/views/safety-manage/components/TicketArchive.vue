<template>
  <div class="ticket-archive">
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
        <el-form-item label="驾驶员">
          <el-input v-model="searchForm.driverName" placeholder="请输入驾驶员" clearable style="width: 150px" />
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

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">罚单总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value fine">¥{{ stats.totalFine }}</div>
          <div class="stat-label">罚款总额</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value points">{{ stats.totalPoints }}</div>
          <div class="stat-label">扣分总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value vehicles">{{ stats.vehicles }}</div>
          <div class="stat-label">涉及车辆</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>罚单档案</span>
          <div class="header-actions">
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
        <el-table-column prop="handleTime" label="处理时间" width="160" align="center" />
        <el-table-column prop="handler" label="处理人" width="100" align="center" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
            <el-button type="primary" link size="small" @click="handlePrint(row)">打印</el-button>
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
  driverName: '',
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
  total: 256,
  totalFine: 51200,
  totalPoints: 512,
  vehicles: 85
})

const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    plateNo: '',
    driverName: '',
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
        ticketNo: 'TK202401150001',
        plateNo: '京A12345',
        companyName: '北京运输公司',
        driverName: '张三',
        violationType: '超速',
        violationTime: '2024-01-15 10:30:25',
        location: '京藏高速120公里处',
        fine: 200,
        points: 3,
        handleTime: '2024-01-18 14:00:00',
        handler: '管理员'
      },
      {
        id: 2,
        ticketNo: 'TK202401100002',
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        violationType: '疲劳驾驶',
        violationTime: '2024-01-10 09:15:30',
        location: '京沪高速200公里处',
        fine: 200,
        points: 6,
        handleTime: '2024-01-12 10:00:00',
        handler: '管理员'
      }
    ]
    pagination.total = 256
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
  ElMessage.info(`查看罚单详情: ${row.ticketNo}`)
}

const handlePrint = (row: any) => {
  ElMessage.info(`打印罚单: ${row.ticketNo}`)
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.ticket-archive {
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

        &.fine {
          color: #f56c6c;
        }

        &.points {
          color: #e6a23c;
        }

        &.vehicles {
          color: #67c23a;
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

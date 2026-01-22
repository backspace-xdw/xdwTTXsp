<template>
  <div class="driver-identify">
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
        <el-form-item label="识别结果">
          <el-select v-model="searchForm.result" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="识别成功" value="success" />
            <el-option label="识别失败" value="fail" />
            <el-option label="未注册" value="unregistered" />
          </el-select>
        </el-form-item>
        <el-form-item label="识别时间">
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
          <div class="stat-label">识别总次数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value success">{{ stats.success }}</div>
          <div class="stat-label">识别成功</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value fail">{{ stats.fail }}</div>
          <div class="stat-label">识别失败</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value rate">{{ stats.successRate }}%</div>
          <div class="stat-label">识别成功率</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>身份识别记录</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="driverName" label="驾驶员" width="80" align="center" />
        <el-table-column prop="idCard" label="身份证号" width="180" align="center" />
        <el-table-column prop="identifyTime" label="识别时间" width="160" align="center" />
        <el-table-column prop="identifyType" label="识别方式" width="100" align="center">
          <template #default="{ row }">
            <el-tag>{{ row.identifyType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="识别结果" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getResultTag(row.resultCode)">{{ row.result }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="similarity" label="相似度" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'high-similarity': row.similarity >= 80 }">{{ row.similarity }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewImage(row)">查看照片</el-button>
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
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

    <!-- 照片查看弹窗 -->
    <el-dialog v-model="imageDialogVisible" title="识别照片对比" width="700px">
      <div class="image-compare">
        <div class="image-item">
          <div class="image-label">抓拍照片</div>
          <el-image
            :src="currentImages.capture"
            fit="contain"
            class="compare-image"
          >
            <template #error>
              <div class="image-placeholder">暂无照片</div>
            </template>
          </el-image>
        </div>
        <div class="image-item">
          <div class="image-label">注册照片</div>
          <el-image
            :src="currentImages.register"
            fit="contain"
            class="compare-image"
          >
            <template #error>
              <div class="image-placeholder">暂无照片</div>
            </template>
          </el-image>
        </div>
      </div>
    </el-dialog>
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
  result: '',
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
  total: 1256,
  success: 1180,
  fail: 76,
  successRate: 93.9
})

const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const imageDialogVisible = ref(false)
const currentImages = reactive({
  capture: '',
  register: ''
})

const getResultTag = (code: string) => {
  const map: Record<string, string> = {
    success: 'success',
    fail: 'danger',
    unregistered: 'warning'
  }
  return map[code] || 'info'
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    companyId: '',
    plateNo: '',
    driverName: '',
    result: '',
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
        driverName: '张三',
        idCard: '110101199001011234',
        identifyTime: '2024-01-20 08:30:25',
        identifyType: '人脸识别',
        resultCode: 'success',
        result: '识别成功',
        similarity: 95.8
      },
      {
        id: 2,
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        idCard: '110101199002022345',
        identifyTime: '2024-01-20 07:15:30',
        identifyType: '人脸识别',
        resultCode: 'fail',
        result: '识别失败',
        similarity: 65.2
      },
      {
        id: 3,
        plateNo: '京C11111',
        companyName: '北京物流公司',
        driverName: '未知',
        idCard: '-',
        identifyTime: '2024-01-20 06:45:00',
        identifyType: '人脸识别',
        resultCode: 'unregistered',
        result: '未注册',
        similarity: 0
      }
    ]
    pagination.total = 1256
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

const handleViewImage = (row: any) => {
  currentImages.capture = ''
  currentImages.register = ''
  imageDialogVisible.value = true
}

const handleView = (row: any) => {
  ElMessage.info(`查看详情: ${row.driverName}`)
}

const handleExport = () => {
  ElMessage.info('正在导出...')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.driver-identify {
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

        &.success {
          color: #67c23a;
        }

        &.fail {
          color: #f56c6c;
        }

        &.rate {
          color: #e6a23c;
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

    .high-similarity {
      color: #67c23a;
      font-weight: bold;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .image-compare {
    display: flex;
    gap: 24px;
    justify-content: center;

    .image-item {
      text-align: center;

      .image-label {
        margin-bottom: 12px;
        font-weight: 500;
        color: #333;
      }

      .compare-image {
        width: 280px;
        height: 350px;
        border: 1px solid #e8e8e8;
        border-radius: 4px;
      }

      .image-placeholder {
        width: 280px;
        height: 350px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        color: #999;
      }
    }
  }
}
</style>

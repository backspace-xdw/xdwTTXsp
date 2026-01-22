<template>
  <div class="driver-evidence">
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
        <el-form-item label="证据类型">
          <el-select v-model="searchForm.evidenceType" placeholder="请选择" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="登录照片" value="login" />
            <el-option label="换班照片" value="shift" />
            <el-option label="定时抓拍" value="scheduled" />
          </el-select>
        </el-form-item>
        <el-form-item label="抓拍时间">
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
          <span>身份识别证据</span>
          <div class="header-actions">
            <el-button :icon="Download" @click="handleBatchDownload">批量下载</el-button>
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
        <el-table-column prop="plateNo" label="车牌号" width="100" align="center" />
        <el-table-column prop="companyName" label="所属企业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="driverName" label="驾驶员" width="80" align="center" />
        <el-table-column prop="evidenceType" label="证据类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getEvidenceTypeTag(row.evidenceTypeCode)">{{ row.evidenceType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="captureTime" label="抓拍时间" width="160" align="center" />
        <el-table-column prop="thumbnail" label="缩略图" width="120" align="center">
          <template #default="{ row }">
            <el-image
              :src="row.thumbnail"
              :preview-src-list="[row.imageUrl]"
              fit="cover"
              class="thumbnail-image"
            >
              <template #error>
                <div class="image-error">无图片</div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button type="primary" link size="small" @click="handleDownload(row)">下载</el-button>
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

    <!-- 查看弹窗 -->
    <el-dialog v-model="viewDialogVisible" title="证据详情" width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="车牌号">{{ currentRow?.plateNo }}</el-descriptions-item>
        <el-descriptions-item label="驾驶员">{{ currentRow?.driverName }}</el-descriptions-item>
        <el-descriptions-item label="企业">{{ currentRow?.companyName }}</el-descriptions-item>
        <el-descriptions-item label="证据类型">{{ currentRow?.evidenceType }}</el-descriptions-item>
        <el-descriptions-item label="抓拍时间">{{ currentRow?.captureTime }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ currentRow?.location }}</el-descriptions-item>
      </el-descriptions>
      <div class="evidence-image-container">
        <el-image
          :src="currentRow?.imageUrl"
          fit="contain"
          class="evidence-image"
        >
          <template #error>
            <div class="image-error-large">暂无图片</div>
          </template>
        </el-image>
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
  evidenceType: '',
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

const viewDialogVisible = ref(false)
const currentRow = ref<any>(null)

const getEvidenceTypeTag = (code: string) => {
  const map: Record<string, string> = {
    login: 'success',
    shift: 'warning',
    scheduled: 'primary'
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
    driverName: '',
    evidenceType: '',
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
        evidenceTypeCode: 'login',
        evidenceType: '登录照片',
        captureTime: '2024-01-20 08:30:25',
        thumbnail: '',
        imageUrl: '',
        location: '北京市朝阳区建国路100号'
      },
      {
        id: 2,
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        evidenceTypeCode: 'scheduled',
        evidenceType: '定时抓拍',
        captureTime: '2024-01-20 10:00:00',
        thumbnail: '',
        imageUrl: '',
        location: '北京市海淀区中关村大街50号'
      }
    ]
    pagination.total = 500
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
  currentRow.value = row
  viewDialogVisible.value = true
}

const handleDownload = (row: any) => {
  ElMessage.info(`下载证据: ${row.plateNo}`)
}

const handleBatchDownload = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要下载的证据')
    return
  }
  ElMessage.info(`批量下载 ${selectedRows.value.length} 条证据`)
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.driver-evidence {
  .search-card {
    margin-bottom: 16px;
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .thumbnail-image {
      width: 80px;
      height: 60px;
      border-radius: 4px;
    }

    .image-error {
      width: 80px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      color: #999;
      font-size: 12px;
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .evidence-image-container {
    margin-top: 16px;
    text-align: center;

    .evidence-image {
      max-width: 100%;
      max-height: 400px;
    }

    .image-error-large {
      width: 100%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      color: #999;
    }
  }
}
</style>

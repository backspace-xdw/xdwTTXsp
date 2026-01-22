<template>
  <div class="alarm-evidence">
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
            <el-option label="前向碰撞" value="forwardCollision" />
            <el-option label="车道偏离" value="laneDeparture" />
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
          <span>证据列表</span>
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
        <el-table-column prop="alarmTypeName" label="报警类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getAlarmTypeTag(row.alarmType)">{{ row.alarmTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarmTime" label="报警时间" width="160" align="center" />
        <el-table-column prop="evidenceType" label="证据类型" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.hasVideo ? '视频' : '' }}{{ row.hasVideo && row.hasImage ? '+' : '' }}{{ row.hasImage ? '图片' : '' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewImage(row)">查看图片</el-button>
            <el-button type="primary" link size="small" @click="handleViewVideo(row)">查看视频</el-button>
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

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="imageDialogVisible" title="证据图片" width="800px">
      <div class="image-gallery">
        <el-image
          v-for="(img, index) in currentImages"
          :key="index"
          :src="img"
          :preview-src-list="currentImages"
          :initial-index="index"
          fit="cover"
          class="evidence-image"
        />
      </div>
      <el-empty v-if="currentImages.length === 0" description="暂无图片" />
    </el-dialog>

    <!-- 视频播放弹窗 -->
    <el-dialog v-model="videoDialogVisible" title="证据视频" width="800px">
      <div class="video-container">
        <video v-if="currentVideoUrl" :src="currentVideoUrl" controls autoplay class="evidence-video"></video>
        <el-empty v-else description="暂无视频" />
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
  alarmType: '',
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

const imageDialogVisible = ref(false)
const videoDialogVisible = ref(false)
const currentImages = ref<string[]>([])
const currentVideoUrl = ref('')

const getAlarmTypeTag = (type: string) => {
  const map: Record<string, string> = {
    fatigue: 'danger',
    phone: 'warning',
    smoking: 'warning',
    distraction: 'warning',
    forwardCollision: 'danger',
    laneDeparture: 'warning'
  }
  return map[type] || 'info'
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
        alarmType: 'fatigue',
        alarmTypeName: '疲劳驾驶',
        alarmTime: '2024-01-20 10:30:25',
        hasVideo: true,
        hasImage: true,
        location: '北京市朝阳区建国路100号'
      },
      {
        id: 2,
        plateNo: '京B67890',
        companyName: '北京货运公司',
        driverName: '李四',
        alarmType: 'phone',
        alarmTypeName: '接打电话',
        alarmTime: '2024-01-20 09:15:30',
        hasVideo: true,
        hasImage: true,
        location: '北京市海淀区中关村大街50号'
      }
    ]
    pagination.total = 100
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

const handleViewImage = (row: any) => {
  // 模拟图片数据
  currentImages.value = [
    'https://via.placeholder.com/800x600?text=Evidence+Image+1',
    'https://via.placeholder.com/800x600?text=Evidence+Image+2'
  ]
  imageDialogVisible.value = true
}

const handleViewVideo = (row: any) => {
  currentVideoUrl.value = ''
  videoDialogVisible.value = true
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
.alarm-evidence {
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

  .image-gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    .evidence-image {
      width: 100%;
      height: 200px;
      border-radius: 4px;
      cursor: pointer;
    }
  }

  .video-container {
    width: 100%;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;

    .evidence-video {
      width: 100%;
      max-height: 450px;
    }
  }
}
</style>

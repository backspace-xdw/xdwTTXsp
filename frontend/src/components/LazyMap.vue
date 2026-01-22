<template>
  <div class="lazy-map-container" ref="containerRef">
    <!-- 加载中状态 -->
    <div v-if="loading" class="map-loading">
      <div class="loading-spinner"></div>
      <span>地图加载中...</span>
    </div>

    <!-- 加载失败状态 -->
    <div v-else-if="error" class="map-error">
      <el-icon class="error-icon"><WarningFilled /></el-icon>
      <span>地图加载失败</span>
      <el-button type="primary" size="small" @click="retryLoad">重试</el-button>
    </div>

    <!-- 地图容器 -->
    <div
      v-show="!loading && !error"
      :id="mapId"
      class="map-container"
    ></div>

    <!-- 地图控件插槽 -->
    <slot name="controls" :map="map" :AMap="AMapInstance"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

interface Props {
  mapId?: string
  center?: [number, number]
  zoom?: number
  mapStyle?: string
  lazy?: boolean  // 是否懒加载（可见时才加载）
  plugins?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  mapId: 'map-container',
  center: () => [121.4737, 31.2304],
  zoom: 12,
  mapStyle: 'amap://styles/normal',
  lazy: true,
  plugins: () => ['AMap.Scale', 'AMap.ToolBar']
})

const emit = defineEmits<{
  (e: 'ready', map: any, AMap: any): void
  (e: 'error', error: Error): void
}>()

const containerRef = ref<HTMLElement>()
const loading = ref(true)
const error = ref(false)
const map = ref<any>(null)
const AMapInstance = ref<any>(null)

let observer: IntersectionObserver | null = null
let isLoaded = false

// 加载高德地图
const loadAMap = async () => {
  if (isLoaded) return

  loading.value = true
  error.value = false

  try {
    // 动态导入 AMapLoader
    const AMapLoader = (await import('@amap/amap-jsapi-loader')).default

    AMapInstance.value = await AMapLoader.load({
      key: '0236671cfb04ddf41d952d0a47b78106',
      version: '1.4.15',
      plugins: props.plugins
    })

    await nextTick()

    // 初始化地图
    map.value = new AMapInstance.value.Map(props.mapId, {
      zoom: props.zoom,
      center: props.center,
      mapStyle: props.mapStyle
    })

    // 添加控件
    if (props.plugins.includes('AMap.Scale')) {
      map.value.addControl(new AMapInstance.value.Scale())
    }
    if (props.plugins.includes('AMap.ToolBar')) {
      map.value.addControl(new AMapInstance.value.ToolBar({ position: 'RT' }))
    }

    isLoaded = true
    loading.value = false

    emit('ready', map.value, AMapInstance.value)
  } catch (err) {
    console.error('Map load error:', err)
    error.value = true
    loading.value = false
    emit('error', err as Error)
  }
}

// 重试加载
const retryLoad = () => {
  isLoaded = false
  loadAMap()
}

// 设置地图中心
const setCenter = (center: [number, number]) => {
  if (map.value) {
    map.value.setCenter(center)
  }
}

// 设置缩放级别
const setZoom = (zoom: number) => {
  if (map.value) {
    map.value.setZoom(zoom)
  }
}

// 获取地图实例
const getMap = () => map.value
const getAMap = () => AMapInstance.value

// 暴露方法
defineExpose({
  map,
  AMapInstance,
  setCenter,
  setZoom,
  getMap,
  getAMap,
  retryLoad
})

// 设置懒加载观察器
const setupObserver = () => {
  if (!props.lazy) {
    loadAMap()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoaded) {
          loadAMap()
          observer?.disconnect()
        }
      })
    },
    { threshold: 0.1 }
  )

  if (containerRef.value) {
    observer.observe(containerRef.value)
  }
}

// 监听 props 变化
watch(() => props.center, (newCenter) => {
  if (map.value && newCenter) {
    map.value.setCenter(newCenter)
  }
})

watch(() => props.zoom, (newZoom) => {
  if (map.value && newZoom) {
    map.value.setZoom(newZoom)
  }
})

onMounted(() => {
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
  if (map.value) {
    map.value.destroy()
    map.value = null
  }
})
</script>

<style lang="scss" scoped>
.lazy-map-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-loading,
.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #94a3b8;
  background: #1e293b;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #334155;
    border-top-color: #409eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-icon {
    font-size: 48px;
    color: #f56c6c;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

<template>
  <div class="lazy-chart-container" ref="containerRef">
    <!-- 加载中状态 -->
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <span>图表加载中...</span>
    </div>

    <!-- 图表容器 -->
    <div
      v-show="!loading"
      ref="chartRef"
      class="chart-container"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, shallowRef } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'

interface Props {
  option: EChartsOption
  lazy?: boolean
  theme?: 'dark' | 'light' | string
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lazy: true,
  theme: 'dark',
  autoResize: true
})

const emit = defineEmits<{
  (e: 'ready', chart: ECharts): void
  (e: 'click', params: any): void
}>()

const containerRef = ref<HTMLElement>()
const chartRef = ref<HTMLElement>()
const loading = ref(true)
const chart = shallowRef<ECharts | null>(null)

let observer: IntersectionObserver | null = null
let isLoaded = false
let resizeObserver: ResizeObserver | null = null

// 暗色主题配置
const darkTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#94a3b8'
  },
  title: {
    textStyle: {
      color: '#e2e8f0'
    }
  },
  legend: {
    textStyle: {
      color: '#94a3b8'
    }
  },
  tooltip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: {
      color: '#e2e8f0'
    }
  },
  xAxis: {
    axisLine: {
      lineStyle: {
        color: '#4a5568'
      }
    },
    axisLabel: {
      color: '#94a3b8'
    },
    splitLine: {
      lineStyle: {
        color: '#2d3748'
      }
    }
  },
  yAxis: {
    axisLine: {
      lineStyle: {
        color: '#4a5568'
      }
    },
    axisLabel: {
      color: '#94a3b8'
    },
    splitLine: {
      lineStyle: {
        color: '#2d3748'
      }
    }
  }
}

// 加载 ECharts
const loadChart = async () => {
  if (isLoaded || !chartRef.value) return

  loading.value = true

  try {
    // 动态导入 echarts
    const echarts = await import('echarts')

    await nextTick()

    // 注册暗色主题
    echarts.registerTheme('dark', darkTheme)

    // 初始化图表
    chart.value = echarts.init(chartRef.value, props.theme === 'dark' ? 'dark' : undefined)

    // 设置选项
    chart.value.setOption(props.option)

    // 绑定事件
    chart.value.on('click', (params) => {
      emit('click', params)
    })

    // 设置自动调整大小
    if (props.autoResize) {
      resizeObserver = new ResizeObserver(() => {
        chart.value?.resize()
      })
      resizeObserver.observe(chartRef.value)
    }

    isLoaded = true
    loading.value = false

    emit('ready', chart.value)
  } catch (err) {
    console.error('Chart load error:', err)
    loading.value = false
  }
}

// 更新图表选项
const setOption = (option: EChartsOption, notMerge = false) => {
  if (chart.value) {
    chart.value.setOption(option, notMerge)
  }
}

// 调整大小
const resize = () => {
  chart.value?.resize()
}

// 获取图表实例
const getChart = () => chart.value

// 暴露方法
defineExpose({
  chart,
  setOption,
  resize,
  getChart
})

// 设置懒加载观察器
const setupObserver = () => {
  if (!props.lazy) {
    loadChart()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoaded) {
          loadChart()
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

// 监听 option 变化
watch(() => props.option, (newOption) => {
  if (chart.value && newOption) {
    chart.value.setOption(newOption)
  }
}, { deep: true })

onMounted(() => {
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
})
</script>

<style lang="scss" scoped>
.lazy-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  min-height: 200px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  background: transparent;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #334155;
    border-top-color: #409eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  span {
    font-size: 13px;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

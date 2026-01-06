<template>
  <div class="flv-player" :class="{ 'is-playing': isPlaying, 'is-loading': isLoading }">
    <!-- 视频元素 -->
    <video
      ref="videoRef"
      class="video-element"
      :muted="muted"
      :autoplay="autoplay"
      playsinline
      @click="togglePlay"
    ></video>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>正在连接...</span>
    </div>

    <!-- 离线状态 -->
    <div v-else-if="!isConnected && !error" class="offline-overlay">
      <el-icon><VideoCamera /></el-icon>
      <span>{{ offlineText }}</span>
      <el-button v-if="showRetry" type="primary" size="small" @click="connect">
        重新连接
      </el-button>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-overlay">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
      <el-button type="primary" size="small" @click="connect">
        重试
      </el-button>
    </div>

    <!-- 控制栏 -->
    <div class="control-bar" v-show="showControls && isPlaying">
      <div class="control-left">
        <el-icon v-if="isPlaying" @click="pause"><VideoPause /></el-icon>
        <el-icon v-else @click="play"><VideoPlay /></el-icon>
        <el-icon :class="{ active: muted }" @click="toggleMute">
          <component :is="muted ? 'Mute' : 'Microphone'" />
        </el-icon>
      </div>
      <div class="control-center">
        <span class="channel-name">{{ channelName }}</span>
      </div>
      <div class="control-right">
        <el-icon @click="enterFullscreen"><FullScreen /></el-icon>
      </div>
    </div>

    <!-- 通道标识 -->
    <div class="channel-label" v-if="showChannelLabel">
      CH{{ channel }} - {{ channelName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import flvjs from 'flv.js'
import {
  Loading,
  VideoCamera,
  WarningFilled,
  VideoPause,
  VideoPlay,
  Mute,
  Microphone,
  FullScreen,
} from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  deviceId: string
  channel: number
  autoplay?: boolean
  muted?: boolean
  showControls?: boolean
  showChannelLabel?: boolean
  showRetry?: boolean
  offlineText?: string
}>(), {
  autoplay: true,
  muted: true,
  showControls: true,
  showChannelLabel: true,
  showRetry: true,
  offlineText: '视频未连接',
})

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'error', error: string): void
  (e: 'connected'): void
  (e: 'disconnected'): void
}>()

// 通道名称映射
const CHANNEL_NAMES: Record<number, string> = {
  1: '前方摄像头',
  2: '后方摄像头',
  3: '驾驶室',
  4: 'DSM',
  5: 'ADAS',
  6: '备用1',
  7: '备用2',
  8: '备用3',
  9: '备用4',
}

const videoRef = ref<HTMLVideoElement>()
const flvPlayer = ref<flvjs.Player | null>(null)

const isPlaying = ref(false)
const isLoading = ref(false)
const isConnected = ref(false)
const error = ref<string | null>(null)
const muted = ref(props.muted)

// 录像状态
const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedChunks = ref<Blob[]>([])
const recordingStartTime = ref<number>(0)

const channelName = computed(() => CHANNEL_NAMES[props.channel] || `通道${props.channel}`)

// 构建流URL
const streamUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${baseUrl}/api/stream/${props.deviceId}/${props.channel}`
})

// 检查flv.js支持
const isSupported = computed(() => flvjs.isSupported())

// 连接视频流
function connect() {
  if (!isSupported.value) {
    error.value = '浏览器不支持FLV播放'
    return
  }

  if (!videoRef.value) {
    return
  }

  // 清理旧连接
  disconnect()

  isLoading.value = true
  error.value = null

  try {
    flvPlayer.value = flvjs.createPlayer({
      type: 'flv',
      isLive: true,
      url: streamUrl.value,
      cors: true,
    }, {
      enableWorker: false,
      enableStashBuffer: false,
      stashInitialSize: 128,
      lazyLoad: false,
      lazyLoadMaxDuration: 3 * 60,
      lazyLoadRecoverDuration: 30,
      deferLoadAfterSourceOpen: false,
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: 3 * 60,
      autoCleanupMinBackwardDuration: 2 * 60,
    })

    flvPlayer.value.attachMediaElement(videoRef.value)

    // 事件监听
    flvPlayer.value.on(flvjs.Events.LOADING_COMPLETE, () => {
      console.log(`[FlvPlayer] ${props.deviceId}:${props.channel} loading complete`)
    })

    flvPlayer.value.on(flvjs.Events.RECOVERED_EARLY_EOF, () => {
      console.log(`[FlvPlayer] ${props.deviceId}:${props.channel} recovered EOF`)
    })

    flvPlayer.value.on(flvjs.Events.MEDIA_INFO, (info: any) => {
      console.log(`[FlvPlayer] ${props.deviceId}:${props.channel} media info:`, info)
      isLoading.value = false
      isConnected.value = true
      emit('connected')
    })

    flvPlayer.value.on(flvjs.Events.ERROR, (errType: string, errDetail: string) => {
      console.error(`[FlvPlayer] ${props.deviceId}:${props.channel} error:`, errType, errDetail)
      isLoading.value = false
      isConnected.value = false
      error.value = `播放错误: ${errDetail}`
      emit('error', errDetail)
    })

    flvPlayer.value.load()

    if (props.autoplay) {
      flvPlayer.value.play()
      isPlaying.value = true
    }

  } catch (err: any) {
    console.error(`[FlvPlayer] ${props.deviceId}:${props.channel} create error:`, err)
    isLoading.value = false
    error.value = err.message || '创建播放器失败'
    emit('error', error.value!)
  }
}

// 断开连接
function disconnect() {
  if (flvPlayer.value) {
    try {
      flvPlayer.value.pause()
      flvPlayer.value.unload()
      flvPlayer.value.detachMediaElement()
      flvPlayer.value.destroy()
    } catch (err) {
      // 忽略错误
    }
    flvPlayer.value = null
  }

  isPlaying.value = false
  isConnected.value = false
  isLoading.value = false
  emit('disconnected')
}

// 播放
function play() {
  if (flvPlayer.value) {
    flvPlayer.value.play()
    isPlaying.value = true
    emit('play')
  } else {
    connect()
  }
}

// 暂停
function pause() {
  if (flvPlayer.value) {
    flvPlayer.value.pause()
    isPlaying.value = false
    emit('pause')
  }
}

// 切换播放
function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

// 切换静音
function toggleMute() {
  muted.value = !muted.value
  if (videoRef.value) {
    videoRef.value.muted = muted.value
  }
}

// 全屏
function enterFullscreen() {
  if (videoRef.value) {
    if (videoRef.value.requestFullscreen) {
      videoRef.value.requestFullscreen()
    } else if ((videoRef.value as any).webkitRequestFullscreen) {
      (videoRef.value as any).webkitRequestFullscreen()
    }
  }
}

// 监听props变化重新连接
watch([() => props.deviceId, () => props.channel], () => {
  if (props.deviceId && props.channel) {
    connect()
  }
})

// 生命周期
onMounted(() => {
  if (props.deviceId && props.channel && props.autoplay) {
    connect()
  }
})

onBeforeUnmount(() => {
  disconnect()
})

// 截图功能
function captureScreenshot(): string | null {
  if (!videoRef.value || !isConnected.value) {
    return null
  }

  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || video.clientWidth
  canvas.height = video.videoHeight || video.clientHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

// 下载截图
function downloadScreenshot(filename?: string): boolean {
  const dataUrl = captureScreenshot()
  if (!dataUrl) return false

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename || `screenshot_${props.deviceId}_CH${props.channel}_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}

// 获取视频元素
function getVideoElement(): HTMLVideoElement | undefined {
  return videoRef.value
}

// 开始录像
function startRecording(): boolean {
  if (!videoRef.value || !isConnected.value) {
    console.warn('[FlvPlayer] Cannot start recording: video not connected')
    return false
  }

  if (isRecording.value) {
    console.warn('[FlvPlayer] Already recording')
    return false
  }

  try {
    // 获取视频流
    const video = videoRef.value
    const stream = (video as any).captureStream ? (video as any).captureStream(30) : null

    if (!stream) {
      console.error('[FlvPlayer] captureStream not supported')
      return false
    }

    // 检查 MediaRecorder 支持
    if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        console.error('[FlvPlayer] MediaRecorder WebM not supported')
        return false
      }
    }

    // 确定最佳编码格式
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    // 创建 MediaRecorder
    recordedChunks.value = []
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    })

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      console.log(`[FlvPlayer] Recording stopped, ${recordedChunks.value.length} chunks`)
    }

    mediaRecorder.value.onerror = (event) => {
      console.error('[FlvPlayer] MediaRecorder error:', event)
      isRecording.value = false
    }

    // 开始录制
    mediaRecorder.value.start(1000) // 每秒收集一次数据
    recordingStartTime.value = Date.now()
    isRecording.value = true

    console.log(`[FlvPlayer] Recording started for ${props.deviceId}:${props.channel}`)
    return true
  } catch (err) {
    console.error('[FlvPlayer] Failed to start recording:', err)
    return false
  }
}

// 停止录像并下载
function stopRecording(download: boolean = true): Blob | null {
  if (!mediaRecorder.value || !isRecording.value) {
    console.warn('[FlvPlayer] Not recording')
    return null
  }

  return new Promise<Blob | null>((resolve) => {
    const recorder = mediaRecorder.value!

    recorder.onstop = () => {
      isRecording.value = false

      if (recordedChunks.value.length === 0) {
        console.warn('[FlvPlayer] No recorded data')
        resolve(null)
        return
      }

      // 创建 Blob
      const blob = new Blob(recordedChunks.value, { type: 'video/webm' })
      const duration = Math.floor((Date.now() - recordingStartTime.value) / 1000)

      console.log(`[FlvPlayer] Recording complete: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ${duration}s`)

      // 下载文件
      if (download) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `recording_${props.deviceId}_CH${props.channel}_${Date.now()}.webm`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      // 清理
      recordedChunks.value = []
      mediaRecorder.value = null

      resolve(blob)
    }

    recorder.stop()
  }) as any // TypeScript workaround for sync return
}

// 获取录像时长 (秒)
function getRecordingDuration(): number {
  if (!isRecording.value) return 0
  return Math.floor((Date.now() - recordingStartTime.value) / 1000)
}

// 暴露方法
defineExpose({
  connect,
  disconnect,
  play,
  pause,
  isPlaying,
  isConnected,
  captureScreenshot,
  downloadScreenshot,
  getVideoElement,
  // 录像功能
  startRecording,
  stopRecording,
  isRecording,
  getRecordingDuration,
})
</script>

<style scoped lang="scss">
.flv-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;

  .video-element {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }

  .loading-overlay,
  .offline-overlay,
  .error-overlay {
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
    background: rgba(0, 0, 0, 0.8);
    color: #999;
    font-size: 14px;

    .el-icon {
      font-size: 48px;
      color: #666;
    }
  }

  .loading-overlay {
    .loading-icon {
      animation: rotate 1s linear infinite;
    }
  }

  .error-overlay {
    color: #f56c6c;

    .el-icon {
      color: #f56c6c;
    }
  }

  .control-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: #fff;
    opacity: 0;
    transition: opacity 0.3s;

    .el-icon {
      font-size: 20px;
      cursor: pointer;
      margin: 0 8px;

      &:hover {
        color: #409eff;
      }

      &.active {
        color: #f56c6c;
      }
    }

    .channel-name {
      font-size: 12px;
      color: #ccc;
    }
  }

  &:hover .control-bar {
    opacity: 1;
  }

  .channel-label {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

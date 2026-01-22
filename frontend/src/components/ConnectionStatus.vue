<template>
  <div class="connection-status" :class="statusClass" @click="handleClick">
    <span class="status-dot" :class="statusClass"></span>
    <span class="status-text" v-if="showText">{{ statusText }}</span>
    <el-tooltip v-if="showReconnect && status === 'error'" content="点击重试连接" placement="bottom">
      <el-icon class="reconnect-icon" @click.stop="handleReconnect">
        <Refresh />
      </el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getConnectionState, getOnlineState, reconnect } from '@/utils/websocket'

interface Props {
  showText?: boolean
  showReconnect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showText: true,
  showReconnect: true
})

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'reconnect'): void
}>()

const connectionState = getConnectionState()
const onlineState = getOnlineState()

const status = computed(() => {
  if (!onlineState.value) return 'offline'
  return connectionState.value
})

const statusClass = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'connected'
    case 'connecting':
      return 'connecting'
    case 'offline':
      return 'offline'
    case 'error':
    case 'disconnected':
    default:
      return 'disconnected'
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中...'
    case 'offline':
      return '网络离线'
    case 'error':
      return '连接失败'
    case 'disconnected':
    default:
      return '未连接'
  }
})

const handleClick = () => {
  emit('click')
}

const handleReconnect = () => {
  emit('reconnect')
  reconnect()
}
</script>

<style lang="scss" scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.connected {
    color: #67c23a;
  }

  &.connecting {
    color: #e6a23c;
  }

  &.disconnected,
  &.offline {
    color: #f56c6c;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;

    &.connected {
      background: #67c23a;
      box-shadow: 0 0 6px rgba(103, 194, 58, 0.5);
    }

    &.connecting {
      background: #e6a23c;
      animation: pulse 1s infinite;
    }

    &.disconnected,
    &.offline {
      background: #f56c6c;
      animation: pulse 0.8s infinite;
    }
  }

  .status-text {
    font-weight: 500;
  }

  .reconnect-icon {
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}
</style>

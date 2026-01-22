/**
 * WebSocket Service
 * 实时数据通信服务 - 增强版
 * 支持自动重连、离线提示、连接状态管理
 */

import { io, Socket } from 'socket.io-client'
import { useVehicleStore } from '@/stores/vehicle'
import { ElNotification, ElMessage } from 'element-plus'
import { ref, readonly } from 'vue'

// WebSocket服务端地址 - 使用当前页面origin，通过nginx代理
const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin

let socket: Socket | null = null

// 连接状态
const connectionState = ref<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
const isOnline = ref(true)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 10

// 事件监听器存储
const eventListeners: Map<string, Set<Function>> = new Map()

// 离线检测
let offlineNotificationHandle: { close: () => void } | null = null
let networkListenerInitialized = false

/**
 * 监听网络状态变化
 */
function setupNetworkListener() {
  if (networkListenerInitialized) return
  networkListenerInitialized = true

  window.addEventListener('online', () => {
    isOnline.value = true
    console.log('[WS] Network online, reconnecting...')
    if (offlineNotificationHandle) {
      offlineNotificationHandle.close()
      offlineNotificationHandle = null
    }
    ElMessage.success('网络已恢复')
    // 网络恢复时尝试重连
    if (!socket?.connected) {
      initWebSocket()
    }
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    console.log('[WS] Network offline')
    offlineNotificationHandle = ElNotification({
      title: '网络断开',
      message: '网络连接已断开，数据可能不是最新的',
      type: 'warning',
      duration: 0, // 不自动关闭
      showClose: true
    })
  })
}

/**
 * 显示连接状态通知
 */
function showConnectionNotification(type: 'success' | 'warning' | 'error', message: string) {
  ElNotification({
    title: type === 'success' ? '连接成功' : type === 'warning' ? '连接警告' : '连接错误',
    message,
    type,
    duration: type === 'success' ? 3000 : 5000
  })
}

// GPS更新数据接口
interface GpsUpdateData {
  deviceId: string
  plateNo?: string
  lat: number
  lng: number
  altitude?: number
  speed: number
  direction: number
  gpsTime: string
  accOn: boolean
  located: boolean
  mileage?: number
  alarmFlag?: number
}

// 报警数据接口
interface AlarmData {
  deviceId: string
  plateNo?: string
  alarmType: number
  alarmName: string
  alarmLevel: number
  lat?: number
  lng?: number
  speed?: number
  gpsTime: string
}

// 设备状态数据接口
interface DeviceStatusData {
  deviceId: string
  plateNo?: string
  online: boolean
  status?: string
}

/**
 * 初始化WebSocket连接
 */
export function initWebSocket() {
  // 设置网络监听器（只设置一次）
  setupNetworkListener()

  if (socket?.connected) {
    console.log('[WS] Already connected')
    return socket
  }

  connectionState.value = 'connecting'
  console.log('[WS] Connecting to', WS_URL)

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  })

  // 连接成功
  socket.on('connect', () => {
    console.log('[WS] Connected, socket id:', socket?.id)
    connectionState.value = 'connected'
    reconnectAttempts.value = 0

    // 订阅所有GPS更新
    socket?.emit('subscribe:all')
    console.log('[WS] Subscribed to all updates')

    // 首次连接不显示通知，重连成功显示
    if (reconnectAttempts.value > 0) {
      showConnectionNotification('success', '服务器连接已恢复')
    }
  })

  // 连接错误
  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error.message)
    connectionState.value = 'error'
  })

  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
    connectionState.value = 'disconnected'

    // 如果是服务端主动断开，显示通知
    if (reason === 'io server disconnect') {
      showConnectionNotification('warning', '服务器断开连接，正在尝试重连...')
    }
  })

  // 重连尝试
  socket.io.on('reconnect_attempt', (attempt) => {
    reconnectAttempts.value = attempt
    console.log(`[WS] Reconnect attempt ${attempt}/${maxReconnectAttempts}`)
    connectionState.value = 'connecting'
  })

  // 重连失败
  socket.io.on('reconnect_failed', () => {
    console.error('[WS] Reconnection failed after', maxReconnectAttempts, 'attempts')
    connectionState.value = 'error'
    showConnectionNotification('error', `连接失败，已尝试 ${maxReconnectAttempts} 次。请检查网络连接后刷新页面。`)
  })

  // 监听GPS更新
  socket.on('gps:update', (data: GpsUpdateData) => {
    console.log('[WS] GPS update received:', data.deviceId, data.speed + 'km/h')

    const vehicleStore = useVehicleStore()
    vehicleStore.updateGpsData(data.deviceId, {
      id: 0,
      deviceId: data.deviceId,
      plateNo: data.plateNo || '',
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      direction: data.direction,
      gpsTime: data.gpsTime,
      receiveTime: new Date().toISOString(),
      accStatus: data.accOn,
      altitude: data.altitude,
      mileage: data.mileage,
      alarmFlags: data.alarmFlag
    })
  })

  // 监听报警
  socket.on('alarm:new', (data: AlarmData) => {
    console.log('[WS] New alarm:', data.deviceId, data.alarmName)
    // 可以触发通知或更新报警列表
  })

  // 监听设备状态变化
  socket.on('device:status', (data: DeviceStatusData) => {
    console.log('[WS] Device status:', data.deviceId, data.online ? 'online' : 'offline')

    const vehicleStore = useVehicleStore()
    vehicleStore.updateVehicleStatus(data.deviceId, data.online, data.status)
  })

  return socket
}

/**
 * 断开WebSocket连接
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('[WS] Manually disconnected')
  }
}

/**
 * 订阅车辆
 */
export function subscribeVehicle(deviceId: string) {
  if (socket?.connected) {
    socket.emit('subscribe:vehicle', deviceId)
    console.log('[WS] Subscribed to vehicle:', deviceId)
  }
}

/**
 * 取消订阅车辆
 */
export function unsubscribeVehicle(deviceId: string) {
  if (socket?.connected) {
    socket.emit('unsubscribe:vehicle', deviceId)
    console.log('[WS] Unsubscribed from vehicle:', deviceId)
  }
}

/**
 * 获取socket实例
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * 获取连接状态
 */
export function getConnectionState() {
  return readonly(connectionState)
}

/**
 * 获取网络在线状态
 */
export function getOnlineState() {
  return readonly(isOnline)
}

/**
 * 手动重连
 */
export function reconnect(): void {
  if (socket) {
    socket.connect()
  } else {
    initWebSocket()
  }
}

/**
 * 添加自定义事件监听器
 */
export function on(event: string, callback: Function): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set())
  }
  eventListeners.get(event)!.add(callback)

  if (socket) {
    socket.on(event, callback as any)
  }
}

/**
 * 移除自定义事件监听器
 */
export function off(event: string, callback: Function): void {
  eventListeners.get(event)?.delete(callback)

  if (socket) {
    socket.off(event, callback as any)
  }
}

/**
 * 发送消息
 */
export function emit(event: string, ...args: any[]): void {
  if (socket?.connected) {
    socket.emit(event, ...args)
  } else {
    console.warn('[WS] Cannot emit, socket not connected')
  }
}

export default {
  initWebSocket,
  disconnectWebSocket,
  subscribeVehicle,
  unsubscribeVehicle,
  getSocket,
  getConnectionState,
  getOnlineState,
  reconnect,
  on,
  off,
  emit
}

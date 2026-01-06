/**
 * WebSocket Service
 * 实时数据通信服务
 */

import { io, Socket } from 'socket.io-client'
import { useVehicleStore } from '@/stores/vehicle'

// WebSocket服务端地址 - 空值表示使用当前页面host
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol}//${window.location.hostname}:8081`

let socket: Socket | null = null

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
  if (socket?.connected) {
    console.log('[WS] Already connected')
    return socket
  }

  console.log('[WS] Connecting to', WS_URL)

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000
  })

  // 连接成功
  socket.on('connect', () => {
    console.log('[WS] Connected, socket id:', socket?.id)
    // 订阅所有GPS更新
    socket?.emit('subscribe:all')
    console.log('[WS] Subscribed to all updates')
  })

  // 连接错误
  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error.message)
  })

  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
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

export default {
  initWebSocket,
  disconnectWebSocket,
  subscribeVehicle,
  unsubscribeVehicle,
  getSocket
}

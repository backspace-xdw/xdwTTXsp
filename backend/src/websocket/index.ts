import { Server as SocketIOServer, Socket } from 'socket.io'

// 存储连接的客户端
const connectedClients = new Map<string, Socket>()
// 存储订阅的车辆
const vehicleSubscriptions = new Map<string, Set<string>>()

// WebSocket实例引用
let ioInstance: SocketIOServer | null = null

// 是否启用模拟数据
const ENABLE_SIMULATION = process.env.ENABLE_GPS_SIMULATION === 'true'

export function setupWebSocket(io: SocketIOServer) {
  ioInstance = io

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`)
    connectedClients.set(socket.id, socket)

    // 订阅车辆
    socket.on('subscribe:vehicle', (vehicleIds: string[]) => {
      vehicleIds.forEach(vehicleId => {
        if (!vehicleSubscriptions.has(vehicleId)) {
          vehicleSubscriptions.set(vehicleId, new Set())
        }
        vehicleSubscriptions.get(vehicleId)?.add(socket.id)
        // 加入设备房间
        socket.join(`device:${vehicleId}`)
      })
      console.log(`[WebSocket] Client ${socket.id} subscribed to vehicles:`, vehicleIds)
    })

    // 取消订阅车辆
    socket.on('unsubscribe:vehicle', (vehicleIds: string[]) => {
      vehicleIds.forEach(vehicleId => {
        vehicleSubscriptions.get(vehicleId)?.delete(socket.id)
        socket.leave(`device:${vehicleId}`)
      })
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from vehicles:`, vehicleIds)
    })

    // 订阅所有更新
    socket.on('subscribe:all', () => {
      socket.join('all-updates')
      console.log(`[WebSocket] Client ${socket.id} subscribed to all updates`)
    })

    // 取消订阅所有更新
    socket.on('unsubscribe:all', () => {
      socket.leave('all-updates')
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from all updates`)
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`)
      connectedClients.delete(socket.id)

      // 清理订阅
      vehicleSubscriptions.forEach((clients, vehicleId) => {
        clients.delete(socket.id)
      })
    })
  })

  // 仅在启用模拟时启动模拟GPS数据
  if (ENABLE_SIMULATION) {
    console.log('[WebSocket] GPS simulation enabled')
    startGpsSimulation(io)
  }
}

/**
 * 获取WebSocket实例
 */
export function getIO(): SocketIOServer | null {
  return ioInstance
}

// 模拟GPS数据更新
function startGpsSimulation(io: SocketIOServer) {
  const mockVehicles = [
    { deviceId: 'DEV001', plateNo: '沪A12345', lat: 31.2304, lng: 121.4737 },
    { deviceId: 'DEV002', plateNo: '沪B67890', lat: 31.2404, lng: 121.4837 },
    { deviceId: 'DEV003', plateNo: '京A11111', lat: 39.9042, lng: 116.4074 },
    { deviceId: 'DEV004', plateNo: '粤A22222', lat: 23.1291, lng: 113.2644 }
  ]

  setInterval(() => {
    mockVehicles.forEach(vehicle => {
      // 模拟位置变化
      const gpsData = {
        deviceId: vehicle.deviceId,
        plateNo: vehicle.plateNo,
        lat: vehicle.lat + (Math.random() - 0.5) * 0.001,
        lng: vehicle.lng + (Math.random() - 0.5) * 0.001,
        speed: Math.floor(Math.random() * 80),
        direction: Math.floor(Math.random() * 360),
        gpsTime: new Date().toISOString(),
        accStatus: Math.random() > 0.2
      }

      // 更新存储的位置
      vehicle.lat = gpsData.lat
      vehicle.lng = gpsData.lng

      // 广播给所有订阅者
      io.to('all-updates').emit('gps:update', gpsData)

      // 通知订阅该车辆的客户端
      const subscribers = vehicleSubscriptions.get(vehicle.deviceId)
      if (subscribers) {
        subscribers.forEach(clientId => {
          const socket = connectedClients.get(clientId)
          if (socket) {
            socket.emit('gps:update', gpsData)
          }
        })
      }
    })
  }, 5000) // 每5秒更新一次

  // 模拟报警
  setInterval(() => {
    const alarmTypes = ['fatigue', 'overspeed', 'deviation', 'collision']
    const vehicle = mockVehicles[Math.floor(Math.random() * mockVehicles.length)]

    const alarm = {
      id: Date.now(),
      deviceId: vehicle.deviceId,
      plateNo: vehicle.plateNo,
      alarmType: alarmTypes[Math.floor(Math.random() * alarmTypes.length)],
      lat: vehicle.lat,
      lng: vehicle.lng,
      alarmTime: new Date().toISOString()
    }

    io.to('all-updates').emit('alarm:new', alarm)
  }, 30000) // 每30秒模拟一次报警
}

// 发送GPS更新
export function sendGpsUpdate(io: SocketIOServer, data: any) {
  io.to('all-updates').emit('gps:update', data)
}

// 发送报警
export function sendAlarm(io: SocketIOServer, data: any) {
  io.to('all-updates').emit('alarm:new', data)
}

// ========== JT808 集成接口 ==========

/**
 * 广播GPS位置更新 (JT808)
 */
export function broadcastGpsUpdate(data: {
  deviceId: string
  plateNo?: string
  lat: number
  lng: number
  altitude?: number
  speed: number
  direction: number
  gpsTime: string | Date
  accOn?: boolean
  located?: boolean
  mileage?: number
  alarmFlag?: number
}): void {
  if (!ioInstance) return

  const gpsData = {
    ...data,
    gpsTime: typeof data.gpsTime === 'string' ? data.gpsTime : data.gpsTime.toISOString()
  }

  // 广播给所有订阅者
  ioInstance.to('all-updates').emit('gps:update', gpsData)

  // 发送给订阅该设备的客户端
  ioInstance.to(`device:${data.deviceId}`).emit('gps:update', gpsData)
}

/**
 * 广播报警信息 (JT808)
 */
export function broadcastAlarm(data: {
  deviceId: string
  plateNo?: string
  alarmType: number
  alarmName: string
  alarmLevel: number
  lat?: number
  lng?: number
  speed?: number
  gpsTime: string | Date
}): void {
  if (!ioInstance) return

  const alarmData = {
    id: Date.now(),
    ...data,
    alarmTime: typeof data.gpsTime === 'string' ? data.gpsTime : data.gpsTime.toISOString()
  }

  // 广播给所有订阅者
  ioInstance.to('all-updates').emit('alarm:new', alarmData)

  // 发送给订阅该设备的客户端
  ioInstance.to(`device:${data.deviceId}`).emit('alarm:new', alarmData)
}

/**
 * 广播设备在线状态变化
 */
export function broadcastDeviceStatus(data: {
  deviceId: string
  plateNo?: string
  isOnline: boolean
  event: 'connect' | 'disconnect' | 'register' | 'auth'
}): void {
  if (!ioInstance) return

  ioInstance.to('all-updates').emit('device:status', data)
  ioInstance.to(`device:${data.deviceId}`).emit('device:status', data)
}

/**
 * 获取在线客户端数量
 */
export function getOnlineClientCount(): number {
  return connectedClients.size
}

/**
 * 获取车辆订阅数量
 */
export function getVehicleSubscriptionCount(deviceId: string): number {
  return vehicleSubscriptions.get(deviceId)?.size ?? 0
}

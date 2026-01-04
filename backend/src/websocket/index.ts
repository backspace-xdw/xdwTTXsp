import { Server as SocketIOServer, Socket } from 'socket.io'

// 存储连接的客户端
const connectedClients = new Map<string, Socket>()
// 存储订阅的车辆
const vehicleSubscriptions = new Map<string, Set<string>>()

export function setupWebSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`)
    connectedClients.set(socket.id, socket)

    // 订阅车辆
    socket.on('subscribe:vehicle', (vehicleIds: string[]) => {
      vehicleIds.forEach(vehicleId => {
        if (!vehicleSubscriptions.has(vehicleId)) {
          vehicleSubscriptions.set(vehicleId, new Set())
        }
        vehicleSubscriptions.get(vehicleId)?.add(socket.id)
      })
      console.log(`Client ${socket.id} subscribed to vehicles:`, vehicleIds)
    })

    // 取消订阅车辆
    socket.on('unsubscribe:vehicle', (vehicleIds: string[]) => {
      vehicleIds.forEach(vehicleId => {
        vehicleSubscriptions.get(vehicleId)?.delete(socket.id)
      })
      console.log(`Client ${socket.id} unsubscribed from vehicles:`, vehicleIds)
    })

    // 订阅所有更新
    socket.on('subscribe:all', () => {
      socket.join('all-updates')
      console.log(`Client ${socket.id} subscribed to all updates`)
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
      connectedClients.delete(socket.id)

      // 清理订阅
      vehicleSubscriptions.forEach((clients, vehicleId) => {
        clients.delete(socket.id)
      })
    })
  })

  // 模拟GPS数据更新
  startGpsSimulation(io)
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

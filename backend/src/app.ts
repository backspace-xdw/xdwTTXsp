import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 导入路由
import authRoutes from './routes/auth'
import vehicleRoutes from './routes/vehicle'
import companyRoutes from './routes/company'
import alarmRoutes from './routes/alarm'
import reportRoutes from './routes/report'

// 导入WebSocket处理
import { setupWebSocket, broadcastGpsUpdate, broadcastAlarm, broadcastDeviceStatus } from './websocket'

// 导入JT808协议模块
import { JT808Server, initJT808, STATUS_FLAG } from './jt808'

// 导入服务层
import { deviceService, locationService, alarmService } from './services'

// 导入数据库
import { testConnection, syncModels } from './models'

const app = express()
const httpServer = createServer(app)

// Socket.IO设置
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

// 中间件
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/alarms', alarmRoutes)
app.use('/api/reports', reportRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// WebSocket设置
setupWebSocket(io)

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found'
  })
})

// JT808服务器实例
let jt808Server: JT808Server | null = null

// 初始化JT808服务器
async function initializeJT808() {
  const JT808_PORT = parseInt(process.env.JT808_PORT || '8808')

  // 初始化协议模块
  initJT808()

  // 创建JT808服务器
  jt808Server = new JT808Server({ port: JT808_PORT })

  // 监听设备注册事件
  jt808Server.on('register', async (data) => {
    try {
      const { deviceId, registerInfo, authCode } = data
      await deviceService.registerDevice(deviceId, registerInfo, authCode)

      // 广播设备上线状态
      broadcastDeviceStatus({
        deviceId,
        plateNo: registerInfo.plateNo,
        isOnline: true,
        event: 'register'
      })
    } catch (error) {
      console.error('[JT808] 设备注册处理失败:', error)
    }
  })

  // 监听设备鉴权事件
  jt808Server.on('auth', async (data) => {
    try {
      const { deviceId, success } = data
      if (success) {
        await deviceService.updateHeartbeat(deviceId)

        broadcastDeviceStatus({
          deviceId,
          isOnline: true,
          event: 'auth'
        })
      }
    } catch (error) {
      console.error('[JT808] 设备鉴权处理失败:', error)
    }
  })

  // 监听心跳事件
  jt808Server.on('heartbeat', async (data) => {
    try {
      await deviceService.updateHeartbeat(data.deviceId)
    } catch (error) {
      console.error('[JT808] 心跳处理失败:', error)
    }
  })

  // 监听位置上报事件
  jt808Server.on('location', async (data) => {
    try {
      const { deviceId, location, extras, status } = data

      // 保存位置到数据库
      await locationService.saveLocation(deviceId, location, extras)

      // 获取设备信息获取车牌号
      const device = await deviceService.getDevice(deviceId)

      // 广播GPS更新到前端
      broadcastGpsUpdate({
        deviceId,
        plateNo: device?.plate_no,
        lat: location.latitude,
        lng: location.longitude,
        altitude: location.altitude,
        speed: location.speed,
        direction: location.direction,
        gpsTime: location.gpsTime,
        accOn: status.accOn,
        located: status.located,
        mileage: extras?.mileage,
        alarmFlag: location.alarmFlag
      })
    } catch (error) {
      console.error('[JT808] 位置处理失败:', error)
    }
  })

  // 监听报警事件
  jt808Server.on('alarm', async (data) => {
    try {
      const { deviceId, alarms, location } = data

      // 保存报警到数据库
      const savedAlarms = await alarmService.saveAlarms(deviceId, alarms, location)

      // 获取设备信息
      const device = await deviceService.getDevice(deviceId)

      // 广播报警到前端
      for (const alarm of savedAlarms) {
        broadcastAlarm({
          deviceId,
          plateNo: device?.plate_no,
          alarmType: alarm.alarm_type,
          alarmName: alarm.alarm_name || '',
          alarmLevel: alarm.alarm_level,
          lat: Number(alarm.latitude),
          lng: Number(alarm.longitude),
          speed: Number(alarm.speed),
          gpsTime: alarm.gps_time
        })
      }
    } catch (error) {
      console.error('[JT808] 报警处理失败:', error)
    }
  })

  // 监听设备断开事件
  jt808Server.on('disconnect', async (data) => {
    try {
      const { deviceId } = data
      await deviceService.setOffline(deviceId)

      broadcastDeviceStatus({
        deviceId,
        isOnline: false,
        event: 'disconnect'
      })
    } catch (error) {
      console.error('[JT808] 设备断开处理失败:', error)
    }
  })

  // 启动JT808服务器
  await jt808Server.start()
  console.log(`📡 JT808 TCP服务器已启动，端口: ${JT808_PORT}`)
}

// 启动服务器
const PORT = process.env.PORT || 8080

async function startServer() {
  try {
    // 连接数据库
    const dbConnected = await testConnection()
    if (dbConnected) {
      // 同步模型(不强制重建表)
      await syncModels(false)
    } else {
      console.warn('[DB] 数据库连接失败，将使用模拟数据模式')
    }

    // 启动HTTP服务器
    httpServer.listen(PORT, async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📡 WebSocket server ready`)

      // 初始化JT808服务器
      try {
        await initializeJT808()
      } catch (error) {
        console.error('[JT808] 启动失败:', error)
      }
    })
  } catch (error) {
    console.error('Server startup failed:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...')
  if (jt808Server) {
    await jt808Server.stop()
  }
  httpServer.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...')
  if (jt808Server) {
    await jt808Server.stop()
  }
  httpServer.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

// 启动
startServer()

export { app, io, jt808Server }

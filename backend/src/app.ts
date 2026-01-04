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
import { setupWebSocket } from './websocket'

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

// 启动服务器
const PORT = process.env.PORT || 8080

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket server ready`)
})

export { app, io }

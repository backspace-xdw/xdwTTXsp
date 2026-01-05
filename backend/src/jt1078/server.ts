/**
 * JT/T 1078 TCP 服务器
 * 接收车载终端的视频流数据
 */

import net, { Socket, Server } from 'net'
import { EventEmitter } from 'events'
import {
  DEFAULT_PORT,
  CONNECTION_TIMEOUT,
  CHANNEL_NAMES,
  DATA_TYPE,
} from './constants'
import {
  FrameBuffer,
  JT1078Frame,
  JT1078FrameHeader,
  isKeyFrame,
  isVideoFrame,
  isAudioFrame,
  getDataTypeName,
} from './parser'

/**
 * 连接信息
 */
interface ConnectionInfo {
  socket: Socket
  deviceId: string | null
  channels: Set<number>
  frameBuffer: FrameBuffer
  lastActivity: number
  frameCount: number
  bytesReceived: number
}

/**
 * 服务器事件
 */
export interface JT1078ServerEvents {
  'connection': (deviceId: string, channels: number[]) => void
  'disconnection': (deviceId: string) => void
  'frame': (deviceId: string, channel: number, frame: JT1078Frame) => void
  'video': (deviceId: string, channel: number, data: Buffer, isKeyFrame: boolean) => void
  'audio': (deviceId: string, channel: number, data: Buffer) => void
  'error': (error: Error) => void
}

/**
 * JT1078 TCP 服务器
 */
export class JT1078Server extends EventEmitter {
  private server: Server | null = null
  private connections: Map<string, ConnectionInfo> = new Map()
  private socketToConnection: Map<Socket, ConnectionInfo> = new Map()
  private port: number
  private timeoutChecker: NodeJS.Timeout | null = null

  constructor(port: number = DEFAULT_PORT) {
    super()
    this.port = port
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket))

      this.server.on('error', (err) => {
        console.error('[JT1078] Server error:', err)
        this.emit('error', err)
        reject(err)
      })

      this.server.listen(this.port, () => {
        console.log(`[JT1078] Video server listening on port ${this.port}`)
        this.startTimeoutChecker()
        resolve()
      })
    })
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.stopTimeoutChecker()

      // 关闭所有连接
      for (const conn of this.connections.values()) {
        conn.socket.destroy()
      }
      this.connections.clear()
      this.socketToConnection.clear()

      if (this.server) {
        this.server.close(() => {
          console.log('[JT1078] Server stopped')
          this.server = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: Socket): void {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`[JT1078] New connection from ${remoteAddr}`)

    const conn: ConnectionInfo = {
      socket,
      deviceId: null,
      channels: new Set(),
      frameBuffer: new FrameBuffer(),
      lastActivity: Date.now(),
      frameCount: 0,
      bytesReceived: 0,
    }

    this.socketToConnection.set(socket, conn)

    socket.on('data', (data) => this.handleData(conn, data))
    socket.on('close', () => this.handleClose(conn))
    socket.on('error', (err) => this.handleError(conn, err))
  }

  /**
   * 处理接收数据
   */
  private handleData(conn: ConnectionInfo, data: Buffer): void {
    conn.lastActivity = Date.now()
    conn.bytesReceived += data.length
    conn.frameBuffer.append(data)

    // 提取所有完整帧
    const frames = conn.frameBuffer.extractAllFrames()

    for (const frame of frames) {
      this.processFrame(conn, frame)
    }
  }

  /**
   * 处理单个帧
   */
  private processFrame(conn: ConnectionInfo, frame: JT1078Frame): void {
    const { header, body } = frame
    const deviceId = header.deviceId
    const channel = header.channel

    conn.frameCount++

    // 首次识别设备ID
    if (!conn.deviceId) {
      conn.deviceId = deviceId
      this.connections.set(deviceId, conn)
      console.log(`[JT1078] Device identified: ${deviceId}`)
    }

    // 记录通道
    if (!conn.channels.has(channel)) {
      conn.channels.add(channel)
      console.log(`[JT1078] Device ${deviceId} channel ${channel} (${CHANNEL_NAMES[channel] || 'Unknown'}) active`)
      this.emit('connection', deviceId, Array.from(conn.channels))
    }

    // 发送帧事件
    this.emit('frame', deviceId, channel, frame)

    // 按类型分发
    if (isVideoFrame(header)) {
      this.emit('video', deviceId, channel, body, isKeyFrame(header))

      // 调试日志 (每100帧打印一次)
      if (conn.frameCount % 100 === 0) {
        console.log(
          `[JT1078] ${deviceId} CH${channel}: ${getDataTypeName(header.dataType)}, ` +
          `seq=${header.sequenceNumber}, size=${body.length}, total=${conn.frameCount}`
        )
      }
    } else if (isAudioFrame(header)) {
      this.emit('audio', deviceId, channel, body)
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(conn: ConnectionInfo): void {
    const deviceId = conn.deviceId || 'unknown'
    console.log(`[JT1078] Connection closed: ${deviceId}`)

    if (conn.deviceId) {
      this.connections.delete(conn.deviceId)
      this.emit('disconnection', conn.deviceId)
    }

    this.socketToConnection.delete(conn.socket)
  }

  /**
   * 处理连接错误
   */
  private handleError(conn: ConnectionInfo, err: Error): void {
    const deviceId = conn.deviceId || 'unknown'
    console.error(`[JT1078] Connection error for ${deviceId}:`, err.message)
  }

  /**
   * 启动超时检查
   */
  private startTimeoutChecker(): void {
    this.timeoutChecker = setInterval(() => {
      const now = Date.now()
      for (const [deviceId, conn] of this.connections) {
        if (now - conn.lastActivity > CONNECTION_TIMEOUT) {
          console.log(`[JT1078] Connection timeout: ${deviceId}`)
          conn.socket.destroy()
        }
      }
    }, 10000) // 每10秒检查一次
  }

  /**
   * 停止超时检查
   */
  private stopTimeoutChecker(): void {
    if (this.timeoutChecker) {
      clearInterval(this.timeoutChecker)
      this.timeoutChecker = null
    }
  }

  /**
   * 获取在线设备列表
   */
  getOnlineDevices(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * 获取设备活跃通道
   */
  getDeviceChannels(deviceId: string): number[] {
    const conn = this.connections.get(deviceId)
    return conn ? Array.from(conn.channels) : []
  }

  /**
   * 检查设备是否在线
   */
  isDeviceOnline(deviceId: string): boolean {
    return this.connections.has(deviceId)
  }

  /**
   * 获取设备统计信息
   */
  getDeviceStats(deviceId: string): { frameCount: number; bytesReceived: number } | null {
    const conn = this.connections.get(deviceId)
    if (!conn) return null
    return {
      frameCount: conn.frameCount,
      bytesReceived: conn.bytesReceived,
    }
  }

  /**
   * 获取服务器统计
   */
  getServerStats(): {
    port: number
    connections: number
    devices: string[]
  } {
    return {
      port: this.port,
      connections: this.connections.size,
      devices: this.getOnlineDevices(),
    }
  }
}

// 单例导出
let serverInstance: JT1078Server | null = null

export function getJT1078Server(port?: number): JT1078Server {
  if (!serverInstance) {
    serverInstance = new JT1078Server(port)
  }
  return serverInstance
}

export default JT1078Server

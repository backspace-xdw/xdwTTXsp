/**
 * JT/T 808 TCP服务器
 * 管理设备连接、数据接收、消息分发
 */

import * as net from 'net'
import { EventEmitter } from 'events'
import {
  extractFrames,
  parseFrame,
  parseLocation,
  parseRegister,
  buildGeneralAck,
  buildRegisterAck,
  getMsgIdName,
  JT808Message,
  parseMileage,
  parseFuel,
  parseRecordSpeed
} from './parser'
import {
  MSG_ID,
  ACK_RESULT,
  REGISTER_RESULT,
  LocationInfo,
  RegisterInfo,
  STATUS_FLAG,
  ALARM_FLAG
} from './constants'

// 报警信息接口
interface AlarmInfo {
  type: number
  name: string
  flag: number
}

// 连接信息
export interface ConnectionInfo {
  socket: net.Socket
  deviceId: string
  remoteAddress: string
  remotePort: number
  connectTime: Date
  lastHeartbeat: Date
  buffer: Buffer
  msgSeq: number
  is2019: boolean
  isAuthenticated: boolean
}

// 服务器配置
export interface JT808ServerConfig {
  port: number
  heartbeatTimeout: number // 心跳超时时间(ms)
  heartbeatCheckInterval: number // 心跳检查间隔(ms)
}

// 默认配置
const DEFAULT_CONFIG: JT808ServerConfig = {
  port: 8808,
  heartbeatTimeout: 180000, // 3分钟
  heartbeatCheckInterval: 30000 // 30秒
}

/**
 * JT/T 808 TCP服务器
 */
export class JT808Server extends EventEmitter {
  private server: net.Server | null = null
  private config: JT808ServerConfig
  private connections: Map<string, ConnectionInfo> = new Map() // deviceId -> ConnectionInfo
  private socketMap: Map<net.Socket, string> = new Map() // socket -> deviceId
  private heartbeatTimer: NodeJS.Timeout | null = null
  private msgSeqCounter: number = 0

  constructor(config: Partial<JT808ServerConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket))

      this.server.on('error', (error) => {
        console.error('[JT808] 服务器错误:', error)
        this.emit('error', error)
        reject(error)
      })

      this.server.listen(this.config.port, () => {
        console.log(`[JT808] TCP服务器已启动，监听端口: ${this.config.port}`)
        this.startHeartbeatCheck()
        this.emit('start', this.config.port)
        resolve()
      })
    })
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.stopHeartbeatCheck()

      // 断开所有连接
      for (const [, conn] of this.connections) {
        conn.socket.destroy()
      }
      this.connections.clear()
      this.socketMap.clear()

      if (this.server) {
        this.server.close(() => {
          console.log('[JT808] TCP服务器已停止')
          this.emit('stop')
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
  private handleConnection(socket: net.Socket): void {
    const remoteAddress = socket.remoteAddress || 'unknown'
    const remotePort = socket.remotePort || 0
    console.log(`[JT808] 新连接: ${remoteAddress}:${remotePort}`)

    // 临时连接信息(设备ID在注册/鉴权后确定)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const connInfo: ConnectionInfo = {
      socket,
      deviceId: tempId,
      remoteAddress,
      remotePort,
      connectTime: new Date(),
      lastHeartbeat: new Date(),
      buffer: Buffer.alloc(0),
      msgSeq: 0,
      is2019: false,
      isAuthenticated: false
    }

    this.connections.set(tempId, connInfo)
    this.socketMap.set(socket, tempId)

    socket.on('data', (data) => this.handleData(socket, data))
    socket.on('close', () => this.handleClose(socket))
    socket.on('error', (error) => this.handleError(socket, error))

    this.emit('connection', { remoteAddress, remotePort })
  }

  /**
   * 处理接收数据
   */
  private handleData(socket: net.Socket, data: Buffer): void {
    const deviceId = this.socketMap.get(socket)
    if (!deviceId) return

    const connInfo = this.connections.get(deviceId)
    if (!connInfo) return

    // 累积数据
    connInfo.buffer = Buffer.concat([connInfo.buffer, data])

    // 提取完整帧
    const { frames, remaining } = extractFrames(connInfo.buffer)
    connInfo.buffer = remaining

    // 处理每个帧
    for (const frame of frames) {
      this.processFrame(connInfo, frame)
    }
  }

  /**
   * 处理单个帧
   */
  private processFrame(connInfo: ConnectionInfo, frameData: Buffer): void {
    const message = parseFrame(frameData)
    if (!message) {
      console.error('[JT808] 解析帧失败')
      return
    }

    const msgIdName = getMsgIdName(message.header.msgId)
    console.log(`[JT808] 收到消息: ${msgIdName} (0x${message.header.msgId.toString(16).padStart(4, '0')}) from ${message.header.deviceId}`)

    // 检查协议版本
    if (message.header.protocolVersion !== undefined) {
      connInfo.is2019 = true
    }

    // 更新设备ID
    this.updateDeviceId(connInfo, message.header.deviceId)

    // 更新心跳时间
    connInfo.lastHeartbeat = new Date()

    // 分发消息
    switch (message.header.msgId) {
      case MSG_ID.TERMINAL_REGISTER:
        this.handleRegister(connInfo, message)
        break
      case MSG_ID.TERMINAL_AUTH:
        this.handleAuth(connInfo, message)
        break
      case MSG_ID.TERMINAL_HEARTBEAT:
        this.handleHeartbeat(connInfo, message)
        break
      case MSG_ID.LOCATION_REPORT:
        this.handleLocationReport(connInfo, message)
        break
      case MSG_ID.TERMINAL_LOGOUT:
        this.handleLogout(connInfo, message)
        break
      case MSG_ID.TERMINAL_GENERAL_ACK:
        this.handleTerminalAck(connInfo, message)
        break
      default:
        // 其他消息发送通用应答
        this.sendGeneralAck(connInfo, message.header.msgSeq, message.header.msgId, ACK_RESULT.SUCCESS)
        this.emit('message', { deviceId: connInfo.deviceId, message })
    }
  }

  /**
   * 更新设备ID(从临时ID更新为真实ID)
   */
  private updateDeviceId(connInfo: ConnectionInfo, newDeviceId: string): void {
    const oldDeviceId = connInfo.deviceId

    if (oldDeviceId !== newDeviceId) {
      // 检查是否有重复连接
      const existingConn = this.connections.get(newDeviceId)
      if (existingConn && existingConn !== connInfo) {
        console.log(`[JT808] 设备 ${newDeviceId} 重复连接，断开旧连接`)
        existingConn.socket.destroy()
        this.connections.delete(newDeviceId)
      }

      // 更新映射
      this.connections.delete(oldDeviceId)
      this.connections.set(newDeviceId, connInfo)
      this.socketMap.set(connInfo.socket, newDeviceId)
      connInfo.deviceId = newDeviceId
    }
  }

  /**
   * 处理终端注册
   */
  private handleRegister(connInfo: ConnectionInfo, message: JT808Message): void {
    const registerInfo = parseRegister(message.body, connInfo.is2019)

    if (registerInfo) {
      console.log(`[JT808] 终端注册: 车牌=${registerInfo.plateNo}, 制造商=${registerInfo.manufacturerId}, 型号=${registerInfo.terminalModel}`)

      // 生成鉴权码
      const authCode = this.generateAuthCode(connInfo.deviceId)

      // 发送注册应答(成功)
      this.sendRegisterAck(connInfo, message.header.msgSeq, REGISTER_RESULT.SUCCESS, authCode)

      // 触发事件
      this.emit('register', {
        deviceId: connInfo.deviceId,
        registerInfo,
        authCode
      })
    } else {
      // 注册失败
      this.sendRegisterAck(connInfo, message.header.msgSeq, REGISTER_RESULT.NO_TERMINAL, '')
    }
  }

  /**
   * 处理终端鉴权
   */
  private handleAuth(connInfo: ConnectionInfo, message: JT808Message): void {
    // 鉴权码在消息体中
    const authCode = message.body.toString('utf8').replace(/\0/g, '').trim()
    console.log(`[JT808] 终端鉴权: ${connInfo.deviceId}, 鉴权码=${authCode}`)

    // 这里可以验证鉴权码，目前直接通过
    connInfo.isAuthenticated = true

    // 发送通用应答(成功)
    this.sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_AUTH, ACK_RESULT.SUCCESS)

    // 触发事件
    this.emit('auth', {
      deviceId: connInfo.deviceId,
      authCode,
      success: true
    })
  }

  /**
   * 处理心跳
   */
  private handleHeartbeat(connInfo: ConnectionInfo, message: JT808Message): void {
    console.log(`[JT808] 心跳: ${connInfo.deviceId}`)

    // 发送通用应答
    this.sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_HEARTBEAT, ACK_RESULT.SUCCESS)

    // 触发事件
    this.emit('heartbeat', {
      deviceId: connInfo.deviceId,
      time: new Date()
    })
  }

  /**
   * 处理位置上报
   */
  private handleLocationReport(connInfo: ConnectionInfo, message: JT808Message): void {
    const location = parseLocation(message.body)

    if (location) {
      // 解析状态标志
      const statusInfo = {
        accOn: (location.status & STATUS_FLAG.ACC_ON) !== 0,
        located: (location.status & STATUS_FLAG.LOCATED) !== 0,
        southLat: (location.status & STATUS_FLAG.SOUTH_LAT) !== 0,
        westLng: (location.status & STATUS_FLAG.WEST_LNG) !== 0,
        operating: (location.status & STATUS_FLAG.OPERATING) !== 0,
        encrypted: (location.status & STATUS_FLAG.LAT_LNG_ENCRYPTED) !== 0,
        gpsLocated: (location.status & STATUS_FLAG.GPS_LOCATED) !== 0,
        beidouLocated: (location.status & STATUS_FLAG.BEIDOU_LOCATED) !== 0,
      }

      // 处理南纬/西经
      let lat = location.latitude
      let lng = location.longitude
      if (statusInfo.southLat) lat = -lat
      if (statusInfo.westLng) lng = -lng

      // 解析附加信息
      const extras: { mileage?: number; fuel?: number; recordSpeed?: number } = {}
      if (location.extras) {
        extras.mileage = parseMileage(location.extras) ?? undefined
        extras.fuel = parseFuel(location.extras) ?? undefined
        extras.recordSpeed = parseRecordSpeed(location.extras) ?? undefined
      }

      console.log(`[JT808] 位置上报: ${connInfo.deviceId} - 经度=${lng.toFixed(6)}, 纬度=${lat.toFixed(6)}, 速度=${location.speed}km/h`)

      // 发送通用应答
      this.sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.LOCATION_REPORT, ACK_RESULT.SUCCESS)

      // 触发事件 - 包含完整的状态和附加信息
      this.emit('location', {
        deviceId: connInfo.deviceId,
        location: {
          ...location,
          latitude: lat,
          longitude: lng
        },
        extras,
        status: statusInfo
      })

      // 解析并处理报警
      if (location.alarmFlag > 0) {
        const alarms = this.parseAlarms(location.alarmFlag)
        if (alarms.length > 0) {
          console.log(`[JT808] 检测到报警: ${connInfo.deviceId}`, alarms.map(a => a.name))

          this.emit('alarm', {
            deviceId: connInfo.deviceId,
            alarms,
            location: {
              ...location,
              latitude: lat,
              longitude: lng
            }
          })
        }
      }
    } else {
      // 解析失败
      this.sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.LOCATION_REPORT, ACK_RESULT.MSG_ERROR)
    }
  }

  /**
   * 解析报警标志
   */
  private parseAlarms(alarmFlag: number): AlarmInfo[] {
    const alarms: AlarmInfo[] = []

    const alarmTypes = [
      { flag: ALARM_FLAG.EMERGENCY, type: 0, name: '紧急报警' },
      { flag: ALARM_FLAG.OVERSPEED, type: 1, name: '超速报警' },
      { flag: ALARM_FLAG.FATIGUE, type: 2, name: '疲劳驾驶' },
      { flag: ALARM_FLAG.DANGER_WARNING, type: 3, name: '危险预警' },
      { flag: ALARM_FLAG.GNSS_FAULT, type: 4, name: 'GNSS模块故障' },
      { flag: ALARM_FLAG.GNSS_ANTENNA_CUT, type: 5, name: 'GNSS天线被剪断' },
      { flag: ALARM_FLAG.GNSS_ANTENNA_SHORT, type: 6, name: 'GNSS天线短路' },
      { flag: ALARM_FLAG.MAIN_POWER_LOW, type: 7, name: '主电源欠压' },
      { flag: ALARM_FLAG.MAIN_POWER_OFF, type: 8, name: '主电源掉电' },
      { flag: ALARM_FLAG.LCD_FAULT, type: 9, name: 'LCD故障' },
      { flag: ALARM_FLAG.TTS_FAULT, type: 10, name: 'TTS模块故障' },
      { flag: ALARM_FLAG.CAMERA_FAULT, type: 11, name: '摄像头故障' },
      { flag: ALARM_FLAG.IC_CARD_FAULT, type: 12, name: 'IC卡模块故障' },
      { flag: ALARM_FLAG.OVERSPEED_WARNING, type: 13, name: '超速预警' },
      { flag: ALARM_FLAG.FATIGUE_WARNING, type: 14, name: '疲劳驾驶预警' },
      { flag: ALARM_FLAG.DRIVING_TIMEOUT_DAY, type: 18, name: '当天累计驾驶超时' },
      { flag: ALARM_FLAG.PARKING_TIMEOUT, type: 19, name: '超时停车' },
      { flag: ALARM_FLAG.ENTER_EXIT_AREA, type: 20, name: '进出区域' },
      { flag: ALARM_FLAG.ENTER_EXIT_ROUTE, type: 21, name: '进出路线' },
      { flag: ALARM_FLAG.ROUTE_TIME_ERROR, type: 22, name: '路段行驶时间异常' },
      { flag: ALARM_FLAG.ROUTE_DEVIATION, type: 23, name: '路线偏离' },
      { flag: ALARM_FLAG.VSS_FAULT, type: 24, name: 'VSS故障' },
      { flag: ALARM_FLAG.FUEL_ABNORMAL, type: 25, name: '油量异常' },
      { flag: ALARM_FLAG.VEHICLE_STOLEN, type: 26, name: '车辆被盗' },
      { flag: ALARM_FLAG.ILLEGAL_IGNITION, type: 27, name: '非法点火' },
      { flag: ALARM_FLAG.ILLEGAL_DISPLACEMENT, type: 28, name: '非法位移' },
      { flag: ALARM_FLAG.COLLISION_WARNING, type: 29, name: '碰撞预警' },
      { flag: ALARM_FLAG.ROLLOVER_WARNING, type: 30, name: '侧翻预警' },
      { flag: ALARM_FLAG.ILLEGAL_DOOR_OPEN, type: 31, name: '非法开门' },
    ]

    for (const alarm of alarmTypes) {
      if ((alarmFlag & alarm.flag) !== 0) {
        alarms.push({
          type: alarm.type,
          name: alarm.name,
          flag: alarm.flag
        })
      }
    }

    return alarms
  }

  /**
   * 处理终端注销
   */
  private handleLogout(connInfo: ConnectionInfo, message: JT808Message): void {
    console.log(`[JT808] 终端注销: ${connInfo.deviceId}`)

    // 发送通用应答
    this.sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_LOGOUT, ACK_RESULT.SUCCESS)

    // 触发事件
    this.emit('logout', {
      deviceId: connInfo.deviceId
    })

    // 断开连接
    connInfo.socket.end()
  }

  /**
   * 处理终端通用应答
   */
  private handleTerminalAck(connInfo: ConnectionInfo, message: JT808Message): void {
    if (message.body.length >= 5) {
      const ackSeq = message.body.readUInt16BE(0)
      const ackMsgId = message.body.readUInt16BE(2)
      const result = message.body.readUInt8(4)

      console.log(`[JT808] 终端应答: ${connInfo.deviceId} - 流水号=${ackSeq}, 消息ID=0x${ackMsgId.toString(16)}, 结果=${result}`)

      this.emit('terminalAck', {
        deviceId: connInfo.deviceId,
        ackSeq,
        ackMsgId,
        result
      })
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(socket: net.Socket): void {
    const deviceId = this.socketMap.get(socket)
    if (deviceId) {
      const connInfo = this.connections.get(deviceId)
      console.log(`[JT808] 连接关闭: ${deviceId} (${connInfo?.remoteAddress})`)

      this.connections.delete(deviceId)
      this.socketMap.delete(socket)

      this.emit('disconnect', { deviceId })
    }
  }

  /**
   * 处理连接错误
   */
  private handleError(socket: net.Socket, error: Error): void {
    const deviceId = this.socketMap.get(socket)
    console.error(`[JT808] 连接错误: ${deviceId}`, error.message)

    this.emit('connectionError', { deviceId, error })
  }

  /**
   * 发送平台通用应答
   */
  private sendGeneralAck(
    connInfo: ConnectionInfo,
    ackSeq: number,
    ackMsgId: number,
    result: number
  ): void {
    const response = buildGeneralAck(
      connInfo.deviceId,
      this.getNextMsgSeq(),
      ackSeq,
      ackMsgId,
      result,
      connInfo.is2019
    )

    connInfo.socket.write(response)
  }

  /**
   * 发送终端注册应答
   */
  private sendRegisterAck(
    connInfo: ConnectionInfo,
    ackSeq: number,
    result: number,
    authCode: string
  ): void {
    const response = buildRegisterAck(
      connInfo.deviceId,
      this.getNextMsgSeq(),
      ackSeq,
      result,
      authCode,
      connInfo.is2019
    )

    connInfo.socket.write(response)
  }

  /**
   * 向指定设备发送消息
   */
  sendToDevice(deviceId: string, data: Buffer): boolean {
    const connInfo = this.connections.get(deviceId)
    if (connInfo && connInfo.isAuthenticated) {
      connInfo.socket.write(data)
      return true
    }
    return false
  }

  /**
   * 广播消息到所有在线设备
   */
  broadcast(data: Buffer): void {
    for (const [, connInfo] of this.connections) {
      if (connInfo.isAuthenticated) {
        connInfo.socket.write(data)
      }
    }
  }

  /**
   * 获取下一个消息流水号
   */
  private getNextMsgSeq(): number {
    this.msgSeqCounter = (this.msgSeqCounter + 1) % 65536
    return this.msgSeqCounter
  }

  /**
   * 生成鉴权码
   */
  private generateAuthCode(deviceId: string): string {
    // 简单实现: 使用设备ID + 时间戳生成
    const timestamp = Date.now().toString(36)
    return `${deviceId.slice(-6)}_${timestamp}`
  }

  /**
   * 启动心跳检查
   */
  private startHeartbeatCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()
      const timeout = this.config.heartbeatTimeout

      for (const [deviceId, connInfo] of this.connections) {
        const lastHeartbeat = connInfo.lastHeartbeat.getTime()
        if (now - lastHeartbeat > timeout) {
          console.log(`[JT808] 心跳超时: ${deviceId}`)
          connInfo.socket.destroy()
          this.emit('timeout', { deviceId })
        }
      }
    }, this.config.heartbeatCheckInterval)
  }

  /**
   * 停止心跳检查
   */
  private stopHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 获取在线设备数量
   */
  getOnlineCount(): number {
    let count = 0
    for (const [, connInfo] of this.connections) {
      if (connInfo.isAuthenticated) {
        count++
      }
    }
    return count
  }

  /**
   * 获取所有在线设备ID
   */
  getOnlineDevices(): string[] {
    const devices: string[] = []
    for (const [deviceId, connInfo] of this.connections) {
      if (connInfo.isAuthenticated) {
        devices.push(deviceId)
      }
    }
    return devices
  }

  /**
   * 检查设备是否在线
   */
  isDeviceOnline(deviceId: string): boolean {
    const connInfo = this.connections.get(deviceId)
    return connInfo?.isAuthenticated ?? false
  }

  /**
   * 获取设备连接信息
   */
  getDeviceInfo(deviceId: string): ConnectionInfo | undefined {
    return this.connections.get(deviceId)
  }
}

// 导出单例
let serverInstance: JT808Server | null = null

export function getJT808Server(config?: Partial<JT808ServerConfig>): JT808Server {
  if (!serverInstance) {
    serverInstance = new JT808Server(config)
  }
  return serverInstance
}

export function createJT808Server(config?: Partial<JT808ServerConfig>): JT808Server {
  return new JT808Server(config)
}

/**
 * JT808 协议模拟器
 * 用于测试 JT808 服务器
 */

import * as net from 'net'
import {
  escape,
  unescape,
  calculateChecksum,
  parseFrame,
  stringToBCD,
  dateToBCDTime,
  getMsgIdName
} from './parser'
import { FRAME_DELIMITER, MSG_ID } from './constants'

// 模拟器配置
interface SimulatorConfig {
  host: string
  port: number
  deviceId: string
  plateNo: string
  manufacturerId: string
  terminalModel: string
  terminalId: string
}

const DEFAULT_CONFIG: SimulatorConfig = {
  host: '127.0.0.1',
  port: 8808,
  deviceId: '013912345678',
  plateNo: '京A12345',
  manufacturerId: 'XDWTT',
  terminalModel: 'GPS-V1',
  terminalId: 'T001'
}

class JT808Simulator {
  private socket: net.Socket | null = null
  private config: SimulatorConfig
  private msgSeq: number = 0
  private buffer: Buffer = Buffer.alloc(0)
  private authCode: string = ''
  private isConnected: boolean = false

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 连接服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket()

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log(`[模拟器] 已连接到 ${this.config.host}:${this.config.port}`)
        this.isConnected = true
        resolve()
      })

      this.socket.on('data', (data) => this.handleData(data))

      this.socket.on('close', () => {
        console.log('[模拟器] 连接已关闭')
        this.isConnected = false
      })

      this.socket.on('error', (error) => {
        console.error('[模拟器] 连接错误:', error.message)
        reject(error)
      })
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
      this.isConnected = false
    }
  }

  /**
   * 处理接收数据
   */
  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])

    // 查找完整帧
    let start = -1
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === FRAME_DELIMITER) {
        if (start === -1) {
          start = i
        } else {
          // 找到完整帧
          const frame = this.buffer.subarray(start + 1, i)
          if (frame.length > 0) {
            this.processResponse(unescape(frame))
          }
          this.buffer = this.buffer.subarray(i + 1)
          start = -1
          i = -1 // 重新开始搜索
        }
      }
    }
  }

  /**
   * 处理服务器响应
   */
  private processResponse(data: Buffer): void {
    const message = parseFrame(data)
    if (!message) {
      console.error('[模拟器] 解析响应失败')
      return
    }

    const msgIdName = getMsgIdName(message.header.msgId)
    console.log(`[模拟器] 收到响应: ${msgIdName} (0x${message.header.msgId.toString(16).padStart(4, '0')})`)

    switch (message.header.msgId) {
      case MSG_ID.REGISTER_ACK:
        this.handleRegisterAck(message.body)
        break
      case MSG_ID.PLATFORM_GENERAL_ACK:
        this.handleGeneralAck(message.body)
        break
      default:
        console.log(`[模拟器] 未处理的消息类型: 0x${message.header.msgId.toString(16)}`)
    }
  }

  /**
   * 处理注册应答
   */
  private handleRegisterAck(body: Buffer): void {
    if (body.length < 3) return

    const ackSeq = body.readUInt16BE(0)
    const result = body.readUInt8(2)

    const resultNames = ['成功', '车辆已注册', '无该车辆', '终端已注册', '无该终端']
    console.log(`[模拟器] 注册应答: 流水号=${ackSeq}, 结果=${resultNames[result] || result}`)

    if (result === 0 && body.length > 3) {
      // 提取鉴权码
      this.authCode = body.subarray(3).toString('utf8').replace(/\0/g, '')
      console.log(`[模拟器] 获得鉴权码: ${this.authCode}`)
    }
  }

  /**
   * 处理通用应答
   */
  private handleGeneralAck(body: Buffer): void {
    if (body.length < 5) return

    const ackSeq = body.readUInt16BE(0)
    const ackMsgId = body.readUInt16BE(2)
    const result = body.readUInt8(4)

    const resultNames = ['成功', '失败', '消息有误', '不支持', '报警已确认']
    const msgIdName = getMsgIdName(ackMsgId)
    console.log(`[模拟器] 通用应答: 消息=${msgIdName}, 结果=${resultNames[result] || result}`)
  }

  /**
   * 发送数据帧
   */
  private sendFrame(msgId: number, body: Buffer = Buffer.alloc(0)): void {
    if (!this.socket || !this.isConnected) {
      console.error('[模拟器] 未连接')
      return
    }

    // 构建消息头
    const headerParts: Buffer[] = []

    // 消息ID (2字节)
    const msgIdBuf = Buffer.alloc(2)
    msgIdBuf.writeUInt16BE(msgId, 0)
    headerParts.push(msgIdBuf)

    // 消息体属性 (2字节) - 简化版,不含分包
    const bodyLength = body.length & 0x03ff
    const attrBuf = Buffer.alloc(2)
    attrBuf.writeUInt16BE(bodyLength, 0)
    headerParts.push(attrBuf)

    // 终端手机号 (6字节BCD)
    headerParts.push(stringToBCD(this.config.deviceId, 6))

    // 消息流水号 (2字节)
    this.msgSeq = (this.msgSeq + 1) % 65536
    const seqBuf = Buffer.alloc(2)
    seqBuf.writeUInt16BE(this.msgSeq, 0)
    headerParts.push(seqBuf)

    // 组合
    const header = Buffer.concat(headerParts)
    const content = Buffer.concat([header, body])

    // 校验码
    const checksum = calculateChecksum(content)

    // 转义
    const frame = Buffer.concat([content, Buffer.from([checksum])])
    const escaped = escape(frame)

    // 发送
    const packet = Buffer.concat([
      Buffer.from([FRAME_DELIMITER]),
      escaped,
      Buffer.from([FRAME_DELIMITER])
    ])

    this.socket.write(packet)
    console.log(`[模拟器] 发送: ${getMsgIdName(msgId)} (0x${msgId.toString(16).padStart(4, '0')})`)
  }

  /**
   * 发送终端注册
   */
  sendRegister(): void {
    const parts: Buffer[] = []

    // 省域ID (2字节)
    const provinceBuf = Buffer.alloc(2)
    provinceBuf.writeUInt16BE(11, 0) // 北京
    parts.push(provinceBuf)

    // 市县域ID (2字节)
    const cityBuf = Buffer.alloc(2)
    cityBuf.writeUInt16BE(0, 0)
    parts.push(cityBuf)

    // 制造商ID (5字节)
    const manufacturer = Buffer.alloc(5)
    manufacturer.write(this.config.manufacturerId.padEnd(5, '\0'))
    parts.push(manufacturer)

    // 终端型号 (20字节)
    const model = Buffer.alloc(20)
    model.write(this.config.terminalModel.padEnd(20, '\0'))
    parts.push(model)

    // 终端ID (7字节)
    const terminalId = Buffer.alloc(7)
    terminalId.write(this.config.terminalId.padEnd(7, '\0'))
    parts.push(terminalId)

    // 车牌颜色 (1字节) - 1:蓝色
    parts.push(Buffer.from([1]))

    // 车牌号
    parts.push(Buffer.from(this.config.plateNo, 'utf8'))

    this.sendFrame(MSG_ID.TERMINAL_REGISTER, Buffer.concat(parts))
  }

  /**
   * 发送终端鉴权
   */
  sendAuth(authCode?: string): void {
    const code = authCode || this.authCode || 'default_auth'
    const body = Buffer.from(code, 'utf8')
    this.sendFrame(MSG_ID.TERMINAL_AUTH, body)
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): void {
    this.sendFrame(MSG_ID.TERMINAL_HEARTBEAT)
  }

  /**
   * 发送位置信息
   */
  sendLocation(options?: {
    lat?: number
    lng?: number
    speed?: number
    direction?: number
    altitude?: number
    alarmFlag?: number
    status?: number
  }): void {
    const lat = options?.lat ?? 39.9042
    const lng = options?.lng ?? 116.4074
    const speed = options?.speed ?? 60
    const direction = options?.direction ?? 90
    const altitude = options?.altitude ?? 50
    const alarmFlag = options?.alarmFlag ?? 0
    const status = options?.status ?? 0x03 // ACC开 + 已定位

    const body = Buffer.alloc(28)
    let offset = 0

    // 报警标志 (4字节)
    body.writeUInt32BE(alarmFlag, offset)
    offset += 4

    // 状态 (4字节)
    body.writeUInt32BE(status, offset)
    offset += 4

    // 纬度 (4字节) - 1e-6度
    body.writeUInt32BE(Math.round(lat * 1000000), offset)
    offset += 4

    // 经度 (4字节) - 1e-6度
    body.writeUInt32BE(Math.round(lng * 1000000), offset)
    offset += 4

    // 海拔 (2字节)
    body.writeUInt16BE(altitude, offset)
    offset += 2

    // 速度 (2字节) - 1/10 km/h
    body.writeUInt16BE(Math.round(speed * 10), offset)
    offset += 2

    // 方向 (2字节)
    body.writeUInt16BE(direction, offset)
    offset += 2

    // GPS时间 (6字节BCD)
    const timeBuf = dateToBCDTime(new Date())
    timeBuf.copy(body, offset)

    this.sendFrame(MSG_ID.LOCATION_REPORT, body)
  }

  /**
   * 运行完整测试流程
   */
  async runTest(): Promise<void> {
    console.log('\n========== JT808 协议测试 ==========\n')

    try {
      // 1. 连接
      await this.connect()
      await this.delay(500)

      // 2. 注册
      console.log('\n--- 步骤1: 终端注册 ---')
      this.sendRegister()
      await this.delay(1000)

      // 3. 鉴权
      console.log('\n--- 步骤2: 终端鉴权 ---')
      this.sendAuth()
      await this.delay(1000)

      // 4. 心跳
      console.log('\n--- 步骤3: 发送心跳 ---')
      this.sendHeartbeat()
      await this.delay(1000)

      // 5. 位置上报
      console.log('\n--- 步骤4: 位置上报 ---')

      // 模拟行驶轨迹
      const baseLocation = { lat: 39.9042, lng: 116.4074 }
      for (let i = 0; i < 5; i++) {
        this.sendLocation({
          lat: baseLocation.lat + (Math.random() - 0.5) * 0.01,
          lng: baseLocation.lng + (Math.random() - 0.5) * 0.01,
          speed: 30 + Math.random() * 50,
          direction: Math.floor(Math.random() * 360),
          status: 0x03 // ACC开 + 已定位
        })
        await this.delay(1000)
      }

      // 6. 模拟报警
      console.log('\n--- 步骤5: 模拟报警 ---')
      this.sendLocation({
        lat: baseLocation.lat,
        lng: baseLocation.lng,
        speed: 120,
        alarmFlag: 0x02, // 超速报警
        status: 0x03
      })
      await this.delay(1000)

      console.log('\n========== 测试完成 ==========\n')

    } catch (error) {
      console.error('测试失败:', error)
    } finally {
      this.disconnect()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 命令行运行
async function main() {
  const args = process.argv.slice(2)
  const host = args[0] || '127.0.0.1'
  const port = parseInt(args[1]) || 8808
  const deviceId = args[2] || '013912345678'

  console.log(`
╔════════════════════════════════════════╗
║       JT808 协议模拟器 v1.0            ║
╠════════════════════════════════════════╣
║  服务器: ${host}:${port}
║  设备ID: ${deviceId}
╚════════════════════════════════════════╝
`)

  const simulator = new JT808Simulator({
    host,
    port,
    deviceId,
    plateNo: '京A12345',
    manufacturerId: 'XDWTT',
    terminalModel: 'GPS-V1',
    terminalId: 'T001'
  })

  await simulator.runTest()
}

main().catch(console.error)

export { JT808Simulator }

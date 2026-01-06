/**
 * JT1078 视频模拟器
 * 用于测试视频流功能 (无需真实设备)
 */

import net from 'net'
import fs from 'fs'
import path from 'path'
import {
  FRAME_HEAD_FLAG,
  DATA_TYPE,
  PAYLOAD_TYPE,
  DEFAULT_PORT,
  SUBPACKAGE_FLAG,
} from './constants'
import { buildFrame, encodeBCD } from './parser'

/**
 * 模拟器配置
 */
export interface SimulatorConfig {
  host: string
  port: number
  deviceId: string
  channel: number
  frameRate: number    // 帧率 (fps)
  bitrate: number      // 比特率 (kbps)
  duration: number     // 持续时间 (秒), 0=无限
  videoFile: string    // H.264视频文件路径
  loop: boolean        // 是否循环播放
}

const DEFAULT_CONFIG: SimulatorConfig = {
  host: '127.0.0.1',
  port: DEFAULT_PORT,
  deviceId: '013912345678',
  channel: 1,
  frameRate: 25,
  bitrate: 1024,
  duration: 0,
  videoFile: '',
  loop: true,
}

/**
 * 生成 H.264 NAL 单元 (模拟)
 * 这是一个简化的模拟，实际应该使用真实的视频数据
 */
function generateNALUnit(isKeyFrame: boolean, frameNum: number): Buffer {
  // NAL 单元头
  const nalHeader = isKeyFrame ? 0x65 : 0x41 // IDR slice / Non-IDR slice

  // 模拟帧数据大小
  const frameSize = isKeyFrame ?
    Math.floor(Math.random() * 20000) + 10000 :  // I帧: 10-30KB
    Math.floor(Math.random() * 5000) + 2000       // P帧: 2-7KB

  const nalUnit = Buffer.alloc(frameSize + 4)

  // 起始码 0x00000001
  nalUnit[0] = 0x00
  nalUnit[1] = 0x00
  nalUnit[2] = 0x00
  nalUnit[3] = 0x01

  // NAL 头
  nalUnit[4] = nalHeader

  // 填充模拟数据
  for (let i = 5; i < nalUnit.length; i++) {
    nalUnit[i] = Math.floor(Math.random() * 256)
  }

  return nalUnit
}

/**
 * 生成测试用的彩色条纹 H.264 帧
 * 这会生成有效的 H.264 数据
 */
function generateColorBarsFrame(width: number, height: number, frameNum: number, isKeyFrame: boolean): Buffer {
  // 简化的 H.264 帧生成
  // 实际生产中应该使用 FFmpeg 或其他编码器

  // SPS NAL (序列参数集) - 只在关键帧发送
  const sps = Buffer.from([
    0x00, 0x00, 0x00, 0x01, // 起始码
    0x67, // SPS NAL type
    0x42, 0x00, 0x1e, // profile_idc, constraint_set, level_idc
    0x89, 0x8b, 0x60, 0x50, // SPS 参数
  ])

  // PPS NAL (图像参数集) - 只在关键帧发送
  const pps = Buffer.from([
    0x00, 0x00, 0x00, 0x01, // 起始码
    0x68, // PPS NAL type
    0xce, 0x38, 0x80, // PPS 参数
  ])

  // 生成模拟的 slice 数据
  const sliceSize = isKeyFrame ? 15000 : 3000
  const slice = Buffer.alloc(sliceSize + 5)

  // 起始码
  slice[0] = 0x00
  slice[1] = 0x00
  slice[2] = 0x00
  slice[3] = 0x01

  // Slice header
  slice[4] = isKeyFrame ? 0x65 : 0x41 // IDR / non-IDR slice

  // 填充模拟数据 (实际应该是编码后的视频数据)
  for (let i = 5; i < slice.length; i++) {
    // 生成一些变化的数据以模拟视频内容
    slice[i] = (frameNum * i) % 256
  }

  if (isKeyFrame) {
    return Buffer.concat([sps, pps, slice])
  } else {
    return slice
  }
}

/**
 * 解析 H.264 文件中的 NAL 单元
 */
function parseNALUnits(buffer: Buffer): Buffer[] {
  const nalUnits: Buffer[] = []
  let i = 0

  while (i < buffer.length - 4) {
    // 查找起始码 0x00000001 或 0x000001
    if (buffer[i] === 0 && buffer[i + 1] === 0) {
      let startCodeLen = 0
      if (buffer[i + 2] === 0 && buffer[i + 3] === 1) {
        startCodeLen = 4
      } else if (buffer[i + 2] === 1) {
        startCodeLen = 3
      }

      if (startCodeLen > 0) {
        // 找到下一个起始码
        let nextStart = i + startCodeLen
        while (nextStart < buffer.length - 3) {
          if (buffer[nextStart] === 0 && buffer[nextStart + 1] === 0) {
            if ((buffer[nextStart + 2] === 0 && buffer[nextStart + 3] === 1) ||
                buffer[nextStart + 2] === 1) {
              break
            }
          }
          nextStart++
        }

        if (nextStart >= buffer.length - 3) {
          nextStart = buffer.length
        }

        // 提取 NAL 单元 (包含起始码)
        const nalUnit = buffer.slice(i, nextStart)
        nalUnits.push(nalUnit)
        i = nextStart
        continue
      }
    }
    i++
  }

  return nalUnits
}

/**
 * 判断 NAL 单元类型
 */
function getNALType(nalUnit: Buffer): { type: number; isKeyFrame: boolean } {
  // 跳过起始码找到 NAL header
  let offset = 0
  if (nalUnit[0] === 0 && nalUnit[1] === 0 && nalUnit[2] === 0 && nalUnit[3] === 1) {
    offset = 4
  } else if (nalUnit[0] === 0 && nalUnit[1] === 0 && nalUnit[2] === 1) {
    offset = 3
  }

  const nalHeader = nalUnit[offset]
  const nalType = nalHeader & 0x1f

  // NAL 类型: 5=IDR, 7=SPS, 8=PPS
  const isKeyFrame = nalType === 5 || nalType === 7 || nalType === 8

  return { type: nalType, isKeyFrame }
}

/**
 * JT1078 模拟器
 */
export class JT1078Simulator {
  private config: SimulatorConfig
  private socket: net.Socket | null = null
  private sequenceNumber: number = 0
  private frameCount: number = 0
  private running: boolean = false
  private frameTimer: NodeJS.Timeout | null = null
  private gopSize: number = 25 // I帧间隔 (GOP)

  // 视频文件相关
  private videoNALUnits: Buffer[] = []
  private currentNALIndex: number = 0
  private useRealVideo: boolean = false

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 加载视频文件
    if (this.config.videoFile) {
      this.loadVideoFile(this.config.videoFile)
    }
  }

  /**
   * 加载 H.264 视频文件
   */
  private loadVideoFile(filePath: string): void {
    try {
      const fullPath = path.resolve(filePath)
      console.log(`[Simulator] Loading video file: ${fullPath}`)

      if (!fs.existsSync(fullPath)) {
        console.error(`[Simulator] Video file not found: ${fullPath}`)
        return
      }

      const buffer = fs.readFileSync(fullPath)
      console.log(`[Simulator] File size: ${(buffer.length / 1024).toFixed(2)} KB`)

      this.videoNALUnits = parseNALUnits(buffer)
      console.log(`[Simulator] Parsed ${this.videoNALUnits.length} NAL units`)

      if (this.videoNALUnits.length > 0) {
        this.useRealVideo = true
        console.log('[Simulator] Using real video data')

        // 打印前几个 NAL 单元类型
        for (let i = 0; i < Math.min(10, this.videoNALUnits.length); i++) {
          const { type, isKeyFrame } = getNALType(this.videoNALUnits[i])
          console.log(`  NAL[${i}]: type=${type}, size=${this.videoNALUnits[i].length}, keyframe=${isKeyFrame}`)
        }
      }
    } catch (err) {
      console.error('[Simulator] Failed to load video file:', err)
    }
  }

  /**
   * 启动模拟器
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[Simulator] Already running')
      return
    }

    return new Promise((resolve, reject) => {
      console.log(`[Simulator] Connecting to ${this.config.host}:${this.config.port}`)
      console.log(`[Simulator] Device ID: ${this.config.deviceId}, Channel: ${this.config.channel}`)

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      })

      this.socket.on('connect', () => {
        console.log('[Simulator] Connected!')
        this.running = true
        this.startSending()
        resolve()
      })

      this.socket.on('error', (err) => {
        console.error('[Simulator] Connection error:', err.message)
        this.running = false
        reject(err)
      })

      this.socket.on('close', () => {
        console.log('[Simulator] Connection closed')
        this.running = false
        this.stopSending()
      })
    })
  }

  /**
   * 停止模拟器
   */
  stop(): void {
    console.log('[Simulator] Stopping...')
    this.running = false
    this.stopSending()

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  /**
   * 开始发送帧
   */
  private startSending(): void {
    const interval = 1000 / this.config.frameRate

    this.frameTimer = setInterval(() => {
      if (!this.running || !this.socket) {
        return
      }

      this.sendFrame()

      // 检查持续时间
      if (this.config.duration > 0) {
        const elapsed = this.frameCount / this.config.frameRate
        if (elapsed >= this.config.duration) {
          console.log(`[Simulator] Duration reached (${this.config.duration}s)`)
          this.stop()
        }
      }
    }, interval)

    console.log(`[Simulator] Sending at ${this.config.frameRate} fps`)
  }

  /**
   * 停止发送帧
   */
  private stopSending(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer)
      this.frameTimer = null
    }
  }

  /**
   * 发送单个帧
   */
  private sendFrame(): void {
    if (!this.socket || !this.socket.writable) {
      return
    }

    let frameData: Buffer
    let isKeyFrame: boolean
    let dataType: number

    if (this.useRealVideo && this.videoNALUnits.length > 0) {
      // 使用真实视频数据
      const nalUnit = this.videoNALUnits[this.currentNALIndex]
      const nalInfo = getNALType(nalUnit)

      frameData = nalUnit
      isKeyFrame = nalInfo.isKeyFrame
      dataType = isKeyFrame ? DATA_TYPE.I_FRAME : DATA_TYPE.P_FRAME

      // 移动到下一个 NAL 单元
      this.currentNALIndex++
      if (this.currentNALIndex >= this.videoNALUnits.length) {
        if (this.config.loop) {
          this.currentNALIndex = 0
          console.log('[Simulator] Video loop - restarting from beginning')
        } else {
          console.log('[Simulator] Video ended')
          this.stop()
          return
        }
      }
    } else {
      // 使用模拟数据
      isKeyFrame = this.frameCount % this.gopSize === 0
      dataType = isKeyFrame ? DATA_TYPE.I_FRAME : DATA_TYPE.P_FRAME
      frameData = generateColorBarsFrame(640, 480, this.frameCount, isKeyFrame)
    }

    // 时间戳 (毫秒)
    const timestamp = BigInt(Date.now())

    // 构建 JT1078 帧
    const jt1078Frame = buildFrame(
      this.config.deviceId,
      this.config.channel,
      dataType,
      PAYLOAD_TYPE.H264,
      this.sequenceNumber,
      timestamp,
      frameData
    )

    // 发送
    try {
      this.socket.write(jt1078Frame)
    } catch (err) {
      console.error('[Simulator] Send error:', err)
      return
    }

    this.sequenceNumber = (this.sequenceNumber + 1) % 65536
    this.frameCount++

    // 每秒打印一次状态
    if (this.frameCount % this.config.frameRate === 0) {
      const seconds = Math.floor(this.frameCount / this.config.frameRate)
      const mode = this.useRealVideo ? 'real' : 'simulated'
      console.log(
        `[Simulator] ${seconds}s: Sent ${this.frameCount} frames ` +
        `(${isKeyFrame ? 'I' : 'P'}-frame, ${frameData.length} bytes, ${mode})`
      )
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    running: boolean
    frameCount: number
    duration: number
    sequenceNumber: number
  } {
    return {
      running: this.running,
      frameCount: this.frameCount,
      duration: Math.floor(this.frameCount / this.config.frameRate),
      sequenceNumber: this.sequenceNumber,
    }
  }
}

/**
 * 命令行入口
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const config: Partial<SimulatorConfig> = {}

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--host':
      case '-h':
        config.host = args[++i]
        break
      case '--port':
      case '-p':
        config.port = parseInt(args[++i], 10)
        break
      case '--device':
      case '-d':
        config.deviceId = args[++i]
        break
      case '--channel':
      case '-c':
        config.channel = parseInt(args[++i], 10)
        break
      case '--fps':
      case '-f':
        config.frameRate = parseInt(args[++i], 10)
        break
      case '--duration':
      case '-t':
        config.duration = parseInt(args[++i], 10)
        break
      case '--video':
      case '-v':
        config.videoFile = args[++i]
        break
      case '--no-loop':
        config.loop = false
        break
      case '--help':
        console.log(`
JT1078 Video Simulator

Usage: npx ts-node src/jt1078/simulator.ts [options]

Options:
  --host, -h      Server host (default: 127.0.0.1)
  --port, -p      Server port (default: 1078)
  --device, -d    Device ID (default: 013912345678)
  --channel, -c   Channel number (default: 1)
  --fps, -f       Frame rate (default: 25)
  --duration, -t  Duration in seconds, 0=infinite (default: 0)
  --video, -v     H.264 video file path (uses real video data)
  --no-loop       Don't loop video (default: loop enabled)
  --help          Show this help

Example:
  npx ts-node src/jt1078/simulator.ts -d 013900000001 -c 1 -f 15 -t 60
  npx ts-node src/jt1078/simulator.ts -v test-videos/test-video.h264
`)
        process.exit(0)
    }
  }

  console.log('╔════════════════════════════════════════╗')
  console.log('║     JT1078 Video Simulator             ║')
  console.log('╚════════════════════════════════════════╝')

  const simulator = new JT1078Simulator(config)

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n[Simulator] Received SIGINT, stopping...')
    simulator.stop()
    setTimeout(() => process.exit(0), 500)
  })

  try {
    await simulator.start()
  } catch (err) {
    console.error('[Simulator] Failed to start:', err)
    process.exit(1)
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main()
}

export default JT1078Simulator

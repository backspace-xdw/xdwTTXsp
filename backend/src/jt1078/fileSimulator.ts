/**
 * JT1078 视频文件模拟器
 * 从真实 H.264 文件读取并发送
 */

import net from 'net'
import fs from 'fs'
import path from 'path'
import {
  DATA_TYPE,
  PAYLOAD_TYPE,
  DEFAULT_PORT,
} from './constants'
import { buildFrame } from './parser'

interface FileSimulatorConfig {
  host: string
  port: number
  deviceId: string
  channel: number
  frameRate: number
  h264File: string
  loop: boolean
}

const DEFAULT_CONFIG: FileSimulatorConfig = {
  host: '127.0.0.1',
  port: DEFAULT_PORT,
  deviceId: '013912345678',
  channel: 1,
  frameRate: 25,
  h264File: path.join(__dirname, '../../test-videos/test-video.h264'),
  loop: true,
}

/**
 * 解析 H.264 Annex-B 格式，提取 NAL 单元
 */
function parseH264File(filePath: string): Buffer[] {
  const data = fs.readFileSync(filePath)
  const nalUnits: Buffer[] = []

  let i = 0
  let nalStart = -1

  while (i < data.length - 4) {
    // 查找起始码 0x00000001 或 0x000001
    if (data[i] === 0 && data[i + 1] === 0) {
      if (data[i + 2] === 0 && data[i + 3] === 1) {
        // 4字节起始码
        if (nalStart !== -1) {
          nalUnits.push(data.subarray(nalStart, i))
        }
        nalStart = i
        i += 4
        continue
      } else if (data[i + 2] === 1) {
        // 3字节起始码
        if (nalStart !== -1) {
          nalUnits.push(data.subarray(nalStart, i))
        }
        nalStart = i
        i += 3
        continue
      }
    }
    i++
  }

  // 最后一个 NAL 单元
  if (nalStart !== -1) {
    nalUnits.push(data.subarray(nalStart))
  }

  return nalUnits
}

/**
 * 获取 NAL 单元类型
 */
function getNalType(nalUnit: Buffer): number {
  // 跳过起始码，获取 NAL 头
  let offset = 0
  if (nalUnit[0] === 0 && nalUnit[1] === 0) {
    if (nalUnit[2] === 0 && nalUnit[3] === 1) {
      offset = 4
    } else if (nalUnit[2] === 1) {
      offset = 3
    }
  }
  return nalUnit[offset] & 0x1f
}

/**
 * 判断是否为关键帧 (IDR 或包含 SPS/PPS)
 */
function isKeyFrame(nalType: number): boolean {
  // 5 = IDR slice, 7 = SPS, 8 = PPS
  return nalType === 5 || nalType === 7 || nalType === 8
}

/**
 * 将 NAL 单元分组为访问单元 (Access Units)
 * 每个访问单元包含一帧完整的数据
 * 确保从第一个 I-frame (IDR) 开始，并包含必要的 SPS/PPS
 */
function groupNalUnitsToAccessUnits(nalUnits: Buffer[]): Buffer[][] {
  const accessUnits: Buffer[][] = []
  let currentAU: Buffer[] = []
  let foundFirstIDR = false
  let savedSPS: Buffer | null = null
  let savedPPS: Buffer | null = null

  for (const nal of nalUnits) {
    const nalType = getNalType(nal)

    // 保存 SPS/PPS 供后续使用
    if (nalType === 7) {
      savedSPS = nal
      if (foundFirstIDR) currentAU.push(nal)
      continue
    }
    if (nalType === 8) {
      savedPPS = nal
      if (foundFirstIDR) currentAU.push(nal)
      continue
    }

    // SEI 添加到当前 AU
    if (nalType === 6) {
      if (foundFirstIDR) currentAU.push(nal)
      continue
    }

    // IDR slice - 开始或完成一个关键帧 AU
    if (nalType === 5) {
      if (!foundFirstIDR) {
        foundFirstIDR = true
        // 首个 IDR 前面加上 SPS 和 PPS
        if (savedSPS) currentAU.push(savedSPS)
        if (savedPPS) currentAU.push(savedPPS)
      }
      currentAU.push(nal)
      accessUnits.push(currentAU)
      currentAU = []
      continue
    }

    // non-IDR slice (P-frame)
    if (nalType === 1) {
      if (!foundFirstIDR) continue  // 跳过 IDR 之前的 P-frame
      currentAU.push(nal)
      accessUnits.push(currentAU)
      currentAU = []
    }
  }

  // 处理最后一个 AU
  if (currentAU.length > 0) {
    accessUnits.push(currentAU)
  }

  return accessUnits
}

/**
 * 文件模拟器类
 */
class FileSimulator {
  private config: FileSimulatorConfig
  private socket: net.Socket | null = null
  private accessUnits: Buffer[][] = []
  private currentIndex: number = 0
  private sequenceNumber: number = 0
  private frameCount: number = 0
  private running: boolean = false
  private frameTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<FileSimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async start(): Promise<void> {
    // 加载 H.264 文件
    console.log(`[FileSimulator] Loading H.264 file: ${this.config.h264File}`)

    if (!fs.existsSync(this.config.h264File)) {
      throw new Error(`H.264 file not found: ${this.config.h264File}`)
    }

    const nalUnits = parseH264File(this.config.h264File)
    console.log(`[FileSimulator] Loaded ${nalUnits.length} NAL units`)

    // 统计 NAL 类型
    const typeCounts: Record<number, number> = {}
    for (const nal of nalUnits) {
      const type = getNalType(nal)
      typeCounts[type] = (typeCounts[type] || 0) + 1
    }
    console.log('[FileSimulator] NAL types:', typeCounts)

    // 分组为访问单元
    this.accessUnits = groupNalUnitsToAccessUnits(nalUnits)
    console.log(`[FileSimulator] Grouped into ${this.accessUnits.length} access units (frames)`)

    return new Promise((resolve, reject) => {
      console.log(`[FileSimulator] Connecting to ${this.config.host}:${this.config.port}`)

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      })

      this.socket.on('connect', () => {
        console.log('[FileSimulator] Connected!')
        this.running = true
        this.startSending()
        resolve()
      })

      this.socket.on('error', (err) => {
        console.error('[FileSimulator] Connection error:', err.message)
        this.running = false
        reject(err)
      })

      this.socket.on('close', () => {
        console.log('[FileSimulator] Connection closed')
        this.running = false
        this.stopSending()
      })
    })
  }

  stop(): void {
    console.log('[FileSimulator] Stopping...')
    this.running = false
    this.stopSending()

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  private startSending(): void {
    const interval = 1000 / this.config.frameRate

    this.frameTimer = setInterval(() => {
      if (!this.running || !this.socket) {
        return
      }

      this.sendNextFrame()
    }, interval)

    console.log(`[FileSimulator] Sending at ${this.config.frameRate} fps`)
  }

  private stopSending(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer)
      this.frameTimer = null
    }
  }

  private sendNextFrame(): void {
    if (!this.socket || !this.socket.writable) {
      return
    }

    if (this.currentIndex >= this.accessUnits.length) {
      if (this.config.loop) {
        console.log('[FileSimulator] Looping video...')
        this.currentIndex = 0
      } else {
        console.log('[FileSimulator] End of file')
        this.stop()
        return
      }
    }

    const accessUnit = this.accessUnits[this.currentIndex]
    // 合并所有 NAL 单元为一个数据块
    const frameData = Buffer.concat(accessUnit)

    // 检查是否为关键帧 (包含 IDR slice)
    const hasIDR = accessUnit.some(nal => getNalType(nal) === 5)
    const dataType = hasIDR ? DATA_TYPE.I_FRAME : DATA_TYPE.P_FRAME

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

    try {
      this.socket.write(jt1078Frame)
    } catch (err) {
      console.error('[FileSimulator] Send error:', err)
      return
    }

    this.sequenceNumber = (this.sequenceNumber + 1) % 65536
    this.currentIndex++
    this.frameCount++

    // 每秒打印状态
    if (this.frameCount % this.config.frameRate === 0) {
      const seconds = Math.floor(this.frameCount / this.config.frameRate)
      console.log(
        `[FileSimulator] ${seconds}s: Sent ${this.frameCount} frames, ` +
        `current: ${hasIDR ? 'I' : 'P'}-frame, ${accessUnit.length} NALs, ${frameData.length} bytes`
      )
    }
  }
}

// 命令行入口
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const config: Partial<FileSimulatorConfig> = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--host':
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
      case '--file':
        config.h264File = args[++i]
        break
      case '--no-loop':
        config.loop = false
        break
      case '--help':
        console.log(`
JT1078 File Simulator - Send real H.264 video

Usage: npx ts-node src/jt1078/fileSimulator.ts [options]

Options:
  --host        Server host (default: 127.0.0.1)
  --port, -p    Server port (default: 1078)
  --device, -d  Device ID (default: 013912345678)
  --channel, -c Channel number (default: 1)
  --fps, -f     Frame rate (default: 25)
  --file        H.264 file path (default: test-videos/test-video.h264)
  --no-loop     Don't loop the video
  --help        Show this help

Example:
  npx ts-node src/jt1078/fileSimulator.ts -d 013900000001 -c 1 -f 25
`)
        process.exit(0)
    }
  }

  console.log('╔════════════════════════════════════════╗')
  console.log('║   JT1078 File Simulator (Real H.264)   ║')
  console.log('╚════════════════════════════════════════╝')

  const simulator = new FileSimulator(config)

  process.on('SIGINT', () => {
    console.log('\n[FileSimulator] Received SIGINT, stopping...')
    simulator.stop()
    setTimeout(() => process.exit(0), 500)
  })

  try {
    await simulator.start()
  } catch (err) {
    console.error('[FileSimulator] Failed to start:', err)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export default FileSimulator

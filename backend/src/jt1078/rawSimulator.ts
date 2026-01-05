/**
 * JT1078 Raw Stream Simulator
 * Sends raw H.264 file as a continuous stream
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

interface RawSimulatorConfig {
  host: string
  port: number
  deviceId: string
  channel: number
  chunkSize: number      // Bytes per chunk
  sendInterval: number   // ms between chunks
  h264File: string
  loop: boolean
}

const DEFAULT_CONFIG: RawSimulatorConfig = {
  host: '127.0.0.1',
  port: DEFAULT_PORT,
  deviceId: '013912345678',
  channel: 1,
  chunkSize: 4096,       // 4KB per chunk
  sendInterval: 40,      // 40ms = 25 fps equivalent
  h264File: path.join(__dirname, '../../test-videos/test-video.h264'),
  loop: true,
}

class RawSimulator {
  private config: RawSimulatorConfig
  private socket: net.Socket | null = null
  private fileData: Buffer | null = null
  private currentOffset: number = 0
  private sequenceNumber: number = 0
  private chunkCount: number = 0
  private running: boolean = false
  private sendTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<RawSimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async start(): Promise<void> {
    console.log(`[RawSimulator] Loading H.264 file: ${this.config.h264File}`)

    if (!fs.existsSync(this.config.h264File)) {
      throw new Error(`H.264 file not found: ${this.config.h264File}`)
    }

    this.fileData = fs.readFileSync(this.config.h264File)
    console.log(`[RawSimulator] Loaded ${this.fileData.length} bytes (${(this.fileData.length / 1024).toFixed(1)} KB)`)

    return new Promise((resolve, reject) => {
      console.log(`[RawSimulator] Connecting to ${this.config.host}:${this.config.port}`)

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      })

      this.socket.on('connect', () => {
        console.log('[RawSimulator] Connected!')
        this.running = true
        this.startSending()
        resolve()
      })

      this.socket.on('error', (err) => {
        console.error('[RawSimulator] Connection error:', err.message)
        this.running = false
        reject(err)
      })

      this.socket.on('close', () => {
        console.log('[RawSimulator] Connection closed')
        this.running = false
        this.stopSending()
      })
    })
  }

  stop(): void {
    console.log('[RawSimulator] Stopping...')
    this.running = false
    this.stopSending()

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  private startSending(): void {
    this.sendTimer = setInterval(() => {
      if (!this.running || !this.socket || !this.fileData) {
        return
      }

      this.sendNextChunk()
    }, this.config.sendInterval)

    console.log(`[RawSimulator] Sending ${this.config.chunkSize} bytes every ${this.config.sendInterval}ms`)
  }

  private stopSending(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer)
      this.sendTimer = null
    }
  }

  private sendNextChunk(): void {
    if (!this.socket || !this.socket.writable || !this.fileData) {
      return
    }

    // Check if we've reached end of file
    if (this.currentOffset >= this.fileData.length) {
      if (this.config.loop) {
        console.log('[RawSimulator] Looping video...')
        this.currentOffset = 0
      } else {
        console.log('[RawSimulator] End of file')
        this.stop()
        return
      }
    }

    // Calculate chunk end
    const endOffset = Math.min(
      this.currentOffset + this.config.chunkSize,
      this.fileData.length
    )
    const chunk = this.fileData.subarray(this.currentOffset, endOffset)

    // Determine frame type based on position
    // First chunk should be I-frame (contains SPS/PPS)
    const isKeyFrame = this.currentOffset === 0

    const dataType = isKeyFrame ? DATA_TYPE.I_FRAME : DATA_TYPE.P_FRAME
    const timestamp = BigInt(Date.now())

    // Build JT1078 frame
    const jt1078Frame = buildFrame(
      this.config.deviceId,
      this.config.channel,
      dataType,
      PAYLOAD_TYPE.H264,
      this.sequenceNumber,
      timestamp,
      chunk
    )

    try {
      this.socket.write(jt1078Frame)
    } catch (err) {
      console.error('[RawSimulator] Send error:', err)
      return
    }

    this.sequenceNumber = (this.sequenceNumber + 1) % 65536
    this.currentOffset = endOffset
    this.chunkCount++

    // Print status every second (approx)
    const chunksPerSecond = 1000 / this.config.sendInterval
    if (this.chunkCount % Math.floor(chunksPerSecond) === 0) {
      const seconds = Math.floor(this.chunkCount / chunksPerSecond)
      const totalSent = (this.chunkCount * this.config.chunkSize / 1024).toFixed(1)
      const progress = ((this.currentOffset / this.fileData.length) * 100).toFixed(1)
      console.log(
        `[RawSimulator] ${seconds}s: Sent ${this.chunkCount} chunks (${totalSent} KB), ` +
        `progress: ${progress}%`
      )
    }
  }
}

// CLI entry
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const config: Partial<RawSimulatorConfig> = {}

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
      case '--chunk':
        config.chunkSize = parseInt(args[++i], 10)
        break
      case '--interval':
        config.sendInterval = parseInt(args[++i], 10)
        break
      case '--file':
        config.h264File = args[++i]
        break
      case '--no-loop':
        config.loop = false
        break
      case '--help':
        console.log(`
JT1078 Raw Stream Simulator

Usage: npx ts-node src/jt1078/rawSimulator.ts [options]

Options:
  --host        Server host (default: 127.0.0.1)
  --port, -p    Server port (default: 1078)
  --device, -d  Device ID (default: 013912345678)
  --channel, -c Channel number (default: 1)
  --chunk       Chunk size in bytes (default: 4096)
  --interval    Send interval in ms (default: 40)
  --file        H.264 file path
  --no-loop     Don't loop the video
  --help        Show this help
`)
        process.exit(0)
    }
  }

  console.log('╔════════════════════════════════════════╗')
  console.log('║   JT1078 Raw Stream Simulator          ║')
  console.log('╚════════════════════════════════════════╝')

  const simulator = new RawSimulator(config)

  process.on('SIGINT', () => {
    console.log('\n[RawSimulator] Received SIGINT, stopping...')
    simulator.stop()
    setTimeout(() => process.exit(0), 500)
  })

  try {
    await simulator.start()
  } catch (err) {
    console.error('[RawSimulator] Failed to start:', err)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export default RawSimulator

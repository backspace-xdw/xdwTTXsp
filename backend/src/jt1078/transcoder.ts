/**
 * FFmpeg 转码器
 * 将 H.264 裸流转码为 FLV 容器格式
 */

import { spawn, ChildProcess } from 'child_process'
import { Readable, PassThrough } from 'stream'
import { EventEmitter } from 'events'

/**
 * 转码器配置
 */
export interface TranscoderConfig {
  inputFormat?: string    // 输入格式 (默认 h264)
  outputFormat?: string   // 输出格式 (默认 flv)
  videoCopy?: boolean     // 视频直接复制 (默认 true)
  audioCopy?: boolean     // 音频直接复制 (默认 true)
  frameRate?: number      // 帧率 (可选)
  bufferSize?: string     // 缓冲区大小 (默认 '1M')
}

/**
 * 转码器事件
 */
export interface TranscoderEvents {
  'data': (chunk: Buffer) => void
  'error': (error: Error) => void
  'close': () => void
  'ready': () => void
}

/**
 * H264 到 FLV 转码器
 */
export class H264ToFlvTranscoder extends EventEmitter {
  private process: ChildProcess | null = null
  private config: TranscoderConfig
  private output: PassThrough
  private isReady: boolean = false
  private deviceId: string
  private channel: number
  private flvHeader: Buffer | null = null  // Cache FLV header for new subscribers

  constructor(deviceId: string, channel: number, config: TranscoderConfig = {}) {
    super()
    this.deviceId = deviceId
    this.channel = channel
    this.config = {
      inputFormat: 'h264',
      outputFormat: 'flv',
      videoCopy: true,
      audioCopy: true,
      bufferSize: '1M',
      ...config,
    }
    this.output = new PassThrough()
  }

  /**
   * 获取 FLV 头部 (供新订阅者使用)
   */
  getFlvHeader(): Buffer | null {
    return this.flvHeader
  }

  /**
   * 启动转码器
   */
  start(): void {
    if (this.process) {
      return
    }

    const args = this.buildFFmpegArgs()
    console.log(`[Transcoder] Starting for ${this.deviceId}:${this.channel}`)
    console.log(`[Transcoder] FFmpeg args: ${args.join(' ')}`)

    this.process = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // 处理输出流
    this.process.stdout?.on('data', (chunk: Buffer) => {
      // Capture FLV header (first chunk with 'FLV' signature)
      if (!this.flvHeader && chunk.length >= 9 &&
          chunk[0] === 0x46 && chunk[1] === 0x4c && chunk[2] === 0x56) {
        // FLV header + first tag (typically onMetaData)
        // Find the end of header + metadata by looking for the script tag
        this.flvHeader = Buffer.from(chunk)
        console.log(`[Transcoder] FLV header captured: ${this.flvHeader.length} bytes`)
      }

      this.isReady = true
      this.output.write(chunk)
      this.emit('data', chunk)
    })

    // 处理错误输出 (FFmpeg的日志)
    this.process.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString()
      // 只在调试模式或错误时输出
      if (msg.includes('Error') || msg.includes('error')) {
        console.error(`[Transcoder] ${this.deviceId}:${this.channel} stderr:`, msg)
      }
    })

    this.process.on('close', (code) => {
      console.log(`[Transcoder] ${this.deviceId}:${this.channel} closed with code ${code}`)
      this.process = null
      this.isReady = false
      this.output.end()
      this.emit('close')
    })

    this.process.on('error', (err) => {
      console.error(`[Transcoder] ${this.deviceId}:${this.channel} error:`, err)
      this.emit('error', err)
    })

    // 标记为就绪
    setTimeout(() => {
      if (this.process) {
        this.emit('ready')
      }
    }, 100)
  }

  /**
   * 构建 FFmpeg 参数
   */
  private buildFFmpegArgs(): string[] {
    const args: string[] = []

    // 输入参数
    args.push('-f', this.config.inputFormat!)
    args.push('-i', 'pipe:0')

    // 视频编码
    if (this.config.videoCopy) {
      args.push('-c:v', 'copy')
    }

    // 不处理音频 (H264裸流无音频)
    args.push('-an')

    // 输出参数
    args.push('-f', this.config.outputFormat!)

    // FLV 特定参数
    args.push('-flvflags', 'no_duration_filesize')

    // 输出到 stdout
    args.push('pipe:1')

    return args
  }

  /**
   * 写入视频数据
   */
  write(data: Buffer): boolean {
    if (!this.process || !this.process.stdin?.writable) {
      return false
    }

    try {
      return this.process.stdin.write(data)
    } catch (err) {
      console.error(`[Transcoder] Write error:`, err)
      return false
    }
  }

  /**
   * 获取输出流
   */
  getOutputStream(): PassThrough {
    return this.output
  }

  /**
   * 停止转码器
   */
  stop(): void {
    if (this.process) {
      console.log(`[Transcoder] Stopping ${this.deviceId}:${this.channel}`)

      try {
        this.process.stdin?.end()
        this.process.kill('SIGTERM')
      } catch (err) {
        // 忽略错误
      }

      // 强制终止
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL')
          this.process = null
        }
      }, 1000)
    }
  }

  /**
   * 是否正在运行
   */
  get running(): boolean {
    return this.process !== null
  }

  /**
   * 是否就绪
   */
  get ready(): boolean {
    return this.isReady
  }
}

/**
 * 检查 FFmpeg 是否可用
 */
export async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])

    proc.on('close', (code) => {
      resolve(code === 0)
    })

    proc.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * 获取 FFmpeg 版本
 */
export async function getFFmpegVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])
    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/ffmpeg version (\S+)/)
        resolve(match ? match[1] : 'unknown')
      } else {
        resolve(null)
      }
    })

    proc.on('error', () => {
      resolve(null)
    })
  })
}

export default H264ToFlvTranscoder

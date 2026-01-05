/**
 * 视频流管理器
 * 管理设备视频流和 FFmpeg 转码进程
 */

import { PassThrough, Readable } from 'stream'
import { EventEmitter } from 'events'
import { H264ToFlvTranscoder } from './transcoder'
import { CHANNEL_NAMES } from './constants'

/**
 * 视频流状态
 */
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'error' | 'closed'

/**
 * 视频流信息
 */
export interface VideoStream {
  deviceId: string
  channel: number
  status: StreamStatus
  transcoder: H264ToFlvTranscoder | null
  subscribers: Set<PassThrough>
  frameCount: number
  bytesReceived: number
  startTime: number
  lastFrameTime: number
  error: string | null
}

/**
 * 流管理器事件
 */
export interface StreamManagerEvents {
  'streamStart': (deviceId: string, channel: number) => void
  'streamStop': (deviceId: string, channel: number) => void
  'streamError': (deviceId: string, channel: number, error: Error) => void
  'subscriberJoin': (deviceId: string, channel: number, count: number) => void
  'subscriberLeave': (deviceId: string, channel: number, count: number) => void
}

/**
 * 获取流的唯一键
 */
function getStreamKey(deviceId: string, channel: number): string {
  return `${deviceId}_${channel}`
}

/**
 * 视频流管理器
 */
export class StreamManager extends EventEmitter {
  private streams: Map<string, VideoStream> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.startCleanup()
  }

  /**
   * 创建或获取流
   */
  getOrCreateStream(deviceId: string, channel: number): VideoStream {
    const key = getStreamKey(deviceId, channel)
    let stream = this.streams.get(key)

    if (!stream) {
      stream = {
        deviceId,
        channel,
        status: 'idle',
        transcoder: null,
        subscribers: new Set(),
        frameCount: 0,
        bytesReceived: 0,
        startTime: 0,
        lastFrameTime: 0,
        error: null,
      }
      this.streams.set(key, stream)
      console.log(`[StreamManager] Created stream for ${deviceId}:${channel}`)
    }

    return stream
  }

  /**
   * 写入视频帧
   */
  writeFrame(deviceId: string, channel: number, data: Buffer, isKeyFrame: boolean = false): void {
    const stream = this.getOrCreateStream(deviceId, channel)
    const now = Date.now()

    stream.frameCount++
    stream.bytesReceived += data.length
    stream.lastFrameTime = now

    // 如果是第一帧或需要启动转码器
    if (!stream.transcoder) {
      // 必须从关键帧开始 (或者这是首次收到数据时立即启动)
      // 对于连续流，第一个数据包通常包含 SPS/PPS
      if (!isKeyFrame && stream.frameCount > 1) {
        // 等待关键帧
        return
      }

      this.startTranscoder(stream)
    }

    // 写入数据到转码器 (包括 connecting 状态)
    if (stream.transcoder) {
      stream.transcoder.write(data)
    }
  }

  /**
   * 启动转码器
   */
  private startTranscoder(stream: VideoStream): void {
    if (stream.transcoder) {
      return
    }

    console.log(`[StreamManager] Starting transcoder for ${stream.deviceId}:${stream.channel}`)
    stream.status = 'connecting'
    stream.startTime = Date.now()
    stream.error = null

    const transcoder = new H264ToFlvTranscoder(stream.deviceId, stream.channel)
    stream.transcoder = transcoder

    // 监听转码输出
    transcoder.on('data', (chunk: Buffer) => {
      // 分发给所有订阅者
      for (const subscriber of stream.subscribers) {
        if (!subscriber.destroyed) {
          subscriber.write(chunk)
        }
      }
    })

    transcoder.on('ready', () => {
      stream.status = 'streaming'
      console.log(`[StreamManager] Stream ${stream.deviceId}:${stream.channel} is streaming`)
      this.emit('streamStart', stream.deviceId, stream.channel)
    })

    transcoder.on('error', (err: Error) => {
      stream.status = 'error'
      stream.error = err.message
      console.error(`[StreamManager] Stream ${stream.deviceId}:${stream.channel} error:`, err)
      this.emit('streamError', stream.deviceId, stream.channel, err)
    })

    transcoder.on('close', () => {
      stream.status = 'closed'
      stream.transcoder = null
      console.log(`[StreamManager] Stream ${stream.deviceId}:${stream.channel} closed`)
      this.emit('streamStop', stream.deviceId, stream.channel)
    })

    transcoder.start()
  }

  /**
   * 订阅流 (返回可读流用于 HTTP 响应)
   */
  subscribe(deviceId: string, channel: number): PassThrough | null {
    const key = getStreamKey(deviceId, channel)
    const stream = this.streams.get(key)

    if (!stream) {
      console.log(`[StreamManager] Stream not found: ${deviceId}:${channel}`)
      return null
    }

    const subscriber = new PassThrough()
    stream.subscribers.add(subscriber)

    // Send FLV header to new subscriber so they can start playing immediately
    if (stream.transcoder) {
      const flvHeader = stream.transcoder.getFlvHeader()
      if (flvHeader) {
        console.log(`[StreamManager] Sending FLV header to new subscriber: ${flvHeader.length} bytes`)
        subscriber.write(flvHeader)
      }
    }

    console.log(`[StreamManager] New subscriber for ${deviceId}:${channel}, total: ${stream.subscribers.size}`)
    this.emit('subscriberJoin', deviceId, channel, stream.subscribers.size)

    // 处理订阅者断开
    subscriber.on('close', () => {
      stream.subscribers.delete(subscriber)
      console.log(`[StreamManager] Subscriber left ${deviceId}:${channel}, remaining: ${stream.subscribers.size}`)
      this.emit('subscriberLeave', deviceId, channel, stream.subscribers.size)

      // 如果没有订阅者了，可以停止转码
      if (stream.subscribers.size === 0) {
        this.stopStream(deviceId, channel)
      }
    })

    return subscriber
  }

  /**
   * 停止流
   */
  stopStream(deviceId: string, channel: number): void {
    const key = getStreamKey(deviceId, channel)
    const stream = this.streams.get(key)

    if (!stream) {
      return
    }

    console.log(`[StreamManager] Stopping stream ${deviceId}:${channel}`)

    // 停止转码器
    if (stream.transcoder) {
      stream.transcoder.stop()
      stream.transcoder = null
    }

    // 关闭所有订阅者
    for (const subscriber of stream.subscribers) {
      subscriber.end()
    }
    stream.subscribers.clear()

    stream.status = 'closed'
  }

  /**
   * 获取流状态
   */
  getStreamStatus(deviceId: string, channel: number): VideoStream | null {
    const key = getStreamKey(deviceId, channel)
    return this.streams.get(key) || null
  }

  /**
   * 获取所有活跃流
   */
  getActiveStreams(): Array<{
    deviceId: string
    channel: number
    channelName: string
    status: StreamStatus
    subscribers: number
    frameCount: number
    bytesReceived: number
    duration: number
  }> {
    const result = []
    const now = Date.now()

    for (const stream of this.streams.values()) {
      if (stream.status === 'streaming' || stream.subscribers.size > 0) {
        result.push({
          deviceId: stream.deviceId,
          channel: stream.channel,
          channelName: CHANNEL_NAMES[stream.channel] || `Channel ${stream.channel}`,
          status: stream.status,
          subscribers: stream.subscribers.size,
          frameCount: stream.frameCount,
          bytesReceived: stream.bytesReceived,
          duration: stream.startTime ? Math.floor((now - stream.startTime) / 1000) : 0,
        })
      }
    }

    return result
  }

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    // 每30秒清理不活跃的流
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const inactiveTimeout = 60000 // 60秒无数据视为不活跃

      for (const [key, stream] of this.streams) {
        // 跳过有订阅者的流
        if (stream.subscribers.size > 0) {
          continue
        }

        // 检查是否超时
        if (stream.lastFrameTime && now - stream.lastFrameTime > inactiveTimeout) {
          console.log(`[StreamManager] Cleaning up inactive stream: ${key}`)
          this.stopStream(stream.deviceId, stream.channel)
          this.streams.delete(key)
        }
      }
    }, 30000)
  }

  /**
   * 停止管理器
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // 停止所有流
    for (const stream of this.streams.values()) {
      this.stopStream(stream.deviceId, stream.channel)
    }
    this.streams.clear()

    console.log('[StreamManager] Shutdown complete')
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalStreams: number
    activeStreams: number
    totalSubscribers: number
    totalFrames: number
    totalBytes: number
  } {
    let activeStreams = 0
    let totalSubscribers = 0
    let totalFrames = 0
    let totalBytes = 0

    for (const stream of this.streams.values()) {
      if (stream.status === 'streaming') {
        activeStreams++
      }
      totalSubscribers += stream.subscribers.size
      totalFrames += stream.frameCount
      totalBytes += stream.bytesReceived
    }

    return {
      totalStreams: this.streams.size,
      activeStreams,
      totalSubscribers,
      totalFrames,
      totalBytes,
    }
  }
}

// 单例
let instance: StreamManager | null = null

export function getStreamManager(): StreamManager {
  if (!instance) {
    instance = new StreamManager()
  }
  return instance
}

export default StreamManager

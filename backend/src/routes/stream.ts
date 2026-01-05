/**
 * 视频流路由
 * 提供 HTTP-FLV 视频流端点
 */

import { Router, Request, Response } from 'express'
import { getStreamManager } from '../jt1078/streamManager'
import { getJT1078Server } from '../jt1078/server'
import { CHANNEL_NAMES } from '../jt1078/constants'

const router = Router()

/**
 * 获取视频流 (HTTP-FLV)
 * GET /api/stream/:deviceId/:channel
 */
router.get('/:deviceId/:channel', (req: Request, res: Response) => {
  const { deviceId, channel } = req.params
  const channelNum = parseInt(channel, 10)

  if (isNaN(channelNum) || channelNum < 1 || channelNum > 16) {
    return res.status(400).json({
      code: 400,
      message: 'Invalid channel number (1-16)',
    })
  }

  console.log(`[Stream] Request for ${deviceId}:${channelNum}`)

  const streamManager = getStreamManager()
  const stream = streamManager.getStreamStatus(deviceId, channelNum)

  // 检查流是否存在
  if (!stream || stream.status === 'idle') {
    return res.status(404).json({
      code: 404,
      message: 'Stream not available. Device may not be connected.',
    })
  }

  // 订阅流
  const subscriber = streamManager.subscribe(deviceId, channelNum)
  if (!subscriber) {
    return res.status(404).json({
      code: 404,
      message: 'Failed to subscribe to stream',
    })
  }

  // 设置响应头
  res.setHeader('Content-Type', 'video/x-flv')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Cache-Control', 'no-cache, no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')

  // 处理客户端断开
  req.on('close', () => {
    console.log(`[Stream] Client disconnected from ${deviceId}:${channelNum}`)
    subscriber.destroy()
  })

  // 管道输出
  subscriber.pipe(res)
})

/**
 * 获取流状态
 * GET /api/stream/:deviceId/:channel/status
 */
router.get('/:deviceId/:channel/status', (req: Request, res: Response) => {
  const { deviceId, channel } = req.params
  const channelNum = parseInt(channel, 10)

  const streamManager = getStreamManager()
  const stream = streamManager.getStreamStatus(deviceId, channelNum)

  if (!stream) {
    return res.json({
      code: 0,
      data: {
        deviceId,
        channel: channelNum,
        channelName: CHANNEL_NAMES[channelNum] || `Channel ${channelNum}`,
        status: 'offline',
        available: false,
      },
    })
  }

  res.json({
    code: 0,
    data: {
      deviceId,
      channel: channelNum,
      channelName: CHANNEL_NAMES[channelNum] || `Channel ${channelNum}`,
      status: stream.status,
      available: stream.status === 'streaming',
      subscribers: stream.subscribers.size,
      frameCount: stream.frameCount,
      bytesReceived: stream.bytesReceived,
      duration: stream.startTime ? Math.floor((Date.now() - stream.startTime) / 1000) : 0,
    },
  })
})

/**
 * 获取设备所有通道状态
 * GET /api/stream/:deviceId/channels
 */
router.get('/:deviceId/channels', (req: Request, res: Response) => {
  const { deviceId } = req.params

  const jt1078Server = getJT1078Server()
  const streamManager = getStreamManager()

  // 检查设备是否在线
  const isOnline = jt1078Server.isDeviceOnline(deviceId)
  const activeChannels = jt1078Server.getDeviceChannels(deviceId)

  const channels = []

  // 返回所有可能的通道状态
  for (let ch = 1; ch <= 9; ch++) {
    const stream = streamManager.getStreamStatus(deviceId, ch)
    channels.push({
      channel: ch,
      channelName: CHANNEL_NAMES[ch] || `Channel ${ch}`,
      active: activeChannels.includes(ch),
      status: stream?.status || 'offline',
      available: stream?.status === 'streaming',
      subscribers: stream?.subscribers.size || 0,
    })
  }

  res.json({
    code: 0,
    data: {
      deviceId,
      online: isOnline,
      channels,
    },
  })
})

/**
 * 获取所有活跃流
 * GET /api/stream/list
 */
router.get('/list', (_req: Request, res: Response) => {
  const streamManager = getStreamManager()
  const activeStreams = streamManager.getActiveStreams()

  res.json({
    code: 0,
    data: activeStreams,
  })
})

/**
 * 获取流服务统计
 * GET /api/stream/stats
 */
router.get('/stats', (_req: Request, res: Response) => {
  const jt1078Server = getJT1078Server()
  const streamManager = getStreamManager()

  const serverStats = jt1078Server.getServerStats()
  const streamStats = streamManager.getStats()

  res.json({
    code: 0,
    data: {
      server: serverStats,
      streams: streamStats,
    },
  })
})

/**
 * 获取在线设备列表
 * GET /api/stream/devices
 */
router.get('/devices', (_req: Request, res: Response) => {
  const jt1078Server = getJT1078Server()

  const devices = jt1078Server.getOnlineDevices().map((deviceId) => ({
    deviceId,
    channels: jt1078Server.getDeviceChannels(deviceId),
    stats: jt1078Server.getDeviceStats(deviceId),
  }))

  res.json({
    code: 0,
    data: devices,
  })
})

export default router

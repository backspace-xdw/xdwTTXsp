/**
 * JT/T 1078 模块入口
 * 导出所有 JT1078 相关功能
 */

export * from './constants'
export * from './parser'
export * from './server'
export * from './streamManager'
export * from './transcoder'

import { JT1078Server, getJT1078Server } from './server'
import { StreamManager, getStreamManager } from './streamManager'
import { checkFFmpeg, getFFmpegVersion } from './transcoder'

/**
 * 初始化 JT1078 服务
 */
export async function initJT1078(port: number = 1078): Promise<{
  server: JT1078Server
  streamManager: StreamManager
}> {
  // 检查 FFmpeg
  const ffmpegAvailable = await checkFFmpeg()
  if (!ffmpegAvailable) {
    console.warn('[JT1078] FFmpeg not found! Video streaming will not work.')
    console.warn('[JT1078] Install FFmpeg: sudo apt install ffmpeg')
  } else {
    const version = await getFFmpegVersion()
    console.log(`[JT1078] FFmpeg version: ${version}`)
  }

  // 获取实例
  const server = getJT1078Server(port)
  const streamManager = getStreamManager()

  // 连接 server 和 streamManager
  server.on('video', (deviceId, channel, data, isKeyFrame) => {
    streamManager.writeFrame(deviceId, channel, data, isKeyFrame)
  })

  // 启动服务器
  await server.start()

  return { server, streamManager }
}

/**
 * 关闭 JT1078 服务
 */
export async function shutdownJT1078(): Promise<void> {
  const server = getJT1078Server()
  const streamManager = getStreamManager()

  streamManager.shutdown()
  await server.stop()
}

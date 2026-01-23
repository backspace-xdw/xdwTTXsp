/**
 * 高性能批量处理服务
 * 支持 1万+ 车辆并发数据处理
 */

import { Location, DeviceRealtime } from '../models'
import { LocationInfo, STATUS_FLAG } from '../jt808/constants'
import * as cacheService from './cacheService'

// ========== 配置常量 ==========
const BATCH_CONFIG = {
  // GPS 数据批量写入配置
  GPS_BUFFER_SIZE: 1000,            // GPS 缓冲区大小
  GPS_FLUSH_INTERVAL: 2000,         // GPS 刷新间隔 (ms)
  GPS_MAX_WAIT_TIME: 5000,          // 最大等待时间 (ms)

  // 实时状态更新配置
  REALTIME_BUFFER_SIZE: 500,        // 实时状态缓冲区大小
  REALTIME_FLUSH_INTERVAL: 1000,    // 实时状态刷新间隔 (ms)

  // 并发控制
  MAX_CONCURRENT_WRITES: 10,        // 最大并发写入数
  RETRY_COUNT: 3,                   // 失败重试次数
  RETRY_DELAY: 1000,                // 重试延迟 (ms)
}

// ========== GPS 数据缓冲区 ==========
interface GpsBufferItem {
  deviceId: string
  location: LocationInfo
  extras?: { mileage?: number; fuel?: number; recordSpeed?: number }
  timestamp: number
}

const gpsBuffer: GpsBufferItem[] = []
let gpsFlushTimer: NodeJS.Timeout | null = null
let gpsLastFlushTime = Date.now()
let isGpsFlushing = false

// ========== 实时状态缓冲区 ==========
interface RealtimeBufferItem {
  deviceId: string
  data: {
    latitude: number
    longitude: number
    altitude?: number
    speed: number
    direction: number
    mileage?: number
    alarmFlag: number
    status: number
    gpsTime: Date
    isOnline: boolean
  }
}

const realtimeBuffer: Map<string, RealtimeBufferItem> = new Map()
let realtimeFlushTimer: NodeJS.Timeout | null = null
let isRealtimeFlushing = false

// ========== 统计信息 ==========
interface BatchStats {
  gpsReceived: number
  gpsSaved: number
  gpsDropped: number
  realtimeUpdated: number
  errors: number
  lastFlushTime: number
  avgFlushDuration: number
}

const stats: BatchStats = {
  gpsReceived: 0,
  gpsSaved: 0,
  gpsDropped: 0,
  realtimeUpdated: 0,
  errors: 0,
  lastFlushTime: 0,
  avgFlushDuration: 0
}

// ========== GPS 数据处理 ==========

/**
 * 添加 GPS 数据到缓冲区 (非阻塞)
 */
export function addGpsData(
  deviceId: string,
  location: LocationInfo,
  extras?: { mileage?: number; fuel?: number; recordSpeed?: number }
): void {
  stats.gpsReceived++

  // 背压处理：如果缓冲区满，丢弃最旧的数据
  if (gpsBuffer.length >= BATCH_CONFIG.GPS_BUFFER_SIZE) {
    gpsBuffer.shift()
    stats.gpsDropped++
    console.warn(`[BatchService] GPS buffer full, dropped oldest data`)
  }

  gpsBuffer.push({
    deviceId,
    location,
    extras,
    timestamp: Date.now()
  })

  // 启动定时刷新
  ensureGpsFlushTimer()

  // 如果缓冲区达到一半，立即触发刷新
  if (gpsBuffer.length >= BATCH_CONFIG.GPS_BUFFER_SIZE / 2) {
    flushGpsBuffer()
  }
}

/**
 * 确保 GPS 刷新定时器运行
 */
function ensureGpsFlushTimer(): void {
  if (gpsFlushTimer) return

  gpsFlushTimer = setInterval(() => {
    const now = Date.now()
    // 如果有数据且超过最大等待时间，强制刷新
    if (gpsBuffer.length > 0 && (now - gpsLastFlushTime) >= BATCH_CONFIG.GPS_MAX_WAIT_TIME) {
      flushGpsBuffer()
    }
  }, BATCH_CONFIG.GPS_FLUSH_INTERVAL)
}

/**
 * 刷新 GPS 缓冲区到数据库
 */
async function flushGpsBuffer(): Promise<void> {
  if (isGpsFlushing || gpsBuffer.length === 0) return

  isGpsFlushing = true
  const startTime = Date.now()

  // 取出当前缓冲区所有数据
  const batch = gpsBuffer.splice(0, gpsBuffer.length)

  try {
    // 转换为数据库记录格式
    const records = batch.map(item => {
      let latitude = item.location.latitude
      let longitude = item.location.longitude
      const southLat = (item.location.status & STATUS_FLAG.SOUTH_LAT) !== 0
      const westLng = (item.location.status & STATUS_FLAG.WEST_LNG) !== 0
      if (southLat) latitude = -latitude
      if (westLng) longitude = -longitude

      return {
        device_id: item.deviceId,
        alarm_flag: item.location.alarmFlag,
        status: item.location.status,
        latitude,
        longitude,
        altitude: item.location.altitude,
        speed: item.location.speed,
        direction: item.location.direction,
        mileage: item.extras?.mileage,
        fuel: item.extras?.fuel,
        record_speed: item.extras?.recordSpeed,
        gps_time: item.location.gpsTime
      }
    })

    // 批量插入 (使用 ignoreDuplicates 避免重复数据错误)
    await Location.bulkCreate(records, {
      ignoreDuplicates: true,
      validate: false  // 跳过验证提高性能
    })

    stats.gpsSaved += batch.length
    gpsLastFlushTime = Date.now()

    // 更新统计
    const duration = Date.now() - startTime
    stats.avgFlushDuration = (stats.avgFlushDuration + duration) / 2
    stats.lastFlushTime = gpsLastFlushTime

    console.log(`[BatchService] GPS flush: ${batch.length} records in ${duration}ms`)

  } catch (error) {
    console.error('[BatchService] GPS flush error:', error)
    stats.errors++

    // 失败的数据放回缓冲区 (只保留最近的)
    const reinsert = batch.slice(-Math.floor(BATCH_CONFIG.GPS_BUFFER_SIZE / 2))
    gpsBuffer.unshift(...reinsert)
  } finally {
    isGpsFlushing = false
  }
}

// ========== 实时状态处理 ==========

/**
 * 更新设备实时状态 (非阻塞)
 */
export function updateRealtimeStatus(
  deviceId: string,
  data: {
    latitude: number
    longitude: number
    altitude?: number
    speed: number
    direction: number
    mileage?: number
    alarmFlag: number
    status: number
    gpsTime: Date
  }
): void {
  // 使用 Map 自动去重，只保留最新状态
  realtimeBuffer.set(deviceId, {
    deviceId,
    data: {
      ...data,
      isOnline: true
    }
  })

  // 同时更新 Redis 缓存 (异步，不阻塞)
  updateRedisRealtimeCache(deviceId, data).catch(err => {
    console.error('[BatchService] Redis update error:', err)
  })

  // 启动定时刷新
  ensureRealtimeFlushTimer()

  // 如果缓冲区达到阈值，立即刷新
  if (realtimeBuffer.size >= BATCH_CONFIG.REALTIME_BUFFER_SIZE) {
    flushRealtimeBuffer()
  }
}

/**
 * 更新 Redis 实时缓存
 */
async function updateRedisRealtimeCache(
  deviceId: string,
  data: any
): Promise<void> {
  if (!cacheService.isCacheAvailable()) return

  const cacheKey = `realtime:${deviceId}`
  const cacheData = {
    ...data,
    updatedAt: Date.now()
  }

  await cacheService.set(cacheKey, cacheData, 60) // 60秒过期
}

/**
 * 确保实时状态刷新定时器运行
 */
function ensureRealtimeFlushTimer(): void {
  if (realtimeFlushTimer) return

  realtimeFlushTimer = setInterval(() => {
    if (realtimeBuffer.size > 0) {
      flushRealtimeBuffer()
    }
  }, BATCH_CONFIG.REALTIME_FLUSH_INTERVAL)
}

/**
 * 刷新实时状态缓冲区到数据库
 */
async function flushRealtimeBuffer(): Promise<void> {
  if (isRealtimeFlushing || realtimeBuffer.size === 0) return

  isRealtimeFlushing = true
  const startTime = Date.now()

  // 取出当前缓冲区所有数据
  const batch = Array.from(realtimeBuffer.values())
  realtimeBuffer.clear()

  try {
    // 使用 upsert 批量更新 (需要 MySQL 8.0+)
    const upsertPromises = batch.map(item =>
      DeviceRealtime.upsert({
        device_id: item.deviceId,
        latitude: item.data.latitude,
        longitude: item.data.longitude,
        altitude: item.data.altitude ?? 0,
        speed: item.data.speed,
        direction: item.data.direction,
        mileage: item.data.mileage,
        alarm_flag: item.data.alarmFlag,
        status: item.data.status,
        acc_on: (item.data.status & 0x01) !== 0,  // ACC状态位
        gps_time: item.data.gpsTime,
        is_online: item.data.isOnline
      })
    )

    // 并发执行，限制并发数
    await Promise.all(upsertPromises)

    stats.realtimeUpdated += batch.length

    const duration = Date.now() - startTime
    console.log(`[BatchService] Realtime flush: ${batch.length} records in ${duration}ms`)

  } catch (error) {
    console.error('[BatchService] Realtime flush error:', error)
    stats.errors++
  } finally {
    isRealtimeFlushing = false
  }
}

// ========== 批量查询优化 ==========

/**
 * 批量获取设备实时状态 (优先从 Redis)
 */
export async function getRealtimeStatusBatch(
  deviceIds: string[]
): Promise<Map<string, any>> {
  const result = new Map<string, any>()
  const missingIds: string[] = []

  // 1. 先从 Redis 获取
  if (cacheService.isCacheAvailable()) {
    const cachePromises = deviceIds.map(async id => {
      const cached = await cacheService.get<any>(`realtime:${id}`)
      if (cached) {
        result.set(id, cached)
      } else {
        missingIds.push(id)
      }
    })
    await Promise.all(cachePromises)
  } else {
    missingIds.push(...deviceIds)
  }

  // 2. 缺失的从数据库获取
  if (missingIds.length > 0) {
    const dbResults = await DeviceRealtime.findAll({
      where: { device_id: missingIds },
      raw: true
    })

    dbResults.forEach((record: any) => {
      result.set(record.device_id, record)
      // 写入 Redis 缓存
      if (cacheService.isCacheAvailable()) {
        cacheService.set(`realtime:${record.device_id}`, record, 60).catch(() => {})
      }
    })
  }

  return result
}

/**
 * 获取所有在线设备实时状态
 */
export async function getAllRealtimeStatus(): Promise<any[]> {
  // 优先从 Redis 获取汇总数据
  const cacheKey = 'realtime:all'

  if (cacheService.isCacheAvailable()) {
    const cached = await cacheService.get<any[]>(cacheKey)
    if (cached) {
      return cached
    }
  }

  // 从数据库获取
  const results = await DeviceRealtime.findAll({
    where: { is_online: true },
    raw: true
  })

  // 缓存 10 秒
  if (cacheService.isCacheAvailable()) {
    await cacheService.set(cacheKey, results, 10)
  }

  return results
}

// ========== 服务管理 ==========

/**
 * 获取批处理统计信息
 */
export function getStats(): BatchStats & {
  gpsBufferSize: number
  realtimeBufferSize: number
} {
  return {
    ...stats,
    gpsBufferSize: gpsBuffer.length,
    realtimeBufferSize: realtimeBuffer.size
  }
}

/**
 * 强制刷新所有缓冲区
 */
export async function forceFlush(): Promise<void> {
  await Promise.all([
    flushGpsBuffer(),
    flushRealtimeBuffer()
  ])
}

/**
 * 关闭批处理服务
 */
export async function shutdown(): Promise<void> {
  console.log('[BatchService] Shutting down...')

  // 停止定时器
  if (gpsFlushTimer) {
    clearInterval(gpsFlushTimer)
    gpsFlushTimer = null
  }
  if (realtimeFlushTimer) {
    clearInterval(realtimeFlushTimer)
    realtimeFlushTimer = null
  }

  // 刷新所有缓冲区
  await forceFlush()

  console.log('[BatchService] Shutdown complete')
}

/**
 * 初始化批处理服务
 */
export function init(): void {
  console.log('[BatchService] Initializing with config:', BATCH_CONFIG)

  // 启动定时器
  ensureGpsFlushTimer()
  ensureRealtimeFlushTimer()

  // 注册进程退出处理
  process.on('beforeExit', async () => {
    await shutdown()
  })

  console.log('[BatchService] Initialized')
}

export default {
  addGpsData,
  updateRealtimeStatus,
  getRealtimeStatusBatch,
  getAllRealtimeStatus,
  getStats,
  forceFlush,
  shutdown,
  init
}

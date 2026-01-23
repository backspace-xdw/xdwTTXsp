/**
 * Redis Cache Service
 * 提供 API 查询缓存功能
 */

import { createClient, RedisClientType } from 'redis'

// 缓存配置
const CACHE_CONFIG = {
  DEFAULT_TTL: 60,           // 默认缓存时间 60秒
  VEHICLE_LIST_TTL: 30,      // 车辆列表缓存 30秒
  REALTIME_TTL: 10,          // 实时位置缓存 10秒
  TRACK_TTL: 300,            // 轨迹数据缓存 5分钟
  STATS_TTL: 60,             // 统计数据缓存 60秒
}

// Redis 客户端
let redisClient: RedisClientType | null = null
let isConnected = false

/**
 * 初始化 Redis 连接
 */
export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  try {
    redisClient = createClient({ url: redisUrl })

    redisClient.on('error', (err) => {
      console.error('[Cache] Redis error:', err.message)
      isConnected = false
    })

    redisClient.on('connect', () => {
      console.log('[Cache] Redis connected')
      isConnected = true
    })

    redisClient.on('disconnect', () => {
      console.log('[Cache] Redis disconnected')
      isConnected = false
    })

    await redisClient.connect()
  } catch (error) {
    console.error('[Cache] Failed to connect to Redis:', error)
    redisClient = null
    isConnected = false
  }
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isConnected = false
  }
}

/**
 * 检查缓存是否可用
 */
export function isCacheAvailable(): boolean {
  return isConnected && redisClient !== null
}

/**
 * 获取缓存
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!isCacheAvailable()) return null

  try {
    const value = await redisClient!.get(key)
    if (value) {
      return JSON.parse(value) as T
    }
    return null
  } catch (error) {
    console.error('[Cache] Get error:', error)
    return null
  }
}

/**
 * 设置缓存
 */
export async function set(key: string, value: any, ttl?: number): Promise<boolean> {
  if (!isCacheAvailable()) return false

  try {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await redisClient!.setEx(key, ttl, serialized)
    } else {
      await redisClient!.setEx(key, CACHE_CONFIG.DEFAULT_TTL, serialized)
    }
    return true
  } catch (error) {
    console.error('[Cache] Set error:', error)
    return false
  }
}

/**
 * 删除缓存
 */
export async function del(key: string): Promise<boolean> {
  if (!isCacheAvailable()) return false

  try {
    await redisClient!.del(key)
    return true
  } catch (error) {
    console.error('[Cache] Delete error:', error)
    return false
  }
}

/**
 * 删除匹配模式的缓存
 */
export async function delByPattern(pattern: string): Promise<number> {
  if (!isCacheAvailable()) return 0

  try {
    const keys = await redisClient!.keys(pattern)
    if (keys.length > 0) {
      await redisClient!.del(keys)
    }
    return keys.length
  } catch (error) {
    console.error('[Cache] Delete by pattern error:', error)
    return 0
  }
}

// ========== 业务缓存方法 ==========

/**
 * 车辆列表缓存键
 */
export function vehicleListKey(params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return `vehicles:list:${sortedParams}`
}

/**
 * 获取车辆列表缓存
 */
export async function getVehicleList(params: Record<string, any>): Promise<any | null> {
  const key = vehicleListKey(params)
  return get(key)
}

/**
 * 设置车辆列表缓存
 */
export async function setVehicleList(params: Record<string, any>, data: any): Promise<boolean> {
  const key = vehicleListKey(params)
  return set(key, data, CACHE_CONFIG.VEHICLE_LIST_TTL)
}

/**
 * 获取实时位置缓存
 */
export async function getRealtimeLocations(): Promise<any | null> {
  return get('vehicles:realtime:all')
}

/**
 * 设置实时位置缓存
 */
export async function setRealtimeLocations(data: any): Promise<boolean> {
  return set('vehicles:realtime:all', data, CACHE_CONFIG.REALTIME_TTL)
}

/**
 * 获取轨迹缓存
 */
export async function getTrack(deviceId: string, startTime: string, endTime: string): Promise<any | null> {
  const key = `track:${deviceId}:${startTime}:${endTime}`
  return get(key)
}

/**
 * 设置轨迹缓存
 */
export async function setTrack(deviceId: string, startTime: string, endTime: string, data: any): Promise<boolean> {
  const key = `track:${deviceId}:${startTime}:${endTime}`
  return set(key, data, CACHE_CONFIG.TRACK_TTL)
}

/**
 * 获取统计缓存
 */
export async function getStats(): Promise<any | null> {
  return get('vehicles:stats:overview')
}

/**
 * 设置统计缓存
 */
export async function setStats(data: any): Promise<boolean> {
  return set('vehicles:stats:overview', data, CACHE_CONFIG.STATS_TTL)
}

/**
 * 清除所有车辆相关缓存
 */
export async function invalidateVehicleCache(): Promise<void> {
  await delByPattern('vehicles:*')
}

export default {
  initRedis,
  closeRedis,
  isCacheAvailable,
  get,
  set,
  del,
  delByPattern,
  getVehicleList,
  setVehicleList,
  getRealtimeLocations,
  setRealtimeLocations,
  getTrack,
  setTrack,
  getStats,
  setStats,
  invalidateVehicleCache,
}

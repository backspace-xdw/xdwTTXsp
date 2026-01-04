/**
 * 位置服务
 * 处理位置数据存储、查询等
 */

import { Op } from 'sequelize'
import { Location } from '../models'
import { LocationInfo, STATUS_FLAG } from '../jt808/constants'
import * as deviceService from './deviceService'

// 位置缓存 (用于减少数据库写入)
const locationCache: Map<string, {
  location: LocationInfo
  gpsTime: Date
  savedAt: number
}> = new Map()

// 最小保存间隔(毫秒)
const MIN_SAVE_INTERVAL = 5000

/**
 * 保存位置数据
 */
export async function saveLocation(
  deviceId: string,
  location: LocationInfo,
  extras?: { mileage?: number; fuel?: number; recordSpeed?: number }
): Promise<Location | null> {
  try {
    // 检查缓存,避免频繁写入
    const cached = locationCache.get(deviceId)
    const now = Date.now()

    if (cached) {
      const timeDiff = now - cached.savedAt
      // 如果间隔太短且位置没有明显变化,跳过保存
      if (timeDiff < MIN_SAVE_INTERVAL) {
        const latDiff = Math.abs(location.latitude - cached.location.latitude)
        const lngDiff = Math.abs(location.longitude - cached.location.longitude)

        // 位置变化小于0.0001度(约10米)且时间间隔短,跳过
        if (latDiff < 0.0001 && lngDiff < 0.0001) {
          return null
        }
      }
    }

    // 处理南纬/西经
    let latitude = location.latitude
    let longitude = location.longitude
    const southLat = (location.status & STATUS_FLAG.SOUTH_LAT) !== 0
    const westLng = (location.status & STATUS_FLAG.WEST_LNG) !== 0
    if (southLat) latitude = -latitude
    if (westLng) longitude = -longitude

    // 创建位置记录
    const record = await Location.create({
      device_id: deviceId,
      alarm_flag: location.alarmFlag,
      status: location.status,
      latitude,
      longitude,
      altitude: location.altitude,
      speed: location.speed,
      direction: location.direction,
      mileage: extras?.mileage,
      fuel: extras?.fuel,
      record_speed: extras?.recordSpeed,
      gps_time: location.gpsTime
    })

    // 更新缓存
    locationCache.set(deviceId, {
      location,
      gpsTime: location.gpsTime,
      savedAt: now
    })

    // 更新设备实时状态
    await deviceService.updateRealtimeStatus(deviceId, {
      latitude,
      longitude,
      altitude: location.altitude,
      speed: location.speed,
      direction: location.direction,
      mileage: extras?.mileage,
      alarmFlag: location.alarmFlag,
      status: location.status,
      gpsTime: location.gpsTime
    })

    return record
  } catch (error) {
    console.error('[LocationService] 保存位置失败:', error)
    return null
  }
}

/**
 * 批量保存位置数据
 */
export async function saveLocationBatch(
  locations: Array<{
    deviceId: string
    location: LocationInfo
    extras?: { mileage?: number; fuel?: number; recordSpeed?: number }
  }>
): Promise<number> {
  try {
    const records = locations.map(item => {
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

    await Location.bulkCreate(records)
    return records.length
  } catch (error) {
    console.error('[LocationService] 批量保存位置失败:', error)
    return 0
  }
}

/**
 * 查询历史轨迹
 */
export async function getTrack(
  deviceId: string,
  startTime: Date,
  endTime: Date,
  options?: {
    limit?: number
    offset?: number
    simplified?: boolean // 是否简化(抽稀)
  }
): Promise<{
  total: number
  data: Location[]
}> {
  const where = {
    device_id: deviceId,
    gps_time: {
      [Op.between]: [startTime, endTime]
    }
  }

  const total = await Location.count({ where })

  let limit = options?.limit || 10000
  const offset = options?.offset || 0

  // 如果需要简化且数据量大,进行抽稀
  if (options?.simplified && total > limit) {
    // 计算采样间隔
    const interval = Math.ceil(total / limit)

    // 使用SQL进行抽稀 (每interval条取一条)
    const data = await Location.findAll({
      where,
      order: [['gps_time', 'ASC']],
      // 这里简化处理,实际可以用更复杂的抽稀算法
    })

    // 简单抽稀
    const simplified = data.filter((_, index) => index % interval === 0)

    return {
      total,
      data: simplified
    }
  }

  const data = await Location.findAll({
    where,
    order: [['gps_time', 'ASC']],
    limit,
    offset
  })

  return {
    total,
    data
  }
}

/**
 * 获取最后位置
 */
export async function getLastLocation(deviceId: string): Promise<Location | null> {
  return Location.findOne({
    where: { device_id: deviceId },
    order: [['gps_time', 'DESC']]
  })
}

/**
 * 获取多个设备的最后位置
 */
export async function getLastLocations(deviceIds: string[]): Promise<Map<string, Location>> {
  const result = new Map<string, Location>()

  // 使用Promise.all并行查询
  const locations = await Promise.all(
    deviceIds.map(id => getLastLocation(id))
  )

  deviceIds.forEach((id, index) => {
    const location = locations[index]
    if (location) {
      result.set(id, location)
    }
  })

  return result
}

/**
 * 统计行驶里程
 */
export async function calculateMileage(
  deviceId: string,
  startTime: Date,
  endTime: Date
): Promise<{
  totalMileage: number
  startMileage?: number
  endMileage?: number
}> {
  // 获取起始和结束位置
  const startLocation = await Location.findOne({
    where: {
      device_id: deviceId,
      gps_time: { [Op.gte]: startTime },
      mileage: { [Op.not]: null as any }
    },
    order: [['gps_time', 'ASC']]
  })

  const endLocation = await Location.findOne({
    where: {
      device_id: deviceId,
      gps_time: { [Op.lte]: endTime },
      mileage: { [Op.not]: null as any }
    },
    order: [['gps_time', 'DESC']]
  })

  if (!startLocation || !endLocation) {
    return { totalMileage: 0 }
  }

  const startMileage = Number(startLocation.mileage) || 0
  const endMileage = Number(endLocation.mileage) || 0
  const totalMileage = Math.max(0, endMileage - startMileage)

  return {
    totalMileage,
    startMileage,
    endMileage
  }
}

/**
 * 清除缓存
 */
export function clearCache(deviceId?: string): void {
  if (deviceId) {
    locationCache.delete(deviceId)
  } else {
    locationCache.clear()
  }
}

/**
 * 删除历史数据(保留指定天数)
 */
export async function cleanupOldData(retainDays: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retainDays)

  const result = await Location.destroy({
    where: {
      gps_time: { [Op.lt]: cutoffDate }
    }
  })

  console.log(`[LocationService] 清理 ${result} 条过期位置数据`)
  return result
}

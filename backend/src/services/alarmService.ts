/**
 * 报警服务
 * 处理报警数据存储、查询、处理等
 */

import { Op } from 'sequelize'
import { Alarm } from '../models'
import { LocationInfo, ALARM_FLAG, ALARM_TYPE_NAME } from '../jt808/constants'

// 报警级别映射
const ALARM_LEVEL_MAP: Record<number, number> = {
  [ALARM_FLAG.EMERGENCY]: 3,           // 紧急报警 - 紧急
  [ALARM_FLAG.OVERSPEED]: 2,           // 超速报警 - 重要
  [ALARM_FLAG.FATIGUE]: 2,             // 疲劳驾驶 - 重要
  [ALARM_FLAG.DANGER_WARNING]: 2,      // 危险预警 - 重要
  [ALARM_FLAG.VEHICLE_STOLEN]: 3,      // 车辆被盗 - 紧急
  [ALARM_FLAG.ILLEGAL_IGNITION]: 2,    // 非法点火 - 重要
  [ALARM_FLAG.COLLISION_WARNING]: 3,   // 碰撞预警 - 紧急
  [ALARM_FLAG.ROLLOVER_WARNING]: 3,    // 侧翻预警 - 紧急
}

// 报警信息
export interface AlarmInfo {
  type: number
  name: string
  flag: number
}

/**
 * 保存报警记录
 */
export async function saveAlarms(
  deviceId: string,
  alarms: AlarmInfo[],
  location: LocationInfo
): Promise<Alarm[]> {
  const records: Alarm[] = []

  for (const alarm of alarms) {
    try {
      // 检查是否有重复报警(同一设备、同一类型、5分钟内)
      const recentAlarm = await Alarm.findOne({
        where: {
          device_id: deviceId,
          alarm_type: alarm.type,
          gps_time: {
            [Op.gte]: new Date(location.gpsTime.getTime() - 5 * 60 * 1000)
          }
        }
      })

      if (recentAlarm) {
        // 5分钟内有相同报警,跳过
        continue
      }

      // 创建报警记录
      const record = await Alarm.create({
        device_id: deviceId,
        alarm_type: alarm.type,
        alarm_name: alarm.name,
        alarm_flag: alarm.flag,
        alarm_level: ALARM_LEVEL_MAP[alarm.flag] || 1,
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        speed: location.speed,
        direction: location.direction,
        gps_time: location.gpsTime,
        status: 0
      })

      records.push(record)
      console.log(`[AlarmService] 新报警: ${deviceId} - ${alarm.name}`)
    } catch (error) {
      console.error('[AlarmService] 保存报警失败:', error)
    }
  }

  return records
}

/**
 * 解析报警标志并保存
 */
export async function processAlarmFlag(
  deviceId: string,
  alarmFlag: number,
  location: LocationInfo
): Promise<Alarm[]> {
  if (alarmFlag === 0) {
    return []
  }

  const alarms: AlarmInfo[] = []

  // 遍历所有报警类型
  for (const [flagValue, name] of Object.entries(ALARM_TYPE_NAME)) {
    const flag = parseInt(flagValue)
    if ((alarmFlag & flag) !== 0) {
      // 获取报警类型编号
      const type = getAlarmTypeFromFlag(flag)
      alarms.push({ type, name, flag })
    }
  }

  if (alarms.length > 0) {
    return saveAlarms(deviceId, alarms, location)
  }

  return []
}

/**
 * 从报警标志获取报警类型编号
 */
function getAlarmTypeFromFlag(flag: number): number {
  const typeMap: Record<number, number> = {
    [ALARM_FLAG.EMERGENCY]: 0,
    [ALARM_FLAG.OVERSPEED]: 1,
    [ALARM_FLAG.FATIGUE]: 2,
    [ALARM_FLAG.DANGER_WARNING]: 3,
    [ALARM_FLAG.GNSS_FAULT]: 4,
    [ALARM_FLAG.GNSS_ANTENNA_CUT]: 5,
    [ALARM_FLAG.GNSS_ANTENNA_SHORT]: 6,
    [ALARM_FLAG.MAIN_POWER_LOW]: 7,
    [ALARM_FLAG.MAIN_POWER_OFF]: 8,
    [ALARM_FLAG.LCD_FAULT]: 9,
    [ALARM_FLAG.TTS_FAULT]: 10,
    [ALARM_FLAG.CAMERA_FAULT]: 11,
    [ALARM_FLAG.IC_CARD_FAULT]: 12,
    [ALARM_FLAG.OVERSPEED_WARNING]: 13,
    [ALARM_FLAG.FATIGUE_WARNING]: 14,
    [ALARM_FLAG.DRIVING_TIMEOUT_DAY]: 18,
    [ALARM_FLAG.PARKING_TIMEOUT]: 19,
    [ALARM_FLAG.ENTER_EXIT_AREA]: 20,
    [ALARM_FLAG.ENTER_EXIT_ROUTE]: 21,
    [ALARM_FLAG.ROUTE_TIME_ERROR]: 22,
    [ALARM_FLAG.ROUTE_DEVIATION]: 23,
    [ALARM_FLAG.VSS_FAULT]: 24,
    [ALARM_FLAG.FUEL_ABNORMAL]: 25,
    [ALARM_FLAG.VEHICLE_STOLEN]: 26,
    [ALARM_FLAG.ILLEGAL_IGNITION]: 27,
    [ALARM_FLAG.ILLEGAL_DISPLACEMENT]: 28,
    [ALARM_FLAG.COLLISION_WARNING]: 29,
    [ALARM_FLAG.ROLLOVER_WARNING]: 30,
    [ALARM_FLAG.ILLEGAL_DOOR_OPEN]: 31,
  }
  return typeMap[flag] ?? -1
}

/**
 * 查询报警列表
 */
export async function getAlarms(options: {
  deviceId?: string
  alarmType?: number
  status?: number
  startTime?: Date
  endTime?: Date
  limit?: number
  offset?: number
}): Promise<{
  total: number
  data: Alarm[]
}> {
  const where: any = {}

  if (options.deviceId) {
    where.device_id = options.deviceId
  }
  if (options.alarmType !== undefined) {
    where.alarm_type = options.alarmType
  }
  if (options.status !== undefined) {
    where.status = options.status
  }
  if (options.startTime && options.endTime) {
    where.gps_time = {
      [Op.between]: [options.startTime, options.endTime]
    }
  }

  const total = await Alarm.count({ where })
  const data = await Alarm.findAll({
    where,
    order: [['gps_time', 'DESC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  })

  return { total, data }
}

/**
 * 处理报警
 */
export async function handleAlarm(
  alarmId: number,
  handlerId: number,
  status: number,
  remark?: string
): Promise<boolean> {
  const alarm = await Alarm.findByPk(alarmId)
  if (!alarm) {
    return false
  }

  await alarm.update({
    status,
    handler_id: handlerId,
    handle_time: new Date(),
    handle_remark: remark
  })

  console.log(`[AlarmService] 报警已处理: ${alarmId} -> ${status === 1 ? '已处理' : '已忽略'}`)
  return true
}

/**
 * 批量处理报警
 */
export async function handleAlarmBatch(
  alarmIds: number[],
  handlerId: number,
  status: number,
  remark?: string
): Promise<number> {
  const [affectedCount] = await Alarm.update(
    {
      status,
      handler_id: handlerId,
      handle_time: new Date(),
      handle_remark: remark
    },
    {
      where: {
        id: { [Op.in]: alarmIds }
      }
    }
  )

  return affectedCount
}

/**
 * 获取未处理报警数量
 */
export async function getUnhandledCount(deviceId?: string): Promise<number> {
  const where: any = { status: 0 }
  if (deviceId) {
    where.device_id = deviceId
  }
  return Alarm.count({ where })
}

/**
 * 获取报警统计
 */
export async function getAlarmStats(
  startTime: Date,
  endTime: Date,
  deviceId?: string
): Promise<{
  total: number
  handled: number
  unhandled: number
  ignored: number
  byType: Record<string, number>
  byLevel: Record<number, number>
}> {
  const where: any = {
    gps_time: { [Op.between]: [startTime, endTime] }
  }
  if (deviceId) {
    where.device_id = deviceId
  }

  const total = await Alarm.count({ where })
  const handled = await Alarm.count({ where: { ...where, status: 1 } })
  const unhandled = await Alarm.count({ where: { ...where, status: 0 } })
  const ignored = await Alarm.count({ where: { ...where, status: 2 } })

  // 按类型统计
  const byType: Record<string, number> = {}
  const typeStats = await Alarm.findAll({
    where,
    attributes: ['alarm_name'],
    group: ['alarm_name'],
    raw: true
  }) as any[]

  for (const stat of typeStats) {
    if (stat.alarm_name) {
      const count = await Alarm.count({
        where: { ...where, alarm_name: stat.alarm_name }
      })
      byType[stat.alarm_name] = count
    }
  }

  // 按级别统计
  const byLevel: Record<number, number> = {
    1: await Alarm.count({ where: { ...where, alarm_level: 1 } }),
    2: await Alarm.count({ where: { ...where, alarm_level: 2 } }),
    3: await Alarm.count({ where: { ...where, alarm_level: 3 } })
  }

  return {
    total,
    handled,
    unhandled,
    ignored,
    byType,
    byLevel
  }
}

/**
 * 清理过期报警数据
 */
export async function cleanupOldAlarms(retainDays: number = 180): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retainDays)

  const result = await Alarm.destroy({
    where: {
      gps_time: { [Op.lt]: cutoffDate }
    }
  })

  console.log(`[AlarmService] 清理 ${result} 条过期报警数据`)
  return result
}

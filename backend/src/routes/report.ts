/**
 * Report API Routes
 * 报表统计接口 (性能优化版 v2)
 * - 消除重复计数查询: 使用原生SQL COUNT替代全量GROUP BY拉取
 * - 报表数据缓存: 趋势/分布/统计数据缓存5分钟
 * - 并行查询: 独立子查询并行执行
 */

import { Router } from 'express'
import { Op, fn, col, literal, Sequelize } from 'sequelize'
import { Device, Alarm, Location, Company } from '../models'
import { reportCacheKey, getReportCache, setReportCache } from '../services/cacheService'

const router = Router()

// ==================== 设备映射缓存 ====================
let devicePlateCache: Record<string, string> = {}
let deviceCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

async function getDevicePlateMapCached(deviceIds?: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  if (now - deviceCacheTime > CACHE_TTL || Object.keys(devicePlateCache).length === 0) {
    const devices = await Device.findAll({
      attributes: ['device_id', 'plate_no'],
      raw: true
    }) as any[]
    devicePlateCache = {}
    devices.forEach(d => { devicePlateCache[d.device_id] = d.plate_no || d.device_id })
    deviceCacheTime = now
  }

  if (!deviceIds) return devicePlateCache

  const map: Record<string, string> = {}
  deviceIds.forEach(id => { map[id] = devicePlateCache[id] || id })
  return map
}

/** 解析日期范围，默认今天 */
function parseDateRange(query: any): { start: Date; end: Date } {
  const { startDate, endDate } = query
  const now = new Date()
  const start = startDate ? new Date(startDate as string) : new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = endDate ? new Date(endDate as string) : new Date(now)
  end.setHours(23, 59, 59, 999)
  if (start > end) {
    return { start: end, end: start }
  }
  return { start, end }
}

/** 构建设备过滤条件：通过 plateNo 模糊匹配查找 device_id 列表 */
async function getDeviceFilter(query: any): Promise<string[] | null> {
  const { plateNo } = query
  if (!plateNo) return null

  const devices = await Device.findAll({
    attributes: ['device_id'],
    where: { plate_no: { [Op.like]: `%${String(plateNo).slice(0, 20)}%` } },
    raw: true
  })
  return devices.map((d: any) => d.device_id as string)
}

/** 获取 sequelize 实例和设备过滤SQL片段 */
function getSeqAndFilter(deviceIds: string[] | null): { seq: any; deviceFilter: string } {
  const seq = (Location as any).sequelize
  const deviceFilter = deviceIds ? `AND device_id IN (${deviceIds.map(id => seq.escape(id)).join(',')})` : ''
  return { seq, deviceFilter }
}

/**
 * Tab 1: 上下线报告
 * GET /api/reports/online-offline
 * 优化: 用原生SQL COUNT替代全量GROUP BY; 趋势/top10独立查询+缓存
 */
router.get('/online-offline', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query)
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const deviceIds = await getDeviceFilter(req.query)

    const locationWhere: any = {
      gps_time: { [Op.between]: [start, end] }
    }
    if (deviceIds) locationWhere.device_id = deviceIds

    const { seq, deviceFilter } = getSeqAndFilter(deviceIds)

    // [优化] 用原生SQL COUNT替代全量GROUP BY拉取
    const [totalAndDevices, rows] = await Promise.all([
      // 1. 总分组数 + 设备列表 (单次查询)
      seq.query(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT device_id) AS device_count FROM (
          SELECT device_id FROM locations
          WHERE gps_time BETWEEN ? AND ? ${deviceFilter}
          GROUP BY device_id, DATE(gps_time)
        ) sub`,
        { replacements: [start, end], type: 'SELECT' }
      ),
      // 2. 带分页的聚合查询
      Location.findAll({
        attributes: [
          'device_id',
          [fn('DATE', col('gps_time')), 'date'],
          [fn('MIN', col('gps_time')), 'first_online'],
          [fn('MAX', col('gps_time')), 'last_online'],
          [fn('COUNT', col('id')), 'report_count'],
          [fn('TIMESTAMPDIFF', literal('SECOND'), fn('MIN', col('gps_time')), fn('MAX', col('gps_time'))), 'online_seconds']
        ],
        where: locationWhere,
        group: ['device_id', Sequelize.literal('DATE(gps_time)')] as any,
        order: [[literal('date'), 'DESC'], ['device_id', 'ASC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true
      })
    ]) as any[]

    const countData = Array.isArray(totalAndDevices) ? totalAndDevices[0] : totalAndDevices
    const total = parseInt(countData?.total) || 0
    const totalDevices = parseInt(countData?.device_count) || 0

    // 获取当前页设备映射
    const rowDeviceIds: string[] = [...new Set<string>(rows.map((r: any) => r.device_id))]
    const deviceMap = await getDevicePlateMapCached(rowDeviceIds)

    const list = rows.map((r: any) => ({
      deviceId: r.device_id,
      plateNo: deviceMap[r.device_id] || r.device_id,
      date: r.date,
      firstOnline: r.first_online,
      lastOnline: r.last_online,
      onlineSeconds: parseInt(r.online_seconds) || 0,
      onlineHours: parseFloat(((parseInt(r.online_seconds) || 0) / 3600).toFixed(2)),
      reportCount: parseInt(r.report_count) || 0
    }))

    // [缓存] 趋势+top10+统计 使用缓存
    const cacheKey = reportCacheKey('online-offline', {
      start: start.toISOString(), end: end.toISOString(),
      deviceIds: deviceIds?.join(',') || ''
    })
    let cached = await getReportCache<any>(cacheKey)

    if (!cached) {
      const [trendRows, top10Rows, totalRecordsCount] = await Promise.all([
        // 每日在线设备趋势
        seq.query(
          `SELECT date, COUNT(*) AS count FROM (
            SELECT DATE(gps_time) AS date, device_id
            FROM locations WHERE gps_time BETWEEN ? AND ? ${deviceFilter}
            GROUP BY device_id, DATE(gps_time)
          ) sub GROUP BY date ORDER BY date ASC`,
          { replacements: [start, end], type: 'SELECT' }
        ),
        // Top10在线时长
        Location.findAll({
          attributes: [
            'device_id',
            [fn('TIMESTAMPDIFF', literal('SECOND'), fn('MIN', col('gps_time')), fn('MAX', col('gps_time'))), 'total_seconds']
          ],
          where: locationWhere,
          group: ['device_id'],
          order: [[literal('total_seconds'), 'DESC']],
          limit: 10,
          raw: true
        }),
        // 总记录数
        Location.count({ where: locationWhere })
      ]) as any[]

      const trendData = (Array.isArray(trendRows) ? trendRows : []).map((r: any) => ({
        date: r.date,
        count: parseInt(r.count) || 0
      }))

      const top10DeviceMap = await getDevicePlateMapCached(top10Rows.map((r: any) => r.device_id))
      const top10 = top10Rows.map((r: any) => ({
        name: top10DeviceMap[r.device_id] || r.device_id,
        value: parseFloat(((parseInt(r.total_seconds) || 0) / 3600).toFixed(1))
      }))

      const totalOnlineSeconds = rows.reduce((s: number, r: any) => s + (parseInt(r.online_seconds) || 0), 0)
      const avgOnlineHours = total > 0
        ? parseFloat(((totalOnlineSeconds / Math.min(total, pageSize)) / 3600).toFixed(2))
        : 0

      cached = {
        trend: trendData,
        top10,
        stats: { totalDevices, avgOnlineHours, totalRecords: totalRecordsCount || 0 }
      }
      await setReportCache(cacheKey, cached)
    }

    res.json({
      code: 0,
      data: { list, total, ...cached }
    })
  } catch (error) {
    console.error('[Report] 上下线报告查询失败:', error)
    res.status(500).json({ code: 500, message: '查询失败', error: (error as Error).message })
  }
})

/**
 * Tab 2: 里程统计
 * GET /api/reports/mileage
 * 优化: 用原生SQL COUNT替代全量GROUP BY; 趋势/top10缓存
 */
router.get('/mileage', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query)
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const deviceIds = await getDeviceFilter(req.query)

    const locationWhere: any = {
      gps_time: { [Op.between]: [start, end] },
      mileage: { [Op.gt]: 0 }
    }
    if (deviceIds) locationWhere.device_id = deviceIds

    const { seq, deviceFilter } = getSeqAndFilter(deviceIds)
    const mileageFilter = 'AND mileage > 0'

    // [优化] 并行: COUNT + 分页数据
    const [countResult, rows] = await Promise.all([
      seq.query(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT device_id) AS device_count FROM (
          SELECT device_id FROM locations
          WHERE gps_time BETWEEN ? AND ? ${mileageFilter} ${deviceFilter}
          GROUP BY device_id, DATE(gps_time)
        ) sub`,
        { replacements: [start, end], type: 'SELECT' }
      ),
      Location.findAll({
        attributes: [
          'device_id',
          [fn('DATE', col('gps_time')), 'date'],
          [fn('MAX', col('mileage')), 'max_mileage'],
          [fn('MIN', col('mileage')), 'min_mileage'],
          [literal('MAX(mileage) - MIN(mileage)'), 'daily_mileage']
        ],
        where: locationWhere,
        group: ['device_id', Sequelize.literal('DATE(gps_time)')] as any,
        order: [[literal('date'), 'DESC'], [literal('daily_mileage'), 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true
      })
    ]) as any[]

    const countData = Array.isArray(countResult) ? countResult[0] : countResult
    const total = parseInt(countData?.total) || 0
    const vehicleCount = parseInt(countData?.device_count) || 0

    const rowDeviceIds: string[] = [...new Set<string>(rows.map((r: any) => r.device_id))]
    const deviceMap = await getDevicePlateMapCached(rowDeviceIds)

    const list = rows.map((r: any) => ({
      deviceId: r.device_id,
      plateNo: deviceMap[r.device_id] || r.device_id,
      date: r.date,
      dailyMileage: parseFloat(parseFloat(r.daily_mileage || '0').toFixed(1)),
      maxMileage: parseFloat(r.max_mileage || '0'),
      minMileage: parseFloat(r.min_mileage || '0')
    }))

    // [缓存] 趋势+top10+统计
    const cacheKey = reportCacheKey('mileage', {
      start: start.toISOString(), end: end.toISOString(),
      deviceIds: deviceIds?.join(',') || ''
    })
    let cached = await getReportCache<any>(cacheKey)

    if (!cached) {
      const [trendResult, top10Rows] = await Promise.all([
        seq.query(
          `SELECT date, SUM(daily_mileage) AS total_mileage FROM (
            SELECT DATE(gps_time) AS date, device_id, MAX(mileage) - MIN(mileage) AS daily_mileage
            FROM locations
            WHERE gps_time BETWEEN ? AND ? ${mileageFilter} ${deviceFilter}
            GROUP BY device_id, DATE(gps_time)
          ) sub GROUP BY date ORDER BY date ASC`,
          { replacements: [start, end], type: 'SELECT' }
        ),
        Location.findAll({
          attributes: [
            'device_id',
            [literal('MAX(mileage) - MIN(mileage)'), 'total_mileage']
          ],
          where: locationWhere,
          group: ['device_id'],
          order: [[literal('total_mileage'), 'DESC']],
          limit: 10,
          raw: true
        })
      ]) as any[]

      const trendData = (Array.isArray(trendResult) ? trendResult : []).map((r: any) => ({
        date: r.date,
        mileage: parseFloat(parseFloat(r.total_mileage || '0').toFixed(1))
      }))

      const allDeviceMap = await getDevicePlateMapCached(top10Rows.map((r: any) => r.device_id))
      const top10 = top10Rows.map((r: any) => ({
        name: allDeviceMap[r.device_id] || r.device_id,
        value: parseFloat(parseFloat(r.total_mileage || '0').toFixed(1))
      }))

      const sumMileage = parseFloat(trendData.reduce((s: number, t: any) => s + t.mileage, 0).toFixed(1))
      const dayCount = trendData.length || 1
      const avgDailyMileage = trendData.length > 0
        ? parseFloat((sumMileage / dayCount).toFixed(1))
        : 0

      cached = {
        trend: trendData,
        top10,
        stats: { totalMileage: sumMileage, avgDailyMileage, vehicleCount }
      }
      await setReportCache(cacheKey, cached)
    }

    res.json({
      code: 0,
      data: { list, total, ...cached }
    })
  } catch (error) {
    console.error('[Report] 里程统计查询失败:', error)
    res.status(500).json({ code: 500, message: '查询失败', error: (error as Error).message })
  }
})

/**
 * Tab 3: 报警统计
 * GET /api/reports/alarm
 * 优化: 趋势/分布/统计缓存
 */
router.get('/alarm', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query)
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const alarmType = req.query.alarmType as string | undefined
    const alarmLevel = req.query.alarmLevel as string | undefined

    const deviceIds = await getDeviceFilter(req.query)

    const alarmWhere: any = {
      gps_time: { [Op.between]: [start, end] }
    }
    if (deviceIds) alarmWhere.device_id = deviceIds
    if (alarmType) alarmWhere.alarm_type = parseInt(alarmType)
    if (alarmLevel) alarmWhere.alarm_level = parseInt(alarmLevel)

    const baseWhere: any = {
      gps_time: { [Op.between]: [start, end] }
    }
    if (deviceIds) baseWhere.device_id = deviceIds

    // 查询报警列表（带分页） — findAndCountAll 一次搞定
    const { count, rows } = await Alarm.findAndCountAll({
      where: alarmWhere,
      order: [['gps_time', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      raw: true
    }) as any

    const rowDeviceIds: string[] = [...new Set<string>(rows.map((r: any) => r.device_id))]
    const deviceMap = await getDevicePlateMapCached(rowDeviceIds)

    const list = rows.map((r: any) => ({
      id: r.id,
      deviceId: r.device_id,
      plateNo: deviceMap[r.device_id] || r.device_id,
      alarmType: r.alarm_type,
      alarmName: r.alarm_name || '未知报警',
      alarmLevel: r.alarm_level,
      speed: parseFloat(r.speed) || 0,
      status: r.status,
      gpsTime: r.gps_time,
      address: r.address || ''
    }))

    // [缓存] 趋势+类型分布+状态统计
    const cacheKey = reportCacheKey('alarm', {
      start: start.toISOString(), end: end.toISOString(),
      deviceIds: deviceIds?.join(',') || '',
      alarmType: alarmType || '', alarmLevel: alarmLevel || ''
    })
    let cached = await getReportCache<any>(cacheKey)

    if (!cached) {
      const [trendRows, typeRows, statusRows] = await Promise.all([
        Alarm.findAll({
          attributes: [
            [fn('DATE', col('gps_time')), 'date'],
            [fn('COUNT', col('id')), 'count']
          ],
          where: baseWhere,
          group: [Sequelize.literal('DATE(gps_time)')] as any,
          order: [[literal('date'), 'ASC']],
          raw: true
        }),
        Alarm.findAll({
          attributes: [
            'alarm_name',
            [fn('COUNT', col('id')), 'count']
          ],
          where: baseWhere,
          group: ['alarm_name'],
          order: [[literal('count'), 'DESC']],
          limit: 8,
          raw: true
        }),
        Alarm.findAll({
          attributes: [
            'status',
            [fn('COUNT', col('id')), 'count']
          ],
          where: alarmWhere,
          group: ['status'],
          raw: true
        })
      ]) as any[]

      const trend = trendRows.map((r: any) => ({ date: r.date, count: parseInt(r.count) || 0 }))
      const typeDistribution = typeRows.map((r: any) => ({
        name: r.alarm_name || '其他',
        value: parseInt(r.count) || 0
      }))

      const statusMap: Record<number, number> = {}
      statusRows.forEach((r: any) => { statusMap[r.status] = parseInt(r.count) || 0 })
      const handledCount = statusMap[1] || 0
      const unhandledCount = statusMap[0] || 0
      const totalAlarms = count
      const handleRate = totalAlarms > 0
        ? parseFloat(((handledCount / totalAlarms) * 100).toFixed(1))
        : 0

      cached = {
        trend,
        typeDistribution,
        stats: { totalAlarms, handledCount, unhandledCount, handleRate }
      }
      await setReportCache(cacheKey, cached)
    }

    res.json({
      code: 0,
      data: { list, total: count, ...cached }
    })
  } catch (error) {
    console.error('[Report] 报警统计查询失败:', error)
    res.status(500).json({ code: 500, message: '查询失败', error: (error as Error).message })
  }
})

/**
 * Tab 4: 车辆运营
 * GET /api/reports/operation
 * 优化: 用原生SQL COUNT替代全量GROUP BY; 趋势/分布缓存
 */
router.get('/operation', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query)
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const deviceIds = await getDeviceFilter(req.query)

    const locationWhere: any = {
      gps_time: { [Op.between]: [start, end] }
    }
    if (deviceIds) locationWhere.device_id = deviceIds

    const { seq, deviceFilter } = getSeqAndFilter(deviceIds)

    // [优化] 并行: COUNT + 分页数据
    const [countResult, rows] = await Promise.all([
      seq.query(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT device_id) AS device_count FROM (
          SELECT device_id FROM locations
          WHERE gps_time BETWEEN ? AND ? ${deviceFilter}
          GROUP BY device_id, DATE(gps_time)
        ) sub`,
        { replacements: [start, end], type: 'SELECT' }
      ),
      Location.findAll({
        attributes: [
          'device_id',
          [fn('DATE', col('gps_time')), 'date'],
          [fn('COUNT', col('id')), 'total_points'],
          [fn('SUM', literal('CASE WHEN speed > 0 THEN 1 ELSE 0 END')), 'driving_points'],
          [fn('SUM', literal('CASE WHEN speed = 0 THEN 1 ELSE 0 END')), 'parking_points'],
          [fn('MAX', col('speed')), 'max_speed'],
          [fn('AVG', col('speed')), 'avg_speed']
        ],
        where: locationWhere,
        group: ['device_id', Sequelize.literal('DATE(gps_time)')] as any,
        order: [[literal('date'), 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true
      })
    ]) as any[]

    const countData = Array.isArray(countResult) ? countResult[0] : countResult
    const total = parseInt(countData?.total) || 0
    const vehicleCount = parseInt(countData?.device_count) || 0

    const rowDeviceIds: string[] = [...new Set<string>(rows.map((r: any) => r.device_id))]
    const deviceMap = await getDevicePlateMapCached(rowDeviceIds)

    const INTERVAL_SECONDS = 30
    const list = rows.map((r: any) => {
      const totalPoints = parseInt(r.total_points) || 0
      const drivingPoints = parseInt(r.driving_points) || 0
      const parkingPoints = parseInt(r.parking_points) || 0
      const drivingHours = parseFloat(((drivingPoints * INTERVAL_SECONDS) / 3600).toFixed(2))
      const parkingHours = parseFloat(((parkingPoints * INTERVAL_SECONDS) / 3600).toFixed(2))
      const totalHours = drivingHours + parkingHours
      const utilization = totalHours > 0
        ? parseFloat(((drivingHours / totalHours) * 100).toFixed(1))
        : 0

      return {
        deviceId: r.device_id,
        plateNo: deviceMap[r.device_id] || r.device_id,
        date: r.date,
        totalPoints,
        drivingPoints,
        parkingPoints,
        drivingHours,
        parkingHours,
        utilization,
        maxSpeed: parseFloat(parseFloat(r.max_speed || '0').toFixed(1)),
        avgSpeed: parseFloat(parseFloat(r.avg_speed || '0').toFixed(1))
      }
    })

    // [缓存] 趋势+分布+统计
    const cacheKey = reportCacheKey('operation', {
      start: start.toISOString(), end: end.toISOString(),
      deviceIds: deviceIds?.join(',') || ''
    })
    let cached = await getReportCache<any>(cacheKey)

    if (!cached) {
      const [trendRows, distResult] = await Promise.all([
        Location.findAll({
          attributes: [
            [fn('DATE', col('gps_time')), 'date'],
            [fn('SUM', literal('CASE WHEN speed > 0 THEN 1 ELSE 0 END')), 'driving_pts'],
            [fn('COUNT', col('id')), 'total_pts']
          ],
          where: locationWhere,
          group: [Sequelize.literal('DATE(gps_time)')] as any,
          order: [[literal('date'), 'ASC']],
          raw: true
        }),
        seq.query(
          `SELECT
            CASE
              WHEN utilization < 30 THEN '<30%'
              WHEN utilization < 60 THEN '30%-60%'
              WHEN utilization < 80 THEN '60%-80%'
              ELSE '>80%'
            END AS range_label,
            COUNT(*) AS count
          FROM (
            SELECT device_id, DATE(gps_time) AS date,
              SUM(CASE WHEN speed > 0 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS utilization
            FROM locations
            WHERE gps_time BETWEEN ? AND ? ${deviceFilter}
            GROUP BY device_id, DATE(gps_time)
          ) sub
          GROUP BY range_label`,
          { replacements: [start, end], type: 'SELECT' }
        )
      ]) as any[]

      const trend = trendRows.map((r: any) => {
        const dPts = parseInt(r.driving_pts) || 0
        const tPts = parseInt(r.total_pts) || 0
        return {
          date: r.date,
          utilization: tPts > 0 ? parseFloat(((dPts / tPts) * 100).toFixed(1)) : 0,
          drivingHours: parseFloat(((dPts * INTERVAL_SECONDS) / 3600).toFixed(1))
        }
      })

      const distData = Array.isArray(distResult) ? distResult : (distResult ? [distResult] : [])
      const distMap: Record<string, number> = {}
      distData.forEach((r: any) => { if (r.range_label) distMap[r.range_label] = parseInt(r.count) || 0 })
      const utilizationDistribution = [
        { name: '<30%', value: distMap['<30%'] || 0 },
        { name: '30%-60%', value: distMap['30%-60%'] || 0 },
        { name: '60%-80%', value: distMap['60%-80%'] || 0 },
        { name: '>80%', value: distMap['>80%'] || 0 }
      ]

      const totalDrivingPts = trendRows.reduce((s: number, r: any) => s + (parseInt(r.driving_pts) || 0), 0)
      const totalAllPts = trendRows.reduce((s: number, r: any) => s + (parseInt(r.total_pts) || 0), 0)
      const totalDrivingHours = parseFloat(((totalDrivingPts * INTERVAL_SECONDS) / 3600).toFixed(1))
      const avgUtilization = totalAllPts > 0
        ? parseFloat(((totalDrivingPts / totalAllPts) * 100).toFixed(1))
        : 0

      cached = {
        trend,
        utilizationDistribution,
        stats: { vehicleCount, totalDrivingHours, avgUtilization }
      }
      await setReportCache(cacheKey, cached)
    }

    res.json({
      code: 0,
      data: { list, total, ...cached }
    })
  } catch (error) {
    console.error('[Report] 车辆运营查询失败:', error)
    res.status(500).json({ code: 500, message: '查询失败', error: (error as Error).message })
  }
})

/**
 * Tab 5: 超速报表
 * GET /api/reports/overspeed
 * 优化: 趋势/分布/统计缓存
 */
router.get('/overspeed', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query)
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const speedLimit = Math.max(10, Math.min(300, parseFloat(req.query.speedLimit as string) || 120))

    const deviceIds = await getDeviceFilter(req.query)

    const locationWhere: any = {
      gps_time: { [Op.between]: [start, end] },
      speed: { [Op.gt]: speedLimit }
    }
    if (deviceIds) locationWhere.device_id = deviceIds

    // 查询超速记录（带分页） — findAndCountAll 一次搞定
    const { count, rows } = await Location.findAndCountAll({
      where: locationWhere,
      order: [['gps_time', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      raw: true
    }) as any

    const rowDeviceIds: string[] = [...new Set<string>(rows.map((r: any) => r.device_id))]
    const deviceMap = await getDevicePlateMapCached(rowDeviceIds)

    const list = rows.map((r: any) => ({
      id: r.id,
      deviceId: r.device_id,
      plateNo: deviceMap[r.device_id] || r.device_id,
      speed: parseFloat(r.speed) || 0,
      speedLimit,
      overspeedPercent: parseFloat((((parseFloat(r.speed) - speedLimit) / speedLimit) * 100).toFixed(1)),
      latitude: parseFloat(r.latitude) || 0,
      longitude: parseFloat(r.longitude) || 0,
      gpsTime: r.gps_time,
      direction: r.direction
    }))

    // [缓存] 趋势+分布+统计
    const cacheKey = reportCacheKey('overspeed', {
      start: start.toISOString(), end: end.toISOString(),
      speedLimit, deviceIds: deviceIds?.join(',') || ''
    })
    let cached = await getReportCache<any>(cacheKey)

    if (!cached) {
      const [trendRows, distRows, statsResult] = await Promise.all([
        Location.findAll({
          attributes: [
            [fn('DATE', col('gps_time')), 'date'],
            [fn('COUNT', col('id')), 'count']
          ],
          where: locationWhere,
          group: [Sequelize.literal('DATE(gps_time)')] as any,
          order: [[literal('date'), 'ASC']],
          raw: true
        }),
        Location.findAll({
          attributes: [
            [literal(`CASE
              WHEN speed > ${speedLimit} AND speed <= ${speedLimit + 20} THEN '${speedLimit}-${speedLimit + 20}km/h'
              WHEN speed > ${speedLimit + 20} AND speed <= ${speedLimit + 40} THEN '${speedLimit + 20}-${speedLimit + 40}km/h'
              WHEN speed > ${speedLimit + 40} AND speed <= ${speedLimit + 60} THEN '${speedLimit + 40}-${speedLimit + 60}km/h'
              WHEN speed > ${speedLimit + 60} THEN '>${speedLimit + 60}km/h'
            END`), 'range_label'],
            [fn('COUNT', col('id')), 'count']
          ],
          where: locationWhere,
          group: [literal('range_label')] as any,
          raw: true
        }),
        Location.findOne({
          attributes: [
            [fn('COUNT', literal('DISTINCT device_id')), 'involvedVehicles'],
            [fn('MAX', col('speed')), 'maxSpeed']
          ],
          where: locationWhere,
          raw: true
        })
      ]) as any[]

      const trend = trendRows.map((r: any) => ({ date: r.date, count: parseInt(r.count) || 0 }))

      const speedLabels = [
        `${speedLimit}-${speedLimit + 20}km/h`,
        `${speedLimit + 20}-${speedLimit + 40}km/h`,
        `${speedLimit + 40}-${speedLimit + 60}km/h`,
        `>${speedLimit + 60}km/h`
      ]
      const distMap: Record<string, number> = {}
      distRows.forEach((r: any) => {
        if (r.range_label) distMap[r.range_label] = parseInt(r.count) || 0
      })
      const speedDistribution = speedLabels.map(label => ({
        name: label,
        value: distMap[label] || 0
      }))

      const involvedVehicles = parseInt(statsResult?.involvedVehicles) || 0
      const maxSpeed = parseFloat(statsResult?.maxSpeed) || 0

      cached = {
        trend,
        speedDistribution,
        stats: { totalOverspeed: count, involvedVehicles, maxSpeed, speedLimit }
      }
      await setReportCache(cacheKey, cached)
    }

    res.json({
      code: 0,
      data: { list, total: count, ...cached }
    })
  } catch (error) {
    console.error('[Report] 超速报表查询失败:', error)
    res.status(500).json({ code: 500, message: '查询失败', error: (error as Error).message })
  }
})

/**
 * 企业下拉列表
 * GET /api/reports/companies
 */
router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name', 'short_name'],
      where: { status: 1 },
      order: [['name', 'ASC']],
      raw: true
    })

    res.json({
      code: 0,
      data: companies.map((c: any) => ({
        id: c.id,
        name: c.name,
        shortName: c.short_name
      }))
    })
  } catch (error) {
    console.error('[Report] 获取企业列表失败:', error)
    res.status(500).json({ code: 500, message: '获取企业列表失败' })
  }
})

export default router

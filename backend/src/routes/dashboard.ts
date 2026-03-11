/**
 * Dashboard API Routes
 * 仪表盘数据接口
 */

import { Router } from 'express'
import { Op, fn, col, literal } from 'sequelize'
import { Device, Alarm, Location, Company, Driver, DeviceRealtime } from '../models'
import { deviceService, alarmService } from '../services'
import { todayStart, daysAgo } from '../utils/format'

const router = Router()

/**
 * 获取运营看板数据
 * GET /api/dashboard/operation
 */
router.get('/operation', async (req, res) => {
  try {
    const today = todayStart()

    // 并行执行所有独立查询
    const [
      deviceStats,
      totalEnterprises,
      totalDrivers,
      todayOnline,
      alarmVehicles,
      mileageResult,
      mileageRank,
      alarmDistribution,
      onlineTimeRank,
      // 上线趋势: 6个时间段并行
      ...trendCounts
    ] = await Promise.all([
      deviceService.getStats(),
      Company.count(),
      Driver.count(),
      Location.count({ distinct: true, col: 'device_id', where: { gps_time: { [Op.gte]: today } } }),
      Alarm.count({ distinct: true, col: 'device_id', where: { status: 0, gps_time: { [Op.gte]: today } } }),
      DeviceRealtime.findOne({
        attributes: [[fn('AVG', col('mileage')), 'avgMileage']],
        where: { mileage: { [Op.gt]: 0 } },
        raw: true
      }),
      DeviceRealtime.findAll({
        attributes: ['device_id', 'mileage'],
        where: { mileage: { [Op.gt]: 0 } },
        order: [['mileage', 'DESC']],
        limit: 5,
        include: [{ model: Device, as: 'device', attributes: ['plate_no'] }],
        raw: true, nest: true
      }),
      Alarm.findAll({
        attributes: ['alarm_name', [fn('COUNT', col('id')), 'count']],
        where: { gps_time: { [Op.gte]: today } },
        group: ['alarm_name'],
        order: [[literal('count'), 'DESC']],
        limit: 5,
        raw: true
      }),
      DeviceRealtime.findAll({
        attributes: ['device_id', 'updated_at'],
        where: { is_online: true },
        order: [['updated_at', 'ASC']],
        limit: 5,
        include: [{ model: Device, as: 'device', attributes: ['plate_no'] }],
        raw: true, nest: true
      }),
      // 6个时间段的上线趋势 (并行)
      ...[0, 4, 8, 12, 16, 20].map(hour => {
        const hourStart = new Date(today); hourStart.setHours(hour)
        const hourEnd = new Date(today); hourEnd.setHours(hour + 4)
        return Location.count({
          distinct: true, col: 'device_id',
          where: { gps_time: { [Op.gte]: hourStart, [Op.lt]: hourEnd } }
        })
      })
    ])

    // 报警趋势: 近7天并行
    const alarmTrendCounts = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const dayStart = daysAgo(6 - i)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
        return Alarm.count({ where: { gps_time: { [Op.gte]: dayStart, [Op.lt]: dayEnd } } })
          .then(count => ({ date: dayStart.toISOString().split('T')[0], count }))
      })
    )

    const averageMileage = (mileageResult as any)?.avgMileage
      ? parseFloat((mileageResult as any).avgMileage).toFixed(2) : '0'
    const avgOnlineHours = deviceStats.total > 0
      ? ((deviceStats.online / deviceStats.total) * 24).toFixed(2) : '0'
    const normalVehicles = deviceStats.total - (deviceStats.offline || 0)
    const onlineTrend = trendCounts as number[]
    const alarmTrend = alarmTrendCounts

    res.json({
      code: 0,
      data: {
        stats: {
          totalEnterprises,
          totalDrivers,
          totalVehicles: deviceStats.total,
          todayOnline,
          alarmVehicles,
          currentOnline: deviceStats.online,
          averageMileage: parseFloat(averageMileage),
          averageOnlineHours: parseFloat(avgOnlineHours)
        },
        operationData: {
          normal: normalVehicles,
          stopped: 0,
          expired: 0
        },
        onlineTrend,
        mileageRank: mileageRank.map((item: any) => ({
          name: item.device?.plate_no || item.device_id,
          value: Math.round(item.mileage || 0)
        })),
        alarmDistribution: alarmDistribution.map((item: any) => ({
          name: item.alarm_name || '未知',
          value: parseInt(item.count) || 0
        })),
        alarmTrend,
        onlineTimeRank: onlineTimeRank.map((item: any, index: number) => ({
          name: item.device?.plate_no || item.device_id,
          value: 24 - index * 2 // 模拟在线时长
        }))
      }
    })
  } catch (error) {
    console.error('[Dashboard] 获取运营数据失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取运营数据失败',
      error: (error as Error).message
    })
  }
})

/**
 * 获取安全看板数据
 * GET /api/dashboard/safety
 */
router.get('/safety', async (req, res) => {
  try {
    const today = todayStart()
    const sevenDaysAgo = daysAgo(7)

    // 并行执行基础统计查询
    const [totalAlarms, alarmByType, unhandledAlarms, handledAlarms, processingAlarms, alarmTypeDistribution, alarmVehicleRank] = await Promise.all([
      Alarm.count({ where: { gps_time: { [Op.gte]: sevenDaysAgo } } }),
      Alarm.findAll({
        attributes: ['alarm_name', [fn('COUNT', col('id')), 'count']],
        where: { gps_time: { [Op.gte]: sevenDaysAgo } },
        group: ['alarm_name'],
        raw: true
      }),
      Alarm.count({ where: { status: 0, gps_time: { [Op.gte]: sevenDaysAgo } } }),
      Alarm.count({ where: { status: 1, gps_time: { [Op.gte]: sevenDaysAgo } } }),
      Alarm.count({ where: { status: 2, gps_time: { [Op.gte]: sevenDaysAgo } } }),
      Alarm.findAll({
        attributes: ['alarm_name', [fn('COUNT', col('id')), 'count']],
        where: { gps_time: { [Op.gte]: sevenDaysAgo } },
        group: ['alarm_name'],
        order: [[literal('count'), 'DESC']],
        limit: 5,
        raw: true
      }),
      Alarm.findAll({
        attributes: ['device_id', [fn('COUNT', col('id')), 'count']],
        where: { gps_time: { [Op.gte]: sevenDaysAgo } },
        group: ['device_id'],
        order: [[literal('count'), 'DESC']],
        limit: 5,
        raw: true
      })
    ]) as any[]

    // 分类报警 (简化映射)
    const aiAlarmStats = {
      total: totalAlarms,
      adas: 0, // 驾驶辅助
      dsm: 0,  // 驾驶员异常
      bsd: 0,  // 盲点监测
      aggressive: 0, // 激烈驾驶
      gps: 0,  // 卫星定位
      smart: 0 // 智能检测
    }

    for (const alarm of alarmByType) {
      const count = parseInt(alarm.count) || 0
      const name = alarm.alarm_name?.toLowerCase() || ''

      if (name.includes('超速') || name.includes('疲劳')) {
        aiAlarmStats.adas += count
      } else if (name.includes('驾驶员') || name.includes('dsm')) {
        aiAlarmStats.dsm += count
      } else if (name.includes('盲点') || name.includes('bsd')) {
        aiAlarmStats.bsd += count
      } else if (name.includes('急') || name.includes('碰撞')) {
        aiAlarmStats.aggressive += count
      } else if (name.includes('gps') || name.includes('定位')) {
        aiAlarmStats.gps += count
      } else {
        aiAlarmStats.smart += count
      }
    }

    const handleRate = totalAlarms > 0
      ? ((handledAlarms / totalAlarms) * 100).toFixed(1) : '0'

    // 报警趋势: 近7天并行查询
    const alarmTrend = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const dayStart = daysAgo(6 - i)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
        return Alarm.findAll({
          attributes: ['alarm_name', [fn('COUNT', col('id')), 'count']],
          where: { gps_time: { [Op.gte]: dayStart, [Op.lt]: dayEnd } },
          group: ['alarm_name'],
          raw: true
        }).then((dayAlarms: any[]) => {
          let adas = 0, dsm = 0, bsd = 0
          for (const alarm of dayAlarms) {
            const count = parseInt(alarm.count) || 0
            const name = alarm.alarm_name?.toLowerCase() || ''
            if (name.includes('超速') || name.includes('疲劳')) adas += count
            else if (name.includes('驾驶员')) dsm += count
            else bsd += count
          }
          return { date: dayStart.toISOString().split('T')[0], adas, dsm, bsd }
        })
      })
    )

    // 获取报警车辆排名的车牌号 (并行)
    const vehicleRankWithPlate = await Promise.all(
      (alarmVehicleRank as any[]).map(async (item: any) => {
        const device = await Device.findOne({
          where: { device_id: item.device_id },
          attributes: ['plate_no']
        })
        return { name: (device as any)?.plate_no || item.device_id, value: parseInt(item.count) || 0 }
      })
    )

    const alarmHandleStats = { handled: handledAlarms, unhandled: unhandledAlarms, processing: processingAlarms }

    res.json({
      code: 0,
      data: {
        aiAlarmStats,
        safetyStats: {
          expiredDocs: 0,
          untrainedDrivers: 0,
          unhandledAlarms,
          handleRate: parseFloat(handleRate)
        },
        alarmTypeDistribution: (alarmTypeDistribution as any[]).map((item: any) => ({
          name: item.alarm_name || '其他',
          value: parseInt(item.count) || 0
        })),
        alarmTrend,
        alarmHandleStats,
        alarmVehicleRank: vehicleRankWithPlate
      }
    })
  } catch (error) {
    console.error('[Dashboard] 获取安全数据失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取安全数据失败',
      error: (error as Error).message
    })
  }
})

/**
 * 获取数据看板数据
 * GET /api/dashboard/data
 */
router.get('/data', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 30天前
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 基础统计
    const totalVehicles = await Device.count()
    const totalDrivers = await Driver.count()

    // 模拟订单数据 (实际需要订单表)
    const totalOrders = Math.floor(totalVehicles * 30 * 2.5) // 模拟
    const totalRevenue = totalOrders * 125 // 模拟平均订单金额
    const avgMileageOrder = totalVehicles > 0 ? (totalOrders / totalVehicles).toFixed(1) : '0'
    const avgMileageRevenue = totalVehicles > 0 ? (totalRevenue / totalVehicles / 1000).toFixed(1) : '0'

    // 行驶里程 (近30天按日统计)
    const drivingMileage: { date: string; value: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(today)
      dayStart.setDate(dayStart.getDate() - i)

      // 模拟里程数据
      drivingMileage.push({
        date: dayStart.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 5000 + 10000)
      })
    }

    // 里程利用率走势
    const mileageUtilization = drivingMileage.map(item => ({
      date: item.date,
      value: Math.floor(Math.random() * 20 + 65)
    }))

    // 排名数据 (从实时表获取)
    const mileageOrderRank = await DeviceRealtime.findAll({
      attributes: ['device_id', 'mileage'],
      where: { mileage: { [Op.gt]: 0 } },
      order: [['mileage', 'DESC']],
      limit: 5,
      include: [{
        model: Device,
        as: 'device',
        attributes: ['plate_no']
      }],
      raw: true,
      nest: true
    })

    res.json({
      code: 0,
      data: {
        dataStats: {
          totalVehicles,
          totalDrivers,
          totalOrders,
          totalRevenue,
          avgMileageOrder: parseFloat(avgMileageOrder),
          avgMileageRevenue: parseFloat(avgMileageRevenue)
        },
        drivingMileage,
        mileageUtilization,
        mileageOrderRank: mileageOrderRank.map((item: any) => ({
          name: item.device?.plate_no || item.device_id,
          value: Math.floor(Math.random() * 100 + 50)
        })),
        mileageRevenueRank: mileageOrderRank.map((item: any) => ({
          name: item.device?.plate_no || item.device_id,
          value: Math.floor(Math.random() * 10000 + 5000)
        })),
        emptyMileageRank: mileageOrderRank.map((item: any) => ({
          name: item.device?.plate_no || item.device_id,
          value: Math.floor(Math.random() * 500 + 200)
        })),
        orderCountRank: mileageOrderRank.map((item: any) => ({
          name: item.device?.plate_no || item.device_id,
          value: Math.floor(Math.random() * 50 + 20)
        })),
        revenueTrend: drivingMileage.map(item => ({
          date: item.date,
          value: Math.floor(Math.random() * 30000 + 40000)
        }))
      }
    })
  } catch (error) {
    console.error('[Dashboard] 获取数据看板失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取数据看板失败',
      error: (error as Error).message
    })
  }
})

/**
 * 获取仪表盘汇总数据
 * GET /api/dashboard/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const deviceStats = await deviceService.getStats()
    const totalEnterprises = await Company.count()
    const totalDrivers = await Driver.count()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayAlarms = await Alarm.count({
      where: { gps_time: { [Op.gte]: today } }
    })

    const unhandledAlarms = await Alarm.count({
      where: { status: 0 }
    })

    res.json({
      code: 0,
      data: {
        enterprises: totalEnterprises,
        drivers: totalDrivers,
        vehicles: {
          total: deviceStats.total,
          online: deviceStats.online,
          offline: deviceStats.offline,
          driving: deviceStats.driving,
          parkingAccOn: deviceStats.parkingAccOn,
          accOff: deviceStats.accOff
        },
        alarms: {
          today: todayAlarms,
          unhandled: unhandledAlarms
        }
      }
    })
  } catch (error) {
    console.error('[Dashboard] 获取汇总数据失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取汇总数据失败'
    })
  }
})

export default router

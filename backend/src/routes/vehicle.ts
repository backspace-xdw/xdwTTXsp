import { Router, Request, Response } from 'express'
import { Device, DeviceRealtime, Location, Vehicle, Company } from '../models'
import { Op } from 'sequelize'

const router = Router()

// 格式化日期时间
function formatDateTime(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

// 确定车辆运营状态
function getVehicleStatus(realtime: DeviceRealtime | null): string {
  if (!realtime || !realtime.is_online) return 'offline'
  if (realtime.alarm_flag > 0) return 'alarm'
  if (realtime.speed > 0) return 'driving'
  if (realtime.acc_on) return 'parking_acc_on'
  return 'acc_off'
}

// 获取车辆列表 (包含实时位置)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { companyId, status, online, page = 1, pageSize = 20, keyword } = req.query

    // 查询设备及其实时数据
    const devices = await Device.findAll({
      include: [{
        model: DeviceRealtime,
        as: 'realtime',
        required: false
      }],
      order: [['updated_at', 'DESC']]
    })

    // 转换为前端需要的格式
    let vehicleList = devices.map((device: any) => {
      const realtime = device.realtime
      const vehicleStatus = getVehicleStatus(realtime)

      return {
        id: device.id,
        deviceId: device.device_id,
        plateNo: device.plate_no || device.device_id,
        companyId: 1,
        companyName: '监控中心',
        groupName: 'JT808设备',
        driverId: null,
        driverName: '',
        status: vehicleStatus,
        online: realtime?.is_online || false,
        lat: realtime?.latitude ? Number(realtime.latitude) : null,
        lng: realtime?.longitude ? Number(realtime.longitude) : null,
        speed: realtime?.speed ? Number(realtime.speed) : 0,
        direction: realtime?.direction || 0,
        altitude: realtime?.altitude || 0,
        mileage: realtime?.mileage ? Number(realtime.mileage) : 0,
        alarmFlag: realtime?.alarm_flag || 0,
        accOn: realtime?.acc_on || false,
        gpsTime: formatDateTime(realtime?.gps_time),
        lastHeartbeat: formatDateTime(device.last_heartbeat),
        manufacturer: device.manufacturer_id,
        terminalModel: device.terminal_model
      }
    })

    // 筛选
    if (status) {
      vehicleList = vehicleList.filter(v => v.status === status)
    }

    if (online !== undefined) {
      vehicleList = vehicleList.filter(v => v.online === (online === 'true'))
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase()
      vehicleList = vehicleList.filter(v =>
        v.plateNo.toLowerCase().includes(kw) ||
        v.deviceId.toLowerCase().includes(kw)
      )
    }

    // 分页
    const total = vehicleList.length
    const start = (Number(page) - 1) * Number(pageSize)
    const end = start + Number(pageSize)
    const list = vehicleList.slice(start, end)

    res.json({
      code: 0,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('[Vehicle] 获取车辆列表失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get vehicle list'
    })
  }
})

// 获取所有车辆实时位置 (用于地图显示)
router.get('/realtime/all', async (req: Request, res: Response) => {
  try {
    const devices = await Device.findAll({
      include: [{
        model: DeviceRealtime,
        as: 'realtime',
        required: false
      }]
    })

    const locations = devices
      .filter((d: any) => d.realtime?.latitude && d.realtime?.longitude)
      .map((device: any) => {
        const realtime = device.realtime
        return {
          deviceId: device.device_id,
          plateNo: device.plate_no || device.device_id,
          lat: Number(realtime.latitude),
          lng: Number(realtime.longitude),
          speed: Number(realtime.speed) || 0,
          direction: realtime.direction || 0,
          status: getVehicleStatus(realtime),
          online: realtime.is_online,
          accOn: realtime.acc_on,
          alarmFlag: realtime.alarm_flag,
          gpsTime: formatDateTime(realtime.gps_time)
        }
      })

    res.json({
      code: 0,
      data: locations
    })
  } catch (error) {
    console.error('[Vehicle] 获取实时位置失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get realtime locations'
    })
  }
})

// 获取单个车辆
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const device = await Device.findByPk(req.params.id, {
      include: [{
        model: DeviceRealtime,
        as: 'realtime',
        required: false
      }]
    }) as any

    if (!device) {
      return res.status(404).json({
        code: 404,
        message: 'Vehicle not found'
      })
    }

    const realtime = device.realtime
    res.json({
      code: 0,
      data: {
        id: device.id,
        deviceId: device.device_id,
        plateNo: device.plate_no || device.device_id,
        companyName: '监控中心',
        status: getVehicleStatus(realtime),
        online: realtime?.is_online || false,
        lat: realtime?.latitude ? Number(realtime.latitude) : null,
        lng: realtime?.longitude ? Number(realtime.longitude) : null,
        speed: realtime?.speed ? Number(realtime.speed) : 0,
        direction: realtime?.direction || 0,
        gpsTime: formatDateTime(realtime?.gps_time),
        manufacturer: device.manufacturer_id,
        terminalModel: device.terminal_model
      }
    })
  } catch (error) {
    console.error('[Vehicle] 获取车辆详情失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get vehicle'
    })
  }
})

// 获取车辆实时位置
router.get('/:id/location', async (req: Request, res: Response) => {
  try {
    // 支持通过 id 或 deviceId 查询
    const idOrDeviceId = req.params.id

    let device: any
    if (/^\d+$/.test(idOrDeviceId)) {
      device = await Device.findByPk(idOrDeviceId, {
        include: [{ model: DeviceRealtime, as: 'realtime' }]
      })
    } else {
      device = await Device.findOne({
        where: { device_id: idOrDeviceId },
        include: [{ model: DeviceRealtime, as: 'realtime' }]
      })
    }

    if (!device) {
      return res.status(404).json({
        code: 404,
        message: 'Vehicle not found'
      })
    }

    const realtime = device.realtime
    res.json({
      code: 0,
      data: {
        deviceId: device.device_id,
        plateNo: device.plate_no || device.device_id,
        lat: realtime?.latitude ? Number(realtime.latitude) : null,
        lng: realtime?.longitude ? Number(realtime.longitude) : null,
        speed: realtime?.speed ? Number(realtime.speed) : 0,
        direction: realtime?.direction || 0,
        altitude: realtime?.altitude || 0,
        accOn: realtime?.acc_on || false,
        online: realtime?.is_online || false,
        alarmFlag: realtime?.alarm_flag || 0,
        gpsTime: formatDateTime(realtime?.gps_time)
      }
    })
  } catch (error) {
    console.error('[Vehicle] 获取车辆位置失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get vehicle location'
    })
  }
})

// 获取车辆历史轨迹
router.get('/:id/track', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.query
    const idOrDeviceId = req.params.id

    // 查找设备
    let device: any
    if (/^\d+$/.test(idOrDeviceId)) {
      device = await Device.findByPk(idOrDeviceId)
    } else {
      device = await Device.findOne({ where: { device_id: idOrDeviceId } })
    }

    if (!device) {
      return res.status(404).json({
        code: 404,
        message: 'Vehicle not found'
      })
    }

    // 构建时间范围
    const start = startTime ? new Date(startTime as string) : new Date(Date.now() - 3600000)
    const end = endTime ? new Date(endTime as string) : new Date()

    // 查询历史轨迹
    const locations = await Location.findAll({
      where: {
        device_id: device.device_id,
        gps_time: {
          [Op.between]: [start, end]
        }
      },
      order: [['gps_time', 'ASC']],
      limit: 1000
    })

    const track = locations.map((loc: any) => ({
      lng: Number(loc.longitude),
      lat: Number(loc.latitude),
      speed: Number(loc.speed) || 0,
      direction: loc.direction || 0,
      altitude: loc.altitude || 0,
      time: formatDateTime(loc.gps_time),
      alarmFlag: loc.alarm_flag || 0
    }))

    // 计算统计信息
    const totalMileage = track.length > 1 ? calculateMileage(track) : 0
    const avgSpeed = track.length > 0
      ? track.reduce((sum, p) => sum + p.speed, 0) / track.length
      : 0

    res.json({
      code: 0,
      data: {
        deviceId: device.device_id,
        plateNo: device.plate_no || device.device_id,
        track,
        summary: {
          pointCount: track.length,
          startTime: track[0]?.time || '',
          endTime: track[track.length - 1]?.time || '',
          mileage: totalMileage.toFixed(2),
          avgSpeed: avgSpeed.toFixed(1)
        }
      }
    })
  } catch (error) {
    console.error('[Vehicle] 获取车辆轨迹失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get vehicle track'
    })
  }
})

// 计算里程 (Haversine公式)
function calculateMileage(track: Array<{lat: number, lng: number}>): number {
  let total = 0
  for (let i = 1; i < track.length; i++) {
    const p1 = track[i - 1]
    const p2 = track[i]
    total += haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng)
  }
  return total
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // 地球半径 km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// 车辆统计
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const devices = await Device.findAll({
      include: [{
        model: DeviceRealtime,
        as: 'realtime',
        required: false
      }]
    })

    let online = 0
    let driving = 0
    let parkingAccOn = 0
    let accOff = 0
    let alarm = 0

    devices.forEach((device: any) => {
      const realtime = device.realtime
      if (realtime?.is_online) {
        online++
        if (realtime.alarm_flag > 0) {
          alarm++
        } else if (realtime.speed > 0) {
          driving++
        } else if (realtime.acc_on) {
          parkingAccOn++
        } else {
          accOff++
        }
      }
    })

    const total = devices.length
    const offline = total - online

    res.json({
      code: 0,
      data: {
        total,
        online,
        offline,
        driving,
        parkingAccOn,
        accOff,
        alarm,
        onlineRate: total > 0 ? ((online / total) * 100).toFixed(2) : '0.00'
      }
    })
  } catch (error) {
    console.error('[Vehicle] 获取统计失败:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get stats'
    })
  }
})

export default router

import { Router, Request, Response } from 'express'

const router = Router()

// 模拟车辆数据
const mockVehicles = [
  {
    id: 1,
    plateNo: '沪A12345',
    deviceId: 'DEV001',
    companyId: 3,
    companyName: '金旅',
    driverId: 1,
    driverName: '张三',
    status: 'driving',
    online: true,
    lat: 31.2304,
    lng: 121.4737,
    speed: 60,
    direction: 45,
    gpsTime: new Date().toISOString()
  },
  {
    id: 2,
    plateNo: '沪B67890',
    deviceId: 'DEV002',
    companyId: 3,
    companyName: '金旅',
    driverId: 2,
    driverName: '李四',
    status: 'parking_acc_on',
    online: true,
    lat: 31.2404,
    lng: 121.4837,
    speed: 0,
    direction: 90,
    gpsTime: new Date().toISOString()
  },
  {
    id: 3,
    plateNo: '沪C11111',
    deviceId: 'DEV003',
    companyId: 3,
    companyName: '金旅',
    status: 'offline',
    online: false,
    lat: 31.2204,
    lng: 121.4637
  },
  {
    id: 4,
    plateNo: '京A11111',
    deviceId: 'DEV004',
    companyId: 4,
    companyName: '本安测试部',
    status: 'driving',
    online: true,
    lat: 39.9042,
    lng: 116.4074,
    speed: 45,
    direction: 180,
    gpsTime: new Date().toISOString()
  }
]

// 获取车辆列表
router.get('/', (req: Request, res: Response) => {
  const { companyId, status, online, page = 1, pageSize = 20 } = req.query

  let filtered = [...mockVehicles]

  if (companyId) {
    filtered = filtered.filter(v => v.companyId === Number(companyId))
  }

  if (status) {
    filtered = filtered.filter(v => v.status === status)
  }

  if (online !== undefined) {
    filtered = filtered.filter(v => v.online === (online === 'true'))
  }

  const start = (Number(page) - 1) * Number(pageSize)
  const end = start + Number(pageSize)
  const list = filtered.slice(start, end)

  res.json({
    code: 0,
    data: {
      list,
      total: filtered.length,
      page: Number(page),
      pageSize: Number(pageSize)
    }
  })
})

// 获取单个车辆
router.get('/:id', (req: Request, res: Response) => {
  const vehicle = mockVehicles.find(v => v.id === Number(req.params.id))

  if (!vehicle) {
    return res.status(404).json({
      code: 404,
      message: 'Vehicle not found'
    })
  }

  res.json({
    code: 0,
    data: vehicle
  })
})

// 获取车辆实时位置
router.get('/:id/location', (req: Request, res: Response) => {
  const vehicle = mockVehicles.find(v => v.id === Number(req.params.id))

  if (!vehicle) {
    return res.status(404).json({
      code: 404,
      message: 'Vehicle not found'
    })
  }

  res.json({
    code: 0,
    data: {
      plateNo: vehicle.plateNo,
      lat: vehicle.lat,
      lng: vehicle.lng,
      speed: vehicle.speed,
      direction: vehicle.direction,
      gpsTime: vehicle.gpsTime,
      online: vehicle.online
    }
  })
})

// 获取车辆历史轨迹
router.get('/:id/track', (req: Request, res: Response) => {
  const { startTime, endTime } = req.query
  const vehicle = mockVehicles.find(v => v.id === Number(req.params.id))

  if (!vehicle) {
    return res.status(404).json({
      code: 404,
      message: 'Vehicle not found'
    })
  }

  // 解析时间范围
  const start = startTime ? new Date(startTime as string).getTime() : Date.now() - 3600000
  const end = endTime ? new Date(endTime as string).getTime() : Date.now()
  const duration = end - start
  const pointCount = Math.min(Math.floor(duration / 60000), 200) // 每分钟一个点，最多200个

  // 根据车辆位置生成模拟轨迹
  const baseLng = vehicle.lng || 121.4737
  const baseLat = vehicle.lat || 31.2304

  const addresses = [
    '张江高科技园区',
    '金桥开发区',
    '陆家嘴金融区',
    '世纪公园',
    '浦东大道',
    '杨高中路',
    '龙阳路',
    '东方明珠'
  ]

  // 模拟轨迹数据
  const track = Array.from({ length: pointCount }, (_, i) => {
    const time = new Date(start + i * 60000)
    const progress = i / pointCount

    return {
      lng: baseLng + (Math.random() - 0.3) * 0.08 + progress * 0.05,
      lat: baseLat + (Math.random() - 0.5) * 0.04 + progress * 0.02,
      speed: Math.floor(Math.random() * 60) + 20,
      direction: Math.floor(Math.random() * 360),
      time: formatDateTime(time),
      address: `上海市浦东新区${addresses[i % addresses.length]}${100 + i}号`
    }
  })

  res.json({
    code: 0,
    data: {
      vehicleId: vehicle.id,
      plateNo: vehicle.plateNo,
      track,
      summary: {
        pointCount: track.length,
        startTime: track[0]?.time,
        endTime: track[track.length - 1]?.time,
        mileage: (track.length * 0.5).toFixed(2), // 模拟里程
        avgSpeed: (track.reduce((sum, p) => sum + p.speed, 0) / track.length).toFixed(1)
      }
    }
  })
})

// 格式化日期时间
function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

// 车辆统计
router.get('/stats/overview', (req: Request, res: Response) => {
  const total = mockVehicles.length
  const online = mockVehicles.filter(v => v.online).length
  const driving = mockVehicles.filter(v => v.status === 'driving').length
  const parkingAccOn = mockVehicles.filter(v => v.status === 'parking_acc_on').length
  const accOff = mockVehicles.filter(v => v.status === 'acc_off').length
  const alarm = mockVehicles.filter(v => v.status === 'alarm').length

  res.json({
    code: 0,
    data: {
      total,
      online,
      offline: total - online,
      driving,
      parkingAccOn,
      accOff,
      alarm,
      onlineRate: total > 0 ? ((online / total) * 100).toFixed(2) : '0.00'
    }
  })
})

export default router

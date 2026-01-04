import { Router, Request, Response } from 'express'

const router = Router()

// 报警类型定义
const alarmTypes = [
  { value: 'fatigue', label: '疲劳驾驶', color: '#f56c6c' },
  { value: 'phone', label: '接打电话', color: '#e6a23c' },
  { value: 'smoke', label: '抽烟', color: '#e6a23c' },
  { value: 'distraction', label: '分神驾驶', color: '#e6a23c' },
  { value: 'lane_departure', label: '车道偏离', color: '#f56c6c' },
  { value: 'forward_collision', label: '前车碰撞预警', color: '#f56c6c' },
  { value: 'pedestrian', label: '行人碰撞预警', color: '#f56c6c' },
  { value: 'speed', label: '超速报警', color: '#e6a23c' },
  { value: 'no_face', label: '未检测到人脸', color: '#909399' },
  { value: 'camera_blocked', label: '摄像头遮挡', color: '#909399' }
]

// 车辆数据
const vehicles = [
  { plateNo: '沪A12345', driverName: '张三', companyName: '金旅', deviceId: 'DEV001' },
  { plateNo: '沪B67890', driverName: '李四', companyName: '金旅', deviceId: 'DEV002' },
  { plateNo: '沪C11111', driverName: '王五', companyName: '金旅', deviceId: 'DEV003' },
  { plateNo: '京A11111', driverName: '赵六', companyName: '本安测试部', deviceId: 'DEV004' }
]

// 位置数据
const locations = [
  '上海市浦东新区张江高科技园区',
  '上海市浦东新区陆家嘴金融中心',
  '上海市浦东新区世纪大道',
  '上海市黄浦区南京东路',
  '北京市朝阳区CBD商务区',
  '北京市海淀区中关村'
]

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

// 生成模拟报警数据
function generateMockAlarms(): any[] {
  const now = new Date()
  const mockData: any[] = []
  const levels = ['high', 'medium', 'low']
  const statuses = ['pending', 'pending', 'pending', 'processed', 'ignored']

  for (let i = 0; i < 100; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)]
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)]
    const time = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 最近7天

    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const isProcessed = status !== 'pending'

    mockData.push({
      id: i + 1,
      ...vehicle,
      alarmType: alarmType.label,
      alarmTypeCode: alarmType.value,
      alarmTime: formatDateTime(time),
      level: levels[Math.floor(Math.random() * levels.length)],
      speed: Math.floor(Math.random() * 80) + 20,
      lat: 31.2304 + (Math.random() - 0.5) * 0.1,
      lng: 121.4737 + (Math.random() - 0.5) * 0.1,
      location: locations[Math.floor(Math.random() * locations.length)],
      status,
      hasVideo: Math.random() > 0.3,
      hasImage: Math.random() > 0.2,
      imageUrl: 'https://via.placeholder.com/640x480?text=Alarm+Image',
      videoUrl: '',
      processedBy: isProcessed ? 'admin' : null,
      processedTime: isProcessed ? formatDateTime(new Date(time.getTime() + Math.random() * 3600000)) : null,
      processRemark: isProcessed ? '已处理' : null
    })
  }

  // 按时间排序
  mockData.sort((a, b) => new Date(b.alarmTime).getTime() - new Date(a.alarmTime).getTime())

  return mockData
}

// 模拟报警数据存储
let mockAlarms = generateMockAlarms()

// 获取报警列表
router.get('/', (req: Request, res: Response) => {
  const { alarmType, status, plateNo, startTime, endTime, page = 1, pageSize = 20 } = req.query

  let filtered = [...mockAlarms]

  if (alarmType) {
    filtered = filtered.filter(a => a.alarmTypeCode === alarmType)
  }

  if (status) {
    filtered = filtered.filter(a => a.status === status)
  }

  if (plateNo) {
    filtered = filtered.filter(a => a.plateNo.includes(plateNo as string))
  }

  if (startTime) {
    const start = new Date(startTime as string).getTime()
    filtered = filtered.filter(a => new Date(a.alarmTime).getTime() >= start)
  }

  if (endTime) {
    const end = new Date(endTime as string).getTime()
    filtered = filtered.filter(a => new Date(a.alarmTime).getTime() <= end)
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

// 获取单个报警详情
router.get('/:id', (req: Request, res: Response) => {
  const alarm = mockAlarms.find(a => a.id === Number(req.params.id))

  if (!alarm) {
    return res.status(404).json({
      code: 404,
      message: 'Alarm not found'
    })
  }

  res.json({
    code: 0,
    data: alarm
  })
})

// 获取报警统计
router.get('/stats/overview', (req: Request, res: Response) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayAlarms = mockAlarms.filter(a => new Date(a.alarmTime) >= today)

  const total = todayAlarms.length
  const pending = todayAlarms.filter(a => a.status === 'pending').length
  const processed = todayAlarms.filter(a => a.status === 'processed').length
  const ignored = todayAlarms.filter(a => a.status === 'ignored').length
  const highLevel = todayAlarms.filter(a => a.level === 'high').length

  // 按类型统计
  const byType: Record<string, number> = {}
  todayAlarms.forEach(a => {
    byType[a.alarmTypeCode] = (byType[a.alarmTypeCode] || 0) + 1
  })

  res.json({
    code: 0,
    data: {
      total,
      pending,
      processed,
      ignored,
      highLevel,
      byType
    }
  })
})

// 处理报警
router.post('/:id/process', (req: Request, res: Response) => {
  const { result, remark } = req.body
  const alarm = mockAlarms.find(a => a.id === Number(req.params.id))

  if (!alarm) {
    return res.status(404).json({
      code: 404,
      message: 'Alarm not found'
    })
  }

  if (alarm.status !== 'pending') {
    return res.status(400).json({
      code: 400,
      message: 'Alarm already processed'
    })
  }

  // 更新报警状态
  alarm.status = 'processed'
  alarm.processedBy = 'admin'
  alarm.processedTime = formatDateTime(new Date())
  alarm.processRemark = remark || result

  res.json({
    code: 0,
    message: 'Alarm processed successfully',
    data: alarm
  })
})

// 忽略报警
router.post('/:id/ignore', (req: Request, res: Response) => {
  const { reason } = req.body
  const alarm = mockAlarms.find(a => a.id === Number(req.params.id))

  if (!alarm) {
    return res.status(404).json({
      code: 404,
      message: 'Alarm not found'
    })
  }

  if (alarm.status !== 'pending') {
    return res.status(400).json({
      code: 400,
      message: 'Alarm already processed'
    })
  }

  // 更新报警状态
  alarm.status = 'ignored'
  alarm.processedBy = 'admin'
  alarm.processedTime = formatDateTime(new Date())
  alarm.processRemark = reason || '已忽略'

  res.json({
    code: 0,
    message: 'Alarm ignored successfully',
    data: alarm
  })
})

// 批量处理报警
router.post('/batch/process', (req: Request, res: Response) => {
  const { ids, result, remark } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      code: 400,
      message: 'Invalid alarm IDs'
    })
  }

  const processed: number[] = []
  const now = formatDateTime(new Date())

  ids.forEach((id: number) => {
    const alarm = mockAlarms.find(a => a.id === id && a.status === 'pending')
    if (alarm) {
      alarm.status = 'processed'
      alarm.processedBy = 'admin'
      alarm.processedTime = now
      alarm.processRemark = remark || result
      processed.push(id)
    }
  })

  res.json({
    code: 0,
    message: `${processed.length} alarms processed successfully`,
    data: { processed }
  })
})

// 获取报警类型列表
router.get('/types/list', (req: Request, res: Response) => {
  res.json({
    code: 0,
    data: alarmTypes
  })
})

export default router

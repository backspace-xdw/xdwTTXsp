import { Router, Request, Response } from 'express'

const router = Router()

// Dashboard统计数据
router.get('/dashboard', (req: Request, res: Response) => {
  res.json({
    code: 0,
    data: {
      totalEnterprises: 30,
      totalDrivers: 0,
      totalVehicles: 4558,
      todayOnline: 355,
      averageMileage: 10.33,
      onlineRate: 3.31,
      damageRate: 82.47,
      vehicleOperation: {
        normal: 735,
        repair: 310,
        disable: 234,
        expired: 135
      },
      alarmStats: {
        total: 1234,
        pending: 127,
        handled: 1107
      }
    }
  })
})

// 车辆在线趋势
router.get('/online-trend', (req: Request, res: Response) => {
  const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
  const data = hours.map(h => ({
    time: h,
    count: Math.floor(Math.random() * 400) + 100
  }))

  res.json({
    code: 0,
    data
  })
})

// 报警排名
router.get('/alarm-rank', (req: Request, res: Response) => {
  const { type = 'worst' } = req.query

  const vehicles = [
    { plateNo: '沪A12345', count: 120 },
    { plateNo: '沪B67890', count: 98 },
    { plateNo: '京A11111', count: 85 },
    { plateNo: '粤A22222', count: 72 },
    { plateNo: '苏B33333', count: 65 }
  ]

  if (type === 'best') {
    vehicles.reverse()
  }

  res.json({
    code: 0,
    data: vehicles
  })
})

// 里程排名
router.get('/mileage-rank', (req: Request, res: Response) => {
  const vehicles = [
    { plateNo: '沪C44444', mileage: 2500 },
    { plateNo: '沪D55555', mileage: 2200 },
    { plateNo: '京E66666', mileage: 1800 },
    { plateNo: '粤F77777', mileage: 1500 },
    { plateNo: '苏G88888', mileage: 1200 }
  ]

  res.json({
    code: 0,
    data: vehicles
  })
})

export default router

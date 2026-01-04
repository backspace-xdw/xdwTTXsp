import { Router, Request, Response } from 'express'

const router = Router()

// 模拟企业数据
const mockCompanies = [
  {
    id: 1,
    name: 'Monitoring Center',
    parentId: null,
    vehicleCount: 4558,
    onlineCount: 151
  },
  {
    id: 2,
    name: '808',
    parentId: 1,
    vehicleCount: 5,
    onlineCount: 0
  },
  {
    id: 3,
    name: '金旅',
    parentId: 1,
    vehicleCount: 4187,
    onlineCount: 144
  },
  {
    id: 4,
    name: '本安测试部',
    parentId: 1,
    vehicleCount: 89,
    onlineCount: 0
  },
  {
    id: 5,
    name: '山东四通',
    parentId: 1,
    vehicleCount: 20,
    onlineCount: 6
  }
]

// 获取企业列表
router.get('/', (req: Request, res: Response) => {
  res.json({
    code: 0,
    data: mockCompanies
  })
})

// 获取企业树结构
router.get('/tree', (req: Request, res: Response) => {
  const buildTree = (parentId: number | null): any[] => {
    return mockCompanies
      .filter(c => c.parentId === parentId)
      .map(company => ({
        ...company,
        children: buildTree(company.id)
      }))
  }

  res.json({
    code: 0,
    data: buildTree(null)
  })
})

// 获取单个企业
router.get('/:id', (req: Request, res: Response) => {
  const company = mockCompanies.find(c => c.id === Number(req.params.id))

  if (!company) {
    return res.status(404).json({
      code: 404,
      message: 'Company not found'
    })
  }

  res.json({
    code: 0,
    data: company
  })
})

export default router

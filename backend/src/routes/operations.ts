/**
 * 运营管理路由
 * 提供车辆、驾驶员、设备、企业的CRUD操作
 */

import { Router, Request, Response } from 'express'
import { Device, Driver, Company, DeviceRealtime } from '../models'
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

// ================== 车辆管理 ==================

// 创建车辆 (实际上是创建/更新设备记录)
router.post('/vehicles', async (req: Request, res: Response) => {
  try {
    const { device_id, plate_no, sim_no, plate_color, company_id, driver_id } = req.body

    if (!device_id) {
      return res.status(400).json({ code: 400, message: '设备ID不能为空' })
    }

    // 检查是否已存在
    const existing = await Device.findOne({ where: { device_id } })
    if (existing) {
      return res.status(400).json({ code: 400, message: '设备ID已存在' })
    }

    const device = await Device.create({
      device_id,
      plate_no,
      sim_no,
      plate_color: plate_color || 1,
      protocol_version: '2019'
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: device.id }
    })
  } catch (error) {
    console.error('[Operations] 创建车辆失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新车辆
router.put('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { plate_no, sim_no, plate_color } = req.body

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ code: 404, message: '车辆不存在' })
    }

    await device.update({
      plate_no,
      sim_no,
      plate_color
    })

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新车辆失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除车辆
router.delete('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ code: 404, message: '车辆不存在' })
    }

    // 同时删除关联的实时数据
    await DeviceRealtime.destroy({ where: { device_id: device.device_id } })
    await device.destroy()

    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除车辆失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除车辆
router.delete('/vehicles/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    // 获取设备ID列表
    const devices = await Device.findAll({ where: { id: { [Op.in]: ids } } })
    const deviceIds = devices.map((d: any) => d.device_id)

    // 删除实时数据
    await DeviceRealtime.destroy({ where: { device_id: { [Op.in]: deviceIds } } })
    // 删除设备
    await Device.destroy({ where: { id: { [Op.in]: ids } } })

    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除车辆失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

// ================== 驾驶员管理 ==================

// 获取驾驶员列表
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, companyId } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
        { license_no: { [Op.like]: `%${keyword}%` } }
      ]
    }
    if (companyId) {
      where.company_id = companyId
    }

    const { count, rows } = await Driver.findAndCountAll({
      where,
      include: [{
        model: Company,
        as: 'company',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    })

    const list = rows.map((driver: any) => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      idCard: driver.id_card,
      licenseNo: driver.license_no,
      licenseType: driver.license_type,
      companyId: driver.company_id,
      companyName: driver.company?.name || '',
      icCardNo: driver.ic_card_no,
      status: driver.status,
      createdAt: formatDateTime(driver.created_at)
    }))

    res.json({
      code: 0,
      data: {
        list,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('[Operations] 获取驾驶员列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 创建驾驶员
router.post('/drivers', async (req: Request, res: Response) => {
  try {
    const { name, phone, id_card, license_no, license_type, company_id, ic_card_no, status } = req.body

    if (!name) {
      return res.status(400).json({ code: 400, message: '姓名不能为空' })
    }

    const driver = await Driver.create({
      name,
      phone,
      id_card,
      license_no,
      license_type,
      company_id,
      ic_card_no,
      status: status ?? 1
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: driver.id }
    })
  } catch (error) {
    console.error('[Operations] 创建驾驶员失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新驾驶员
router.put('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, id_card, license_no, license_type, company_id, ic_card_no, status } = req.body

    const driver = await Driver.findByPk(id)
    if (!driver) {
      return res.status(404).json({ code: 404, message: '驾驶员不存在' })
    }

    await driver.update({
      name,
      phone,
      id_card,
      license_no,
      license_type,
      company_id,
      ic_card_no,
      status
    })

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新驾驶员失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除驾驶员
router.delete('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const driver = await Driver.findByPk(id)
    if (!driver) {
      return res.status(404).json({ code: 404, message: '驾驶员不存在' })
    }

    await driver.destroy()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除驾驶员失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除驾驶员
router.delete('/drivers/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    await Driver.destroy({ where: { id: { [Op.in]: ids } } })
    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除驾驶员失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

// ================== 设备管理 ==================

// 获取设备列表
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, online } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { device_id: { [Op.like]: `%${keyword}%` } },
        { sim_no: { [Op.like]: `%${keyword}%` } },
        { plate_no: { [Op.like]: `%${keyword}%` } }
      ]
    }
    if (online !== undefined) {
      where.is_online = online === 'true'
    }

    const { count, rows } = await Device.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    })

    const list = rows.map((device: any) => ({
      id: device.id,
      deviceId: device.device_id,
      simNo: device.sim_no,
      plateNo: device.plate_no,
      terminalModel: device.terminal_model,
      manufacturerId: device.manufacturer_id,
      protocolVersion: device.protocol_version,
      isOnline: device.is_online,
      lastHeartbeat: formatDateTime(device.last_heartbeat),
      createdAt: formatDateTime(device.created_at)
    }))

    res.json({
      code: 0,
      data: {
        list,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('[Operations] 获取设备列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 创建设备
router.post('/devices', async (req: Request, res: Response) => {
  try {
    const { device_id, sim_no, plate_no, terminal_model, protocol_version, manufacturer_id } = req.body

    if (!device_id) {
      return res.status(400).json({ code: 400, message: '设备ID不能为空' })
    }

    // 检查是否已存在
    const existing = await Device.findOne({ where: { device_id } })
    if (existing) {
      return res.status(400).json({ code: 400, message: '设备ID已存在' })
    }

    const device = await Device.create({
      device_id,
      sim_no,
      plate_no,
      terminal_model,
      protocol_version: protocol_version || '2019',
      manufacturer_id
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: device.id }
    })
  } catch (error) {
    console.error('[Operations] 创建设备失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新设备
router.put('/devices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { sim_no, plate_no, terminal_model, protocol_version, manufacturer_id } = req.body

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ code: 404, message: '设备不存在' })
    }

    await device.update({
      sim_no,
      plate_no,
      terminal_model,
      protocol_version,
      manufacturer_id
    })

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新设备失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除设备
router.delete('/devices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ code: 404, message: '设备不存在' })
    }

    // 同时删除关联的实时数据
    await DeviceRealtime.destroy({ where: { device_id: device.device_id } })
    await device.destroy()

    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除设备失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除设备
router.delete('/devices/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    // 获取设备ID列表
    const devices = await Device.findAll({ where: { id: { [Op.in]: ids } } })
    const deviceIds = devices.map((d: any) => d.device_id)

    // 删除实时数据
    await DeviceRealtime.destroy({ where: { device_id: { [Op.in]: deviceIds } } })
    // 删除设备
    await Device.destroy({ where: { id: { [Op.in]: ids } } })

    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除设备失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

// ================== 企业管理 ==================

// 获取企业列表
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { short_name: { [Op.like]: `%${keyword}%` } },
        { contact_name: { [Op.like]: `%${keyword}%` } }
      ]
    }

    const { count, rows } = await Company.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    })

    const list = rows.map((company: any) => ({
      id: company.id,
      name: company.name,
      shortName: company.short_name,
      parentId: company.parent_id,
      contactName: company.contact_name,
      contactPhone: company.contact_phone,
      address: company.address,
      status: company.status,
      createdAt: formatDateTime(company.created_at)
    }))

    res.json({
      code: 0,
      data: {
        list,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('[Operations] 获取企业列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 创建企业
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const { name, short_name, parent_id, contact_name, contact_phone, address, status } = req.body

    if (!name) {
      return res.status(400).json({ code: 400, message: '企业名称不能为空' })
    }

    const company = await Company.create({
      name,
      short_name,
      parent_id,
      contact_name,
      contact_phone,
      address,
      status: status ?? 1
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: company.id }
    })
  } catch (error) {
    console.error('[Operations] 创建企业失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新企业
router.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, short_name, parent_id, contact_name, contact_phone, address, status } = req.body

    const company = await Company.findByPk(id)
    if (!company) {
      return res.status(404).json({ code: 404, message: '企业不存在' })
    }

    // 不能将自己设为上级
    if (parent_id && Number(parent_id) === Number(id)) {
      return res.status(400).json({ code: 400, message: '不能将自己设为上级企业' })
    }

    await company.update({
      name,
      short_name,
      parent_id,
      contact_name,
      contact_phone,
      address,
      status
    })

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新企业失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除企业
router.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const company = await Company.findByPk(id)
    if (!company) {
      return res.status(404).json({ code: 404, message: '企业不存在' })
    }

    // 检查是否有子企业
    const childCount = await Company.count({ where: { parent_id: id } })
    if (childCount > 0) {
      return res.status(400).json({ code: 400, message: '该企业下有子企业，无法删除' })
    }

    // 检查是否有关联的驾驶员
    const driverCount = await Driver.count({ where: { company_id: id } })
    if (driverCount > 0) {
      return res.status(400).json({ code: 400, message: '该企业下有驾驶员，无法删除' })
    }

    await company.destroy()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除企业失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除企业
router.delete('/companies/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    // 检查是否有子企业
    const childCount = await Company.count({ where: { parent_id: { [Op.in]: ids } } })
    if (childCount > 0) {
      return res.status(400).json({ code: 400, message: '选中的企业中有子企业，无法删除' })
    }

    // 检查是否有关联的驾驶员
    const driverCount = await Driver.count({ where: { company_id: { [Op.in]: ids } } })
    if (driverCount > 0) {
      return res.status(400).json({ code: 400, message: '选中的企业中有驾驶员，无法删除' })
    }

    await Company.destroy({ where: { id: { [Op.in]: ids } } })
    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除企业失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

export default router

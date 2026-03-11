/**
 * 运营管理路由
 * 提供车辆、驾驶员、设备、企业的CRUD操作
 */

import { Router, Request, Response } from 'express'
import { Device, Driver, Company, DeviceRealtime, User, Role } from '../models'
import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import { formatDateTime } from '../utils/format'

const router = Router()

// ================== 统计数据 ==================

// 获取运营统计数据
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // 车辆统计
    const totalVehicles = await Device.count()
    const onlineVehicles = await Device.count({ where: { is_online: true } })
    const offlineVehicles = totalVehicles - onlineVehicles

    // 驾驶员统计
    const totalDrivers = await Driver.count()
    const activeDrivers = await Driver.count({ where: { status: 1 } })

    // 设备统计
    const totalDevices = await Device.count()
    const onlineDevices = await Device.count({ where: { is_online: true } })

    // 企业统计
    const totalCompanies = await Company.count()
    const activeCompanies = await Company.count({ where: { status: 1 } })

    // 用户统计
    const totalUsers = await User.count()
    const activeUsers = await User.count({ where: { status: 1 } })

    // 角色统计
    const totalRoles = await Role.count()
    const activeRoles = await Role.count({ where: { status: 1 } })

    // 今日新增统计
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayNewVehicles = await Device.count({
      where: { created_at: { [Op.gte]: today } }
    })
    const todayNewDrivers = await Driver.count({
      where: { created_at: { [Op.gte]: today } }
    })

    res.json({
      code: 0,
      data: {
        vehicle: {
          total: totalVehicles,
          online: onlineVehicles,
          offline: offlineVehicles,
          todayNew: todayNewVehicles
        },
        driver: {
          total: totalDrivers,
          active: activeDrivers,
          inactive: totalDrivers - activeDrivers,
          todayNew: todayNewDrivers
        },
        device: {
          total: totalDevices,
          online: onlineDevices,
          offline: totalDevices - onlineDevices
        },
        company: {
          total: totalCompanies,
          active: activeCompanies,
          inactive: totalCompanies - activeCompanies
        },
        user: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        role: {
          total: totalRoles,
          active: activeRoles
        }
      }
    })
  } catch (error) {
    console.error('[Operations] 获取统计数据失败:', error)
    res.status(500).json({ code: 500, message: '获取统计数据失败' })
  }
})

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

// 批量导入车辆
router.post('/vehicles/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的数据' })
    }

    let successCount = 0
    let skipCount = 0

    for (const item of data) {
      if (!item.device_id) {
        skipCount++
        continue
      }

      // 检查是否已存在
      const existing = await Device.findOne({ where: { device_id: item.device_id } })
      if (existing) {
        // 更新已有记录
        await existing.update({
          plate_no: item.plate_no || existing.plate_no,
          sim_no: item.sim_no || existing.sim_no
        })
      } else {
        // 创建新记录
        await Device.create({
          device_id: item.device_id,
          plate_no: item.plate_no,
          sim_no: item.sim_no,
          protocol_version: '2019'
        })
      }
      successCount++
    }

    res.json({
      code: 0,
      message: `导入完成，成功${successCount}条，跳过${skipCount}条`,
      data: { count: successCount, skip: skipCount }
    })
  } catch (error) {
    console.error('[Operations] 批量导入车辆失败:', error)
    res.status(500).json({ code: 500, message: '导入失败' })
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
    const { page = 1, pageSize = 20, keyword, companyId, startDate, endDate } = req.query

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
    // 日期范围筛选
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string + ' 23:59:59')]
      }
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

// 批量导入驾驶员
router.post('/drivers/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的数据' })
    }

    let successCount = 0
    let skipCount = 0

    for (const item of data) {
      if (!item.name) {
        skipCount++
        continue
      }

      // 检查是否已存在（按姓名+手机号）
      const where: any = { name: item.name }
      if (item.phone) where.phone = item.phone

      const existing = await Driver.findOne({ where })
      if (existing) {
        // 更新已有记录
        await existing.update({
          id_card: item.id_card || existing.id_card,
          license_no: item.license_no || existing.license_no,
          license_type: item.license_type || existing.license_type
        })
      } else {
        // 创建新记录
        await Driver.create({
          name: item.name,
          phone: item.phone,
          id_card: item.id_card,
          license_no: item.license_no,
          license_type: item.license_type,
          status: 1
        })
      }
      successCount++
    }

    res.json({
      code: 0,
      message: `导入完成，成功${successCount}条，跳过${skipCount}条`,
      data: { count: successCount, skip: skipCount }
    })
  } catch (error) {
    console.error('[Operations] 批量导入驾驶员失败:', error)
    res.status(500).json({ code: 500, message: '导入失败' })
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
    const { page = 1, pageSize = 20, keyword, online, startDate, endDate } = req.query

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
    // 日期范围筛选
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string + ' 23:59:59')]
      }
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

// 批量导入设备
router.post('/devices/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的数据' })
    }

    let successCount = 0
    let skipCount = 0

    for (const item of data) {
      if (!item.device_id) {
        skipCount++
        continue
      }

      // 检查是否已存在
      const existing = await Device.findOne({ where: { device_id: item.device_id } })
      if (existing) {
        // 更新已有记录
        await existing.update({
          sim_no: item.sim_no || existing.sim_no,
          plate_no: item.plate_no || existing.plate_no,
          terminal_model: item.terminal_model || existing.terminal_model
        })
      } else {
        // 创建新记录
        await Device.create({
          device_id: item.device_id,
          sim_no: item.sim_no,
          plate_no: item.plate_no,
          terminal_model: item.terminal_model,
          protocol_version: '2019'
        })
      }
      successCount++
    }

    res.json({
      code: 0,
      message: `导入完成，成功${successCount}条，跳过${skipCount}条`,
      data: { count: successCount, skip: skipCount }
    })
  } catch (error) {
    console.error('[Operations] 批量导入设备失败:', error)
    res.status(500).json({ code: 500, message: '导入失败' })
  }
})

// 设备指令下发
router.post('/devices/:id/command', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { command, params: cmdParams } = req.body

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ code: 404, message: '设备不存在' })
    }

    // 检查设备是否在线
    if (!device.is_online) {
      return res.status(400).json({ code: 400, message: '设备离线，无法下发指令' })
    }

    // 支持的指令类型
    const supportedCommands = [
      'lock',           // 远程锁车
      'unlock',         // 远程解锁
      'cut_oil',        // 断油断电
      'restore_oil',    // 恢复油电
      'set_interval',   // 设置上报间隔
      'query_params',   // 查询参数
      'set_speed_limit', // 设置限速
      'reset',          // 终端复位
      'factory_reset',  // 恢复出厂设置
      'query_location', // 位置查询
      'text_message'    // 文本消息下发
    ]

    if (!supportedCommands.includes(command)) {
      return res.status(400).json({ code: 400, message: '不支持的指令类型' })
    }

    // 这里实际应该通过JT808协议发送指令到设备
    // 目前先模拟返回成功
    console.log(`[Operations] 向设备 ${device.device_id} 下发指令: ${command}`, cmdParams)

    // 记录指令日志（可以添加到数据库）
    const commandLog = {
      device_id: device.device_id,
      command,
      params: cmdParams,
      status: 'sent',
      sent_at: new Date()
    }

    res.json({
      code: 0,
      message: '指令下发成功',
      data: {
        command,
        device_id: device.device_id,
        sent_at: commandLog.sent_at
      }
    })
  } catch (error) {
    console.error('[Operations] 设备指令下发失败:', error)
    res.status(500).json({ code: 500, message: '指令下发失败' })
  }
})

// 批量指令下发
router.post('/devices/batch-command', async (req: Request, res: Response) => {
  try {
    const { device_ids, command, params: cmdParams } = req.body

    if (!Array.isArray(device_ids) || device_ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要下发指令的设备' })
    }

    const devices = await Device.findAll({
      where: { id: { [Op.in]: device_ids } }
    })

    const results = {
      success: 0,
      failed: 0,
      offline: 0
    }

    for (const device of devices) {
      if (!device.is_online) {
        results.offline++
        continue
      }

      // 模拟下发指令
      console.log(`[Operations] 向设备 ${device.device_id} 下发指令: ${command}`, cmdParams)
      results.success++
    }

    res.json({
      code: 0,
      message: `指令下发完成: 成功${results.success}台, 离线${results.offline}台`,
      data: results
    })
  } catch (error) {
    console.error('[Operations] 批量指令下发失败:', error)
    res.status(500).json({ code: 500, message: '批量指令下发失败' })
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
    const { page = 1, pageSize = 20, keyword, startDate, endDate } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { short_name: { [Op.like]: `%${keyword}%` } },
        { contact_name: { [Op.like]: `%${keyword}%` } }
      ]
    }
    // 日期范围筛选
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string + ' 23:59:59')]
      }
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

// 批量导入企业
router.post('/companies/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的数据' })
    }

    let successCount = 0
    let skipCount = 0

    for (const item of data) {
      if (!item.name) {
        skipCount++
        continue
      }

      // 检查是否已存在
      const existing = await Company.findOne({ where: { name: item.name } })
      if (existing) {
        // 更新已有记录
        await existing.update({
          short_name: item.short_name || existing.short_name,
          contact_name: item.contact_name || existing.contact_name,
          contact_phone: item.contact_phone || existing.contact_phone,
          address: item.address || existing.address
        })
      } else {
        // 创建新记录
        await Company.create({
          name: item.name,
          short_name: item.short_name,
          contact_name: item.contact_name,
          contact_phone: item.contact_phone,
          address: item.address,
          status: 1
        })
      }
      successCount++
    }

    res.json({
      code: 0,
      message: `导入完成，成功${successCount}条，跳过${skipCount}条`,
      data: { count: successCount, skip: skipCount }
    })
  } catch (error) {
    console.error('[Operations] 批量导入企业失败:', error)
    res.status(500).json({ code: 500, message: '导入失败' })
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

// ================== 用户管理 ==================

// 获取用户列表
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, companyId, roleId, startDate, endDate } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ]
    }
    if (companyId) {
      where.company_id = companyId
    }
    if (roleId) {
      where.role_id = roleId
    }
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string + ' 23:59:59')]
      }
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    })

    const list = rows.map((user: any) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      email: user.email,
      companyId: user.company_id,
      companyName: user.company?.name || '',
      roleId: user.role_id,
      roleName: user.role?.name || '',
      status: user.status,
      lastLoginTime: formatDateTime(user.last_login_time),
      createdAt: formatDateTime(user.created_at)
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
    console.error('[Operations] 获取用户列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 创建用户
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, password, name, phone, email, company_id, role_id, status } = req.body

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' })
    }

    // 检查用户名是否已存在
    const existing = await User.findOne({ where: { username } })
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      username,
      password: hashedPassword,
      name,
      phone,
      email,
      company_id,
      role_id,
      status: status ?? 1
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: user.id }
    })
  } catch (error) {
    console.error('[Operations] 创建用户失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新用户
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, email, company_id, role_id, status, password } = req.body

    const user = await User.findByPk(id)
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    const updateData: any = { name, phone, email, company_id, role_id, status }

    // 如果提供了新密码，则更新密码
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    await user.update(updateData)

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新用户失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除用户
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    // 不允许删除admin用户
    if (user.username === 'admin') {
      return res.status(400).json({ code: 400, message: '不能删除管理员账户' })
    }

    await user.destroy()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除用户失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除用户
router.delete('/users/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    // 排除admin用户
    await User.destroy({
      where: {
        id: { [Op.in]: ids },
        username: { [Op.ne]: 'admin' }
      }
    })

    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除用户失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

// ================== 角色管理 ==================

// 获取角色列表
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query

    const where: any = {}
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { code: { [Op.like]: `%${keyword}%` } }
      ]
    }

    const { count, rows } = await Role.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    })

    const list = rows.map((role: any) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: role.permissions ? JSON.parse(role.permissions) : [],
      status: role.status,
      createdAt: formatDateTime(role.created_at)
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
    console.error('[Operations] 获取角色列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 获取所有角色（用于下拉选择）
router.get('/roles/all', async (req: Request, res: Response) => {
  try {
    const roles = await Role.findAll({
      where: { status: 1 },
      attributes: ['id', 'name', 'code'],
      order: [['id', 'ASC']]
    })

    res.json({
      code: 0,
      data: roles.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code
      }))
    })
  } catch (error) {
    console.error('[Operations] 获取角色列表失败:', error)
    res.status(500).json({ code: 500, message: '获取失败' })
  }
})

// 创建角色
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, code, description, permissions, status } = req.body

    if (!name || !code) {
      return res.status(400).json({ code: 400, message: '角色名称和编码不能为空' })
    }

    // 检查编码是否已存在
    const existing = await Role.findOne({ where: { code } })
    if (existing) {
      return res.status(400).json({ code: 400, message: '角色编码已存在' })
    }

    const role = await Role.create({
      name,
      code,
      description,
      permissions: permissions ? JSON.stringify(permissions) : undefined,
      status: status ?? 1
    })

    res.json({
      code: 0,
      message: '创建成功',
      data: { id: role.id }
    })
  } catch (error) {
    console.error('[Operations] 创建角色失败:', error)
    res.status(500).json({ code: 500, message: '创建失败' })
  }
})

// 更新角色
router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, code, description, permissions, status } = req.body

    const role = await Role.findByPk(id)
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' })
    }

    // 检查编码是否与其他角色冲突
    if (code && code !== role.code) {
      const existing = await Role.findOne({ where: { code, id: { [Op.ne]: id } } })
      if (existing) {
        return res.status(400).json({ code: 400, message: '角色编码已存在' })
      }
    }

    await role.update({
      name,
      code,
      description,
      permissions: permissions ? JSON.stringify(permissions) : role.permissions,
      status
    })

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('[Operations] 更新角色失败:', error)
    res.status(500).json({ code: 500, message: '更新失败' })
  }
})

// 删除角色
router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const role = await Role.findByPk(id)
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' })
    }

    // 检查是否有用户使用此角色
    const userCount = await User.count({ where: { role_id: id } })
    if (userCount > 0) {
      return res.status(400).json({ code: 400, message: '该角色下有用户，无法删除' })
    }

    await role.destroy()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('[Operations] 删除角色失败:', error)
    res.status(500).json({ code: 500, message: '删除失败' })
  }
})

// 批量删除角色
router.delete('/roles/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要删除的记录' })
    }

    // 检查是否有用户使用这些角色
    const userCount = await User.count({ where: { role_id: { [Op.in]: ids } } })
    if (userCount > 0) {
      return res.status(400).json({ code: 400, message: '选中的角色下有用户，无法删除' })
    }

    await Role.destroy({ where: { id: { [Op.in]: ids } } })
    res.json({ code: 0, message: '批量删除成功' })
  } catch (error) {
    console.error('[Operations] 批量删除角色失败:', error)
    res.status(500).json({ code: 500, message: '批量删除失败' })
  }
})

export default router

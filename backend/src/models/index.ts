/**
 * Sequelize 数据库初始化
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

// 数据库配置
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT || '3306')
const DB_NAME = process.env.DB_NAME || 'gps_platform'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''

// 创建Sequelize实例
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  timezone: '+08:00',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

// 测试连接
export async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate()
    console.log('[DB] 数据库连接成功')
    return true
  } catch (error) {
    console.error('[DB] 数据库连接失败:', error)
    return false
  }
}

// 同步模型
export async function syncModels(force: boolean = false): Promise<void> {
  try {
    await sequelize.sync({ force })
    console.log('[DB] 模型同步完成')
  } catch (error) {
    console.error('[DB] 模型同步失败:', error)
    throw error
  }
}

// 导出模型
export { Device } from './Device'
export { Location } from './Location'
export { Alarm } from './Alarm'
export { Vehicle } from './Vehicle'
export { Driver } from './Driver'
export { Company } from './Company'
export { User } from './User'
export { DeviceRealtime } from './DeviceRealtime'

// 导入模型用于关联设置
import { Device } from './Device'
import { DeviceRealtime } from './DeviceRealtime'
import { Driver } from './Driver'
import { Company } from './Company'

// 设置模型关联
DeviceRealtime.belongsTo(Device, {
  foreignKey: 'device_id',
  targetKey: 'device_id',
  as: 'device'
})

Device.hasOne(DeviceRealtime, {
  foreignKey: 'device_id',
  sourceKey: 'device_id',
  as: 'realtime'
})

// 驾驶员-企业关联
Driver.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
})

Company.hasMany(Driver, {
  foreignKey: 'company_id',
  as: 'drivers'
})

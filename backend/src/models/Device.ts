/**
 * 设备模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

// 设备属性接口
export interface DeviceAttributes {
  id: number
  device_id: string
  sim_no?: string
  plate_no?: string
  vehicle_id?: number
  protocol_version: string
  manufacturer_id?: string
  terminal_model?: string
  terminal_id?: string
  auth_code?: string
  province_id?: number
  city_id?: number
  plate_color: number
  is_online: boolean
  last_heartbeat?: Date
  last_location_time?: Date
  created_at?: Date
  updated_at?: Date
}

// 创建时可选属性
export interface DeviceCreationAttributes extends Optional<DeviceAttributes,
  'id' | 'sim_no' | 'plate_no' | 'vehicle_id' | 'protocol_version' | 'manufacturer_id' |
  'terminal_model' | 'terminal_id' | 'auth_code' | 'province_id' | 'city_id' |
  'plate_color' | 'is_online' | 'last_heartbeat' | 'last_location_time' | 'created_at' | 'updated_at'
> {}

// 设备模型类
export class Device extends Model<DeviceAttributes, DeviceCreationAttributes> implements DeviceAttributes {
  public id!: number
  public device_id!: string
  public sim_no?: string
  public plate_no?: string
  public vehicle_id?: number
  public protocol_version!: string
  public manufacturer_id?: string
  public terminal_model?: string
  public terminal_id?: string
  public auth_code?: string
  public province_id?: number
  public city_id?: number
  public plate_color!: number
  public is_online!: boolean
  public last_heartbeat?: Date
  public last_location_time?: Date
  public created_at?: Date
  public updated_at?: Date
}

// 初始化模型
Device.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    device_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: '终端ID/手机号'
    },
    sim_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'SIM卡号'
    },
    plate_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '车牌号'
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '关联车辆ID'
    },
    protocol_version: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '2013',
      comment: '协议版本'
    },
    manufacturer_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '制造商ID'
    },
    terminal_model: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '终端型号'
    },
    terminal_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '终端ID'
    },
    auth_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '鉴权码'
    },
    province_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '省域ID'
    },
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '市县域ID'
    },
    plate_color: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '车牌颜色'
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否在线'
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后心跳时间'
    },
    last_location_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后位置时间'
    }
  },
  {
    sequelize,
    tableName: 'devices',
    indexes: [
      { fields: ['vehicle_id'] },
      { fields: ['plate_no'] },
      { fields: ['is_online'] }
    ]
  }
)

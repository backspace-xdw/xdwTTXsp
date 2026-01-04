/**
 * 设备实时状态模型
 * 用于快速查询设备当前状态
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

export interface DeviceRealtimeAttributes {
  device_id: string
  latitude?: number
  longitude?: number
  altitude: number
  speed: number
  direction: number
  mileage?: number
  alarm_flag: number
  status: number
  acc_on: boolean
  is_online: boolean
  gps_time?: Date
  updated_at?: Date
}

export interface DeviceRealtimeCreationAttributes extends Optional<DeviceRealtimeAttributes,
  'latitude' | 'longitude' | 'altitude' | 'speed' | 'direction' |
  'mileage' | 'alarm_flag' | 'status' | 'acc_on' | 'is_online' | 'gps_time' | 'updated_at'
> {}

export class DeviceRealtime extends Model<DeviceRealtimeAttributes, DeviceRealtimeCreationAttributes> implements DeviceRealtimeAttributes {
  public device_id!: string
  public latitude?: number
  public longitude?: number
  public altitude!: number
  public speed!: number
  public direction!: number
  public mileage?: number
  public alarm_flag!: number
  public status!: number
  public acc_on!: boolean
  public is_online!: boolean
  public gps_time?: Date
  public updated_at?: Date
}

DeviceRealtime.init(
  {
    device_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      comment: '终端ID'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: '纬度'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: '经度'
    },
    altitude: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '海拔'
    },
    speed: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      comment: '速度'
    },
    direction: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '方向'
    },
    mileage: {
      type: DataTypes.DECIMAL(12, 1),
      allowNull: true,
      comment: '里程'
    },
    alarm_flag: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '报警标志'
    },
    status: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '状态'
    },
    acc_on: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'ACC状态'
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否在线'
    },
    gps_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'GPS时间'
    }
  },
  {
    sequelize,
    tableName: 'device_realtime',
    createdAt: false,
    indexes: [
      { fields: ['is_online'] },
      { fields: ['acc_on'] }
    ]
  }
)

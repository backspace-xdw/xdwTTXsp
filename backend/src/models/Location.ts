/**
 * 位置模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

// 位置属性接口
export interface LocationAttributes {
  id: number
  device_id: string
  alarm_flag: number
  status: number
  latitude: number
  longitude: number
  altitude: number
  speed: number
  direction: number
  mileage?: number
  fuel?: number
  record_speed?: number
  gps_time: Date
  created_at?: Date
}

// 创建时可选属性
export interface LocationCreationAttributes extends Optional<LocationAttributes,
  'id' | 'alarm_flag' | 'status' | 'altitude' | 'speed' | 'direction' |
  'mileage' | 'fuel' | 'record_speed' | 'created_at'
> {}

// 位置模型类
export class Location extends Model<LocationAttributes, LocationCreationAttributes> implements LocationAttributes {
  public id!: number
  public device_id!: string
  public alarm_flag!: number
  public status!: number
  public latitude!: number
  public longitude!: number
  public altitude!: number
  public speed!: number
  public direction!: number
  public mileage?: number
  public fuel?: number
  public record_speed?: number
  public gps_time!: Date
  public created_at?: Date
}

// 初始化模型
Location.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    device_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '终端ID'
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
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      comment: '纬度'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      comment: '经度'
    },
    altitude: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '海拔(m)'
    },
    speed: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      comment: '速度(km/h)'
    },
    direction: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '方向(0-359)'
    },
    mileage: {
      type: DataTypes.DECIMAL(12, 1),
      allowNull: true,
      comment: '里程(km)'
    },
    fuel: {
      type: DataTypes.DECIMAL(8, 1),
      allowNull: true,
      comment: '油量(L)'
    },
    record_speed: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: true,
      comment: '行驶记录速度(km/h)'
    },
    gps_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'GPS时间'
    }
  },
  {
    sequelize,
    tableName: 'locations',
    updatedAt: false,
    indexes: [
      { fields: ['device_id', 'gps_time'] },
      { fields: ['gps_time'] },
      { fields: ['device_id'] }
    ]
  }
)

/**
 * 报警模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

// 报警属性接口
export interface AlarmAttributes {
  id: number
  device_id: string
  alarm_type: number
  alarm_name?: string
  alarm_flag: number
  alarm_level: number
  latitude?: number
  longitude?: number
  altitude: number
  speed: number
  direction: number
  address?: string
  status: number
  handler_id?: number
  handle_time?: Date
  handle_remark?: string
  gps_time: Date
  created_at?: Date
}

// 创建时可选属性
export interface AlarmCreationAttributes extends Optional<AlarmAttributes,
  'id' | 'alarm_name' | 'alarm_flag' | 'alarm_level' | 'latitude' | 'longitude' |
  'altitude' | 'speed' | 'direction' | 'address' | 'status' | 'handler_id' |
  'handle_time' | 'handle_remark' | 'created_at'
> {}

// 报警模型类
export class Alarm extends Model<AlarmAttributes, AlarmCreationAttributes> implements AlarmAttributes {
  public id!: number
  public device_id!: string
  public alarm_type!: number
  public alarm_name?: string
  public alarm_flag!: number
  public alarm_level!: number
  public latitude?: number
  public longitude?: number
  public altitude!: number
  public speed!: number
  public direction!: number
  public address?: string
  public status!: number
  public handler_id?: number
  public handle_time?: Date
  public handle_remark?: string
  public gps_time!: Date
  public created_at?: Date
}

// 初始化模型
Alarm.init(
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
    alarm_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '报警类型'
    },
    alarm_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '报警名称'
    },
    alarm_flag: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '报警标志位'
    },
    alarm_level: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '报警级别 1一般 2重要 3紧急'
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
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '地址'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '处理状态 0未处理 1已处理 2已忽略'
    },
    handler_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '处理人ID'
    },
    handle_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '处理时间'
    },
    handle_remark: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '处理备注'
    },
    gps_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'GPS时间'
    }
  },
  {
    sequelize,
    tableName: 'alarms',
    updatedAt: false,
    indexes: [
      { fields: ['device_id', 'gps_time'] },
      { fields: ['alarm_type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  }
)

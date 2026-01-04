/**
 * 车辆模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

// 车辆属性接口
export interface VehicleAttributes {
  id: number
  plate_no: string
  plate_color: number
  vehicle_type?: string
  brand?: string
  model?: string
  color?: string
  vin?: string
  engine_no?: string
  company_id?: number
  driver_id?: number
  status: number
  created_at?: Date
  updated_at?: Date
}

// 创建时可选属性
export interface VehicleCreationAttributes extends Optional<VehicleAttributes,
  'id' | 'plate_color' | 'vehicle_type' | 'brand' | 'model' | 'color' |
  'vin' | 'engine_no' | 'company_id' | 'driver_id' | 'status' | 'created_at' | 'updated_at'
> {}

// 车辆模型类
export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
  public id!: number
  public plate_no!: string
  public plate_color!: number
  public vehicle_type?: string
  public brand?: string
  public model?: string
  public color?: string
  public vin?: string
  public engine_no?: string
  public company_id?: number
  public driver_id?: number
  public status!: number
  public created_at?: Date
  public updated_at?: Date
}

// 初始化模型
Vehicle.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    plate_no: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: '车牌号'
    },
    plate_color: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '车牌颜色'
    },
    vehicle_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '车辆类型'
    },
    brand: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '品牌'
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '型号'
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '车身颜色'
    },
    vin: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '车架号'
    },
    engine_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '发动机号'
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '所属企业ID'
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '主驾驶员ID'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态 0停用 1启用'
    }
  },
  {
    sequelize,
    tableName: 'vehicles',
    indexes: [
      { fields: ['company_id'] }
    ]
  }
)

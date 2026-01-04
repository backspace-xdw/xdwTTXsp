/**
 * 驾驶员模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

export interface DriverAttributes {
  id: number
  name: string
  id_card?: string
  license_no?: string
  license_type?: string
  phone?: string
  company_id?: number
  ic_card_no?: string
  status: number
  created_at?: Date
  updated_at?: Date
}

export interface DriverCreationAttributes extends Optional<DriverAttributes,
  'id' | 'id_card' | 'license_no' | 'license_type' | 'phone' |
  'company_id' | 'ic_card_no' | 'status' | 'created_at' | 'updated_at'
> {}

export class Driver extends Model<DriverAttributes, DriverCreationAttributes> implements DriverAttributes {
  public id!: number
  public name!: string
  public id_card?: string
  public license_no?: string
  public license_type?: string
  public phone?: string
  public company_id?: number
  public ic_card_no?: string
  public status!: number
  public created_at?: Date
  public updated_at?: Date
}

Driver.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '姓名'
    },
    id_card: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '身份证号'
    },
    license_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '驾驶证号'
    },
    license_type: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '准驾车型'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号'
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '所属企业ID'
    },
    ic_card_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'IC卡号'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态'
    }
  },
  {
    sequelize,
    tableName: 'drivers',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['ic_card_no'] }
    ]
  }
)

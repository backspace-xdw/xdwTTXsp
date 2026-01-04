/**
 * 企业模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

export interface CompanyAttributes {
  id: number
  name: string
  short_name?: string
  parent_id?: number
  contact_name?: string
  contact_phone?: string
  address?: string
  status: number
  created_at?: Date
  updated_at?: Date
}

export interface CompanyCreationAttributes extends Optional<CompanyAttributes,
  'id' | 'short_name' | 'parent_id' | 'contact_name' | 'contact_phone' |
  'address' | 'status' | 'created_at' | 'updated_at'
> {}

export class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  public id!: number
  public name!: string
  public short_name?: string
  public parent_id?: number
  public contact_name?: string
  public contact_phone?: string
  public address?: string
  public status!: number
  public created_at?: Date
  public updated_at?: Date
}

Company.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '企业名称'
    },
    short_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '简称'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '上级企业ID'
    },
    contact_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '联系人'
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '联系电话'
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '地址'
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
    tableName: 'companies',
    indexes: [
      { fields: ['parent_id'] }
    ]
  }
)

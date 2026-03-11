/**
 * 角色模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

export interface RoleAttributes {
  id: number
  name: string
  code: string
  description?: string
  permissions?: string
  status: number
  created_at?: Date
  updated_at?: Date
}

export interface RoleCreationAttributes extends Optional<RoleAttributes,
  'id' | 'description' | 'permissions' | 'status' | 'created_at' | 'updated_at'
> {}

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number
  public name!: string
  public code!: string
  public description?: string
  public permissions?: string
  public status!: number
  public created_at?: Date
  public updated_at?: Date
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '角色名称'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '角色编码'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '角色描述'
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '权限列表 JSON格式'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态 0禁用 1启用'
    }
  },
  {
    sequelize,
    tableName: 'roles',
    indexes: [
      { fields: ['code'], unique: true }
    ]
  }
)

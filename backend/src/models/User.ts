/**
 * 用户模型
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from './index'

export interface UserAttributes {
  id: number
  username: string
  password: string
  name?: string
  phone?: string
  email?: string
  company_id?: number
  role_id?: number
  status: number
  last_login_time?: Date
  created_at?: Date
  updated_at?: Date
}

export interface UserCreationAttributes extends Optional<UserAttributes,
  'id' | 'name' | 'phone' | 'email' | 'company_id' | 'role_id' |
  'status' | 'last_login_time' | 'created_at' | 'updated_at'
> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number
  public username!: string
  public password!: string
  public name?: string
  public phone?: string
  public email?: string
  public company_id?: number
  public role_id?: number
  public status!: number
  public last_login_time?: Date
  public created_at?: Date
  public updated_at?: Date
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '用户名'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '姓名'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '邮箱'
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '所属企业ID'
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '角色ID'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态 0禁用 1启用'
    },
    last_login_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
    }
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [
      { fields: ['company_id'] }
    ]
  }
)

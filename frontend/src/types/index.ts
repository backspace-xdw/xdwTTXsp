// 用户类型
export interface User {
  id: number
  username: string
  nickname?: string
  avatar?: string
  role: string
  companyId: number
  companyName?: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应
export interface LoginResponse {
  token: string
  user: User
}

// 车辆类型
export interface Vehicle {
  id: number
  plateNo: string
  deviceId: string
  companyId: number
  companyName: string
  driverId?: number
  driverName?: string
  status: VehicleStatus
  online: boolean
  lat?: number
  lng?: number
  speed?: number
  direction?: number
  gpsTime?: string
  accStatus?: boolean
}

// 车辆状态类型
export type VehicleStatus = 'driving' | 'parking_acc_on' | 'acc_off' | 'offline' | 'alarm' | 'repair' | 'disable'

// 企业/车辆分组
export interface Company {
  id: number
  name: string
  parentId?: number
  children?: Company[]
  vehicleCount: number
  onlineCount: number
}

// 车辆树节点
export interface VehicleTreeNode {
  id: string
  label: string
  type: 'company' | 'vehicle'
  data?: Company | Vehicle
  children?: VehicleTreeNode[]
  onlineCount?: number
  totalCount?: number
}

// GPS数据
export interface GpsData {
  id: number
  deviceId: string
  plateNo: string
  lat: number
  lng: number
  speed: number
  direction: number
  altitude?: number
  mileage?: number
  gpsTime: string
  receiveTime: string
  accStatus: boolean
  alarmFlags?: number
}

// 报警类型
export interface Alarm {
  id: number
  deviceId: string
  plateNo: string
  companyName: string
  alarmType: string
  alarmName: string
  alarmLevel: 'low' | 'medium' | 'high' | 'critical'
  lat: number
  lng: number
  speed: number
  alarmTime: string
  status: 'pending' | 'processing' | 'handled'
  handleTime?: string
  handleUser?: string
  handleResult?: string
  mediaUrl?: string
}

// 统计数据
export interface DashboardStats {
  totalEnterprises: number
  totalDrivers: number
  totalVehicles: number
  todayOnline: number
  averageMileage: number
  onlineRate: number
  damageRate: number
  vehicleOperation: {
    normal: number
    repair: number
    disable: number
    expired: number
  }
  alarmStats: {
    total: number
    pending: number
    handled: number
  }
}

// API响应通用类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页请求
export interface PageRequest {
  page: number
  pageSize: number
}

// 分页响应
export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

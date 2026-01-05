/**
 * Dashboard API
 * 仪表盘数据接口
 */

import { request } from './request'

// 运营看板数据类型
export interface OperationData {
  stats: {
    totalEnterprises: number
    totalDrivers: number
    totalVehicles: number
    todayOnline: number
    alarmVehicles: number
    currentOnline: number
    averageMileage: number
    averageOnlineHours: number
  }
  operationData: {
    normal: number
    stopped: number
    expired: number
  }
  onlineTrend: number[]
  mileageRank: { name: string; value: number }[]
  alarmDistribution: { name: string; value: number }[]
  alarmTrend: { date: string; count: number }[]
  onlineTimeRank: { name: string; value: number }[]
}

// 安全看板数据类型
export interface SafetyData {
  aiAlarmStats: {
    total: number
    adas: number
    dsm: number
    bsd: number
    aggressive: number
    gps: number
    smart: number
  }
  safetyStats: {
    expiredDocs: number
    untrainedDrivers: number
    unhandledAlarms: number
    handleRate: number
  }
  alarmTypeDistribution: { name: string; value: number }[]
  alarmTrend: { date: string; adas: number; dsm: number; bsd: number }[]
  alarmHandleStats: {
    handled: number
    unhandled: number
    processing: number
  }
  alarmVehicleRank: { name: string; value: number }[]
}

// 数据看板数据类型
export interface DataDashboardData {
  dataStats: {
    totalVehicles: number
    totalDrivers: number
    totalOrders: number
    totalRevenue: number
    avgMileageOrder: number
    avgMileageRevenue: number
  }
  drivingMileage: { date: string; value: number }[]
  mileageUtilization: { date: string; value: number }[]
  mileageOrderRank: { name: string; value: number }[]
  mileageRevenueRank: { name: string; value: number }[]
  emptyMileageRank: { name: string; value: number }[]
  orderCountRank: { name: string; value: number }[]
  revenueTrend: { date: string; value: number }[]
}

// API响应类型
interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

/**
 * 获取运营看板数据
 */
export function getOperationData(): Promise<ApiResponse<OperationData>> {
  return request.get('/dashboard/operation')
}

/**
 * 获取安全看板数据
 */
export function getSafetyData(): Promise<ApiResponse<SafetyData>> {
  return request.get('/dashboard/safety')
}

/**
 * 获取数据看板数据
 */
export function getDataDashboard(): Promise<ApiResponse<DataDashboardData>> {
  return request.get('/dashboard/data')
}

/**
 * 获取仪表盘汇总数据
 */
export function getDashboardSummary(): Promise<ApiResponse<{
  enterprises: number
  drivers: number
  vehicles: {
    total: number
    online: number
    offline: number
    driving: number
    parkingAccOn: number
    accOff: number
  }
  alarms: {
    today: number
    unhandled: number
  }
}>> {
  return request.get('/dashboard/summary')
}

export default {
  getOperationData,
  getSafetyData,
  getDataDashboard,
  getDashboardSummary
}

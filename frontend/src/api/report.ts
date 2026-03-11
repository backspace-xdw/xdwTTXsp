/**
 * Report API
 * 报表统计接口
 */

import { request } from './request'

// 通用查询参数
export interface ReportQuery {
  startDate?: string
  endDate?: string
  companyId?: number
  plateNo?: string
  page?: number
  pageSize?: number
}

// 报警报表额外参数
export interface AlarmReportQuery extends ReportQuery {
  alarmType?: number
  alarmLevel?: number
}

// 超速报表额外参数
export interface OverspeedReportQuery extends ReportQuery {
  speedLimit?: number
}

// API响应类型
interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

// 上下线报告数据
export interface OnlineOfflineData {
  list: {
    deviceId: string
    plateNo: string
    date: string
    firstOnline: string
    lastOnline: string
    onlineSeconds: number
    onlineHours: number
    reportCount: number
  }[]
  total: number
  stats: {
    totalDevices: number
    avgOnlineHours: number
    totalRecords: number
  }
  trend: { date: string; count: number }[]
  top10: { name: string; value: number }[]
}

// 里程统计数据
export interface MileageData {
  list: {
    deviceId: string
    plateNo: string
    date: string
    dailyMileage: number
    maxMileage: number
    minMileage: number
  }[]
  total: number
  stats: {
    totalMileage: number
    avgDailyMileage: number
    vehicleCount: number
  }
  trend: { date: string; mileage: number }[]
  top10: { name: string; value: number }[]
}

// 报警统计数据
export interface AlarmReportData {
  list: {
    id: number
    deviceId: string
    plateNo: string
    alarmType: number
    alarmName: string
    alarmLevel: number
    speed: number
    status: number
    gpsTime: string
    address: string
  }[]
  total: number
  stats: {
    totalAlarms: number
    handledCount: number
    unhandledCount: number
    handleRate: number
  }
  trend: { date: string; count: number }[]
  typeDistribution: { name: string; value: number }[]
}

// 车辆运营数据
export interface OperationData {
  list: {
    deviceId: string
    plateNo: string
    date: string
    totalPoints: number
    drivingPoints: number
    parkingPoints: number
    drivingHours: number
    parkingHours: number
    utilization: number
    maxSpeed: number
    avgSpeed: number
  }[]
  total: number
  stats: {
    vehicleCount: number
    totalDrivingHours: number
    avgUtilization: number
  }
  trend: { date: string; utilization: number; drivingHours: number }[]
  utilizationDistribution: { name: string; value: number }[]
}

// 超速报表数据
export interface OverspeedData {
  list: {
    id: number
    deviceId: string
    plateNo: string
    speed: number
    speedLimit: number
    overspeedPercent: number
    latitude: number
    longitude: number
    gpsTime: string
    direction: number
  }[]
  total: number
  stats: {
    totalOverspeed: number
    involvedVehicles: number
    maxSpeed: number
    speedLimit: number
  }
  trend: { date: string; count: number }[]
  speedDistribution: { name: string; value: number }[]
}

// 企业项
export interface CompanyItem {
  id: number
  name: string
  shortName: string
}

/** 上下线报告 */
export function getOnlineOfflineReport(params: ReportQuery): Promise<ApiResponse<OnlineOfflineData>> {
  return request.get('/reports/online-offline', { params })
}

/** 里程统计 */
export function getMileageReport(params: ReportQuery): Promise<ApiResponse<MileageData>> {
  return request.get('/reports/mileage', { params })
}

/** 报警统计 */
export function getAlarmReport(params: AlarmReportQuery): Promise<ApiResponse<AlarmReportData>> {
  return request.get('/reports/alarm', { params })
}

/** 车辆运营 */
export function getOperationReport(params: ReportQuery): Promise<ApiResponse<OperationData>> {
  return request.get('/reports/operation', { params })
}

/** 超速报表 */
export function getOverspeedReport(params: OverspeedReportQuery): Promise<ApiResponse<OverspeedData>> {
  return request.get('/reports/overspeed', { params })
}

/** 企业下拉列表 */
export function getReportCompanies(): Promise<ApiResponse<CompanyItem[]>> {
  return request.get('/reports/companies')
}

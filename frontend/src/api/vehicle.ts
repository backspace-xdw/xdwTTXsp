/**
 * 车辆API
 */
import { request } from './request'

export interface VehicleData {
  id: number
  deviceId: string
  plateNo: string
  companyId: number
  companyName: string
  groupName: string
  driverId: number | null
  driverName: string
  status: 'driving' | 'parking_acc_on' | 'acc_off' | 'offline' | 'alarm'
  online: boolean
  lat: number | null
  lng: number | null
  speed: number
  direction: number
  altitude: number
  mileage: number
  alarmFlag: number
  accOn: boolean
  gpsTime: string
  lastHeartbeat: string
  manufacturer: string
  terminalModel: string
}

export interface VehicleListResponse {
  code: number
  data: {
    list: VehicleData[]
    total: number
    page: number
    pageSize: number
  }
}

export interface RealtimeLocationResponse {
  code: number
  data: Array<{
    deviceId: string
    plateNo: string
    lat: number
    lng: number
    speed: number
    direction: number
    status: string
    online: boolean
    accOn: boolean
    alarmFlag: number
    gpsTime: string
  }>
}

export interface VehicleStatsResponse {
  code: number
  data: {
    total: number
    online: number
    offline: number
    driving: number
    parkingAccOn: number
    accOff: number
    alarm: number
    onlineRate: string
  }
}

/**
 * 获取车辆列表
 */
export function getVehicles(params?: {
  page?: number
  pageSize?: number
  status?: string
  online?: boolean
  keyword?: string
}): Promise<VehicleListResponse> {
  return request.get('/vehicles', { params })
}

/**
 * 获取所有车辆实时位置
 */
export function getRealtimeLocations(): Promise<RealtimeLocationResponse> {
  return request.get('/vehicles/realtime/all')
}

/**
 * 获取车辆统计
 */
export function getVehicleStats(): Promise<VehicleStatsResponse> {
  return request.get('/vehicles/stats/overview')
}

/**
 * 获取单个车辆详情
 */
export function getVehicle(id: number | string): Promise<{ code: number; data: VehicleData }> {
  return request.get(`/vehicles/${id}`)
}

/**
 * 获取车辆位置
 */
export function getVehicleLocation(id: number | string): Promise<{ code: number; data: any }> {
  return request.get(`/vehicles/${id}/location`)
}

/**
 * 获取车辆历史轨迹
 */
export function getVehicleTrack(id: number | string, params: {
  startTime: string
  endTime: string
}): Promise<{ code: number; data: any }> {
  return request.get(`/vehicles/${id}/track`, { params })
}

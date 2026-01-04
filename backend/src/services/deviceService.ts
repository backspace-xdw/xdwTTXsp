/**
 * 设备服务
 * 处理设备注册、在线状态、心跳等
 */

import { Device, DeviceRealtime } from '../models'
import { RegisterInfo, STATUS_FLAG } from '../jt808/constants'

/**
 * 注册或更新设备
 */
export async function registerDevice(
  deviceId: string,
  registerInfo: RegisterInfo,
  authCode: string,
  protocolVersion: string = '2013'
): Promise<Device> {
  const [device, created] = await Device.findOrCreate({
    where: { device_id: deviceId },
    defaults: {
      device_id: deviceId,
      plate_no: registerInfo.plateNo,
      plate_color: registerInfo.plateColor,
      manufacturer_id: registerInfo.manufacturerId,
      terminal_model: registerInfo.terminalModel,
      terminal_id: registerInfo.terminalId,
      province_id: registerInfo.provinceId,
      city_id: registerInfo.cityId,
      auth_code: authCode,
      protocol_version: protocolVersion,
      is_online: true,
      last_heartbeat: new Date()
    }
  })

  if (!created) {
    // 更新已存在的设备
    await device.update({
      plate_no: registerInfo.plateNo || device.plate_no,
      plate_color: registerInfo.plateColor,
      manufacturer_id: registerInfo.manufacturerId,
      terminal_model: registerInfo.terminalModel,
      terminal_id: registerInfo.terminalId,
      province_id: registerInfo.provinceId,
      city_id: registerInfo.cityId,
      auth_code: authCode,
      protocol_version: protocolVersion,
      is_online: true,
      last_heartbeat: new Date()
    })
  }

  console.log(`[DeviceService] 设备${created ? '注册' : '更新'}: ${deviceId}`)
  return device
}

/**
 * 验证鉴权码
 */
export async function verifyAuth(deviceId: string, authCode: string): Promise<boolean> {
  const device = await Device.findOne({ where: { device_id: deviceId } })

  if (!device) {
    console.log(`[DeviceService] 设备不存在: ${deviceId}`)
    return false
  }

  // 简单验证: 鉴权码匹配或设备已存在
  if (device.auth_code && device.auth_code !== authCode) {
    console.log(`[DeviceService] 鉴权码不匹配: ${deviceId}`)
    // 可以选择严格验证或宽松验证
    // return false
  }

  // 更新在线状态
  await device.update({
    is_online: true,
    last_heartbeat: new Date()
  })

  return true
}

/**
 * 更新心跳
 */
export async function updateHeartbeat(deviceId: string): Promise<void> {
  await Device.update(
    {
      is_online: true,
      last_heartbeat: new Date()
    },
    { where: { device_id: deviceId } }
  )

  // 同时更新实时状态表
  await DeviceRealtime.upsert({
    device_id: deviceId,
    is_online: true,
    updated_at: new Date()
  })
}

/**
 * 设备离线
 */
export async function setOffline(deviceId: string): Promise<void> {
  await Device.update(
    { is_online: false },
    { where: { device_id: deviceId } }
  )

  await DeviceRealtime.update(
    { is_online: false },
    { where: { device_id: deviceId } }
  )

  console.log(`[DeviceService] 设备离线: ${deviceId}`)
}

/**
 * 批量设置离线(心跳超时)
 */
export async function setTimeoutDevicesOffline(timeoutMs: number = 180000): Promise<number> {
  const timeoutDate = new Date(Date.now() - timeoutMs)

  const [affectedCount] = await Device.update(
    { is_online: false },
    {
      where: {
        is_online: true,
        last_heartbeat: { $lt: timeoutDate } as any
      }
    }
  )

  if (affectedCount > 0) {
    console.log(`[DeviceService] ${affectedCount} 设备因超时离线`)
  }

  return affectedCount
}

/**
 * 获取设备信息
 */
export async function getDevice(deviceId: string): Promise<Device | null> {
  return Device.findOne({ where: { device_id: deviceId } })
}

/**
 * 获取在线设备数量
 */
export async function getOnlineCount(): Promise<number> {
  return Device.count({ where: { is_online: true } })
}

/**
 * 获取所有在线设备
 */
export async function getOnlineDevices(): Promise<Device[]> {
  return Device.findAll({ where: { is_online: true } })
}

/**
 * 获取设备实时状态
 */
export async function getRealtimeStatus(deviceId: string): Promise<DeviceRealtime | null> {
  return DeviceRealtime.findByPk(deviceId)
}

/**
 * 更新设备实时状态
 */
export async function updateRealtimeStatus(
  deviceId: string,
  data: {
    latitude?: number
    longitude?: number
    altitude?: number
    speed?: number
    direction?: number
    mileage?: number
    alarmFlag?: number
    status?: number
    gpsTime?: Date
  }
): Promise<void> {
  const accOn = data.status ? (data.status & STATUS_FLAG.ACC_ON) !== 0 : false

  await DeviceRealtime.upsert({
    device_id: deviceId,
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude ?? 0,
    speed: data.speed ?? 0,
    direction: data.direction ?? 0,
    mileage: data.mileage,
    alarm_flag: data.alarmFlag ?? 0,
    status: data.status ?? 0,
    acc_on: accOn,
    is_online: true,
    gps_time: data.gpsTime
  })

  // 同时更新设备表
  await Device.update(
    {
      is_online: true,
      last_location_time: data.gpsTime
    },
    { where: { device_id: deviceId } }
  )
}

/**
 * 获取统计数据
 */
export async function getStats(): Promise<{
  total: number
  online: number
  offline: number
  driving: number
  parkingAccOn: number
  accOff: number
}> {
  const total = await Device.count()
  const online = await Device.count({ where: { is_online: true } })
  const offline = total - online

  // 从实时状态表获取详细状态
  const driving = await DeviceRealtime.count({
    where: {
      is_online: true,
      acc_on: true,
      speed: { $gt: 0 } as any
    }
  })

  const parkingAccOn = await DeviceRealtime.count({
    where: {
      is_online: true,
      acc_on: true,
      speed: 0
    }
  })

  const accOff = await DeviceRealtime.count({
    where: {
      is_online: true,
      acc_on: false
    }
  })

  return {
    total,
    online,
    offline,
    driving,
    parkingAccOn,
    accOff
  }
}

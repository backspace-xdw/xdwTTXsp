/**
 * 位置信息处理器 (0x0200)
 * 核心处理器 - 处理GPS位置上报
 */

import { MSG_ID, ACK_RESULT, LocationInfo, ALARM_FLAG, STATUS_FLAG, ALARM_TYPE_NAME } from '../constants'
import { JT808Message, buildGeneralAck, parseLocation, parseMileage, parseFuel, parseRecordSpeed } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'
import { registerHandler } from './index'

// 位置数据回调类型
export type LocationCallback = (
  deviceId: string,
  location: LocationInfo,
  extras: LocationExtras
) => Promise<void> | void

// 报警回调类型
export type AlarmCallback = (
  deviceId: string,
  alarms: AlarmInfo[],
  location: LocationInfo
) => Promise<void> | void

// 位置附加信息
export interface LocationExtras {
  mileage?: number    // 里程 km
  fuel?: number       // 油量 L
  recordSpeed?: number // 行驶记录速度 km/h
}

// 报警信息
export interface AlarmInfo {
  type: number
  name: string
  flag: number
}

// 位置回调
let onLocation: LocationCallback | null = null
let onAlarm: AlarmCallback | null = null

/**
 * 设置位置回调
 */
export function setLocationCallback(callback: LocationCallback): void {
  onLocation = callback
}

/**
 * 设置报警回调
 */
export function setAlarmCallback(callback: AlarmCallback): void {
  onAlarm = callback
}

/**
 * 解析报警标志
 */
function parseAlarms(alarmFlag: number): AlarmInfo[] {
  const alarms: AlarmInfo[] = []

  // 检查每个报警位
  const alarmTypes = [
    { flag: ALARM_FLAG.EMERGENCY, type: 0, name: '紧急报警' },
    { flag: ALARM_FLAG.OVERSPEED, type: 1, name: '超速报警' },
    { flag: ALARM_FLAG.FATIGUE, type: 2, name: '疲劳驾驶' },
    { flag: ALARM_FLAG.DANGER_WARNING, type: 3, name: '危险预警' },
    { flag: ALARM_FLAG.GNSS_FAULT, type: 4, name: 'GNSS模块故障' },
    { flag: ALARM_FLAG.GNSS_ANTENNA_CUT, type: 5, name: 'GNSS天线被剪断' },
    { flag: ALARM_FLAG.GNSS_ANTENNA_SHORT, type: 6, name: 'GNSS天线短路' },
    { flag: ALARM_FLAG.MAIN_POWER_LOW, type: 7, name: '主电源欠压' },
    { flag: ALARM_FLAG.MAIN_POWER_OFF, type: 8, name: '主电源掉电' },
    { flag: ALARM_FLAG.LCD_FAULT, type: 9, name: 'LCD故障' },
    { flag: ALARM_FLAG.TTS_FAULT, type: 10, name: 'TTS模块故障' },
    { flag: ALARM_FLAG.CAMERA_FAULT, type: 11, name: '摄像头故障' },
    { flag: ALARM_FLAG.IC_CARD_FAULT, type: 12, name: 'IC卡模块故障' },
    { flag: ALARM_FLAG.OVERSPEED_WARNING, type: 13, name: '超速预警' },
    { flag: ALARM_FLAG.FATIGUE_WARNING, type: 14, name: '疲劳驾驶预警' },
    { flag: ALARM_FLAG.DRIVING_TIMEOUT_DAY, type: 18, name: '当天累计驾驶超时' },
    { flag: ALARM_FLAG.PARKING_TIMEOUT, type: 19, name: '超时停车' },
    { flag: ALARM_FLAG.ENTER_EXIT_AREA, type: 20, name: '进出区域' },
    { flag: ALARM_FLAG.ENTER_EXIT_ROUTE, type: 21, name: '进出路线' },
    { flag: ALARM_FLAG.ROUTE_TIME_ERROR, type: 22, name: '路段行驶时间异常' },
    { flag: ALARM_FLAG.ROUTE_DEVIATION, type: 23, name: '路线偏离' },
    { flag: ALARM_FLAG.VSS_FAULT, type: 24, name: 'VSS故障' },
    { flag: ALARM_FLAG.FUEL_ABNORMAL, type: 25, name: '油量异常' },
    { flag: ALARM_FLAG.VEHICLE_STOLEN, type: 26, name: '车辆被盗' },
    { flag: ALARM_FLAG.ILLEGAL_IGNITION, type: 27, name: '非法点火' },
    { flag: ALARM_FLAG.ILLEGAL_DISPLACEMENT, type: 28, name: '非法位移' },
    { flag: ALARM_FLAG.COLLISION_WARNING, type: 29, name: '碰撞预警' },
    { flag: ALARM_FLAG.ROLLOVER_WARNING, type: 30, name: '侧翻预警' },
    { flag: ALARM_FLAG.ILLEGAL_DOOR_OPEN, type: 31, name: '非法开门' },
  ]

  for (const alarm of alarmTypes) {
    if ((alarmFlag & alarm.flag) !== 0) {
      alarms.push({
        type: alarm.type,
        name: alarm.name,
        flag: alarm.flag
      })
    }
  }

  return alarms
}

/**
 * 解析状态标志
 */
export function parseStatus(status: number): {
  accOn: boolean
  located: boolean
  southLat: boolean
  westLng: boolean
  operating: boolean
  encrypted: boolean
  gpsLocated: boolean
  beidouLocated: boolean
} {
  return {
    accOn: (status & STATUS_FLAG.ACC_ON) !== 0,
    located: (status & STATUS_FLAG.LOCATED) !== 0,
    southLat: (status & STATUS_FLAG.SOUTH_LAT) !== 0,
    westLng: (status & STATUS_FLAG.WEST_LNG) !== 0,
    operating: (status & STATUS_FLAG.OPERATING) !== 0,
    encrypted: (status & STATUS_FLAG.LAT_LNG_ENCRYPTED) !== 0,
    gpsLocated: (status & STATUS_FLAG.GPS_LOCATED) !== 0,
    beidouLocated: (status & STATUS_FLAG.BEIDOU_LOCATED) !== 0,
  }
}

/**
 * 处理位置信息上报
 */
async function handleLocationReport(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  const location = parseLocation(message.body)

  if (!location) {
    console.error(`[JT808] 位置解析失败: ${message.header.deviceId}`)
    sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.LOCATION_REPORT, ACK_RESULT.MSG_ERROR)
    return
  }

  // 解析附加信息
  const extras: LocationExtras = {}
  if (location.extras) {
    extras.mileage = parseMileage(location.extras) ?? undefined
    extras.fuel = parseFuel(location.extras) ?? undefined
    extras.recordSpeed = parseRecordSpeed(location.extras) ?? undefined
  }

  // 解析状态
  const statusInfo = parseStatus(location.status)

  // 处理南纬/西经
  let lat = location.latitude
  let lng = location.longitude
  if (statusInfo.southLat) lat = -lat
  if (statusInfo.westLng) lng = -lng

  console.log(`[JT808] 位置上报: ${message.header.deviceId}`, {
    lat: lat.toFixed(6),
    lng: lng.toFixed(6),
    speed: `${location.speed}km/h`,
    direction: `${location.direction}°`,
    time: location.gpsTime.toISOString(),
    acc: statusInfo.accOn ? 'ON' : 'OFF',
    located: statusInfo.located,
    mileage: extras.mileage ? `${extras.mileage}km` : undefined
  })

  // 发送通用应答
  sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.LOCATION_REPORT, ACK_RESULT.SUCCESS)

  // 调用位置回调
  if (onLocation) {
    try {
      await onLocation(message.header.deviceId, location, extras)
    } catch (error) {
      console.error('[JT808] 位置回调错误:', error)
    }
  }

  // 解析并处理报警
  const alarms = parseAlarms(location.alarmFlag)
  if (alarms.length > 0) {
    console.log(`[JT808] 检测到报警: ${message.header.deviceId}`, alarms.map(a => a.name))

    if (onAlarm) {
      try {
        await onAlarm(message.header.deviceId, alarms, location)
      } catch (error) {
        console.error('[JT808] 报警回调错误:', error)
      }
    }

    // 触发报警事件
    server.emit('alarm', {
      deviceId: message.header.deviceId,
      alarms,
      location
    })
  }

  // 触发位置事件
  server.emit('location', {
    deviceId: message.header.deviceId,
    location: {
      ...location,
      latitude: lat,
      longitude: lng
    },
    extras,
    status: statusInfo
  })
}

/**
 * 发送通用应答
 */
function sendGeneralAck(
  connInfo: ConnectionInfo,
  ackSeq: number,
  ackMsgId: number,
  result: number
): void {
  const msgSeq = getNextMsgSeq()
  const response = buildGeneralAck(
    connInfo.deviceId,
    msgSeq,
    ackSeq,
    ackMsgId,
    result,
    connInfo.is2019
  )
  connInfo.socket.write(response)
}

// 消息流水号计数器
let msgSeqCounter = 0
function getNextMsgSeq(): number {
  msgSeqCounter = (msgSeqCounter + 1) % 65536
  return msgSeqCounter
}

// 注册处理器
registerHandler(MSG_ID.LOCATION_REPORT, handleLocationReport)

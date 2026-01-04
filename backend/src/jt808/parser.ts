/**
 * JT/T 808 协议解析器
 * 实现帧转义、解析、构建等核心功能
 */

import {
  FRAME_DELIMITER,
  MSG_ID,
  MessageHeader,
  LocationInfo,
  RegisterInfo,
  LOCATION_EXTRA_ID
} from './constants'

// 解析后的消息结构
export interface JT808Message {
  header: MessageHeader
  body: Buffer
  checksum: number
  raw: Buffer
}

// 位置上报解析结果
export interface LocationMessage extends JT808Message {
  location: LocationInfo
}

// 终端注册解析结果
export interface RegisterMessage extends JT808Message {
  register: RegisterInfo
}

/**
 * 转义处理 - 发送数据前调用
 * 0x7d -> 0x7d01
 * 0x7e -> 0x7d02
 */
export function escape(data: Buffer): Buffer {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte === 0x7d) {
      result.push(0x7d, 0x01)
    } else if (byte === 0x7e) {
      result.push(0x7d, 0x02)
    } else {
      result.push(byte)
    }
  }
  return Buffer.from(result)
}

/**
 * 反转义处理 - 接收数据后调用
 * 0x7d01 -> 0x7d
 * 0x7d02 -> 0x7e
 */
export function unescape(data: Buffer): Buffer {
  const result: number[] = []
  let i = 0
  while (i < data.length) {
    if (data[i] === 0x7d && i + 1 < data.length) {
      if (data[i + 1] === 0x01) {
        result.push(0x7d)
        i += 2
      } else if (data[i + 1] === 0x02) {
        result.push(0x7e)
        i += 2
      } else {
        result.push(data[i])
        i++
      }
    } else {
      result.push(data[i])
      i++
    }
  }
  return Buffer.from(result)
}

/**
 * 计算BCC校验码
 * 从消息头到消息体的异或校验
 */
export function calculateChecksum(data: Buffer): number {
  let checksum = 0
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i]
  }
  return checksum
}

/**
 * 验证校验码
 */
export function verifyChecksum(data: Buffer, checksum: number): boolean {
  return calculateChecksum(data) === checksum
}

/**
 * 解析消息头
 * 2019版本支持
 */
export function parseHeader(data: Buffer): { header: MessageHeader; headerLength: number } {
  let offset = 0

  // 消息ID (2字节)
  const msgId = data.readUInt16BE(offset)
  offset += 2

  // 消息体属性 (2字节)
  const msgBodyAttr = data.readUInt16BE(offset)
  offset += 2

  // 解析消息体属性
  const bodyLength = msgBodyAttr & 0x03ff // bit0-9: 消息体长度
  const hasEncrypt = (msgBodyAttr >> 10) & 0x07 // bit10-12: 加密方式
  const hasSubPackage = (msgBodyAttr >> 13) & 0x01 // bit13: 分包标识
  const versionFlag = (msgBodyAttr >> 14) & 0x01 // bit14: 版本标识 (2019新增)

  let protocolVersion: number | undefined
  let deviceId: string

  if (versionFlag === 1) {
    // 2019版本 - 协议版本号 (1字节) + 终端手机号 (10字节BCD)
    protocolVersion = data.readUInt8(offset)
    offset += 1
    deviceId = parseBCD(data.subarray(offset, offset + 10))
    offset += 10
  } else {
    // 2013版本 - 终端手机号 (6字节BCD)
    deviceId = parseBCD(data.subarray(offset, offset + 6))
    offset += 6
  }

  // 消息流水号 (2字节)
  const msgSeq = data.readUInt16BE(offset)
  offset += 2

  // 分包信息
  let packageInfo: { total: number; index: number } | undefined
  if (hasSubPackage) {
    const total = data.readUInt16BE(offset)
    offset += 2
    const index = data.readUInt16BE(offset)
    offset += 2
    packageInfo = { total, index }
  }

  const header: MessageHeader = {
    msgId,
    msgBodyAttr,
    protocolVersion,
    deviceId,
    msgSeq,
    packageInfo
  }

  return { header, headerLength: offset }
}

/**
 * 解析完整帧
 * 输入: 去掉首尾0x7e并反转义后的数据
 */
export function parseFrame(rawData: Buffer): JT808Message | null {
  try {
    // 最小长度: 消息头(12) + 校验码(1) = 13
    if (rawData.length < 13) {
      console.error('JT808: 数据长度不足')
      return null
    }

    // 校验码在最后一个字节
    const checksum = rawData[rawData.length - 1]
    const content = rawData.subarray(0, rawData.length - 1)

    // 验证校验码
    if (!verifyChecksum(content, checksum)) {
      console.error('JT808: 校验码错误')
      return null
    }

    // 解析消息头
    const { header, headerLength } = parseHeader(content)

    // 消息体
    const body = content.subarray(headerLength)

    return {
      header,
      body,
      checksum,
      raw: rawData
    }
  } catch (error) {
    console.error('JT808: 解析帧失败', error)
    return null
  }
}

/**
 * 从原始数据中提取帧
 * 处理粘包问题
 */
export function extractFrames(buffer: Buffer): { frames: Buffer[]; remaining: Buffer } {
  const frames: Buffer[] = []
  let start = -1
  let i = 0

  while (i < buffer.length) {
    if (buffer[i] === FRAME_DELIMITER) {
      if (start === -1) {
        // 找到帧开始
        start = i
      } else {
        // 找到帧结束
        const frame = buffer.subarray(start + 1, i) // 去掉首尾0x7e
        if (frame.length > 0) {
          frames.push(unescape(frame))
        }
        start = -1
      }
    }
    i++
  }

  // 返回未处理完的数据
  const remaining = start === -1 ? Buffer.alloc(0) : buffer.subarray(start)
  return { frames, remaining }
}

/**
 * 解析位置信息
 */
export function parseLocation(body: Buffer): LocationInfo | null {
  try {
    if (body.length < 28) {
      console.error('JT808: 位置数据长度不足')
      return null
    }

    let offset = 0

    // 报警标志 (4字节)
    const alarmFlag = body.readUInt32BE(offset)
    offset += 4

    // 状态 (4字节)
    const status = body.readUInt32BE(offset)
    offset += 4

    // 纬度 (4字节) 单位: 1e-6度
    const latitudeRaw = body.readUInt32BE(offset)
    const latitude = latitudeRaw / 1000000
    offset += 4

    // 经度 (4字节) 单位: 1e-6度
    const longitudeRaw = body.readUInt32BE(offset)
    const longitude = longitudeRaw / 1000000
    offset += 4

    // 海拔 (2字节) 单位: 米
    const altitude = body.readUInt16BE(offset)
    offset += 2

    // 速度 (2字节) 单位: 1/10 km/h
    const speedRaw = body.readUInt16BE(offset)
    const speed = speedRaw / 10
    offset += 2

    // 方向 (2字节) 单位: 度
    const direction = body.readUInt16BE(offset)
    offset += 2

    // GPS时间 (6字节BCD) YYMMDDHHmmss
    const gpsTime = parseBCDTime(body.subarray(offset, offset + 6))
    offset += 6

    // 解析附加信息
    const extras = new Map<number, Buffer>()
    while (offset < body.length) {
      if (offset + 2 > body.length) break

      const extraId = body.readUInt8(offset)
      offset += 1
      const extraLength = body.readUInt8(offset)
      offset += 1

      if (offset + extraLength > body.length) break

      const extraData = body.subarray(offset, offset + extraLength)
      extras.set(extraId, extraData)
      offset += extraLength
    }

    return {
      alarmFlag,
      status,
      latitude,
      longitude,
      altitude,
      speed,
      direction,
      gpsTime,
      extras
    }
  } catch (error) {
    console.error('JT808: 解析位置信息失败', error)
    return null
  }
}

/**
 * 解析终端注册信息
 */
export function parseRegister(body: Buffer, is2019: boolean = false): RegisterInfo | null {
  try {
    let offset = 0

    // 省域ID (2字节)
    const provinceId = body.readUInt16BE(offset)
    offset += 2

    // 市县域ID (2字节)
    const cityId = body.readUInt16BE(offset)
    offset += 2

    let manufacturerId: string
    let terminalModel: string
    let terminalId: string

    if (is2019) {
      // 2019版本
      // 制造商ID (11字节)
      manufacturerId = body.subarray(offset, offset + 11).toString('ascii').replace(/\0/g, '').trim()
      offset += 11

      // 终端型号 (30字节)
      terminalModel = body.subarray(offset, offset + 30).toString('ascii').replace(/\0/g, '').trim()
      offset += 30

      // 终端ID (30字节)
      terminalId = body.subarray(offset, offset + 30).toString('ascii').replace(/\0/g, '').trim()
      offset += 30
    } else {
      // 2013版本
      // 制造商ID (5字节)
      manufacturerId = body.subarray(offset, offset + 5).toString('ascii').replace(/\0/g, '').trim()
      offset += 5

      // 终端型号 (20字节)
      terminalModel = body.subarray(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim()
      offset += 20

      // 终端ID (7字节)
      terminalId = body.subarray(offset, offset + 7).toString('ascii').replace(/\0/g, '').trim()
      offset += 7
    }

    // 车牌颜色 (1字节)
    const plateColor = body.readUInt8(offset)
    offset += 1

    // 车牌号
    const plateNo = body.subarray(offset).toString('utf8').replace(/\0/g, '').trim()

    return {
      provinceId,
      cityId,
      manufacturerId,
      terminalModel,
      terminalId,
      plateColor,
      plateNo
    }
  } catch (error) {
    console.error('JT808: 解析注册信息失败', error)
    return null
  }
}

/**
 * 构建消息帧
 */
export function buildFrame(
  msgId: number,
  deviceId: string,
  msgSeq: number,
  body: Buffer = Buffer.alloc(0),
  is2019: boolean = false
): Buffer {
  // 构建消息头
  const headerParts: Buffer[] = []

  // 消息ID (2字节)
  const msgIdBuf = Buffer.alloc(2)
  msgIdBuf.writeUInt16BE(msgId, 0)
  headerParts.push(msgIdBuf)

  // 消息体属性 (2字节)
  let msgBodyAttr = body.length & 0x03ff // 消息体长度
  if (is2019) {
    msgBodyAttr |= 0x4000 // bit14: 版本标识
  }
  const attrBuf = Buffer.alloc(2)
  attrBuf.writeUInt16BE(msgBodyAttr, 0)
  headerParts.push(attrBuf)

  if (is2019) {
    // 协议版本号 (1字节)
    const versionBuf = Buffer.alloc(1)
    versionBuf.writeUInt8(1, 0) // 版本1
    headerParts.push(versionBuf)

    // 终端手机号 (10字节BCD)
    headerParts.push(stringToBCD(deviceId, 10))
  } else {
    // 终端手机号 (6字节BCD)
    headerParts.push(stringToBCD(deviceId, 6))
  }

  // 消息流水号 (2字节)
  const seqBuf = Buffer.alloc(2)
  seqBuf.writeUInt16BE(msgSeq, 0)
  headerParts.push(seqBuf)

  // 组合消息头和消息体
  const header = Buffer.concat(headerParts)
  const content = Buffer.concat([header, body])

  // 计算校验码
  const checksum = calculateChecksum(content)

  // 组合完整帧 (不含首尾0x7e)
  const frame = Buffer.concat([content, Buffer.from([checksum])])

  // 转义处理
  const escaped = escape(frame)

  // 添加首尾标识
  return Buffer.concat([
    Buffer.from([FRAME_DELIMITER]),
    escaped,
    Buffer.from([FRAME_DELIMITER])
  ])
}

/**
 * 构建平台通用应答
 */
export function buildGeneralAck(
  deviceId: string,
  msgSeq: number,
  ackSeq: number,
  ackMsgId: number,
  result: number,
  is2019: boolean = false
): Buffer {
  // 应答流水号 (2字节)
  // 应答ID (2字节)
  // 结果 (1字节)
  const body = Buffer.alloc(5)
  body.writeUInt16BE(ackSeq, 0)
  body.writeUInt16BE(ackMsgId, 2)
  body.writeUInt8(result, 4)

  return buildFrame(MSG_ID.PLATFORM_GENERAL_ACK, deviceId, msgSeq, body, is2019)
}

/**
 * 构建终端注册应答
 */
export function buildRegisterAck(
  deviceId: string,
  msgSeq: number,
  ackSeq: number,
  result: number,
  authCode: string = '',
  is2019: boolean = false
): Buffer {
  // 应答流水号 (2字节)
  // 结果 (1字节)
  // 鉴权码 (可变长度)
  const authCodeBuf = Buffer.from(authCode, 'utf8')
  const body = Buffer.alloc(3 + authCodeBuf.length)
  body.writeUInt16BE(ackSeq, 0)
  body.writeUInt8(result, 2)
  if (authCodeBuf.length > 0) {
    authCodeBuf.copy(body, 3)
  }

  return buildFrame(MSG_ID.REGISTER_ACK, deviceId, msgSeq, body, is2019)
}

// ============ 工具函数 ============

/**
 * 解析BCD编码
 */
export function parseBCD(data: Buffer): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    const high = (byte >> 4) & 0x0f
    const low = byte & 0x0f
    result += high.toString(16) + low.toString(16)
  }
  // 去掉前导0
  return result.replace(/^0+/, '') || '0'
}

/**
 * 字符串转BCD编码
 */
export function stringToBCD(str: string, length: number): Buffer {
  // 补齐到指定长度的2倍（每个BCD字节表示2位数字）
  const padded = str.padStart(length * 2, '0')
  const result = Buffer.alloc(length)

  for (let i = 0; i < length; i++) {
    const high = parseInt(padded[i * 2], 16) || 0
    const low = parseInt(padded[i * 2 + 1], 16) || 0
    result[i] = (high << 4) | low
  }

  return result
}

/**
 * 解析BCD时间
 */
export function parseBCDTime(data: Buffer): Date {
  if (data.length !== 6) {
    return new Date()
  }

  const year = 2000 + parseInt(parseBCD(data.subarray(0, 1)), 10)
  const month = parseInt(parseBCD(data.subarray(1, 2)), 10) - 1 // JS月份从0开始
  const day = parseInt(parseBCD(data.subarray(2, 3)), 10)
  const hour = parseInt(parseBCD(data.subarray(3, 4)), 10)
  const minute = parseInt(parseBCD(data.subarray(4, 5)), 10)
  const second = parseInt(parseBCD(data.subarray(5, 6)), 10)

  return new Date(year, month, day, hour, minute, second)
}

/**
 * 日期转BCD时间
 */
export function dateToBCDTime(date: Date): Buffer {
  const year = (date.getFullYear() - 2000).toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const second = date.getSeconds().toString().padStart(2, '0')

  const timeStr = year + month + day + hour + minute + second
  return stringToBCD(timeStr, 6)
}

/**
 * 解析位置附加信息中的里程
 */
export function parseMileage(extras: Map<number, Buffer>): number | null {
  const data = extras.get(LOCATION_EXTRA_ID.MILEAGE)
  if (data && data.length >= 4) {
    return data.readUInt32BE(0) / 10 // 单位: km
  }
  return null
}

/**
 * 解析位置附加信息中的油量
 */
export function parseFuel(extras: Map<number, Buffer>): number | null {
  const data = extras.get(LOCATION_EXTRA_ID.FUEL)
  if (data && data.length >= 2) {
    return data.readUInt16BE(0) / 10 // 单位: L
  }
  return null
}

/**
 * 解析位置附加信息中的行驶记录速度
 */
export function parseRecordSpeed(extras: Map<number, Buffer>): number | null {
  const data = extras.get(LOCATION_EXTRA_ID.SPEED)
  if (data && data.length >= 2) {
    return data.readUInt16BE(0) / 10 // 单位: km/h
  }
  return null
}

/**
 * 获取消息ID名称
 */
export function getMsgIdName(msgId: number): string {
  const names: Record<number, string> = {
    [MSG_ID.TERMINAL_GENERAL_ACK]: '终端通用应答',
    [MSG_ID.TERMINAL_HEARTBEAT]: '终端心跳',
    [MSG_ID.TERMINAL_LOGOUT]: '终端注销',
    [MSG_ID.TERMINAL_REGISTER]: '终端注册',
    [MSG_ID.TERMINAL_AUTH]: '终端鉴权',
    [MSG_ID.LOCATION_REPORT]: '位置信息汇报',
    [MSG_ID.LOCATION_QUERY_ACK]: '位置信息查询应答',
    [MSG_ID.PLATFORM_GENERAL_ACK]: '平台通用应答',
    [MSG_ID.REGISTER_ACK]: '终端注册应答',
  }
  return names[msgId] || `未知消息(0x${msgId.toString(16).padStart(4, '0')})`
}

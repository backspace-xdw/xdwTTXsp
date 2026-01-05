/**
 * JT/T 1078 协议解析器
 * 解析和构建 JT1078 视频帧
 */

import {
  FRAME_HEAD_FLAG,
  FRAME_HEADER_LENGTH,
  DATA_TYPE,
  SUBPACKAGE_FLAG,
} from './constants'

/**
 * JT1078 帧头结构 (30字节)
 */
export interface JT1078FrameHeader {
  frameHeadFlag: number      // 帧头标识 (4 bytes: 0x30316364)
  versionFlag: number        // V: 固定为1, P: 固定为0 (1 byte)
  payloadType: number        // PT: 负载类型 (1 byte) - 98=H264, 99=H265
  sequenceNumber: number     // 包序号 (2 bytes)
  deviceId: string           // SIM卡号/终端ID (BCD, 6 bytes)
  channel: number            // 逻辑通道号 (1 byte)
  dataType: number           // 数据类型 (4 bits高位): 0=I帧, 1=P帧, 2=B帧, 3=音频
  subpackageFlag: number     // 分包标识 (4 bits低位)
  timestamp: bigint          // 时间戳 (8 bytes, 毫秒)
  lastIFrameInterval: number // 上一关键帧间隔 (2 bytes)
  lastFrameInterval: number  // 上一帧间隔 (2 bytes)
  bodyLength: number         // 数据体长度 (2 bytes)
}

/**
 * JT1078 完整帧
 */
export interface JT1078Frame {
  header: JT1078FrameHeader
  body: Buffer
}

/**
 * 解析 BCD 编码的设备ID
 */
export function parseBCD(buffer: Buffer, offset: number, length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    const byte = buffer[offset + i]
    result += ((byte >> 4) & 0x0f).toString(16)
    result += (byte & 0x0f).toString(16)
  }
  return result.replace(/^0+/, '') || '0' // 去除前导零
}

/**
 * 编码设备ID为BCD格式
 */
export function encodeBCD(deviceId: string, length: number): Buffer {
  // 补齐长度
  const padded = deviceId.padStart(length * 2, '0')
  const buffer = Buffer.alloc(length)

  for (let i = 0; i < length; i++) {
    const high = parseInt(padded[i * 2], 16)
    const low = parseInt(padded[i * 2 + 1], 16)
    buffer[i] = (high << 4) | low
  }

  return buffer
}

/**
 * 解析 JT1078 帧头 (30字节)
 */
export function parseFrameHeader(buffer: Buffer, offset: number = 0): JT1078FrameHeader | null {
  if (buffer.length < offset + FRAME_HEADER_LENGTH) {
    return null
  }

  // 检查帧头标识
  const frameHeadFlag = buffer.readUInt32BE(offset)
  if (frameHeadFlag !== FRAME_HEAD_FLAG) {
    return null
  }

  // V (2 bits) | P (1 bit) | X (1 bit) | CC (4 bits)
  const vpxcc = buffer[offset + 4]
  const versionFlag = (vpxcc >> 6) & 0x03

  // M (1 bit) | PT (7 bits)
  const mpt = buffer[offset + 5]
  const payloadType = mpt & 0x7f

  // 包序号
  const sequenceNumber = buffer.readUInt16BE(offset + 6)

  // SIM卡号 (BCD, 6 bytes)
  const deviceId = parseBCD(buffer, offset + 8, 6)

  // 逻辑通道号
  const channel = buffer[offset + 14]

  // 数据类型(高4位) + 分包标识(低4位)
  const dataTypeFlag = buffer[offset + 15]
  const dataType = (dataTypeFlag >> 4) & 0x0f
  const subpackageFlag = dataTypeFlag & 0x0f

  // 时间戳 (8 bytes, 毫秒)
  const timestamp = buffer.readBigUInt64BE(offset + 16)

  // 上一关键帧间隔 (2 bytes)
  const lastIFrameInterval = buffer.readUInt16BE(offset + 24)

  // 上一帧间隔 (2 bytes)
  const lastFrameInterval = buffer.readUInt16BE(offset + 26)

  // 数据体长度 (2 bytes)
  const bodyLength = buffer.readUInt16BE(offset + 28)

  return {
    frameHeadFlag,
    versionFlag,
    payloadType,
    sequenceNumber,
    deviceId,
    channel,
    dataType,
    subpackageFlag,
    timestamp,
    lastIFrameInterval,
    lastFrameInterval,
    bodyLength,
  }
}

/**
 * 解析完整 JT1078 帧
 */
export function parseFrame(buffer: Buffer, offset: number = 0): JT1078Frame | null {
  const header = parseFrameHeader(buffer, offset)
  if (!header) {
    return null
  }

  const bodyStart = offset + FRAME_HEADER_LENGTH
  const bodyEnd = bodyStart + header.bodyLength

  if (buffer.length < bodyEnd) {
    return null // 数据不完整
  }

  const body = buffer.subarray(bodyStart, bodyEnd)

  return { header, body }
}

/**
 * 构建 JT1078 帧
 */
export function buildFrame(
  deviceId: string,
  channel: number,
  dataType: number,
  payloadType: number,
  sequenceNumber: number,
  timestamp: bigint,
  body: Buffer,
  subpackageFlag: number = SUBPACKAGE_FLAG.ATOMIC
): Buffer {
  const header = Buffer.alloc(FRAME_HEADER_LENGTH)
  let offset = 0

  // 帧头标识 (4 bytes)
  header.writeUInt32BE(FRAME_HEAD_FLAG, offset)
  offset += 4

  // V=2, P=0, X=0, CC=1 -> 0x81
  header[offset++] = 0x81

  // M=1, PT=payloadType
  header[offset++] = 0x80 | (payloadType & 0x7f)

  // 包序号
  header.writeUInt16BE(sequenceNumber & 0xffff, offset)
  offset += 2

  // SIM卡号 (BCD, 6 bytes)
  const bcdDeviceId = encodeBCD(deviceId, 6)
  bcdDeviceId.copy(header, offset)
  offset += 6

  // 逻辑通道号
  header[offset++] = channel & 0xff

  // 数据类型 + 分包标识
  header[offset++] = ((dataType & 0x0f) << 4) | (subpackageFlag & 0x0f)

  // 时间戳 (8 bytes)
  header.writeBigUInt64BE(timestamp, offset)
  offset += 8

  // 上一关键帧间隔 (固定为0)
  header.writeUInt16BE(0, offset)
  offset += 2

  // 上一帧间隔 (固定为0)
  header.writeUInt16BE(0, offset)
  offset += 2

  // 数据体长度
  header.writeUInt16BE(body.length, offset)

  return Buffer.concat([header, body])
}

/**
 * 帧缓冲器 - 处理TCP粘包/拆包
 */
export class FrameBuffer {
  private buffer: Buffer = Buffer.alloc(0)

  /**
   * 添加数据到缓冲区
   */
  append(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])
  }

  /**
   * 尝试提取完整帧
   */
  extractFrame(): JT1078Frame | null {
    // 查找帧头
    const headIndex = this.findFrameHead()
    if (headIndex === -1) {
      // 没有找到帧头，清空缓冲区
      if (this.buffer.length > 4) {
        this.buffer = this.buffer.subarray(this.buffer.length - 3)
      }
      return null
    }

    // 丢弃帧头之前的数据
    if (headIndex > 0) {
      this.buffer = this.buffer.subarray(headIndex)
    }

    // 检查是否有完整帧头
    if (this.buffer.length < FRAME_HEADER_LENGTH) {
      return null
    }

    // 解析帧头获取数据长度
    const header = parseFrameHeader(this.buffer)
    if (!header) {
      // 帧头解析失败，跳过这个帧头标识
      this.buffer = this.buffer.subarray(4)
      return null
    }

    const totalLength = FRAME_HEADER_LENGTH + header.bodyLength

    // 检查数据是否完整
    if (this.buffer.length < totalLength) {
      return null
    }

    // 提取完整帧
    const frame = parseFrame(this.buffer)
    if (frame) {
      this.buffer = this.buffer.subarray(totalLength)
    }

    return frame
  }

  /**
   * 提取所有可用帧
   */
  extractAllFrames(): JT1078Frame[] {
    const frames: JT1078Frame[] = []
    let frame: JT1078Frame | null

    while ((frame = this.extractFrame()) !== null) {
      frames.push(frame)
    }

    return frames
  }

  /**
   * 查找帧头位置
   */
  private findFrameHead(): number {
    for (let i = 0; i <= this.buffer.length - 4; i++) {
      if (this.buffer.readUInt32BE(i) === FRAME_HEAD_FLAG) {
        return i
      }
    }
    return -1
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = Buffer.alloc(0)
  }

  /**
   * 获取缓冲区大小
   */
  get size(): number {
    return this.buffer.length
  }
}

/**
 * 判断是否为关键帧
 */
export function isKeyFrame(header: JT1078FrameHeader): boolean {
  return header.dataType === DATA_TYPE.I_FRAME
}

/**
 * 判断是否为音频帧
 */
export function isAudioFrame(header: JT1078FrameHeader): boolean {
  return header.dataType === DATA_TYPE.AUDIO
}

/**
 * 判断是否为视频帧
 */
export function isVideoFrame(header: JT1078FrameHeader): boolean {
  return header.dataType === DATA_TYPE.I_FRAME ||
         header.dataType === DATA_TYPE.P_FRAME ||
         header.dataType === DATA_TYPE.B_FRAME
}

/**
 * 获取数据类型名称
 */
export function getDataTypeName(dataType: number): string {
  switch (dataType) {
    case DATA_TYPE.I_FRAME: return 'I-Frame'
    case DATA_TYPE.P_FRAME: return 'P-Frame'
    case DATA_TYPE.B_FRAME: return 'B-Frame'
    case DATA_TYPE.AUDIO: return 'Audio'
    case DATA_TYPE.TRANSPARENT: return 'Transparent'
    default: return `Unknown(${dataType})`
  }
}

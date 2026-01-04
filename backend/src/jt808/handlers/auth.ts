/**
 * 终端鉴权处理器 (0x0102)
 */

import { MSG_ID, ACK_RESULT } from '../constants'
import { JT808Message, buildGeneralAck } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'
import { registerHandler } from './index'

// 鉴权回调类型
export type AuthCallback = (
  deviceId: string,
  authCode: string,
  imei?: string,
  softwareVersion?: string
) => Promise<boolean>

// 鉴权回调
let onAuth: AuthCallback | null = null

/**
 * 设置鉴权回调
 */
export function setAuthCallback(callback: AuthCallback): void {
  onAuth = callback
}

/**
 * 解析鉴权消息体
 * 2019版本: 鉴权码长度(1) + 鉴权码(n) + IMEI长度(1) + IMEI(15) + 软件版本长度(1) + 软件版本(n)
 * 2013版本: 鉴权码
 */
interface AuthBody {
  authCode: string
  imei?: string
  softwareVersion?: string
}

function parseAuthBody(body: Buffer, is2019: boolean): AuthBody {
  if (is2019 && body.length > 1) {
    let offset = 0

    // 鉴权码长度
    const authCodeLen = body.readUInt8(offset)
    offset += 1

    // 鉴权码
    const authCode = body.subarray(offset, offset + authCodeLen).toString('utf8').replace(/\0/g, '')
    offset += authCodeLen

    let imei: string | undefined
    let softwareVersion: string | undefined

    // IMEI (如果有)
    if (offset < body.length) {
      const imeiLen = body.readUInt8(offset)
      offset += 1
      if (imeiLen > 0 && offset + imeiLen <= body.length) {
        imei = body.subarray(offset, offset + imeiLen).toString('ascii').replace(/\0/g, '')
        offset += imeiLen
      }
    }

    // 软件版本 (如果有)
    if (offset < body.length) {
      const versionLen = body.readUInt8(offset)
      offset += 1
      if (versionLen > 0 && offset + versionLen <= body.length) {
        softwareVersion = body.subarray(offset, offset + versionLen).toString('ascii').replace(/\0/g, '')
      }
    }

    return { authCode, imei, softwareVersion }
  } else {
    // 2013版本: 整个消息体就是鉴权码
    return {
      authCode: body.toString('utf8').replace(/\0/g, '').trim()
    }
  }
}

/**
 * 处理终端鉴权
 */
async function handleAuth(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  const authBody = parseAuthBody(message.body, connInfo.is2019)

  console.log(`[JT808] 终端鉴权请求:`, {
    deviceId: message.header.deviceId,
    authCode: authBody.authCode,
    imei: authBody.imei,
    softwareVersion: authBody.softwareVersion
  })

  // 默认鉴权成功
  let success = true

  // 如果设置了回调，调用回调进行验证
  if (onAuth) {
    try {
      success = await onAuth(
        message.header.deviceId,
        authBody.authCode,
        authBody.imei,
        authBody.softwareVersion
      )
    } catch (error) {
      console.error('[JT808] 鉴权回调错误:', error)
      success = false
    }
  }

  // 更新连接状态
  if (success) {
    connInfo.isAuthenticated = true
  }

  // 发送通用应答
  const result = success ? ACK_RESULT.SUCCESS : ACK_RESULT.FAILURE
  sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_AUTH, result)

  // 触发服务器事件
  server.emit('auth', {
    deviceId: message.header.deviceId,
    authCode: authBody.authCode,
    imei: authBody.imei,
    softwareVersion: authBody.softwareVersion,
    success
  })

  if (success) {
    console.log(`[JT808] 终端鉴权成功: ${message.header.deviceId}`)
  } else {
    console.log(`[JT808] 终端鉴权失败: ${message.header.deviceId}`)
  }
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
registerHandler(MSG_ID.TERMINAL_AUTH, handleAuth)

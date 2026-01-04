/**
 * 终端注册处理器 (0x0100)
 */

import { MSG_ID, REGISTER_RESULT, RegisterInfo } from '../constants'
import { JT808Message, parseRegister, buildRegisterAck } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'
import { registerHandler } from './index'

// 注册信息回调类型
export type RegisterCallback = (
  deviceId: string,
  registerInfo: RegisterInfo,
  authCode: string
) => Promise<{ success: boolean; result?: number; authCode?: string }>

// 注册回调
let onRegister: RegisterCallback | null = null

/**
 * 设置注册回调
 */
export function setRegisterCallback(callback: RegisterCallback): void {
  onRegister = callback
}

/**
 * 处理终端注册
 */
async function handleRegister(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  const registerInfo = parseRegister(message.body, connInfo.is2019)

  if (!registerInfo) {
    // 消息体解析失败
    sendRegisterAck(connInfo, message.header.msgSeq, REGISTER_RESULT.NO_TERMINAL, '')
    return
  }

  console.log(`[JT808] 终端注册请求:`, {
    deviceId: message.header.deviceId,
    plateNo: registerInfo.plateNo,
    manufacturer: registerInfo.manufacturerId,
    model: registerInfo.terminalModel,
    terminalId: registerInfo.terminalId
  })

  // 默认处理: 生成鉴权码并返回成功
  let result: number = REGISTER_RESULT.SUCCESS
  let authCode = generateAuthCode(message.header.deviceId)

  // 如果设置了回调，调用回调进行自定义处理
  if (onRegister) {
    try {
      const response = await onRegister(message.header.deviceId, registerInfo, authCode)
      if (!response.success) {
        result = response.result ?? REGISTER_RESULT.NO_TERMINAL
        authCode = ''
      } else if (response.authCode) {
        authCode = response.authCode
      }
    } catch (error) {
      console.error('[JT808] 注册回调错误:', error)
      result = REGISTER_RESULT.NO_TERMINAL
      authCode = ''
    }
  }

  // 发送注册应答
  sendRegisterAck(connInfo, message.header.msgSeq, result, authCode)

  // 触发服务器事件
  if (result === REGISTER_RESULT.SUCCESS) {
    server.emit('register', {
      deviceId: message.header.deviceId,
      registerInfo,
      authCode
    })
  }
}

/**
 * 发送注册应答
 */
function sendRegisterAck(
  connInfo: ConnectionInfo,
  ackSeq: number,
  result: number,
  authCode: string
): void {
  const msgSeq = getNextMsgSeq()
  const response = buildRegisterAck(
    connInfo.deviceId,
    msgSeq,
    ackSeq,
    result,
    authCode,
    connInfo.is2019
  )
  connInfo.socket.write(response)
}

/**
 * 生成鉴权码
 */
function generateAuthCode(deviceId: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 4)
  return `${deviceId.slice(-6)}_${timestamp}_${random}`
}

// 消息流水号计数器
let msgSeqCounter = 0
function getNextMsgSeq(): number {
  msgSeqCounter = (msgSeqCounter + 1) % 65536
  return msgSeqCounter
}

// 注册处理器
registerHandler(MSG_ID.TERMINAL_REGISTER, handleRegister)

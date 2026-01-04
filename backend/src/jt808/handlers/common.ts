/**
 * 通用消息处理
 * 处理终端注销、通用应答等
 */

import { MSG_ID, ACK_RESULT } from '../constants'
import { JT808Message, buildGeneralAck } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'
import { registerHandler } from './index'

// 终端注销回调
export type LogoutCallback = (deviceId: string) => Promise<void> | void

// 终端应答回调
export type TerminalAckCallback = (
  deviceId: string,
  ackSeq: number,
  ackMsgId: number,
  result: number
) => Promise<void> | void

let onLogout: LogoutCallback | null = null
let onTerminalAck: TerminalAckCallback | null = null

/**
 * 设置注销回调
 */
export function setLogoutCallback(callback: LogoutCallback): void {
  onLogout = callback
}

/**
 * 设置终端应答回调
 */
export function setTerminalAckCallback(callback: TerminalAckCallback): void {
  onTerminalAck = callback
}

/**
 * 处理终端注销 (0x0003)
 */
async function handleLogout(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  console.log(`[JT808] 终端注销: ${message.header.deviceId}`)

  // 发送通用应答
  sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_LOGOUT, ACK_RESULT.SUCCESS)

  // 调用回调
  if (onLogout) {
    try {
      await onLogout(message.header.deviceId)
    } catch (error) {
      console.error('[JT808] 注销回调错误:', error)
    }
  }

  // 触发事件
  server.emit('logout', {
    deviceId: message.header.deviceId
  })

  // 断开连接
  setTimeout(() => {
    connInfo.socket.end()
  }, 100)
}

/**
 * 处理终端通用应答 (0x0001)
 */
async function handleTerminalAck(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  if (message.body.length < 5) {
    console.error('[JT808] 终端应答消息体长度不足')
    return
  }

  const ackSeq = message.body.readUInt16BE(0)
  const ackMsgId = message.body.readUInt16BE(2)
  const result = message.body.readUInt8(4)

  console.log(`[JT808] 终端应答: ${message.header.deviceId}`, {
    ackSeq,
    ackMsgId: `0x${ackMsgId.toString(16).padStart(4, '0')}`,
    result: getResultName(result)
  })

  // 调用回调
  if (onTerminalAck) {
    try {
      await onTerminalAck(message.header.deviceId, ackSeq, ackMsgId, result)
    } catch (error) {
      console.error('[JT808] 终端应答回调错误:', error)
    }
  }

  // 触发事件
  server.emit('terminalAck', {
    deviceId: message.header.deviceId,
    ackSeq,
    ackMsgId,
    result
  })
}

/**
 * 处理查询终端参数应答 (0x0104)
 */
async function handleQueryParamsAck(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  console.log(`[JT808] 查询终端参数应答: ${message.header.deviceId}`)

  // TODO: 解析参数列表

  server.emit('queryParamsAck', {
    deviceId: message.header.deviceId,
    body: message.body
  })
}

/**
 * 处理位置信息查询应答 (0x0201)
 */
async function handleLocationQueryAck(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  console.log(`[JT808] 位置查询应答: ${message.header.deviceId}`)

  if (message.body.length < 30) {
    console.error('[JT808] 位置查询应答消息体长度不足')
    return
  }

  // 应答流水号 (2字节) + 位置信息 (28+字节)
  const ackSeq = message.body.readUInt16BE(0)
  const locationBody = message.body.subarray(2)

  server.emit('locationQueryAck', {
    deviceId: message.header.deviceId,
    ackSeq,
    locationBody
  })
}

/**
 * 获取结果名称
 */
function getResultName(result: number): string {
  const names: Record<number, string> = {
    [ACK_RESULT.SUCCESS]: '成功',
    [ACK_RESULT.FAILURE]: '失败',
    [ACK_RESULT.MSG_ERROR]: '消息有误',
    [ACK_RESULT.NOT_SUPPORTED]: '不支持',
    [ACK_RESULT.ALARM_CONFIRMED]: '报警已确认'
  }
  return names[result] || `未知(${result})`
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
registerHandler(MSG_ID.TERMINAL_LOGOUT, handleLogout)
registerHandler(MSG_ID.TERMINAL_GENERAL_ACK, handleTerminalAck)
registerHandler(MSG_ID.QUERY_PARAMS_ACK, handleQueryParamsAck)
registerHandler(MSG_ID.LOCATION_QUERY_ACK, handleLocationQueryAck)

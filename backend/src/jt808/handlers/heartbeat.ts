/**
 * 终端心跳处理器 (0x0002)
 */

import { MSG_ID, ACK_RESULT } from '../constants'
import { JT808Message, buildGeneralAck } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'
import { registerHandler } from './index'

// 心跳回调类型
export type HeartbeatCallback = (deviceId: string, time: Date) => Promise<void> | void

// 心跳回调
let onHeartbeat: HeartbeatCallback | null = null

/**
 * 设置心跳回调
 */
export function setHeartbeatCallback(callback: HeartbeatCallback): void {
  onHeartbeat = callback
}

/**
 * 处理终端心跳
 */
async function handleHeartbeat(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<void> {
  const now = new Date()

  console.log(`[JT808] 终端心跳: ${message.header.deviceId}`)

  // 更新最后心跳时间
  connInfo.lastHeartbeat = now

  // 发送通用应答
  sendGeneralAck(connInfo, message.header.msgSeq, MSG_ID.TERMINAL_HEARTBEAT, ACK_RESULT.SUCCESS)

  // 调用回调
  if (onHeartbeat) {
    try {
      await onHeartbeat(message.header.deviceId, now)
    } catch (error) {
      console.error('[JT808] 心跳回调错误:', error)
    }
  }

  // 触发服务器事件
  server.emit('heartbeat', {
    deviceId: message.header.deviceId,
    time: now
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
registerHandler(MSG_ID.TERMINAL_HEARTBEAT, handleHeartbeat)

/**
 * JT/T 808 消息处理器注册中心
 * 统一管理所有消息处理器
 */

import { JT808Message } from '../parser'
import { ConnectionInfo, JT808Server } from '../server'

// 处理器函数类型
export type MessageHandler = (
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
) => Promise<void> | void

// 处理器注册表
const handlers: Map<number, MessageHandler> = new Map()

/**
 * 注册消息处理器
 */
export function registerHandler(msgId: number, handler: MessageHandler): void {
  handlers.set(msgId, handler)
}

/**
 * 获取消息处理器
 */
export function getHandler(msgId: number): MessageHandler | undefined {
  return handlers.get(msgId)
}

/**
 * 处理消息
 */
export async function handleMessage(
  server: JT808Server,
  connInfo: ConnectionInfo,
  message: JT808Message
): Promise<boolean> {
  const handler = handlers.get(message.header.msgId)
  if (handler) {
    await handler(server, connInfo, message)
    return true
  }
  return false
}

// 导出所有处理器
export * from './register'
export * from './auth'
export * from './heartbeat'
export * from './location'
export * from './common'

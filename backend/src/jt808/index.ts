/**
 * JT/T 808 协议模块
 * 道路运输车辆卫星定位系统终端通讯协议
 */

// 导出常量
export * from './constants'

// 导出解析器
export * from './parser'

// 导出服务器
export {
  JT808Server,
  JT808ServerConfig,
  ConnectionInfo,
  getJT808Server,
  createJT808Server
} from './server'

// 导出处理器
export {
  registerHandler,
  getHandler,
  handleMessage,
  setRegisterCallback,
  setAuthCallback,
  setHeartbeatCallback,
  setLocationCallback,
  setAlarmCallback,
  setLogoutCallback,
  setTerminalAckCallback,
  LocationExtras,
  AlarmInfo,
  parseStatus
} from './handlers'

// 初始化函数 - 加载所有处理器
export function initJT808(): void {
  // 导入处理器模块会自动注册
  require('./handlers/register')
  require('./handlers/auth')
  require('./handlers/heartbeat')
  require('./handlers/location')
  require('./handlers/common')

  console.log('[JT808] 协议模块已初始化')
}

// 快速启动函数
export async function startJT808Server(
  port: number = 8808,
  callbacks?: {
    onLocation?: (deviceId: string, location: any, extras: any) => void
    onAlarm?: (deviceId: string, alarms: any[], location: any) => void
    onRegister?: (deviceId: string, info: any, authCode: string) => void
    onAuth?: (deviceId: string, authCode: string) => void
    onHeartbeat?: (deviceId: string, time: Date) => void
    onLogout?: (deviceId: string) => void
  }
): Promise<JT808Server> {
  const { JT808Server } = await import('./server')
  const {
    setLocationCallback,
    setAlarmCallback,
    setRegisterCallback,
    setAuthCallback,
    setHeartbeatCallback,
    setLogoutCallback
  } = await import('./handlers')

  // 初始化协议模块
  initJT808()

  // 设置回调
  if (callbacks?.onLocation) {
    setLocationCallback(callbacks.onLocation)
  }
  if (callbacks?.onAlarm) {
    setAlarmCallback(callbacks.onAlarm)
  }
  if (callbacks?.onRegister) {
    setRegisterCallback(async (deviceId, info, authCode) => {
      callbacks.onRegister!(deviceId, info, authCode)
      return { success: true, authCode }
    })
  }
  if (callbacks?.onAuth) {
    setAuthCallback(async (deviceId, authCode) => {
      callbacks.onAuth!(deviceId, authCode)
      return true
    })
  }
  if (callbacks?.onHeartbeat) {
    setHeartbeatCallback(callbacks.onHeartbeat)
  }
  if (callbacks?.onLogout) {
    setLogoutCallback(callbacks.onLogout)
  }

  // 创建并启动服务器
  const server = new JT808Server({ port })
  await server.start()

  return server
}

// 默认导出
import { JT808Server } from './server'
export default JT808Server

/**
 * JT/T 1078 协议常量定义
 * JT/T 1078-2016 道路运输车辆卫星定位系统 视频通信协议
 */

// 帧头标识 (4字节: 0x30 0x31 0x63 0x64 = "01cd")
export const FRAME_HEAD_FLAG = 0x30316364

// 数据类型 (高4位)
export const DATA_TYPE = {
  I_FRAME: 0x00,      // I帧 (关键帧)
  P_FRAME: 0x01,      // P帧 (预测帧)
  B_FRAME: 0x02,      // B帧 (双向预测帧)
  AUDIO: 0x03,        // 音频帧
  TRANSPARENT: 0x04,  // 透传数据
} as const

// 分包标识 (低4位)
export const SUBPACKAGE_FLAG = {
  ATOMIC: 0x00,       // 原子包 (不分包)
  FIRST: 0x01,        // 第一个分包
  LAST: 0x02,         // 最后一个分包
  MIDDLE: 0x03,       // 中间分包
} as const

// 负载类型 (PT)
export const PAYLOAD_TYPE = {
  // 视频
  H264: 98,           // H.264
  H265: 99,           // H.265 (HEVC)
  AVS: 100,           // AVS

  // 音频
  G711A: 6,           // G.711 A律
  G711U: 7,           // G.711 μ律
  G726: 8,            // G.726
  G729: 9,            // G.729
  AAC: 19,            // AAC
  MP3: 25,            // MP3
  ADPCMA: 26,         // ADPCM A律
} as const

// 逻辑通道号
export const CHANNEL = {
  CH1: 1,   // 驾驶员 / 前方
  CH2: 2,   // 车辆正前方
  CH3: 3,   // 车前门
  CH4: 4,   // 车厢前部
  CH5: 5,   // 车厢后部
  CH6: 6,   // 车后门
  CH7: 7,   // 车辆正后方
  CH8: 8,   // 车厢中部
  CH9: 9,   // 左前门
  CH10: 10, // 右前门
  CH11: 11, // 左后门
  CH12: 12, // 右后门
  CH13: 13, // 驾驶席车门
  CH14: 14, // 通道14
  CH15: 15, // 通道15
  CH16: 16, // 通道16
  CH33: 33, // 驾驶员 (网约车)
  CH36: 36, // 车辆正前方 (网约车)
  CH37: 37, // 车辆正后方 (网约车)
} as const

// 通道名称
export const CHANNEL_NAMES: Record<number, string> = {
  1: '前方摄像头',
  2: '后方摄像头',
  3: '驾驶室',
  4: 'DSM',
  5: 'ADAS',
  6: '备用1',
  7: '备用2',
  8: '备用3',
  9: '备用4',
}

// 消息ID (JT808扩展)
export const MSG_ID = {
  // 终端 -> 平台
  AUDIO_VIDEO_UPLOAD: 0x0800,        // 多媒体事件信息上传
  AUDIO_VIDEO_DATA_UPLOAD: 0x0801,   // 多媒体数据上传
  STORED_MEDIA_RETRIEVAL_ACK: 0x0802, // 存储多媒体数据检索应答

  // 平台 -> 终端
  REALTIME_AUDIO_VIDEO_REQUEST: 0x9101,  // 实时音视频传输请求
  AUDIO_VIDEO_CONTROL: 0x9102,           // 音视频实时传输控制
  REALTIME_AUDIO_VIDEO_STATUS: 0x9105,   // 实时音视频传输状态通知
  AUDIO_VIDEO_LIST_QUERY: 0x9201,        // 查询资源列表
  HISTORICAL_AUDIO_VIDEO_REQUEST: 0x9202, // 历史音视频回放请求
  AUDIO_VIDEO_PLAYBACK_CONTROL: 0x9203,  // 音视频回放控制
  AUDIO_VIDEO_DOWNLOAD_REQUEST: 0x9205,  // 音视频下载请求
  AUDIO_VIDEO_UPLOAD_COMMAND: 0x9206,    // 音视频上传指令
} as const

// 音视频请求控制指令
export const AV_CONTROL = {
  CLOSE_ALL: 0,           // 关闭音视频传输
  CLOSE_VIDEO: 1,         // 关闭视频, 保留音频
  CLOSE_AUDIO: 2,         // 关闭音频, 保留视频
  CLOSE_BIDIRECTIONAL: 3, // 关闭双向对讲
} as const

// 音视频类型
export const AV_TYPE = {
  AUDIO_VIDEO: 0, // 音视频
  VIDEO_ONLY: 1,  // 仅视频
  AUDIO_ONLY: 2,  // 仅音频 (双向对讲)
  INTERCOM: 3,    // 监听
} as const

// 码流类型
export const STREAM_TYPE = {
  MAIN: 0,        // 主码流
  SUB: 1,         // 子码流
} as const

// 帧头长度
export const FRAME_HEADER_LENGTH = 30

// 默认端口
export const DEFAULT_PORT = 1078

// 最大帧大小 (2MB)
export const MAX_FRAME_SIZE = 2 * 1024 * 1024

// 连接超时 (30秒)
export const CONNECTION_TIMEOUT = 30000

// 心跳间隔 (10秒)
export const HEARTBEAT_INTERVAL = 10000

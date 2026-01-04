/**
 * JT/T 808 协议常量定义
 * 参考标准: JT/T 808-2019 道路运输车辆卫星定位系统终端通讯协议及数据格式
 */

// 帧标识
export const FRAME_DELIMITER = 0x7e

// 消息ID定义
export const MSG_ID = {
  // ========== 终端上行消息 ==========
  // 终端通用应答
  TERMINAL_GENERAL_ACK: 0x0001,
  // 终端心跳
  TERMINAL_HEARTBEAT: 0x0002,
  // 终端注销
  TERMINAL_LOGOUT: 0x0003,
  // 终端注册
  TERMINAL_REGISTER: 0x0100,
  // 终端注册注销
  TERMINAL_UNREGISTER: 0x0101,
  // 终端鉴权
  TERMINAL_AUTH: 0x0102,
  // 查询终端参数应答
  QUERY_PARAMS_ACK: 0x0104,
  // 查询终端属性应答
  QUERY_ATTRS_ACK: 0x0107,
  // 终端升级结果通知
  UPGRADE_RESULT: 0x0108,
  // 位置信息汇报
  LOCATION_REPORT: 0x0200,
  // 位置信息查询应答
  LOCATION_QUERY_ACK: 0x0201,
  // 事件报告
  EVENT_REPORT: 0x0301,
  // 提问应答
  QUESTION_ACK: 0x0302,
  // 信息点播/取消
  INFO_DEMAND: 0x0303,
  // 车辆控制应答
  VEHICLE_CONTROL_ACK: 0x0500,
  // 行驶记录数据上传
  DRIVING_RECORD_UPLOAD: 0x0700,
  // 电子运单上报
  WAYBILL_REPORT: 0x0701,
  // 驾驶员身份信息采集上报
  DRIVER_ID_REPORT: 0x0702,
  // 定位数据批量上传
  LOCATION_BATCH_UPLOAD: 0x0704,
  // CAN总线数据上传
  CAN_DATA_UPLOAD: 0x0705,
  // 多媒体事件信息上传
  MEDIA_EVENT_UPLOAD: 0x0800,
  // 多媒体数据上传
  MEDIA_DATA_UPLOAD: 0x0801,
  // 存储多媒体数据检索应答
  MEDIA_QUERY_ACK: 0x0802,
  // 摄像头立即拍摄命令应答
  CAMERA_SHOT_ACK: 0x0805,
  // 数据上行透传
  DATA_UPLINK: 0x0900,
  // 数据压缩上报
  DATA_COMPRESSED: 0x0901,
  // 终端RSA公钥
  TERMINAL_RSA_KEY: 0x0a00,

  // ========== 平台下行消息 ==========
  // 平台通用应答
  PLATFORM_GENERAL_ACK: 0x8001,
  // 补传分包请求
  RESEND_PACKET_REQ: 0x8003,
  // 终端注册应答
  REGISTER_ACK: 0x8100,
  // 设置终端参数
  SET_PARAMS: 0x8103,
  // 查询终端参数
  QUERY_PARAMS: 0x8104,
  // 终端控制
  TERMINAL_CONTROL: 0x8105,
  // 查询指定终端参数
  QUERY_SPECIFIC_PARAMS: 0x8106,
  // 查询终端属性
  QUERY_ATTRS: 0x8107,
  // 下发终端升级包
  UPGRADE_PACKAGE: 0x8108,
  // 位置信息查询
  LOCATION_QUERY: 0x8201,
  // 临时位置跟踪控制
  TEMP_LOCATION_TRACK: 0x8202,
  // 人工确认报警消息
  CONFIRM_ALARM: 0x8203,
  // 链路检测
  LINK_TEST: 0x8204,
  // 文本信息下发
  TEXT_MESSAGE: 0x8300,
  // 事件设置
  EVENT_SET: 0x8301,
  // 提问下发
  QUESTION_SEND: 0x8302,
  // 信息点播菜单设置
  INFO_MENU_SET: 0x8303,
  // 信息服务
  INFO_SERVICE: 0x8304,
  // 电话回拨
  PHONE_CALLBACK: 0x8400,
  // 设置电话本
  SET_PHONEBOOK: 0x8401,
  // 车辆控制
  VEHICLE_CONTROL: 0x8500,
  // 设置圆形区域
  SET_CIRCLE_AREA: 0x8600,
  // 删除圆形区域
  DEL_CIRCLE_AREA: 0x8601,
  // 设置矩形区域
  SET_RECT_AREA: 0x8602,
  // 删除矩形区域
  DEL_RECT_AREA: 0x8603,
  // 设置多边形区域
  SET_POLYGON_AREA: 0x8604,
  // 删除多边形区域
  DEL_POLYGON_AREA: 0x8605,
  // 设置路线
  SET_ROUTE: 0x8606,
  // 删除路线
  DEL_ROUTE: 0x8607,
  // 行驶记录数据采集命令
  DRIVING_RECORD_CMD: 0x8700,
  // 行驶记录参数下传命令
  DRIVING_RECORD_PARAMS: 0x8701,
  // 上报驾驶员身份信息请求
  DRIVER_ID_REQUEST: 0x8702,
  // 多媒体数据上传应答
  MEDIA_UPLOAD_ACK: 0x8800,
  // 摄像头立即拍摄命令
  CAMERA_SHOT_CMD: 0x8801,
  // 存储多媒体数据检索
  MEDIA_QUERY: 0x8802,
  // 存储多媒体数据上传
  MEDIA_UPLOAD: 0x8803,
  // 录音开始命令
  RECORD_START: 0x8804,
  // 单条存储多媒体数据检索上传命令
  SINGLE_MEDIA_UPLOAD: 0x8805,
  // 数据下行透传
  DATA_DOWNLINK: 0x8900,
  // 平台RSA公钥
  PLATFORM_RSA_KEY: 0x8a00,
} as const

// 注册结果
export const REGISTER_RESULT = {
  SUCCESS: 0,           // 成功
  VEHICLE_REGISTERED: 1, // 车辆已被注册
  NO_VEHICLE: 2,        // 数据库中无该车辆
  TERMINAL_REGISTERED: 3, // 终端已被注册
  NO_TERMINAL: 4,       // 数据库中无该终端
} as const

// 通用应答结果
export const ACK_RESULT = {
  SUCCESS: 0,           // 成功/确认
  FAILURE: 1,           // 失败
  MSG_ERROR: 2,         // 消息有误
  NOT_SUPPORTED: 3,     // 不支持
  ALARM_CONFIRMED: 4,   // 报警处理确认
} as const

// 报警标志位 (32位)
export const ALARM_FLAG = {
  EMERGENCY: 0x00000001,              // bit0: 紧急报警
  OVERSPEED: 0x00000002,              // bit1: 超速报警
  FATIGUE: 0x00000004,                // bit2: 疲劳驾驶报警
  DANGER_WARNING: 0x00000008,         // bit3: 危险预警
  GNSS_FAULT: 0x00000010,             // bit4: GNSS模块发生故障
  GNSS_ANTENNA_CUT: 0x00000020,       // bit5: GNSS天线未接或被剪断
  GNSS_ANTENNA_SHORT: 0x00000040,     // bit6: GNSS天线短路
  MAIN_POWER_LOW: 0x00000080,         // bit7: 终端主电源欠压
  MAIN_POWER_OFF: 0x00000100,         // bit8: 终端主电源掉电
  LCD_FAULT: 0x00000200,              // bit9: 终端LCD或显示器故障
  TTS_FAULT: 0x00000400,              // bit10: TTS模块故障
  CAMERA_FAULT: 0x00000800,           // bit11: 摄像头故障
  IC_CARD_FAULT: 0x00001000,          // bit12: 道路运输证IC卡模块故障
  OVERSPEED_WARNING: 0x00002000,      // bit13: 超速预警
  FATIGUE_WARNING: 0x00004000,        // bit14: 疲劳驾驶预警
  // bit15-17: 保留
  DRIVING_TIMEOUT_DAY: 0x00040000,    // bit18: 当天累计驾驶超时
  PARKING_TIMEOUT: 0x00080000,        // bit19: 超时停车
  ENTER_EXIT_AREA: 0x00100000,        // bit20: 进出区域
  ENTER_EXIT_ROUTE: 0x00200000,       // bit21: 进出路线
  ROUTE_TIME_ERROR: 0x00400000,       // bit22: 路段行驶时间不足/过长
  ROUTE_DEVIATION: 0x00800000,        // bit23: 路线偏离报警
  VSS_FAULT: 0x01000000,              // bit24: 车辆VSS故障
  FUEL_ABNORMAL: 0x02000000,          // bit25: 车辆油量异常
  VEHICLE_STOLEN: 0x04000000,         // bit26: 车辆被盗
  ILLEGAL_IGNITION: 0x08000000,       // bit27: 车辆非法点火
  ILLEGAL_DISPLACEMENT: 0x10000000,   // bit28: 车辆非法位移
  COLLISION_WARNING: 0x20000000,      // bit29: 碰撞预警
  ROLLOVER_WARNING: 0x40000000,       // bit30: 侧翻预警
  ILLEGAL_DOOR_OPEN: 0x80000000,      // bit31: 非法开门报警
} as const

// 状态标志位 (32位)
export const STATUS_FLAG = {
  ACC_ON: 0x00000001,                 // bit0: ACC开
  LOCATED: 0x00000002,                // bit1: 定位
  SOUTH_LAT: 0x00000004,              // bit2: 南纬
  WEST_LNG: 0x00000008,               // bit3: 西经
  OPERATING: 0x00000010,              // bit4: 运营状态
  LAT_LNG_ENCRYPTED: 0x00000020,      // bit5: 经纬度已加密
  // bit6-7: 保留
  HALF_LOAD: 0x00000100,              // bit8: 半载(客车)
  // bit9: 保留
  FULL_LOAD: 0x00000400,              // bit10: 满载
  OIL_CUT: 0x00000800,                // bit11: 油路断开
  POWER_CUT: 0x00001000,              // bit12: 电路断开
  DOOR_LOCKED: 0x00002000,            // bit13: 车门加锁
  FRONT_DOOR_OPEN: 0x00004000,        // bit14: 前门开
  MID_DOOR_OPEN: 0x00008000,          // bit15: 中门开
  BACK_DOOR_OPEN: 0x00010000,         // bit16: 后门开
  DRIVER_DOOR_OPEN: 0x00020000,       // bit17: 驾驶席门开
  OTHER_DOOR_OPEN: 0x00040000,        // bit18: 自定义
  GPS_LOCATED: 0x00080000,            // bit19: GPS定位
  BEIDOU_LOCATED: 0x00100000,         // bit20: 北斗定位
  GLONASS_LOCATED: 0x00200000,        // bit21: GLONASS定位
  GALILEO_LOCATED: 0x00400000,        // bit22: Galileo定位
  // bit23-31: 保留
} as const

// 位置附加信息ID
export const LOCATION_EXTRA_ID = {
  MILEAGE: 0x01,          // 里程 DWORD 1/10km
  FUEL: 0x02,             // 油量 WORD 1/10L
  SPEED: 0x03,            // 行驶记录功能获取的速度 WORD 1/10km/h
  ALARM_EVENT_ID: 0x04,   // 需要人工确认报警事件的ID WORD
  OVERSPEED_EXTRA: 0x11,  // 超速报警附加信息
  AREA_ROUTE_EXTRA: 0x12, // 进出区域/路线报警附加信息
  ROUTE_TIME_EXTRA: 0x13, // 路段行驶时间不足/过长报警附加信息
  EXTENDED_SIGNAL: 0x25,  // 扩展车辆信号状态位
  IO_STATUS: 0x2a,        // IO状态位
  ANALOG: 0x2b,           // 模拟量
  SIGNAL_STRENGTH: 0x30,  // 无线通信网络信号强度
  GNSS_SATELLITES: 0x31,  // GNSS定位卫星数
  CUSTOM_LENGTH: 0xe0,    // 后续自定义信息长度
} as const

// 报警类型名称映射
export const ALARM_TYPE_NAME: Record<number, string> = {
  [ALARM_FLAG.EMERGENCY]: '紧急报警',
  [ALARM_FLAG.OVERSPEED]: '超速报警',
  [ALARM_FLAG.FATIGUE]: '疲劳驾驶',
  [ALARM_FLAG.DANGER_WARNING]: '危险预警',
  [ALARM_FLAG.GNSS_FAULT]: 'GNSS模块故障',
  [ALARM_FLAG.GNSS_ANTENNA_CUT]: 'GNSS天线被剪断',
  [ALARM_FLAG.GNSS_ANTENNA_SHORT]: 'GNSS天线短路',
  [ALARM_FLAG.MAIN_POWER_LOW]: '主电源欠压',
  [ALARM_FLAG.MAIN_POWER_OFF]: '主电源掉电',
  [ALARM_FLAG.LCD_FAULT]: 'LCD故障',
  [ALARM_FLAG.TTS_FAULT]: 'TTS模块故障',
  [ALARM_FLAG.CAMERA_FAULT]: '摄像头故障',
  [ALARM_FLAG.DRIVING_TIMEOUT_DAY]: '当天累计驾驶超时',
  [ALARM_FLAG.PARKING_TIMEOUT]: '超时停车',
  [ALARM_FLAG.ENTER_EXIT_AREA]: '进出区域',
  [ALARM_FLAG.ENTER_EXIT_ROUTE]: '进出路线',
  [ALARM_FLAG.ROUTE_DEVIATION]: '路线偏离',
  [ALARM_FLAG.VSS_FAULT]: 'VSS故障',
  [ALARM_FLAG.FUEL_ABNORMAL]: '油量异常',
  [ALARM_FLAG.VEHICLE_STOLEN]: '车辆被盗',
  [ALARM_FLAG.ILLEGAL_IGNITION]: '非法点火',
  [ALARM_FLAG.ILLEGAL_DISPLACEMENT]: '非法位移',
  [ALARM_FLAG.COLLISION_WARNING]: '碰撞预警',
  [ALARM_FLAG.ROLLOVER_WARNING]: '侧翻预警',
}

// 消息属性
export interface MessageHeader {
  msgId: number           // 消息ID
  msgBodyAttr: number     // 消息体属性
  protocolVersion?: number // 协议版本 (2019版)
  deviceId: string        // 终端手机号
  msgSeq: number          // 消息流水号
  packageInfo?: {         // 分包信息
    total: number         // 总包数
    index: number         // 包序号
  }
}

// 位置信息
export interface LocationInfo {
  alarmFlag: number       // 报警标志
  status: number          // 状态
  latitude: number        // 纬度
  longitude: number       // 经度
  altitude: number        // 海拔(m)
  speed: number           // 速度(km/h)
  direction: number       // 方向(0-359)
  gpsTime: Date           // GPS时间
  extras?: Map<number, Buffer> // 附加信息
}

// 终端注册信息
export interface RegisterInfo {
  provinceId: number      // 省域ID
  cityId: number          // 市县域ID
  manufacturerId: string  // 制造商ID
  terminalModel: string   // 终端型号
  terminalId: string      // 终端ID
  plateColor: number      // 车牌颜色
  plateNo: string         // 车牌号
}

// 导出类型
export type MsgIdType = typeof MSG_ID[keyof typeof MSG_ID]
export type AlarmFlagType = typeof ALARM_FLAG[keyof typeof ALARM_FLAG]
export type StatusFlagType = typeof STATUS_FLAG[keyof typeof STATUS_FLAG]

/**
 * 导出和截图工具函数
 * GPS Vehicle Monitoring Platform
 */

import { ElMessage, ElLoading } from 'element-plus'

/**
 * 截图功能 - 将指定元素转换为图片并下载
 * @param element 要截图的DOM元素
 * @param filename 文件名（不含扩展名）
 * @param options 配置选项
 */
export async function captureScreenshot(
  element: HTMLElement | string,
  filename: string = 'screenshot',
  options: {
    format?: 'png' | 'jpeg'
    quality?: number
    backgroundColor?: string
  } = {}
): Promise<boolean> {
  const { format = 'png', quality = 0.92, backgroundColor = '#1e293b' } = options

  const loading = ElLoading.service({
    text: '正在生成截图...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 动态导入 html2canvas
    const html2canvas = (await import('html2canvas')).default

    // 获取目标元素
    const targetElement = typeof element === 'string'
      ? document.querySelector(element) as HTMLElement
      : element

    if (!targetElement) {
      throw new Error('截图目标元素不存在')
    }

    // 生成 canvas
    const canvas = await html2canvas(targetElement, {
      backgroundColor,
      scale: 2, // 提高清晰度
      useCORS: true, // 允许跨域图片
      logging: false
    })

    // 转换为图片并下载
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const dataUrl = canvas.toDataURL(mimeType, quality)

    // 创建下载链接
    const link = document.createElement('a')
    link.download = `${filename}_${formatDateTime(new Date())}.${format}`
    link.href = dataUrl
    link.click()

    loading.close()
    ElMessage.success('截图已保存')
    return true
  } catch (error) {
    loading.close()
    console.error('Screenshot error:', error)
    ElMessage.error('截图失败，请重试')
    return false
  }
}

/**
 * 导出数据为 Excel 文件
 * @param data 数据数组
 * @param columns 列配置
 * @param filename 文件名
 */
export async function exportToExcel(
  data: Record<string, any>[],
  columns: { key: string; title: string; width?: number }[],
  filename: string = 'export'
): Promise<boolean> {
  const loading = ElLoading.service({
    text: '正在导出数据...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 动态导入 xlsx
    const XLSX = await import('xlsx')

    // 构建表头
    const headers = columns.map(col => col.title)

    // 构建数据行
    const rows = data.map(item =>
      columns.map(col => item[col.key] ?? '')
    )

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // 设置列宽
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }))

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // 导出文件
    XLSX.writeFile(wb, `${filename}_${formatDateTime(new Date())}.xlsx`)

    loading.close()
    ElMessage.success('导出成功')
    return true
  } catch (error) {
    loading.close()
    console.error('Export error:', error)
    ElMessage.error('导出失败，请重试')
    return false
  }
}

/**
 * 导出数据为 CSV 文件
 * @param data 数据数组
 * @param columns 列配置
 * @param filename 文件名
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: { key: string; title: string }[],
  filename: string = 'export'
): boolean {
  try {
    // 构建 CSV 内容
    const headers = columns.map(col => `"${col.title}"`).join(',')
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key] ?? ''
        // 处理包含逗号或引号的值
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n') // 添加 BOM 支持中文

    // 创建 Blob 并下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${formatDateTime(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
    return true
  } catch (error) {
    console.error('CSV export error:', error)
    ElMessage.error('导出失败')
    return false
  }
}

/**
 * 导出轨迹数据为 KML 文件（可导入 Google Earth）
 * @param trackData 轨迹数据
 * @param vehicleInfo 车辆信息
 * @param filename 文件名
 */
export function exportToKML(
  trackData: { lng: number; lat: number; time?: string; speed?: number }[],
  vehicleInfo: { plateNo: string; driver?: string },
  filename: string = 'track'
): boolean {
  try {
    const coordinates = trackData
      .map(p => `${p.lng},${p.lat},0`)
      .join('\n')

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${vehicleInfo.plateNo} 轨迹</name>
    <description>车辆: ${vehicleInfo.plateNo}, 司机: ${vehicleInfo.driver || '未知'}</description>
    <Style id="trackStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>轨迹线路</name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
${coordinates}
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>起点</name>
      <Point>
        <coordinates>${trackData[0]?.lng},${trackData[0]?.lat},0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>终点</name>
      <Point>
        <coordinates>${trackData[trackData.length - 1]?.lng},${trackData[trackData.length - 1]?.lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${vehicleInfo.plateNo}_${formatDateTime(new Date())}.kml`
    link.click()
    URL.revokeObjectURL(url)

    ElMessage.success('KML导出成功')
    return true
  } catch (error) {
    console.error('KML export error:', error)
    ElMessage.error('KML导出失败')
    return false
  }
}

/**
 * 导出报警数据
 * @param alarms 报警数据数组
 * @param filename 文件名
 */
export async function exportAlarms(
  alarms: any[],
  filename: string = 'alarms'
): Promise<boolean> {
  const columns = [
    { key: 'plateNo', title: '车牌号', width: 12 },
    { key: 'driverName', title: '司机', width: 10 },
    { key: 'companyName', title: '公司', width: 15 },
    { key: 'alarmType', title: '报警类型', width: 15 },
    { key: 'riskLevel', title: '风险等级', width: 10 },
    { key: 'alarmCount', title: '报警次数', width: 10 },
    { key: 'location', title: '位置', width: 30 },
    { key: 'status', title: '状态', width: 10 },
    { key: 'alarmTime', title: '报警时间', width: 18 }
  ]

  return exportToExcel(alarms, columns, filename)
}

/**
 * 导出车辆列表
 * @param vehicles 车辆数据数组
 * @param filename 文件名
 */
export async function exportVehicles(
  vehicles: any[],
  filename: string = 'vehicles'
): Promise<boolean> {
  const columns = [
    { key: 'plateNo', title: '车牌号', width: 12 },
    { key: 'deviceId', title: '设备ID', width: 18 },
    { key: 'driverName', title: '司机', width: 10 },
    { key: 'phone', title: '联系电话', width: 15 },
    { key: 'groupName', title: '所属公司', width: 15 },
    { key: 'vehicleType', title: '车辆类型', width: 10 },
    { key: 'status', title: '状态', width: 10 },
    { key: 'lastOnlineTime', title: '最后在线时间', width: 18 }
  ]

  return exportToExcel(vehicles, columns, filename)
}

/**
 * 格式化日期时间
 * @param date 日期对象
 * @returns 格式化后的字符串 YYYYMMDD_HHmmss
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/**
 * 打印功能
 * @param element 要打印的元素
 * @param title 打印标题
 */
export function printElement(element: HTMLElement | string, title: string = '打印'): void {
  const targetElement = typeof element === 'string'
    ? document.querySelector(element) as HTMLElement
    : element

  if (!targetElement) {
    ElMessage.error('打印目标不存在')
    return
  }

  // 创建打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.error('无法打开打印窗口，请检查浏览器设置')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${targetElement.innerHTML}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

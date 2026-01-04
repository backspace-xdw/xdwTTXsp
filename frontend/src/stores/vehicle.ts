import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Vehicle, VehicleTreeNode, Company, GpsData } from '@/types'

export const useVehicleStore = defineStore('vehicle', () => {
  // 车辆列表
  const vehicles = ref<Vehicle[]>([])
  // 企业列表
  const companies = ref<Company[]>([])
  // 当前选中的车辆
  const selectedVehicle = ref<Vehicle | null>(null)
  // 当前选中的车辆IDs (多选)
  const selectedVehicleIds = ref<string[]>([])
  // GPS数据缓存
  const gpsDataMap = ref<Map<string, GpsData>>(new Map())

  // 计算车辆树结构
  const vehicleTree = computed<VehicleTreeNode[]>(() => {
    const buildTree = (companyList: Company[]): VehicleTreeNode[] => {
      return companyList.map(company => {
        const companyVehicles = vehicles.value.filter(v => v.companyId === company.id)
        const onlineCount = companyVehicles.filter(v => v.online).length

        const node: VehicleTreeNode = {
          id: `company-${company.id}`,
          label: `${company.name} (${onlineCount}/${companyVehicles.length})`,
          type: 'company',
          data: company,
          onlineCount,
          totalCount: companyVehicles.length,
          children: [
            // 子企业
            ...(company.children ? buildTree(company.children) : []),
            // 车辆
            ...companyVehicles.map(vehicle => ({
              id: `vehicle-${vehicle.id}`,
              label: vehicle.plateNo,
              type: 'vehicle' as const,
              data: vehicle
            }))
          ]
        }
        return node
      })
    }

    return buildTree(companies.value.filter(c => !c.parentId))
  })

  // 统计数据
  const stats = computed(() => {
    const total = vehicles.value.length
    const online = vehicles.value.filter(v => v.online).length
    const driving = vehicles.value.filter(v => v.status === 'driving').length
    const parkingAccOn = vehicles.value.filter(v => v.status === 'parking_acc_on').length
    const accOff = vehicles.value.filter(v => v.status === 'acc_off').length
    const alarm = vehicles.value.filter(v => v.status === 'alarm').length

    return {
      total,
      online,
      offline: total - online,
      driving,
      parkingAccOn,
      accOff,
      alarm,
      onlineRate: total > 0 ? ((online / total) * 100).toFixed(2) : '0.00'
    }
  })

  // 设置车辆列表
  const setVehicles = (data: Vehicle[]) => {
    vehicles.value = data
  }

  // 设置企业列表
  const setCompanies = (data: Company[]) => {
    companies.value = data
  }

  // 选择车辆
  const selectVehicle = (vehicle: Vehicle | null) => {
    selectedVehicle.value = vehicle
  }

  // 更新GPS数据
  const updateGpsData = (deviceId: string, data: GpsData) => {
    gpsDataMap.value.set(deviceId, data)
    // 同时更新车辆位置
    const vehicle = vehicles.value.find(v => v.deviceId === deviceId)
    if (vehicle) {
      vehicle.lat = data.lat
      vehicle.lng = data.lng
      vehicle.speed = data.speed
      vehicle.direction = data.direction
      vehicle.gpsTime = data.gpsTime
      vehicle.accStatus = data.accStatus
      vehicle.online = true
    }
  }

  // 更新车辆状态
  const updateVehicleStatus = (deviceId: string, online: boolean, status?: string) => {
    const vehicle = vehicles.value.find(v => v.deviceId === deviceId)
    if (vehicle) {
      vehicle.online = online
      if (status) {
        vehicle.status = status as any
      }
    }
  }

  return {
    vehicles,
    companies,
    selectedVehicle,
    selectedVehicleIds,
    gpsDataMap,
    vehicleTree,
    stats,
    setVehicles,
    setCompanies,
    selectVehicle,
    updateGpsData,
    updateVehicleStatus
  }
})

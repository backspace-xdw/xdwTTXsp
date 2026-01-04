import { request } from './request'
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types'

// 登录
export const login = (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  return request.post('/auth/login', data)
}

// 退出登录
export const logout = (): Promise<ApiResponse<null>> => {
  return request.post('/auth/logout')
}

// 获取当前用户信息
export const getCurrentUser = (): Promise<ApiResponse<any>> => {
  return request.get('/auth/user')
}

// 修改密码
export const changePassword = (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<null>> => {
  return request.post('/auth/change-password', data)
}

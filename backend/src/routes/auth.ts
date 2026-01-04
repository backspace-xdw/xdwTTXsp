import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = Router()

// 模拟用户数据 (实际项目应从数据库读取)
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    nickname: 'Admin',
    role: 'admin',
    companyId: 1,
    companyName: 'Monitoring Center'
  }
]

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Username and password are required'
      })
    }

    // 查找用户
    const user = mockUsers.find(u => u.username === username)

    // 模拟登录：接受任何6位以上密码
    if (!user && password.length >= 6) {
      // 创建模拟用户
      const mockUser = {
        id: Date.now(),
        username,
        nickname: username,
        role: 'user',
        companyId: 1,
        companyName: 'Monitoring Center'
      }

      const token = jwt.sign(
        { userId: mockUser.id, username: mockUser.username },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      )

      return res.json({
        code: 0,
        message: 'Login successful',
        data: {
          token,
          user: mockUser
        }
      })
    }

    if (user) {
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      )

      const { password: _, ...userWithoutPassword } = user

      return res.json({
        code: 0,
        message: 'Login successful',
        data: {
          token,
          user: userWithoutPassword
        }
      })
    }

    res.status(401).json({
      code: 401,
      message: 'Invalid credentials'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      code: 500,
      message: 'Internal server error'
    })
  }
})

// 退出登录
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    code: 0,
    message: 'Logout successful'
  })
})

// 获取当前用户信息
router.get('/user', (req: Request, res: Response) => {
  // 从token获取用户信息 (实际需要验证token)
  res.json({
    code: 0,
    data: {
      id: 1,
      username: 'admin',
      nickname: 'Admin',
      role: 'admin',
      companyId: 1,
      companyName: 'Monitoring Center'
    }
  })
})

export default router

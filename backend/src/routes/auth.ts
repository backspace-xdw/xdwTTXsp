import { Router, Request, Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { authMiddleware, AuthRequest } from '../middleware/auth'

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'
const JWT_OPTIONS: SignOptions = {
  expiresIn: '7d'
}

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

    const user = mockUsers.find(u => u.username === username)
    if (!user) {
      return res.status(401).json({ code: 401, message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ code: 401, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      JWT_OPTIONS
    )

    const { password: _, ...userWithoutPassword } = user

    return res.json({
      code: 0,
      message: 'Login successful',
      data: { token, user: userWithoutPassword }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ code: 500, message: 'Internal server error' })
  }
})

// 退出登录
router.post('/logout', (req: Request, res: Response) => {
  res.json({ code: 0, message: 'Logout successful' })
})

// 获取当前用户信息 (需要有效 token)
router.get('/user', authMiddleware, (req: AuthRequest, res: Response) => {
  const { userId, username } = req.user!
  const user = mockUsers.find(u => u.id === userId)
  if (user) {
    const { password: _, ...userWithoutPassword } = user
    return res.json({ code: 0, data: userWithoutPassword })
  }
  // token 有效但用户不存在 (可能已被删除)
  res.json({
    code: 0,
    data: { id: userId, username, nickname: username, role: 'user', companyId: 1, companyName: 'Monitoring Center' }
  })
})

export default router

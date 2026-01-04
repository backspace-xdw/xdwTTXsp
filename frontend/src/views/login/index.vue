<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="bg-overlay"></div>
    </div>

    <!-- 顶部标题 -->
    <div class="login-header">
      <div class="logo">
        <img src="@/assets/images/logo.png" alt="logo" v-if="false" />
        <span class="logo-icon">&#x1F6E1;</span>
        <span class="logo-text">主动安全云平台</span>
      </div>
      <div class="header-right">
        <span class="lang-switch" @click="toggleLang">{{ lang === 'en' ? '中文' : 'English' }}</span>
        <a href="#" class="api-link">API</a>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="login-main">
      <!-- 左侧宣传 -->
      <div class="login-left">
        <div class="slogan">
          <h2>智能安全管理</h2>
          <p>通过AI智能系统实现多维度、全流程的安全管理</p>
        </div>
        <div class="features">
          <div class="feature-item" v-for="i in 3" :key="i">
            <span class="feature-dot"></span>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-right">
        <div class="login-form-wrapper">
          <h1 class="welcome-title">欢迎登录</h1>

          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="login-form"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                prefix-icon="User"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                class="login-btn"
                size="large"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <!-- 底部下载区域 -->
    <div class="login-footer">
      <div class="download-list">
        <div class="download-item">
          <div class="download-info">
            <h3>Windows客户端</h3>
            <p>版本: 7.34.0.4</p>
            <p>更新: 20241104</p>
          </div>
          <el-button type="primary" size="small" circle>
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
        <div class="download-item">
          <div class="download-info">
            <h3>IOS客户端</h3>
            <p>版本: 1.10.5</p>
            <p>更新: 20241103</p>
          </div>
          <el-button type="primary" size="small" circle>
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
        <div class="download-item">
          <div class="download-info">
            <h3>Android客户端</h3>
            <p>版本: 6.7.4.16</p>
            <p>更新: 20240829</p>
          </div>
          <el-button type="primary" size="small" circle>
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
        <div class="download-item">
          <div class="download-info">
            <h3>回放工具</h3>
            <p>版本: 7.34.0.4</p>
            <p>更新: 20241031</p>
          </div>
          <el-button type="primary" size="small" circle>
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="copyright">
      <p>版权所有 (c) 2024. 保留所有权利.</p>
      <p class="version">版本: 7.34.0.4_20241104</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
// import { login } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const lang = ref('en')

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const toggleLang = () => {
  lang.value = lang.value === 'en' ? 'zh' : 'en'
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      // 模拟登录 - 实际项目中调用API
      // const res = await login(loginForm)

      // 模拟数据
      const mockUser = {
        id: 1,
        username: loginForm.username,
        nickname: '管理员',
        role: 'admin',
        companyId: 1,
        companyName: '监控中心'
      }
      const mockToken = 'mock-token-' + Date.now()

      userStore.setLogin(mockUser, mockToken)
      ElMessage.success('登录成功')
      router.push('/monitor')
    } catch (error) {
      console.error('Login error:', error)
      ElMessage.error('登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e88e5 100%);
  z-index: 0;

  .bg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></svg>');
    background-size: 200px;
    opacity: 0.5;
  }
}

.login-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  color: #fff;

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo-icon {
      font-size: 32px;
    }

    .logo-text {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 1px;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .lang-switch {
      cursor: pointer;
      padding: 4px 12px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      font-size: 13px;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .api-link {
      color: #fff;
      text-decoration: none;
      font-size: 14px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.login-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60px;
  gap: 100px;
}

.login-left {
  color: #fff;
  max-width: 500px;

  .slogan {
    h2 {
      font-size: 36px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    p {
      font-size: 16px;
      line-height: 1.6;
      opacity: 0.9;
    }
  }

  .features {
    display: flex;
    gap: 12px;
    margin-top: 30px;

    .feature-item {
      .feature-dot {
        display: block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);

        &:hover {
          background: #fff;
        }
      }
    }
  }
}

.login-right {
  .login-form-wrapper {
    width: 380px;
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

    .welcome-title {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin-bottom: 30px;
      text-align: center;
    }

    .login-form {
      .el-form-item {
        margin-bottom: 24px;
      }

      .login-btn {
        width: 100%;
        height: 44px;
        font-size: 16px;
      }
    }
  }
}

.login-footer {
  position: relative;
  z-index: 1;
  padding: 20px 60px;

  .download-list {
    display: flex;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;

    .download-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      min-width: 180px;

      .download-info {
        h3 {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        p {
          font-size: 12px;
          opacity: 0.8;
          margin: 2px 0;
        }
      }
    }
  }
}

.copyright {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;

  .version {
    margin-top: 4px;
    opacity: 0.6;
  }
}

// 响应式
@media (max-width: 992px) {
  .login-main {
    flex-direction: column;
    gap: 40px;
    padding: 20px;
  }

  .login-left {
    text-align: center;

    .slogan h2 {
      font-size: 28px;
    }

    .features {
      justify-content: center;
    }
  }

  .login-right .login-form-wrapper {
    width: 100%;
    max-width: 380px;
  }
}

@media (max-width: 768px) {
  .login-footer .download-list {
    gap: 16px;

    .download-item {
      min-width: 150px;
      padding: 12px 16px;
    }
  }
}
</style>

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/monitor',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: 'Dashboard', icon: 'dashboard' }
      },
      {
        path: 'monitor',
        name: 'Monitor',
        component: () => import('@/views/monitor/index.vue'),
        meta: { title: 'Monitor', icon: 'monitor' }
      },
      {
        path: 'group-mon',
        name: 'GroupMon',
        component: () => import('@/views/group-mon/index.vue'),
        meta: { title: 'Group Mon', icon: 'group' }
      },
      {
        path: 'ai-safe',
        name: 'AISafe',
        component: () => import('@/views/ai-safe/index.vue'),
        meta: { title: 'AI Safe', icon: 'ai-safe' }
      },
      {
        path: 'replay',
        name: 'Replay',
        component: () => import('@/views/replay/index.vue'),
        meta: { title: 'Replay', icon: 'replay' }
      },
      {
        path: 'multi-track',
        name: 'MultiTrack',
        component: () => import('@/views/multi-video/index.vue'),
        meta: { title: '多车轨迹', icon: 'track' }
      },
      {
        path: 'safety-manage',
        name: 'SafetyManage',
        component: () => import('@/views/safety-manage/index.vue'),
        meta: { title: '安全管理', icon: 'safety' }
      },
      {
        path: 'safety-edu',
        name: 'SafetyEdu',
        component: () => import('@/views/safety-edu/index.vue'),
        meta: { title: 'Safety Edu', icon: 'education' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/index.vue'),
        meta: { title: 'Reports', icon: 'reports' }
      },
      {
        path: 'operations',
        name: 'Operations',
        component: () => import('@/views/operations/index.vue'),
        meta: { title: 'Operations', icon: 'operations' }
      },
      {
        path: 'rules',
        name: 'Rules',
        component: () => import('@/views/rules/index.vue'),
        meta: { title: 'Rules', icon: 'rules' }
      },
      {
        path: 'server',
        name: 'Server',
        component: () => import('@/views/server/index.vue'),
        meta: { title: 'Server', icon: 'server' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/monitor')
  } else {
    next()
  }
})

export default router

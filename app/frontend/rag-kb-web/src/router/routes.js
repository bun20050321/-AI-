import { ROLES } from '@/api/auth.js'

export const routes = [
  {
    path: '/',
    name: 'user-home',
    component: () => import('@/views/UserPage.vue'),
    meta: { label: '用户端', icon: 'HomeFilled' }
  },
  {
    path: '/repair',
    name: 'my-repair',
    component: () => import('@/views/MyRepair.vue'),
    meta: { label: '我的维修', icon: 'Tools' }
  },
  {
    path: '/orders',
    name: 'repair-orders',
    component: () => import('@/views/RepairOrders.vue'),
    meta: {
      label: '维修工单',
      icon: 'Tools',
      requireRole: ROLES.STAFF  // 仅员工可访问
    }
  },
  {
    path: '/documents',
    name: 'knowledge-docs',
    component: () => import('@/views/KnowledgeDocs.vue'),
    meta: { label: '知识文档', icon: 'Document' }
  },
  {
    path: '/ai',
    name: 'ai-chat',
    component: () => import('@/views/AiChat.vue'),
    meta: { label: 'AI 问答', icon: 'ChatDotRound' }
  }
]

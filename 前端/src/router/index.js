import { createRouter, createWebHistory } from 'vue-router'

export const routes = [
  {
    path: '/',
    redirect: '/repair-orders'
  },
  {
    path: '/repair-orders',
    name: 'RepairOrders',
    component: () => import('@/views/RepairOrders.vue')
  },
  {
    path: '/knowledge-docs',
    name: 'KnowledgeDocs',
    component: () => import('@/views/KnowledgeDocs.vue')
  },
  {
    path: '/ai-chat',
    name: 'AiChat',
    component: () => import('@/views/AiQuestion.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/repair-orders'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

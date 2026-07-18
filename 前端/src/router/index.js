import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'User',
    component: () => import('@/views/UserPage.vue')
  },
  {
    path: '/repair',
    name: 'MyRepair',
    component: () => import('@/views/MyRepair.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

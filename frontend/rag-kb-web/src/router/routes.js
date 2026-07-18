import RepairOrders from '../views/RepairOrders.vue'
import KnowledgeDocs from '../views/KnowledgeDocs.vue'
import AiChat from '../views/AiChat.vue'

export const routes = [
  {
    path: '/',
    name: 'repair-orders',
    component: RepairOrders,
    meta: {
      label: '维修工单'
    }
  },
  {
    path: '/documents',
    name: 'knowledge-docs',
    component: KnowledgeDocs,
    meta: {
      label: '知识文档'
    }
  },
  {
    path: '/ai',
    name: 'ai-chat',
    component: AiChat,
    meta: {
      label: 'AI 问答'
    }
  }
]

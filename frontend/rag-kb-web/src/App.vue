<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ChatDotRound, Document, Refresh, Tools } from '@element-plus/icons-vue'
import { checkBackendHealth } from './api/health.js'
import { routes } from './router/routes.js'

const router = useRouter()
const route = useRoute()
const health = ref({
  connected: false,
  message: '正在检查后端服务',
  data: null
})
const loadingHealth = ref(false)

const menuItems = computed(() =>
  routes.map((item) => ({
    ...item,
    icon: item.name === 'repair-orders' ? Tools : item.name === 'knowledge-docs' ? Document : ChatDotRound
  }))
)

const activePath = computed(() => route.path)
const healthType = computed(() => (health.value.connected ? 'success' : 'danger'))
const healthDetail = computed(() => {
  if (!health.value.data) {
    return ''
  }

  if (typeof health.value.data === 'string') {
    return health.value.data
  }

  return JSON.stringify(health.value.data)
})

async function refreshHealth() {
  loadingHealth.value = true
  health.value = await checkBackendHealth()
  loadingHealth.value = false
}

function navigate(path) {
  router.push(path)
}

onMounted(refreshHealth)
</script>

<template>
  <el-container class="app-shell">
    <el-aside class="app-sidebar" width="232px">
      <div class="brand-block">
        <div class="brand-mark">R</div>
        <div>
          <h1>rag-kb-web</h1>
          <p>维修知识库工作台</p>
        </div>
      </div>

      <el-menu class="entry-menu" :default-active="activePath" router>
        <el-menu-item
          v-for="item in menuItems"
          :key="item.name"
          :index="item.path"
          @click="navigate(item.path)"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.meta.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header" height="72px">
        <div>
          <p class="eyebrow">RAG Knowledge Base</p>
          <h2>{{ route.meta.label }}</h2>
        </div>

        <div class="health-panel">
          <el-tag :type="healthType" effect="light" round>
            {{ health.message }}
          </el-tag>
          <el-tooltip v-if="healthDetail" :content="healthDetail" placement="bottom">
            <span class="health-detail">响应详情</span>
          </el-tooltip>
          <el-button
            circle
            :loading="loadingHealth"
            :icon="Refresh"
            aria-label="刷新后端健康检查"
            @click="refreshHealth"
          />
        </div>
      </el-header>

      <el-main class="app-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

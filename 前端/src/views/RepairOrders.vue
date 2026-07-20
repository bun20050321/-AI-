<script setup>
import { computed, onMounted, ref } from 'vue'
import http from '@/utils/http'

const healthState = ref('loading')
const serviceName = ref('')

const healthText = computed(() => {
  if (healthState.value === 'connected') {
    return '后端服务已连接'
  }
  if (healthState.value === 'loading') {
    return '正在检查后端服务'
  }
  return '后端服务未连接'
})

function isValidHealthResponse(response) {
  return response?.code === 0
    && response.data !== null
    && typeof response.data === 'object'
    && typeof response.data.status === 'string'
    && response.data.status.trim().length > 0
}

onMounted(async () => {
  try {
    const response = await http.get('/api/health')
    if (!isValidHealthResponse(response)) {
      healthState.value = 'disconnected'
      return
    }

    healthState.value = 'connected'
    serviceName.value = typeof response.data.service === 'string'
      ? response.data.service
      : ''
  } catch {
    healthState.value = 'disconnected'
  }
})
</script>

<template>
  <section class="page-section">
    <header class="page-header">
      <p class="page-kicker">服务管理</p>
      <h1>维修工单</h1>
      <p>查看和处理电器维修事项。</p>
    </header>

    <section class="health-section" aria-labelledby="health-title">
      <div>
        <h2 id="health-title">系统连接状态</h2>
        <p v-if="serviceName" class="service-name">服务：{{ serviceName }}</p>
      </div>
      <p
        class="health-status"
        :class="`is-${healthState}`"
        data-testid="health-status"
        role="status"
      >
        <span class="status-dot" aria-hidden="true"></span>
        {{ healthText }}
      </p>
    </section>

    <div class="content-panel">
      <h2>工单概览</h2>
      <p>维修工单功能正在准备中。</p>
    </div>
  </section>
</template>

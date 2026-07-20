<template>
  <el-container class="app-shell">
    <el-aside class="app-sidebar" width="220px">
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
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.meta.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header" height="64px">
        <div>
          <h2>{{ route.meta.label }}</h2>
        </div>
        <div class="health-panel">
          <el-tag :type="healthType" effect="light" round size="small">
            <el-icon v-if="health.connected" class="is-loading"><CircleCheck /></el-icon>
            <el-icon v-else><CircleClose /></el-icon>
            {{ health.message }}
          </el-tag>
          <el-button circle size="small" :loading="loadingHealth" @click="refreshHealth">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </el-header>

      <el-main class="app-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, CircleCheck, CircleClose, HomeFilled, Tools, Document, ChatDotRound } from '@element-plus/icons-vue'
import { checkBackendHealth } from '@/api/health.js'
import { routes } from '@/router/routes.js'

const route = useRoute()
const health = ref({ connected: false, message: '正在检查...' })
const loadingHealth = ref(false)

const menuItems = computed(() =>
  routes.map((item) => ({
    ...item,
    icon: item.name === 'user-home' ? HomeFilled : item.name === 'my-repair' ? Tools : item.name === 'repair-orders' ? Tools : item.name === 'knowledge-docs' ? Document : ChatDotRound
  }))
)

const activePath = computed(() => route.path)
const healthType = computed(() => (health.value.connected ? 'success' : 'danger'))

async function refreshHealth() {
  loadingHealth.value = true
  health.value = await checkBackendHealth()
  loadingHealth.value = false
}

onMounted(refreshHealth)
</script>

<style>
.app-shell { min-height: 100vh; background: linear-gradient(135deg, rgba(28,120,95,0.08), transparent 38%), #f4f7fb; }
.app-sidebar { border-right: 1px solid #dce5ee; background: #fff; padding: 20px 14px; }
.brand-block { display: flex; align-items: center; gap: 12px; padding: 0 6px 22px; }
.brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 8px; background: #1c785f; color: #fff; font-weight: 800; font-size: 20px; }
.brand-block h1 { font-size: 18px; margin: 0; }
.brand-block p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
.entry-menu { border-right: 0; }
.entry-menu .el-menu-item { border-radius: 8px; margin: 4px 0; }
.app-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dce5ee; background: rgba(255,255,255,0.86); backdrop-filter: blur(8px); }
.app-header h2 { margin: 0; font-size: 20px; }
.health-panel { display: flex; align-items: center; gap: 10px; }
.app-main { padding: 24px; }
.workspace-page { max-width: 1200px; }
.page-heading { margin-bottom: 18px; }
.page-heading h3 { font-size: 24px; margin: 0 0 8px; }
.page-heading p { margin: 0; color: #64748b; font-size: 14px; }
</style>

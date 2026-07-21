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

      <!-- 导航菜单（根据角色过滤） -->
      <el-menu class="entry-menu" :default-active="activePath" router>
        <el-menu-item
          v-for="item in visibleMenus"
          :key="item.name"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.meta.label }}</span>
        </el-menu-item>
      </el-menu>

      <!-- 角色切换（仅开发测试用，后端完成后删除） -->
      <div class="role-debug" v-if="true">
        <el-divider />
        <p class="debug-label">当前角色: <strong>{{ isStaff ? '员工' : '用户' }}</strong></p>
        <el-button
          size="small"
          :type="isStaff ? 'default' : 'primary'"
          @click="switchRole(ROLES.USER)"
        >用户</el-button>
        <el-button
          size="small"
          :type="isStaff ? 'primary' : 'default'"
          @click="switchRole(ROLES.STAFF)"
        >员工</el-button>
        <p class="debug-tip">后端完成后删除此区域</p>
      </div>

      <!-- 用户信息 -->
      <div class="user-info" v-if="currentUser">
        <el-divider />
        <div class="user-card">
          <el-avatar :size="32" :icon="UserFilled" />
          <div class="user-detail">
            <span class="user-name">{{ currentUser.name }}</span>
            <el-tag :type="isStaff ? 'success' : 'info'" size="small">{{ isStaff ? '员工' : '用户' }}</el-tag>
          </div>
        </div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="app-header" height="64px">
        <div>
          <h2>{{ route.meta.label }}</h2>
        </div>
        <div class="header-right">
          <!-- 后端健康状态 -->
          <div class="health-panel">
            <el-tag :type="healthType" effect="light" round size="small">
              <el-icon v-if="health.connected"><CircleCheck /></el-icon>
              <el-icon v-else><CircleClose /></el-icon>
              {{ health.message }}
            </el-tag>
            <el-button circle size="small" :loading="loadingHealth" @click="refreshHealth">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main class="app-main">
        <!-- 无权限提示 -->
        <el-alert
          v-if="route.query.noPermission === '1'"
          title="您没有权限访问该页面"
          type="warning"
          description="维修工单页面仅对员工开放，如需访问请联系管理员"
          show-icon
          closable
          style="margin-bottom: 16px"
        />
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import {
  Refresh, CircleCheck, CircleClose,
  HomeFilled, Tools, Document, ChatDotRound, UserFilled
} from '@element-plus/icons-vue'
import { checkBackendHealth } from '@/api/health.js'
import { routes } from '@/router/routes.js'
import { useAuth } from '@/composables/useAuth.js'
import { ROLES } from '@/api/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { currentUser, isStaff, getVisibleMenus } = auth

const health = ref({ connected: false, message: '正在检查...' })
const loadingHealth = ref(false)

// 所有菜单项带图标
const allMenus = computed(() =>
  routes.map((item) => ({
    ...item,
    icon: item.path === '/' ? HomeFilled
      : item.path === '/repair' ? Tools
      : item.path === '/orders' ? Tools
      : item.path === '/documents' ? Document
      : ChatDotRound
  }))
)

// 根据角色过滤后的可见菜单
const visibleMenus = computed(() => getVisibleMenus(allMenus.value))

const activePath = computed(() => route.path)
const healthType = computed(() => (health.value.connected ? 'success' : 'danger'))

async function refreshHealth() {
  loadingHealth.value = true
  health.value = await checkBackendHealth()
  loadingHealth.value = false
}

// 切换角色（仅开发测试，后端完成后删除）
function switchRole(role) {
  localStorage.setItem('mock_role', role)
  location.reload()
}

onMounted(refreshHealth)
</script>

<style>
.app-shell { min-height: 100vh; background: linear-gradient(135deg, rgba(28,120,95,0.08), transparent 38%), #f4f7fb; }
.app-sidebar { border-right: 1px solid #dce5ee; background: #fff; padding: 20px 14px; display: flex; flex-direction: column; }
.brand-block { display: flex; align-items: center; gap: 12px; padding: 0 6px 22px; }
.brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 8px; background: #1c785f; color: #fff; font-weight: 800; font-size: 20px; }
.brand-block h1 { font-size: 18px; margin: 0; }
.brand-block p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
.entry-menu { border-right: 0; }
.entry-menu .el-menu-item { border-radius: 8px; margin: 4px 0; }

.role-debug { padding: 0 10px; margin-top: auto; }
.debug-label { font-size: 12px; color: #64748b; margin: 0 0 8px; }
.debug-label strong { color: #1c785f; }
.debug-tip { font-size: 10px; color: #f59e42; margin: 8px 0 0; }

.user-info { padding: 0 10px; }
.user-card { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.user-detail { display: flex; flex-direction: column; gap: 4px; }
.user-name { font-size: 13px; font-weight: 600; color: #1f2937; }

.app-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dce5ee; background: rgba(255,255,255,0.86); backdrop-filter: blur(8px); }
.app-header h2 { margin: 0; font-size: 20px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.health-panel { display: flex; align-items: center; gap: 10px; }
.app-main { padding: 24px; }
.workspace-page { max-width: 1200px; }
.page-heading { margin-bottom: 18px; }
.page-heading h3 { font-size: 24px; margin: 0 0 8px; }
.page-heading p { margin: 0; color: #64748b; font-size: 14px; }
</style>

# 旧前端基础结构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `前端` 项目中建立包含统一 HTTP 请求、固定菜单、三个基础路由和后端健康状态的 Vue 3 + Vite 应用。

**Architecture:** `App.vue` 只负责系统壳层和导航，三个视图组件分别承载页面内容；`src/utils/http.js` 提供唯一 Axios 实例，维修工单默认页通过该实例读取 `/api/health`。全局 CSS 负责桌面和移动端布局，旧业务页面保留但退出默认路由。

**Tech Stack:** Vue 3、Vite 5、Vue Router 4、Axios、Vitest、Vue Test Utils、jsdom

## Global Constraints

- 只修改 `前端` 目录及本计划文档，不修改 `frontend/rag-kb-web`、后端或数据库文件。
- 保留 `UserPage.vue`、`MyRepair.vue`、`RepairOrder.vue`、`KnowledgeDoc.vue` 和 `AIChat.vue`，不删除或重写旧业务页面。
- `VITE_API_BASE_URL` 的开发值为 `http://localhost:8081`，环境文件不得包含密码或数据库连接信息。
- 健康检查必须调用 `GET /api/health`；请求失败、非零业务码和无效响应必须显示 `后端服务未连接`。
- 不实现登录、注册、权限控制、用户认证或三个业务模块的完整接口。
- 不增加 UI 框架、图标库或动画依赖。

---

### Task 1: 统一 HTTP 请求与测试环境

**Files:**
- Modify: `前端/package.json`
- Modify: `前端/package-lock.json`
- Modify: `前端/vite.config.js`
- Create: `前端/tests/http.test.js`
- Create: `前端/src/utils/http.js`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE_URL`。
- Produces: 默认导出的 Axios 实例 `http`；`http.get(url)` 成功时解析为后端响应体，失败时保持 rejected Promise。

- [ ] **Step 1: 安装测试依赖并增加测试脚本**

在 `前端` 目录运行：

```powershell
npm install --save-dev vitest @vue/test-utils jsdom
npm pkg set scripts.test="vitest run"
```

将 `vite.config.js` 改为：

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8081',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    clearMocks: true
  }
})
```

- [ ] **Step 2: 编写 HTTP 封装的失败测试**

创建 `tests/http.test.js`：

```js
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('http client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('reads its base URL from VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9090')

    const { default: http } = await import('@/utils/http')

    expect(http.defaults.baseURL).toBe('http://localhost:9090')
  })

  it('resolves successful requests to the response body', async () => {
    const payload = { code: 0, message: 'success', data: { status: 'ok' } }
    const { default: http } = await import('@/utils/http')
    http.defaults.adapter = async (config) => ({
      data: payload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    })

    await expect(http.get('/api/health')).resolves.toEqual(payload)
  })
})
```

- [ ] **Step 3: 运行测试并确认因文件不存在而失败**

运行：

```powershell
npm test -- tests/http.test.js
```

预期：FAIL，错误指出无法解析 `@/utils/http`。

- [ ] **Step 4: 实现最小 HTTP 封装**

创建 `src/utils/http.js`：

```js
import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export default http
```

- [ ] **Step 5: 运行 HTTP 测试并确认通过**

运行：

```powershell
npm test -- tests/http.test.js
```

预期：2 tests passed，0 failed。

- [ ] **Step 6: 提交 HTTP 封装**

```powershell
git add -- '前端/package.json' '前端/package-lock.json' '前端/vite.config.js' '前端/tests/http.test.js' '前端/src/utils/http.js'
git commit -m "feat: add frontend http client"
```

---

### Task 2: 应用壳层、菜单与三个基础路由

**Files:**
- Create: `前端/tests/app-navigation.test.js`
- Modify: `前端/src/App.vue`
- Modify: `前端/src/main.js`
- Modify: `前端/src/router/index.js`
- Create: `前端/src/styles.css`
- Create: `前端/src/views/RepairOrders.vue`
- Create: `前端/src/views/KnowledgeDocs.vue`
- Create: `前端/src/views/AiQuestion.vue`

**Interfaces:**
- Consumes: Vue Router 的 `RouterLink` 和 `RouterView`。
- Produces: `/repair-orders`、`/knowledge-docs`、`/ai-chat` 三条页面路由；`/` 和未知路径重定向到 `/repair-orders`。

- [ ] **Step 1: 编写应用导航的失败测试**

创建 `tests/app-navigation.test.js`：

```js
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import App from '@/App.vue'
import { routes } from '@/router'

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    global: {
      plugins: [router]
    }
  })
  await flushPromises()
  return { router, wrapper }
}

describe('application navigation', () => {
  it('redirects the root route to repair orders', async () => {
    const { router, wrapper } = await mountAt('/')

    expect(router.currentRoute.value.path).toBe('/repair-orders')
    expect(wrapper.text()).toContain('电器维修知识系统')
    expect(wrapper.text()).toContain('维修工单')
  })

  it.each([
    ['/repair-orders', '维修工单'],
    ['/knowledge-docs', '知识文档'],
    ['/ai-chat', 'AI 问答']
  ])('renders %s as %s', async (path, heading) => {
    const { wrapper } = await mountAt(path)

    expect(wrapper.get('h1').text()).toBe(heading)
  })

  it('redirects unknown routes to repair orders', async () => {
    const { router } = await mountAt('/missing')

    expect(router.currentRoute.value.path).toBe('/repair-orders')
  })
})
```

- [ ] **Step 2: 运行导航测试并确认旧路由行为导致失败**

运行：

```powershell
npm test -- tests/app-navigation.test.js
```

预期：FAIL，根路由仍为 `/`，并且路由模块尚未导出 `routes`。

- [ ] **Step 3: 创建三个基础页面**

创建 `src/views/RepairOrders.vue`：

```vue
<template>
  <section class="page-section">
    <header class="page-header">
      <p class="page-kicker">服务管理</p>
      <h1>维修工单</h1>
      <p>查看和处理电器维修事项。</p>
    </header>

    <div class="content-panel">
      <h2>工单概览</h2>
      <p>维修工单功能正在准备中。</p>
    </div>
  </section>
</template>
```

创建 `src/views/KnowledgeDocs.vue`：

```vue
<template>
  <section class="page-section">
    <header class="page-header">
      <p class="page-kicker">资料中心</p>
      <h1>知识文档</h1>
      <p>集中查阅电器使用和维修资料。</p>
    </header>

    <div class="content-panel">
      <h2>文档列表</h2>
      <p>知识文档功能正在准备中。</p>
    </div>
  </section>
</template>
```

创建 `src/views/AiQuestion.vue`：

```vue
<template>
  <section class="page-section">
    <header class="page-header">
      <p class="page-kicker">智能服务</p>
      <h1>AI 问答</h1>
      <p>咨询电器使用、保养和维修问题。</p>
    </header>

    <div class="content-panel">
      <h2>问答窗口</h2>
      <p>AI 问答功能正在准备中。</p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: 配置路由和应用壳层**

将 `src/router/index.js` 改为：

```js
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
```

将 `src/App.vue` 改为：

```vue
<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="app-mark" aria-hidden="true">E</span>
      <div>
        <p>设备服务中心</p>
        <strong>电器维修知识系统</strong>
      </div>
    </header>

    <div class="app-body">
      <aside class="app-sidebar" aria-label="主菜单">
        <nav class="app-nav">
          <RouterLink to="/repair-orders">维修工单</RouterLink>
          <RouterLink to="/knowledge-docs">知识文档</RouterLink>
          <RouterLink to="/ai-chat">AI 问答</RouterLink>
        </nav>
      </aside>

      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>
```

将 `src/main.js` 改为：

```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

- [ ] **Step 5: 增加桌面和移动端全局样式**

创建 `src/styles.css`：

```css
:root {
  color: #1d2733;
  background: #f3f5f7;
  font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
}

a {
  color: inherit;
}

.app-shell {
  min-height: 100vh;
}

.app-header {
  position: fixed;
  z-index: 10;
  top: 0;
  right: 0;
  left: 0;
  height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  color: #17212b;
  background: #ffffff;
  border-bottom: 1px solid #dce1e6;
}

.app-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #16705a;
  border-radius: 6px;
  font-weight: 700;
}

.app-header p {
  margin: 0 0 2px;
  color: #6b7682;
  font-size: 12px;
}

.app-header strong {
  font-size: 18px;
}

.app-body {
  min-height: 100vh;
  padding-top: 72px;
}

.app-sidebar {
  position: fixed;
  top: 72px;
  bottom: 0;
  left: 0;
  width: 220px;
  padding: 20px 14px;
  color: #dbe4e8;
  background: #25313a;
}

.app-nav {
  display: grid;
  gap: 6px;
}

.app-nav a {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-left: 3px solid transparent;
  text-decoration: none;
}

.app-nav a:hover {
  background: #32414b;
}

.app-nav a:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.app-nav a.router-link-active {
  color: #ffffff;
  background: #324b47;
  border-left-color: #49b492;
}

.app-main {
  min-height: calc(100vh - 72px);
  margin-left: 220px;
  padding: 32px;
}

.page-section {
  width: min(100%, 1080px);
}

.page-header {
  margin-bottom: 28px;
}

.page-kicker {
  margin: 0 0 8px;
  color: #16705a;
  font-size: 13px;
  font-weight: 700;
}

.page-header h1 {
  margin: 0 0 10px;
  font-size: 30px;
  letter-spacing: 0;
}

.page-header > p:last-child,
.content-panel p {
  color: #64707c;
}

.page-header > p:last-child {
  margin: 0;
}

.content-panel {
  padding: 24px 0;
  border-top: 1px solid #d7dde2;
}

.content-panel h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.content-panel p {
  margin: 0;
}

@media (max-width: 720px) {
  .app-header {
    height: 64px;
    padding: 0 16px;
  }

  .app-header strong {
    font-size: 16px;
  }

  .app-body {
    padding-top: 64px;
  }

  .app-sidebar {
    position: sticky;
    top: 64px;
    width: 100%;
    height: auto;
    padding: 8px;
    overflow-x: auto;
  }

  .app-nav {
    min-width: max-content;
    display: flex;
  }

  .app-nav a {
    min-height: 40px;
    border-bottom: 3px solid transparent;
    border-left: 0;
  }

  .app-nav a.router-link-active {
    border-bottom-color: #49b492;
  }

  .app-main {
    min-height: auto;
    margin-left: 0;
    padding: 24px 18px;
  }

  .page-header h1 {
    font-size: 26px;
  }
}
```

- [ ] **Step 6: 运行导航测试并确认通过**

运行：

```powershell
npm test -- tests/app-navigation.test.js
```

预期：5 tests passed，0 failed。

- [ ] **Step 7: 提交应用壳层和路由**

```powershell
git add -- '前端/tests/app-navigation.test.js' '前端/src/App.vue' '前端/src/main.js' '前端/src/router/index.js' '前端/src/styles.css' '前端/src/views/RepairOrders.vue' '前端/src/views/KnowledgeDocs.vue' '前端/src/views/AiQuestion.vue'
git commit -m "feat: add frontend application shell"
```

---

### Task 3: 后端健康状态与最终验证

**Files:**
- Create: `前端/tests/repair-orders.test.js`
- Modify: `前端/src/views/RepairOrders.vue`
- Modify: `前端/src/styles.css`
- Modify: `前端/.env`
- Modify: `前端/.env.development`

**Interfaces:**
- Consumes: Task 1 的 `http.get('/api/health')`，响应结构为 `{ code: number, message: string, data: object | null }`。
- Produces: `RepairOrders.vue` 中的 `healthText`、`serviceName` 和 `healthState` 页面状态；失败固定文案为 `后端服务未连接`。

- [ ] **Step 1: 编写健康状态的失败测试**

创建 `tests/repair-orders.test.js`：

```js
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepairOrders from '@/views/RepairOrders.vue'
import http from '@/utils/http'

vi.mock('@/utils/http', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('RepairOrders health status', () => {
  beforeEach(() => {
    http.get.mockReset()
  })

  it('shows the connected service for a valid health response', async () => {
    http.get.mockResolvedValue({
      code: 0,
      message: 'success',
      data: {
        status: 'ok',
        service: 'rag-kb-demo'
      }
    })

    const wrapper = mount(RepairOrders)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/api/health')
    expect(wrapper.get('[data-testid="health-status"]').text()).toContain('后端服务已连接')
    expect(wrapper.text()).toContain('rag-kb-demo')
  })

  it.each([
    ['request rejection', () => Promise.reject(new Error('network unavailable'))],
    ['non-zero code', () => Promise.resolve({ code: 500, message: 'error', data: null })],
    ['missing data', () => Promise.resolve({ code: 0, message: 'success', data: null })],
    ['missing status', () => Promise.resolve({ code: 0, message: 'success', data: { service: 'rag-kb-demo' } })]
  ])('shows the disconnected message for %s', async (_label, responseFactory) => {
    http.get.mockImplementation(responseFactory)

    const wrapper = mount(RepairOrders)
    await flushPromises()

    expect(wrapper.get('[data-testid="health-status"]').text()).toBe('后端服务未连接')
  })
})
```

- [ ] **Step 2: 运行健康状态测试并确认页面缺少状态元素**

运行：

```powershell
npm test -- tests/repair-orders.test.js
```

预期：FAIL，`[data-testid="health-status"]` 不存在。

- [ ] **Step 3: 实现健康检查和明确错误状态**

将 `src/views/RepairOrders.vue` 改为：

```vue
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
```

在 `src/styles.css` 的 `.content-panel` 规则前增加：

```css
.health-section {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0;
  border-top: 1px solid #d7dde2;
}

.health-section h2 {
  margin: 0 0 5px;
  font-size: 16px;
}

.service-name {
  margin: 0;
  color: #64707c;
  font-size: 13px;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #8a3f37;
  font-weight: 700;
}

.health-status.is-connected {
  color: #14634f;
}

.health-status.is-loading {
  color: #596673;
}

.status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  background: currentColor;
  border-radius: 50%;
}
```

在移动端媒体查询中增加：

```css
.health-section {
  align-items: flex-start;
  flex-direction: column;
  gap: 12px;
}
```

- [ ] **Step 4: 更新开发环境地址**

将 `.env` 和 `.env.development` 都改为：

```dotenv
VITE_API_BASE_URL=http://localhost:8081
```

- [ ] **Step 5: 运行健康状态测试并确认通过**

运行：

```powershell
npm test -- tests/repair-orders.test.js
```

预期：5 tests passed，0 failed。

- [ ] **Step 6: 运行完整测试和生产构建**

运行：

```powershell
npm test
npm run build
```

预期：全部测试通过且 Vite 构建退出码为 0，输出生成到 `前端/dist`。

- [ ] **Step 7: 启动开发服务器并做响应式视觉检查**

运行：

```powershell
npm run dev -- --host 127.0.0.1
```

使用浏览器检查 `http://127.0.0.1:5173/`：

- 桌面端 `1440x900`：顶部固定、左侧菜单固定、右侧内容不被遮挡。
- 移动端 `390x844`：菜单横向排列、页面无水平溢出、健康状态不重叠。
- 依次打开三个菜单，确认标题匹配且激活态正确。
- 后端不可用或返回无效数据时，确认页面显示 `后端服务未连接`。

- [ ] **Step 8: 提交健康状态实现**

```powershell
git add -- '前端/tests/repair-orders.test.js' '前端/src/views/RepairOrders.vue' '前端/src/styles.css' '前端/.env' '前端/.env.development'
git commit -m "feat: show backend health status"
```

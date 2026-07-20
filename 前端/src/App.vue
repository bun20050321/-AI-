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

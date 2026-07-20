<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Documents</p>
      <h3>知识文档</h3>
      <p>知识文档管理、检索和分类</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="8" :md="6">
        <el-card shadow="never" class="category-card">
          <template #header>
            <div class="card-header">
              <span>文档分类</span>
              <el-button link type="primary" size="small">新增</el-button>
            </div>
          </template>
          <el-tree
            :data="categoryTree"
            :props="{ label: 'name', children: 'children' }"
            default-expand-all
            highlight-current
            @node-click="handleNodeClick"
          />
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="16" :md="18">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>{{ currentCategory || '全部文档' }}</span>
              <el-button type="primary" size="small">上传文档</el-button>
            </div>
          </template>

          <div class="filter-bar">
            <el-input v-model="searchQuery" placeholder="搜索文档..." style="width: 300px" clearable />
            <el-select v-model="sortBy" placeholder="排序方式" style="width: 140px">
              <el-option label="最近更新" value="updateTime" />
              <el-option label="名称" value="name" />
            </el-select>
          </div>

          <div class="doc-list" v-loading="loading">
            <div v-for="doc in filteredDocs" :key="doc.id" class="doc-item" @click="handleDocClick(doc)">
              <div class="doc-icon">
                <el-icon :size="28"><Document /></el-icon>
              </div>
              <div class="doc-info">
                <h4 class="doc-title">{{ doc.name }}</h4>
                <p class="doc-meta">
                  <span>{{ doc.category }}</span>
                  <el-divider direction="vertical" />
                  <span>{{ doc.size }}</span>
                  <el-divider direction="vertical" />
                  <span>更新于 {{ doc.updateTime }}</span>
                </p>
              </div>
              <div class="doc-actions">
                <el-button link type="primary">预览</el-button>
                <el-button link type="primary">下载</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Document } from '@element-plus/icons-vue'

const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('updateTime')
const currentCategory = ref('')

const categoryTree = ref([
  {
    name: '全部文档',
    children: [
      { name: '电器说明书', children: [{ name: '厨房电器' }, { name: '洗护电器' }, { name: '制冷电器' }, { name: '环境电器' }] },
      { name: '维修手册', children: [{ name: '故障排查指南' }, { name: '维修流程规范' }] },
      { name: '培训资料', children: [{ name: '新员工培训' }, { name: '技术培训' }] }
    ]
  }
])

const docList = ref([
  { id: 1, name: '空气炸锅 K7 使用说明书.pdf', category: '厨房电器', size: '2.4 MB', updateTime: '2026-07-15' },
  { id: 2, name: '滚筒洗衣机 W9 维修手册.pdf', category: '洗护电器', size: '5.1 MB', updateTime: '2026-07-14' },
  { id: 3, name: '智能冰箱 F3 故障排查指南.pdf', category: '制冷电器', size: '3.8 MB', updateTime: '2026-07-13' },
  { id: 4, name: '变频空调 G8 安装说明.pdf', category: '环境电器', size: '4.2 MB', updateTime: '2026-07-12' },
  { id: 5, name: '微波炉 M3 快速入门.pdf', category: '厨房电器', size: '1.5 MB', updateTime: '2026-07-11' },
  { id: 6, name: '智能电饭煲 R5 功能介绍.pdf', category: '厨房电器', size: '2.0 MB', updateTime: '2026-07-10' },
  { id: 7, name: '维修流程规范 V2.0.pdf', category: '维修手册', size: '1.8 MB', updateTime: '2026-07-09' },
  { id: 8, name: '新员工培训手册.pdf', category: '培训资料', size: '8.5 MB', updateTime: '2026-07-08' }
])

const filteredDocs = computed(() => {
  let r = docList.value
  if (searchQuery.value) r = r.filter(d => d.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (currentCategory.value && currentCategory.value !== '全部文档') r = r.filter(d => d.category === currentCategory.value)
  return r
})

function handleNodeClick(node) { currentCategory.value = node.name }
function handleDocClick(doc) { console.log('Open:', doc.name) }
</script>

<style scoped>
.eyebrow { margin: 0 0 4px; color: #1c785f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.category-card { min-height: calc(100vh - 200px); }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.doc-item { display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
.doc-item:hover { background: #f5f7fa; border-color: #e4e7ed; }
.doc-icon { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #409eff, #67c23a); display: flex; align-items: center; justify-content: center; color: #fff; margin-right: 14px; flex-shrink: 0; }
.doc-info { flex: 1; min-width: 0; }
.doc-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-meta { margin: 0; font-size: 12px; color: #999; }
.doc-actions { display: flex; gap: 4px; flex-shrink: 0; }
</style>

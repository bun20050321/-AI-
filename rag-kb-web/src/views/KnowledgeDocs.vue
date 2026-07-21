<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Documents</p>
      <h3>知识文档</h3>
      <p>知识文档管理、检索和下载</p>
    </div>

    <!-- 员工专属：上传区域 -->
    <el-card v-if="can('doc.upload')" shadow="never" class="upload-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Upload /></el-icon> 文档上传（员工权限）</span>
        </div>
      </template>
      <el-upload
        drag
        action="/api/documents/upload"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md"
      >
        <el-icon class="el-icon--upload" :size="48"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖拽到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、Word、TXT、Markdown 格式，单个文件不超过 50MB
          </div>
        </template>
      </el-upload>
      <el-row justify="end" style="margin-top: 12px;" v-if="fileList.length > 0">
        <el-button @click="clearFiles">清空</el-button>
        <el-button type="primary" @click="uploadFiles" :loading="uploading">
          开始上传 ({{ fileList.length }})
        </el-button>
      </el-row>
    </el-card>

    <!-- 权限提示：用户看到的信息 -->
    <el-alert
      v-else
      title="文档中心"
      type="info"
      description="您可以预览和下载以下文档。如需上传新文档，请联系管理员获取员工权限。"
      show-icon
      :closable="false"
      style="margin-bottom: 16px;"
    />

    <!-- 文档列表（所有登录用户可见） -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>文档列表</span>
          <el-input v-model="searchQuery" placeholder="搜索文档..." style="width: 260px" clearable prefix-icon="Search" />
        </div>
      </template>

      <el-empty v-if="filteredDocs.length === 0" description="暂无文档" />

      <div v-else class="doc-list">
        <div v-for="doc in filteredDocs" :key="doc.id" class="doc-item">
          <div class="doc-icon">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="doc-info">
            <h4 class="doc-title">{{ doc.name }}</h4>
            <p class="doc-meta">
              <el-tag size="small" type="info">{{ doc.category }}</el-tag>
              <span>{{ doc.size }}</span>
              <span>更新于 {{ doc.updateTime }}</span>
            </p>
          </div>
          <div class="doc-actions">
            <!-- 所有用户：预览 -->
            <el-button link type="primary" size="small" :icon="View" @click="previewDoc(doc)">预览</el-button>
            <!-- 所有用户：下载 -->
            <el-button link type="primary" size="small" :icon="Download" @click="downloadDoc(doc)">下载</el-button>
            <!-- 员工：删除 -->
            <el-button v-if="can('doc.delete')" link type="danger" size="small" :icon="Delete" @click="deleteDoc(doc.id)">删除</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="previewDocName" width="80%" destroy-on-close>
      <div class="preview-container">
        <el-empty v-if="!previewUrl" description="预览功能需要后端支持" />
        <iframe v-else :src="previewUrl" style="width:100%;height:600px;border:0;" />
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, View, Download, Delete, Upload, UploadFilled } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth.js'

const STORAGE_KEY = 'knowledge_docs'
const searchQuery = ref('')
const fileList = ref([])
const uploading = ref(false)
const previewVisible = ref(false)
const previewDocName = ref('')
const previewUrl = ref('')

const { can } = useAuth()

// Load from localStorage
const saved = localStorage.getItem(STORAGE_KEY)
const docList = ref(saved ? JSON.parse(saved) : [
  { id: 1, name: '空气炸锅 K7 使用说明书.pdf', category: '厨房电器', size: '2.4 MB', updateTime: '2026-07-15', url: '' },
  { id: 2, name: '滚筒洗衣机 W9 维修手册.pdf', category: '洗护电器', size: '5.1 MB', updateTime: '2026-07-14', url: '' },
  { id: 3, name: '智能冰箱 F3 故障排查指南.pdf', category: '制冷电器', size: '3.8 MB', updateTime: '2026-07-13', url: '' },
  { id: 4, name: '变频空调 G8 安装说明.pdf', category: '环境电器', size: '4.2 MB', updateTime: '2026-07-12', url: '' },
  { id: 5, name: '微波炉 M3 快速入门.pdf', category: '厨房电器', size: '1.5 MB', updateTime: '2026-07-11', url: '' },
  { id: 6, name: '智能电饭煲 R5 功能介绍.pdf', category: '厨房电器', size: '2.0 MB', updateTime: '2026-07-10', url: '' },
  { id: 7, name: '维修流程规范 V2.0.pdf', category: '维修手册', size: '1.8 MB', updateTime: '2026-07-09', url: '' },
  { id: 8, name: '新员工培训手册.pdf', category: '培训资料', size: '8.5 MB', updateTime: '2026-07-08', url: '' }
])

function saveDocs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docList.value))
}

const filteredDocs = computed(() => {
  if (!searchQuery.value) return docList.value
  const q = searchQuery.value.toLowerCase()
  return docList.value.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
})

// ===== 文件上传（仅员工） =====
function handleFileChange(uploadFile) {
  const ext = uploadFile.name.split('.').pop().toLowerCase()
  const validExts = ['pdf', 'doc', 'docx', 'txt', 'md']
  if (!validExts.includes(ext)) {
    ElMessage.warning(`不支持的文件格式: ${ext}`)
    const idx = fileList.value.indexOf(uploadFile)
    if (idx > -1) fileList.value.splice(idx, 1)
    return
  }
  if (uploadFile.size && uploadFile.size > 50 * 1024 * 1024) {
    ElMessage.warning('文件大小超过50MB限制')
    const idx = fileList.value.indexOf(uploadFile)
    if (idx > -1) fileList.value.splice(idx, 1)
    return
  }
  ElMessage.success(`已选择: ${uploadFile.name}`)
}

async function uploadFiles() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }
  uploading.value = true
  for (const file of fileList.value) {
    const rawFile = file.raw || file
    const newDoc = {
      id: Date.now() + Math.random(),
      name: rawFile.name,
      category: '待分类',
      size: formatSize(rawFile.size || 0),
      updateTime: new Date().toLocaleDateString('zh-CN').replace(/\//g, '-'),
      url: ''
    }
    docList.value.unshift(newDoc)
  }
  saveDocs()
  await new Promise(r => setTimeout(r, 500))
  fileList.value = []
  uploading.value = false
  ElMessage.success('上传成功')
}

function clearFiles() {
  fileList.value = []
}

// ===== 预览（所有用户） =====
function previewDoc(doc) {
  previewDocName.value = doc.name
  // TODO: 后端完成后替换为真实预览 URL
  // previewUrl.value = `/api/documents/${doc.id}/preview`
  previewUrl.value = ''
  previewVisible.value = true
  if (!doc.url) {
    ElMessage.info('预览功能需要后端支持，接口预留：GET /api/documents/{id}/preview')
  }
}

// ===== 下载（所有用户） =====
function downloadDoc(doc) {
  // TODO: 后端完成后替换为真实下载 URL
  // window.open(`/api/documents/${doc.id}/download`)
  ElMessage.info('下载功能需要后端支持，接口预留：GET /api/documents/{id}/download')
}

// ===== 删除（仅员工） =====
function deleteDoc(id) {
  const idx = docList.value.findIndex(d => d.id === id)
  if (idx > -1) {
    docList.value.splice(idx, 1)
    saveDocs()
    ElMessage.success('已删除')
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.eyebrow { margin: 0 0 4px; color: #1c785f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.upload-card { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

.doc-list { display: flex; flex-direction: column; gap: 8px; }
.doc-item {
  display: flex; align-items: center; padding: 14px 16px;
  border-radius: 8px; border: 1px solid #e4e7ed;
  transition: all 0.2s;
}
.doc-item:hover { background: #f5f7fa; }
.doc-icon {
  width: 40px; height: 40px; border-radius: 8px;
  background: linear-gradient(135deg, #1c785f, #34d399);
  display: flex; align-items: center; justify-content: center;
  color: #fff; margin-right: 14px; flex-shrink: 0;
}
.doc-info { flex: 1; min-width: 0; }
.doc-title { margin: 0 0 6px; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-meta { margin: 0; display: flex; align-items: center; gap: 12px; font-size: 12px; color: #64748b; }
.doc-actions { display: flex; gap: 4px; flex-shrink: 0; }

:deep(.el-upload-dragger) { width: 100%; }
.preview-container { min-height: 400px; }
</style>

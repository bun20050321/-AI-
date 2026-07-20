<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { createRepair, getRepair, listRepairs } from '../api/repair.js'
import '../styles/repair-orders.css'

const emptyFilters = () => ({ groupCode: '', equipmentName: '', faultTitle: '' })
const emptyForm = () => ({ groupCode: '', equipmentName: '', faultTitle: '', faultDesc: '' })

const filters = reactive(emptyFilters())
const form = reactive(emptyForm())
const records = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const submitting = ref(false)
const listError = ref('')
const createVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const createFormRef = ref()

async function loadRepairs() {
  loading.value = true
  listError.value = ''
  try {
    const page = await listRepairs({ ...filters, pageNum: currentPage.value, pageSize: pageSize.value })
    records.value = page.records
    total.value = page.total
    currentPage.value = page.current || currentPage.value
    pageSize.value = page.size || pageSize.value
  } catch {
    listError.value = '工单列表加载失败，请确认后端服务已启动。'
  } finally {
    loading.value = false
  }
}

function search() {
  currentPage.value = 1
  loadRepairs()
}

function resetFilters() {
  Object.assign(filters, emptyFilters())
  search()
}

function openCreate() {
  Object.assign(form, emptyForm())
  createVisible.value = true
}

async function submitCreate() {
  if (!createFormRef.value) return
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await createRepair(form)
    createVisible.value = false
    currentPage.value = 1
    await loadRepairs()
    ElMessage.success('维修工单已新增')
  } catch {
    listError.value = '工单提交失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}

async function openDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = row
  try {
    detail.value = await getRepair(row.id)
  } catch {
    detail.value = row
    listError.value = '工单详情加载失败，已展示列表中的已有信息。'
  } finally {
    detailLoading.value = false
  }
}

function handlePageChange(page) {
  currentPage.value = page
  loadRepairs()
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadRepairs()
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

const rules = {
  equipmentName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  faultTitle: [{ required: true, message: '请输入故障标题', trigger: 'blur' }],
  faultDesc: [{ required: true, message: '请输入故障描述', trigger: 'blur' }]
}

onMounted(loadRepairs)
</script>

<template>
  <section class="workspace-page repair-page">
    <div class="page-heading">
      <p class="eyebrow">Work Orders</p>
      <h3>维修工单</h3>
      <p>查询故障工单，登记新的维修请求并查看完整详情。</p>
    </div>

    <el-card shadow="never" class="repair-filter-card">
      <el-form inline @submit.prevent="search">
        <el-form-item label="分组编码">
          <el-input v-model="filters.groupCode" data-testid="repair-group-code" clearable placeholder="输入分组编码" />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="filters.equipmentName" data-testid="repair-equipment-filter" clearable placeholder="输入设备名称" />
        </el-form-item>
        <el-form-item label="故障标题">
          <el-input v-model="filters.faultTitle" data-testid="repair-fault-title-filter" clearable placeholder="输入故障标题" />
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" :icon="Search" data-testid="repair-search" @click="search">查询</el-button>
          <el-button :icon="Refresh" data-testid="repair-reset" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="repair-list-card">
      <template #header>
        <div class="card-header-actions">
          <div><strong>维修工单列表</strong><span class="record-count">共 {{ total }} 条</span></div>
          <div class="list-actions">
            <el-button :icon="Refresh" :loading="loading" @click="loadRepairs">刷新</el-button>
            <el-button type="primary" :icon="Plus" data-testid="open-create-repair" @click="openCreate">新增工单</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="repair-alert" />
      <el-table v-loading="loading" :data="records" stripe empty-text="暂无维修工单">
        <el-table-column prop="id" label="工单编号" width="110" />
        <el-table-column prop="groupCode" label="分组编码" width="120" />
        <el-table-column prop="equipmentName" label="设备名称" min-width="140" />
        <el-table-column prop="faultTitle" label="故障标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" :data-testid="`view-repair-${row.id}`" @click="openDetail(row)">查看</el-button></template></el-table-column>
      </el-table>

      <div class="repair-pagination">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" background @current-change="handlePageChange" @size-change="handleSizeChange" />
      </div>
    </el-card>

    <el-dialog v-model="createVisible" title="新增维修工单" width="640px" destroy-on-close>
      <el-form ref="createFormRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="设备名称" prop="equipmentName"><el-input v-model="form.equipmentName" data-testid="repair-equipment-name" placeholder="请输入设备名称" /></el-form-item>
          <el-form-item label="故障标题" prop="faultTitle"><el-input v-model="form.faultTitle" data-testid="repair-fault-title" placeholder="请输入故障标题" /></el-form-item>
          <el-form-item label="分组编码"><el-input v-model="form.groupCode" data-testid="repair-create-group-code" placeholder="选填" /></el-form-item>
        </div>
        <el-form-item label="故障描述" prop="faultDesc"><el-input v-model="form.faultDesc" data-testid="repair-fault-desc" type="textarea" :rows="4" placeholder="请输入故障现象和发生情况" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" data-testid="repair-submit" :loading="submitting" @click="submitCreate">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="维修工单详情" width="640px">
      <el-skeleton v-if="detailLoading" :rows="5" animated />
      <el-descriptions v-else-if="detail" :column="2" border>
        <el-descriptions-item label="工单编号">{{ detail.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分组编码">{{ detail.groupCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ detail.equipmentName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="故障标题">{{ detail.faultTitle || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="故障描述" :span="2">{{ detail.faultDesc || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </section>
</template>

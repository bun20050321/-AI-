<template>
  <div class="repair-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>维修工单管理</span>
          <el-button type="primary" :icon="Plus" size="small">新建工单</el-button>
        </div>
      </template>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索工单..."
          style="width: 240px"
          clearable
          :prefix-icon="Search"
        />
        <el-select v-model="filterStatus" placeholder="工单状态" clearable style="width: 140px">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已完成" value="completed" />
        </el-select>
        <el-button type="primary" plain :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <!-- Data Table -->
      <el-table :data="paginatedList" stripe v-loading="loading" style="margin-top: 16px">
        <el-table-column prop="id" label="工单编号" width="120" />
        <el-table-column prop="appliance" label="报修设备" width="160" />
        <el-table-column prop="issue" label="故障描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="reporter" label="报修人" width="120" />
        <el-table-column prop="appointTime" label="预约时间" width="160" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default>
            <el-button link type="primary" size="small">查看</el-button>
            <el-button link type="primary" size="small">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredList.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// Mock data
const repairList = ref([
  { id: 'WO-2026001', appliance: '滚筒洗衣机 W9', issue: '不进水，显示 E1 错误', reporter: '张三', appointTime: '2026-07-20 上午', status: 'pending' },
  { id: 'WO-2026002', appliance: '智能冰箱 F3', issue: '制冷效果差，压缩机异响', reporter: '李四', appointTime: '2026-07-21 下午', status: 'processing' },
  { id: 'WO-2026003', appliance: '变频空调 G8', issue: '不制冷，显示 E1 通信故障', reporter: '王五', appointTime: '2026-07-19 上午', status: 'completed' },
  { id: 'WO-2026004', appliance: '空气炸锅 K7', issue: '设备无法启动', reporter: '赵六', appointTime: '2026-07-22 晚上', status: 'pending' },
  { id: 'WO-2026005', appliance: '微波炉 M3', issue: '加热不均匀', reporter: '钱七', appointTime: '2026-07-20 下午', status: 'processing' },
  { id: 'WO-2026006', appliance: '智能电饭煲 R5', issue: '显示 E0 错误', reporter: '孙八', appointTime: '2026-07-23 上午', status: 'pending' },
  { id: 'WO-2026007', appliance: '滚筒洗衣机 W9', issue: '脱水异常，噪音大', reporter: '周九', appointTime: '2026-07-21 上午', status: 'completed' },
  { id: 'WO-2026008', appliance: '智能冰箱 F3', issue: '门封条不严，结霜过多', reporter: '吴十', appointTime: '2026-07-24 下午', status: 'pending' },
])

const statusType = (status) => {
  const map = { pending: 'warning', processing: 'primary', completed: 'success' }
  return map[status] || 'info'
}

const statusLabel = (status) => {
  const map = { pending: '待处理', processing: '处理中', completed: '已完成' }
  return map[status] || status
}

const filteredList = computed(() => {
  return repairList.value.filter(item => {
    const matchQuery = !searchQuery.value ||
      item.id.includes(searchQuery.value) ||
      item.appliance.includes(searchQuery.value) ||
      item.issue.includes(searchQuery.value)
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchQuery && matchStatus
  })
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => { loading.value = false }, 500)
}
</script>

<style scoped>
.repair-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

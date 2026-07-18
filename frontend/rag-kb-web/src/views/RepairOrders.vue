<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Work orders</p>
      <h3>维修工单</h3>
      <p>预留工单列表、工单检索和处理入口，后续可接入维修业务接口。</p>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>待处理工单</template>
          <strong>0</strong>
          <p>当前未接入工单数据。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>处理中</template>
          <strong>0</strong>
          <p>保留状态统计区域。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>已完成</template>
          <strong>0</strong>
          <p>后续展示闭环结果。</p>
        </el-card>
      </el-col>
    </el-row>
  </section>
</template>

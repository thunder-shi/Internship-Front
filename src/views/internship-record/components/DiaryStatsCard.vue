<template>
  <el-card class="stats-card" shadow="never">
    <el-row :gutter="32" justify="center">
      <el-col :span="7" class="stat-item">
        <el-statistic title="已提交" :value="submitted">
          <template #suffix><span class="stat-unit">人</span></template>
        </el-statistic>
      </el-col>
      <el-col :span="7" class="stat-item">
        <el-statistic title="未提交" :value="notSubmitted">
          <template #suffix><span class="stat-unit">人</span></template>
        </el-statistic>
      </el-col>
      <el-col :span="7" class="stat-item">
        <el-statistic title="总计" :value="total">
          <template #suffix><span class="stat-unit">人</span></template>
        </el-statistic>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
defineOptions({ name: 'DiaryStatsCard' })

defineProps({
  submitted:    { type: Number, default: 0 },
  notSubmitted: { type: Number, default: 0 },
  total:        { type: Number, default: 0 },
})
</script>

<style scoped>
.stats-card :deep(.el-card__body) {
  padding: 16px 24px;
}

.stat-item {
  text-align: center;
}

.stat-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 2px;
}
</style>

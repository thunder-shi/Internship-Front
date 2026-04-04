<template>
  <el-dialog
    v-model="visible"
    title="学生详细信息"
    width="560px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <template v-if="row">
      <!-- 学生信息 -->
      <div class="section-title">学生信息</div>
      <el-descriptions :column="2" border size="small" class="mb-16">
        <el-descriptions-item label="姓名">{{ row.studentName || '——' }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ row.studentNo || '——' }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ row.majorName || '——' }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{ row.className || '——' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 校内：题目信息 -->
      <template v-if="row.titleName">
        <div class="section-title">题目信息</div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="题目名称">{{ row.titleName }}</el-descriptions-item>
          <el-descriptions-item label="指导老师">{{ row.teacherName || '——' }}</el-descriptions-item>
          <el-descriptions-item v-if="row.titleDescription" label="题目描述">
            {{ row.titleDescription }}
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 校外：岗位信息 -->
      <template v-else-if="row.internshipPostName">
        <div class="section-title">岗位信息</div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="岗位名称">{{ row.internshipPostName }}</el-descriptions-item>
          <el-descriptions-item label="所在企业">{{ row.companyName || '——' }}</el-descriptions-item>
          <el-descriptions-item v-if="row.postDescription" label="岗位描述">
            {{ row.postDescription }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </template>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

defineOptions({ name: 'DlgStudentDetail' })

const visible = ref(false)
const row = ref(null)

function open(studentRow) {
  row.value = studentRow
  visible.value = true
}

function onClosed() {
  row.value = null
}

defineExpose({ open })
</script>

<style scoped>
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 2px;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}
.mb-16 {
  margin-bottom: 16px;
}
</style>

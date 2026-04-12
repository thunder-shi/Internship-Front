<template>
  <el-dropdown
    split-button
    :type="currentAction === 'pass' ? 'success' : 'warning'"
    :disabled="!selectedRows.length"
    @click="handleClick"
    @command="handleCommand"
  >
    {{ currentAction === 'pass' ? '批量通过' : '批量退回' }}
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="pass">批量通过</el-dropdown-item>
        <el-dropdown-item command="back">批量退回</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const props = defineProps({
  selectedRows: { type: Array, default: () => [] },
})

const emit = defineEmits(['confirm'])

const currentAction = ref('pass')

function handleCommand(command) {
  currentAction.value = command
}

async function handleClick() {
  const count = props.selectedRows.length
  if (!count) {
    ElMessage.warning('请先选择要操作的记录')
    return
  }
  const actionText = currentAction.value === 'pass' ? '通过' : '退回'
  try {
    await ElMessageBox.confirm(
      `已选中 ${count} 条数据，是否批量${actionText}？`,
      '批量审核确认',
      {
        confirmButtonText: `确认批量${actionText}`,
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }
  emit('confirm', {
    type: currentAction.value,
    rows: props.selectedRows,
    remarks: `审核${actionText}`,
  })
}

defineOptions({ name: 'BatchAuditButton' })
</script>

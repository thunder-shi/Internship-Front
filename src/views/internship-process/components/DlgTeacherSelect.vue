<template>
  <el-dialog v-model="visible" title="选择指导老师" width="640px" destroy-on-close @close="onClose">
    <el-table ref="tableRef" v-loading="loading" :data="tableData" border height="360" row-key="id"
      :row-class-name="getRowClassName" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" :reserve-selection="true" :selectable="isRowSelectable" />
      <el-table-column prop="name" label="姓名" min-width="100" show-overflow-tooltip />
      <el-table-column prop="phone" label="手机号" min-width="120" show-overflow-tooltip />
      <el-table-column prop="jobName" label="职务" min-width="80" show-overflow-tooltip />
    </el-table>
    <div class="pagination-wrap">
      <el-pagination v-model:current-page="pageInfo.page" v-model:page-size="pageInfo.size"
        :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="confirmLoading" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';

defineOptions({
  name: 'DlgTeacherSelect',
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 当前实习项目 ID，确认时会与勾选的 userId 一起写入 RelIntershipUser */
  internshipId: { type: Number, default: null },
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const tableRef = ref(null);
const loading = ref(false);
const confirmLoading = ref(false);
const tableData = ref([]);
const total = ref(0);
/** 跨页保留勾选：id -> row */
const selectedMap = ref(new Map());
/** 已写入 RelIntershipUser 的 userId 集合，这些行在表格中禁用勾选 */
const existingUserIds = ref(new Set());

const pageInfo = ref({
  page: 1,
  size: 20,
});

/** 查询当前实习项目已关联的指导老师 userId，这些行将禁用勾选 */
async function loadExistingUserIds() {
  const internshipId = props.internshipId;
  if (internshipId == null) {
    existingUserIds.value = new Set();
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelIntershipUser',
      searchKey: { internshipId },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    const ids = list.map((r) => {
      const uid = r.userId ?? r.user_id;
      return uid != null ? Number(uid) : null;
    }).filter((id) => id != null);
    existingUserIds.value = new Set(ids);
  } catch (e) {
    console.error('加载已选老师失败:', e);
    existingUserIds.value = new Set();
  }
}

async function loadList() {
  if (!visible.value) return;
  loading.value = true;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'BaseUser',
      pageInfo: { page: pageInfo.value.page, size: pageInfo.value.size },
      searchKey: { jobId: '3' },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const data = res?.data;
    tableData.value = data?.content ?? data ?? [];
    total.value = data?.page?.totalElements ?? data?.totalElements ?? tableData.value.length;
  } catch (e) {
    console.error('加载用户列表失败:', e);
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function isExistingUserId(id) {
  if (id == null) return false;
  return existingUserIds.value.has(Number(id)) || existingUserIds.value.has(id);
}

/** 已关联的老师不可勾选（禁用） */
function isRowSelectable(row) {
  return !isExistingUserId(row.id);
}

/** 已禁用的行加样式 */
function getRowClassName({ row }) {
  return isExistingUserId(row.id) ? 'row-disabled' : '';
}

function handleSelectionChange(rows) {
  const idsOnPage = new Set(tableData.value.map((r) => r.id));
  idsOnPage.forEach((id) => selectedMap.value.delete(id));
  rows.forEach((row) => selectedMap.value.set(row.id, row));
}

function handleSizeChange(size) {
  pageInfo.value.size = size;
  pageInfo.value.page = 1;
  loadList();
}

function handleCurrentChange(page) {
  pageInfo.value.page = page;
  loadList();
}

function onClose() {
  selectedMap.value.clear();
  existingUserIds.value = new Set();
  tableRef.value?.clearSelection?.();
}

async function handleConfirm() {
  const list = Array.from(selectedMap.value.values());
  if (!list.length) {
    ElMessage.warning('请至少勾选一位指导老师');
    return;
  }
  const internshipId = props.internshipId;
  if (internshipId == null) {
    ElMessage.warning('缺少实习项目信息');
    return;
  }
  confirmLoading.value = true;
  try {
    for (const row of list) {
      const res = await listAPI.editOneNode('RelIntershipUser', {
        userId: Number(row.id),
        internshipId: Number(internshipId),
      });
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '保存失败');
        return;
      }
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('success');
  } catch (e) {
    console.error('保存失败:', e);
    ElMessage.error('保存失败');
  } finally {
    confirmLoading.value = false;
  }
}

watch(visible, async (val) => {
  if (val) {
    pageInfo.value.page = 1;
    await loadExistingUserIds();
    loadList();
  }
});
</script>

<style scoped>
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
:deep(.row-disabled) {
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
}
</style>

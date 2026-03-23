<template>
  <BaseList ref="baseListRef" :default-props="defaultProps" @edit-click="handleEditClick"
    @delete-click="handleDeleteClick" />
</template>
<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';

defineOptions({
  name: 'RelTeacherStudent',
});

const baseListRef = ref(null);
const { getVerifyRoleName } = useVerifyFilter();

const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTeacherStudentMerge' },
      allTableColumns: [
        { id: 1, showName: '教师名称', tableColumnName: 'teacherName', sortable: true },
        { id: 2, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
        { id: 3, showName: '实习岗位', tableColumnName: 'relInternshipName', sortable: true },
        { id: 4, showName: '状态', tableColumnName: 'customize-status' },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'RelTeacherStudent',
    formItems: [
      { name: '教师名称', field: 'teacherId', type: 'select', keyWords: 'BaseUser', searchKeys: { jobId: '3' },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
      { name: '实习项目', field: 'internshipId', type: 'select', keyWords: 'MainInternship', sortJson: { properties: 'Id', direction: 'DESC' } },
      { name: '实习岗位', field: 'relInternshipId', type: 'select', keyWords: 'RelStuInternshipPost', sortJson: { properties: 'Id', direction: 'DESC' } },
    ],
    formRules: {
      teacherId: [{ required: true, message: '教师名称不能为空', trigger: 'blur' }],
      internshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
      relInternshipId: [{ required: true, message: '实习岗位不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'RelTeacherStudent',
  },
});

// Merge view: row.id = VP ID，编辑时需要用业务记录ID
function handleEditClick(row) {
  const editRow = { ...row, id: row.relationId || row.relTeacherStudentId };
  baseListRef.value.openDlg('edit', editRow);
}

// 自定义删除：先删VP记录，再删业务记录
async function handleDeleteClick(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return;
  try {
    const vpIds = list.map(r => r.id).filter(Boolean);
    const relationIds = list.map(r => r.relationId || r.relTeacherStudentId).filter(Boolean);

    if (vpIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('MainVerifyProcess', vpIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除流程记录失败');
        return;
      }
    }
    if (relationIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('RelTeacherStudent', relationIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    baseListRef.value?.initDataList();
  } catch (error) {
    console.error('删除失败:', error);
  }
}
</script>

<template>
  <BaseList :default-props="defaultProps" ref="baseListRef" @edit-click="handleEditClick"
    @confirm-click="onConfirmClick" @delete-click="handleDeleteClick" @update-record="handleUpdateRecord" />
</template>
<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';

const baseListRef = ref(null);
const { getVerifyRoleName } = useVerifyFilter();

defineOptions({
  name: 'RelStuInternshipPost',
});

const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelStuInternshipPostMerge' },
      allTableColumns: [
        { id: 1, showName: '学号', tableColumnName: 'account', sortable: true },
        { id: 2, showName: '学生名称', tableColumnName: 'studentName', sortable: true },
        { id: 3, showName: '实习岗位', tableColumnName: 'internshipPostName', sortable: true },
        { id: 4, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
        { id: 5, showName: '状态', tableColumnName: 'customize-status' },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'RelStuInternshipPost',
    formItems: [
      {
        name: '学生名称',
        field: 'studentId',
        type: 'select',
        keyWords: 'BaseUser',
        searchKeys: { jobCode: 'STUDENT' },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
      { name: '实习岗位', field: 'postId', type: 'select', keyWords: 'MainInternshipPost', sortJson: { properties: 'Id', direction: 'DESC' } },
      { name: '实习项目', field: 'internshipId', type: 'select', keyWords: 'MainInternship', sortJson: { properties: 'Id', direction: 'DESC' } },
    ],
    formRules: {
      studentId: [{ required: true, message: '学生名称不能为空', trigger: 'blur' }],
      postId: [{ required: true, message: '实习岗位不能为空', trigger: 'blur' }],
      internshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'RelStuInternshipPost',
  },
});

// 存储表单数据，用于在保存成功后更新实习项目人数
let currentFormData = null;

// 检查是否存在重复记录
async function checkDuplicateRecord(form) {
  if (!form.id && form.studentId && form.postId && form.internshipId) {
    try {
      const resp = await listAPI.getSomeRecords({
        keyWords: 'RelStuInternshipPost',
        pageInfo: { page: 1, size: 1 },
        searchKey: { studentId: form.studentId, postId: form.postId, internshipId: form.internshipId },
        reg: { studentId: '=', postId: '=', internshipId: '=' },
      });
      const records = resp?.data?.content || [];
      return records.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

// Merge view: row.id = VP ID，编辑时需要用业务记录ID
function handleEditClick(row) {
  const editRow = { ...row, id: row.relationId || row.relStuInternshipPostId };
  baseListRef.value.openDlg('edit', editRow);
}

// 处理确认点击事件
async function onConfirmClick(form) {
  currentFormData = { ...form };

  const isDuplicate = await checkDuplicateRecord(form);
  if (isDuplicate) {
    ElMessage.warning('该学生已经选择了相同的岗位和项目，请重新选择！');
    throw new Error('存在重复记录，不允许保存');
  }
}

// 保存成功后更新实习项目学生人数
function handleUpdateRecord(form) {
  const isNewRecord = !currentFormData || !currentFormData.id || currentFormData.id === 0;
  const internshipId = form?.internshipId || currentFormData?.internshipId;

  if (isNewRecord && internshipId) {
    updateInternshipStudentCount(internshipId, 1).catch((e) => {
      console.error('更新实习项目学生人数失败:', e);
    });
  }
  currentFormData = null;
}

// 处理删除学生选择记录
async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];
  // 统计每个实习项目需要删除的记录数
  const internshipDeleteCount = new Map();

  rowsToDelete.forEach(row => {
    if (row.internshipId) {
      const currentCount = internshipDeleteCount.get(row.internshipId) || 0;
      internshipDeleteCount.set(row.internshipId, currentCount + 1);
    }
  });

  try {
    // Merge view: row.id = VP ID, row.relationId = 业务记录ID
    const vpIds = rowsToDelete.map(item => item.id).filter(Boolean);
    const relationIds = rowsToDelete.map(item => item.relationId || item.relStuInternshipPostId).filter(Boolean);

    if (vpIds.length > 0) {
      const vpResp = await listAPI.delOneOrManyNodes('MainVerifyProcess', vpIds);
      if (!vpResp || vpResp.message !== 'successful') {
        ElMessage.error(vpResp?.message || '删除流程记录失败');
        return false;
      }
    }
    if (relationIds.length > 0) {
      const deleteResp = await listAPI.delOneOrManyNodes('RelStuInternshipPost', relationIds);
      if (!deleteResp || deleteResp.message !== 'successful') {
        ElMessage.error(deleteResp?.message || '删除记录失败');
        return false;
      }
    }

    ElMessage.success('删除成功');

    // 更新受影响实习项目的学生人数
    for (const [internshipId, deleteCount] of internshipDeleteCount.entries()) {
      try {
        await updateInternshipStudentCount(internshipId, -deleteCount);
      } catch (countError) {
        console.error(`更新实习项目 ${internshipId} 学生人数失败:`, countError);
      }
    }

    baseListRef.value?.initDataList();
    return true;
  } catch (error) {
    console.error('删除失败:', error);
    return false;
  }
}

// 更新实习项目的学生人数统计
async function updateInternshipStudentCount(internshipId, delta) {
  const resp = await listAPI.getSomeRecords({
    keyWords: 'MainInternship',
    pageInfo: { page: 1, size: 1 },
    searchKey: { id: internshipId },
    reg: { id: '=' },
  });
  const records = resp?.data?.content || [];
  if (records.length > 0) {
    const currentStudentNum = records[0].studentNum || 0;
    const newStudentNum = Math.max(0, currentStudentNum + delta);
    await listAPI.editOneNode('MainInternship', { id: internshipId, studentNum: newStudentNum });
  }
}
</script>


<template>
  <BaseList ref="baseListRef" :default-props="defaultProps" @edit-click="handleEditClick"
    @delete-click="handleDeleteClick" @confirm-click="onConfirmClick" />
</template>

<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';

defineOptions({
  name: 'MainInternshipPost',
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
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPostMerge' },
      allTableColumns: [
        { id: 1, showName: '实习项目', theOrder: 1, tableColumnName: 'internshipName', sortable: true },
        { id: 2, showName: '岗位名称', theOrder: 2, tableColumnName: 'internshipPostName', sortable: true },
        { id: 3, showName: '岗位人数', theOrder: 3, tableColumnName: 'allPersonNum', sortable: true },
        { id: 4, showName: '已选人数', theOrder: 4, tableColumnName: 'nowPersonNum', sortable: true },
        { id: 5, showName: '状态', theOrder: 5, tableColumnName: 'customize-status' },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'MainInternshipPost',
    formItems: [
      { name: '实习项目', field: 'mainInternshipId', type: 'select', keyWords: 'MainInternship', sortJson: { properties: 'Id', direction: 'DESC' } },
      { name: '岗位名称', field: 'basePostTypeId', type: 'select', keyWords: 'BasePostType' },
      { name: '岗位人数', field: 'allPersonNum', type: 'input' },
    ],
    formRules: {
      basePostTypeId: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      allPersonNum: [
        { required: true, message: '岗位人数不能为空', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value === '' || value === null || value === undefined) {
              callback();
              return;
            }
            const numValue = typeof value === 'string' ? Number(value) : value;
            if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
              callback(new Error('岗位人数必须是大于0的整数'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ],
      mainInternshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'MainInternshipPost',
  },
});

// Merge view: row.id = VP ID，编辑时需要用业务记录ID
function handleEditClick(row) {
  const editRow = { ...row, id: row.internshipPostId || row.relationId };
  baseListRef.value.openDlg('edit', editRow);
}

// 自定义删除：先删VP记录，再删业务记录
async function handleDeleteClick(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return;
  try {
    const vpIds = list.map(r => r.id).filter(Boolean);
    const postIds = list.map(r => r.internshipPostId || r.relationId).filter(Boolean);

    if (vpIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('MainVerifyProcess', vpIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除流程记录失败');
        return;
      }
    }
    if (postIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('MainInternshipPost', postIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除岗位记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    baseListRef.value?.initDataList();
  } catch (error) {
    console.error('删除失败:', error);
  }
}

function onConfirmClick(form) {
  // 仅新增记录时初始化 nowPersonNum，编辑时不覆盖已有值
  if (!form.id) {
    form.nowPersonNum = 0;
  }
}

</script>
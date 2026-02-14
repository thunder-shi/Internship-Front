<template>
  <BaseList :default-props="defaultProps" :baselist-confirm="handleConfirm" @tree-select-change="treeSelectChange" @edit-click="handleEditClick" ref="baseList" />
</template>
<script setup>
import { reactive, onMounted, ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import listAPI from '@/api/list';
import dlgAPI from '@/utils/forDialog';
defineOptions({
  name: 'BasePostType',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'BasePostType', view: 'ViewBasePostType' },
      allTableColumns: [
        { id: 1, showName: '所属企业', theOrder: 1, tableColumnName: 'departmentName', sortable: true },
        { id: 3, showName: '岗位代码', theOrder: 3, tableColumnName: 'code', sortable: false },
        { id: 2, showName: '岗位名称', theOrder: 2, tableColumnName: 'name', sortable: false },
        { id: 4, showName: '岗位薪资', theOrder: 4, tableColumnName: 'salary', sortable: false },
        { id: 5, showName: '岗位地址', theOrder: 5, tableColumnName: 'address', sortable: false },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BasePostType',
    formItems: [
      { name: '所属企业', field: 'companyId', type: 'cascader', keyWords: 'BaseDepartment', searchKeys: { typeId: 1 } },
      { name: '适合专业', field: 'majorIds', type: 'cascader', keyWords: 'BaseMajor', multiple: true },
      { name: '岗位编码', field: 'code', type: 'input' },
      { name: '岗位名称', field: 'name', type: 'input' },
      { name: '岗位薪资', field: 'salary', type: 'input' },
      { name: '岗位地址', field: 'address', type: 'input' },
      { name: '其他说明', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      companyId: [{ required: true, message: '所属企业不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      majorIds: [{ required: true, message: '适合专业不能为空', trigger: 'blur' }]
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'BasePostType',
  },
});

function getOptions() {
  return new Promise((resolve) => {
    const resp = listAPI.getSomeRecords({
      keyWords: 'BaseDepartment',
      searchKey: { typeId: 1 },
    });
    resolve(resp);
  });
}

const baseList = ref(null);

function treeSelectChange(val, field, form, node) {
  if (field === 'companyId') {
    // 所属企业变化时，自动填充岗位地址
    form.address = node[0].data.departmentAdd || '';
  } else if (field === 'majorIds') {
    // 专业选择变化时的处理（如果需要可以在这里添加逻辑）
  }
}

// 加载已选择的专业ID列表
async function loadMajorIds(postTypeId) {
  try {
    // 查询关联表，获取当前岗位类型关联的所有专业
    const resInfo = await listAPI.getSomeRecords({
      keyWords: 'RelPostMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { postTypeId: postTypeId },
      reg: { postTypeId: '=' }
    });

    const records = resInfo?.data?.records || resInfo?.data?.content || [];
    
    if (records && records.length > 0) {
      // 提取所有专业ID（后端返回的字段名是 majorId）
      const majorIds = records.map(item => item.majorId);
      return majorIds;
    }
    return [];
  } catch (error) {
    console.error('加载专业数据失败:', error);
    return [];
  }
}

// 保存专业关联关系
async function saveMajorIds(postTypeId, majorIds) {
  try {
    // 先查询现有的关联关系
    const existingRes = await listAPI.getSomeRecords({
      keyWords: 'RelPostMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { postTypeId: postTypeId },
      reg: { postTypeId: '=' }
    });

    // 支持 data.records 和 data.content 两种数据结构
    const existingRecords = existingRes?.data?.records || existingRes?.data?.content || [];
    const existingMajorIds = existingRecords.map(item => item.majorId);
    
    // 需要删除的专业ID（存在于数据库但不在新列表中）
    const toDelete = existingMajorIds.filter(id => !majorIds.includes(id));
    
    // 需要新增的专业ID（存在于新列表但不在数据库中）
    const toAdd = majorIds.filter(id => !existingMajorIds.includes(id));

    // 删除不再关联的专业
    if (toDelete.length > 0) {
      const deleteIds = existingRecords
        .filter(item => toDelete.includes(item.majorId))
        .map(item => item.id);
      
      if (deleteIds.length > 0) {
        await listAPI.delOneOrManyNodes('RelPostMajor', deleteIds);
      }
    }

    // 新增关联的专业
    for (const majorId of toAdd) {
      const saveData = {
        postTypeId: postTypeId,
        majorId: majorId
      };
      await listAPI.editOneNode('RelPostMajor', saveData);
    }
  } catch (error) {
    console.error('保存专业关联关系失败:', error);
    ElMessage.warning('保存专业关联关系失败');
  }
}

// 自定义确认函数，处理专业关联关系的保存
async function handleConfirm(option, type, form) {
  try {
    // 获取SimpleDialog的formPanelRef
    const simpleDialog = baseList.value?.$refs?.simpleDialog;
    const formPanelRef = simpleDialog?.formPanelRef;
    
    if (!formPanelRef) {
      ElMessage.error('无法获取表单引用');
      return false;
    }

    // 先保存基本信息（使用commonSubmitDlg进行表单验证和保存）
    const userId = null; // BaseList内部会处理userId
    const resInfo = await dlgAPI.commonSubmitDlg(formPanelRef, form, 'BasePostType', 'edit', false, false, userId);
    
    if (resInfo && resInfo.message === 'successful') {
      // 保存基本信息成功后，保存专业关联关系
      let postTypeId = form.id;
      
      // 如果是新增，后端会返回id
      if (resInfo.data && resInfo.data.id) {
        postTypeId = resInfo.data.id;
        form.id = postTypeId;
      }
      
      // 保存专业关联关系
      if (postTypeId != null && postTypeId !== 0) {
        await saveMajorIds(postTypeId, form.majorIds || []);
      }
      
      // 返回true表示保存成功，BaseList会自动刷新列表
      return true;
    } else {
      // commonSubmitDlg已经显示了错误消息，这里返回false阻止关闭对话框
      return false;
    }
  } catch (error) {
    console.error('保存失败:', error);
    return false;
  }
}

// 编辑时加载专业数据并打开对话框
async function handleEditClick(row) {
  // 先打开对话框，然后再加载专业数据
  if (row && row.id) {
    // 先设置一个空的majorIds，避免undefined
    row.majorIds = row.majorIds || [];
    // 打开对话框
    baseList.value?.openDlg('edit', row);
    // 等待对话框打开后再加载专业数据
    await nextTick();
    // 异步加载专业数据，加载完成后更新表单
    try {
      const majorIds = await loadMajorIds(row.id);
      // 等待DOM更新后再更新表单
      await nextTick();
      // 更新表单中的专业ID
      const simpleDialog = baseList.value?.$refs?.simpleDialog;
      if (simpleDialog && simpleDialog.form) {
        simpleDialog.form.majorIds = majorIds || [];
      }
    } catch (error) {
      console.error('加载专业数据失败:', error);
    }
  } else {
    // 新增模式，清空专业选择
    if (row) {
      row.majorIds = [];
    }
    // 打开对话框
    baseList.value?.openDlg('edit', row);
  }
}

onMounted(() => {
  getOptions().then((res) => {
    defaultProps.defaultSDProps.formItems[0].options = res.data.content || [];
  });
});
</script>

<template>
  <BaseList :default-props="defaultProps" ref="baseListRef" @confirm-click="onConfirmClick" @delete-click="handleDeleteClick" @update-record="handleUpdateRecord" />
</template>
<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import listAPI from '@/api/list';

const baseListRef = ref(null);

defineOptions({
  name: 'RelStuInternship',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
      },
      keyWord: { edit: 'RelStuInternship', view: 'ViewRelStuInternship' },
      allTableColumns: [
        {
          id: 1,
          showName: '学生名称',
          tableColumnName: 'studentName',
          sortable: true,
        },
        {
          id: 2,
          showName: '实习岗位',
          tableColumnName: 'internshipPostName',
          sortable: true,
        },
        {
          id: 3,
          showName: '实习项目',
          tableColumnName: 'internshipName',
          sortable: true,
        },
        {
          id: 4,
          showName: '志愿轮数',
          tableColumnName: 'round',
          sortable: true,  
        },
        {
          id: 5,
          showName: '志愿排序',
          tableColumnName: 'sort',
          sortable: true,        
        }

      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'RelStuInternship',
    formItems: [
      {
        name: '学生名称',
        field: 'studentId',
        type: 'select',
        keyWords: 'BaseUser',
        searchKeys: { jobId: '3' },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
      { name: '实习岗位', field: 'postId', type: 'select', keyWords: 'MainInternshipPost' },
      { name: '实习项目', field: 'internshipId', type: 'select', keyWords: 'MainInternship' },
      { name: '审核状态', field: 'isAudit', type: 'input', hidden: true },
      { name: '志愿轮数', field: 'round', type: 'input', hidden: true },
      { name: '志愿排序', field: 'sort', type: 'input', hidden: true },
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
    keyWords: 'RelStuInternship',
  },
});

// 存储表单数据，用于在保存成功后更新实习项目人数
let currentFormData = null;

// 检查是否存在重复记录
async function checkDuplicateRecord(form) {
  const isNewRecord = !form.id || form.id === 0;
  
  // 只有新增记录才需要检查重复
  if (!isNewRecord) {
    return false; // 编辑记录不检查重复
  }
  
  // 必须要有学生ID、岗位ID和项目ID才能检查
  if (!form.studentId || !form.postId || !form.internshipId) {
    return false; // 缺少必要字段，不检查
  }
  
  try {
    console.log('开始检查重复记录，studentId:', form.studentId, 'postId:', form.postId, 'internshipId:', form.internshipId);
    
    // 查询该学生的所有选择记录
    const resp = await listAPI.getSomeRecords({
      keyWords: 'RelStuInternship',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { 
        studentId: form.studentId,
        postId: form.postId,
        internshipId: form.internshipId
      },
      reg: { 
        studentId: '=',
        postId: '=',
        internshipId: '='
      }
    });
    
    if (resp && resp.data && resp.data.content) {
      const records = resp.data.content;
      // 过滤掉当前编辑的记录（如果有）
      const existingRecords = records.filter(item => item.id !== form.id);
      
      if (existingRecords.length > 0) {
        console.log('发现重复记录:', existingRecords);
        return true; // 存在重复记录
      }
    }
    
    return false; // 没有重复记录
  } catch (error) {
    console.error('检查重复记录失败:', error);
    // 检查失败时，为了安全起见，不阻止保存（避免因为网络问题导致无法保存）
    return false;
  }
}

// 处理确认点击事件，设置默认值
async function onConfirmClick(form) {
  console.log('=== onConfirmClick 被调用 ===');
  console.log('接收到的form:', form);
  
  currentFormData = { ...form };
  
  // 检查是否存在重复记录
  const isDuplicate = await checkDuplicateRecord(form);
  if (isDuplicate) {
    ElMessage.warning('该学生已经选择了相同的岗位和项目，请重新选择！');
    throw new Error('存在重复记录，不允许保存');
  }
  
  // 如果 is_audit 字段未设置，默认设置为 -1（保存未提交）
  if (form.isAudit === undefined || form.isAudit === null || form.isAudit === '') {
    form.isAudit = -1;
    console.log('设置isAudit默认值为-1');
  } else {
    // 确保是数字类型
    form.isAudit = Number(form.isAudit);
  }
  
  // 如果 round 字段未设置，默认设置为 1
  if (form.round === undefined || form.round === null || form.round === '') {
    form.round = 1;
    console.log('设置round默认值为1');
  } else {
    // 确保是数字类型
    form.round = Number(form.round);
  }
  
  // 如果是新增记录且有学生ID，查询该学生的其他选择记录，自动设置排序
  const isNewRecord = !form.id || form.id === 0;
  console.log('是否为新增记录:', isNewRecord, '学生ID:', form.studentId);
  
  if (isNewRecord && form.studentId) {
    console.log('开始查询学生最大排序值，studentId:', form.studentId);
    try {
      const maxSort = await getMaxSortForStudent(form.studentId, form.id);
      form.sort = maxSort + 1;
      console.log(`✓ 学生 ${form.studentId} 的最大排序值为 ${maxSort}，新记录排序值设置为 ${form.sort}`);
    } catch (error) {
      console.error('✗ 获取学生最大排序值失败:', error);
      // 如果查询失败，使用默认值 1
      form.sort = 1;
    }
  } else {
    // 如果 sort 字段未设置，默认设置为 1
    if (form.sort === undefined || form.sort === null || form.sort === '') {
      form.sort = 1;
      console.log('设置sort默认值为1');
    } else {
      // 确保是数字类型
      form.sort = Number(form.sort);
    }
  }
  
  console.log('onConfirmClick处理后的form:', form);
}

// 获取指定学生的最大排序值
async function getMaxSortForStudent(studentId, excludeId = null) {
  try {
    console.log(`开始查询学生 ${studentId} 的选择记录（排除ID: ${excludeId}）`);
    
    // 查询该学生的所有选择记录，使用表名而不是视图
    const resp = await listAPI.getSomeRecords({
      keyWords: 'RelStuInternship', // 使用表名
      pageInfo: { page: 1, size: 1000 }, // 获取所有记录
      searchKey: { studentId: studentId },
      reg: { studentId: '=' }
    });
    
    console.log('查询响应:', resp);
    
    if (resp && resp.data && resp.data.content) {
      // 过滤掉当前编辑的记录（如果有）
      let records = resp.data.content;
      if (excludeId) {
        records = records.filter(item => item.id !== excludeId);
        console.log(`过滤后剩余 ${records.length} 条记录（排除ID: ${excludeId}）`);
      }
      
      console.log(`查询学生 ${studentId} 的选择记录，找到 ${records.length} 条记录`);
      
      // 找到最大的 sort 值
      if (records.length === 0) {
        console.log(`学生 ${studentId} 没有其他选择记录，返回最大排序值 0`);
        return 0; // 没有其他记录，返回 0，新记录将是 1
      }
      
      const sortValues = records.map(item => {
        const sortValue = item.sort;
        const numValue = (sortValue !== null && sortValue !== undefined && sortValue !== '') ? Number(sortValue) : 0;
        console.log(`记录 ID: ${item.id}, studentId: ${item.studentId}, sort 值: ${sortValue} -> ${numValue}`);
        return numValue;
      });
      
      const maxSort = Math.max(...sortValues);
      console.log(`学生 ${studentId} 的最大排序值为: ${maxSort}`);
      
      return maxSort;
    }
    
    console.log(`查询结果为空，返回最大排序值 0`);
    return 0;
  } catch (error) {
    // 如果查询失败（包括401等错误），返回0，让调用方使用默认值1
    // 不抛出错误，避免阻止保存流程
    console.warn('查询学生选择记录失败，将使用默认排序值:', error);
    return 0;
  }
}

// 在组件挂载后设置自定义确认逻辑
onMounted(async () => {
  console.log('=== RelStuInternship组件已挂载 ===');
  await nextTick();
  
  // 获取 SimpleDialog 的引用
  const simpleDialog = baseListRef.value?.simpleDialog;
  console.log('baseListRef.value:', baseListRef.value);
  console.log('simpleDialog:', simpleDialog);
  
  if (simpleDialog) {
    console.log('✓ 找到SimpleDialog，准备重写_confirm方法');
    // 保存原始的 _confirm 方法
    const originalConfirm = simpleDialog._confirm;
    
    // 重写 _confirm 方法
    simpleDialog._confirm = async (option, type, formData = null) => {
      console.log('=== _confirm 方法被调用 ===');
      console.log('option:', option, 'type:', type, 'formData:', formData);
      
      try {
        // 在保存前，如果是新增记录且有学生ID，先计算并设置 sort 值
        const form = simpleDialog.form || currentFormData;
        console.log('当前form对象:', form);
        console.log('form.id:', form?.id, 'form.studentId:', form?.studentId, 'form.sort:', form?.sort);
        
        if (form) {
          const isNewRecord = !form.id || form.id === 0;
          console.log('是否为新增记录:', isNewRecord);
          
          // 新增记录时，查询该学生的其他选择记录，自动设置排序
          if (isNewRecord && form.studentId) {
            console.log('开始查询学生最大排序值，studentId:', form.studentId);
            try {
              const maxSort = await getMaxSortForStudent(form.studentId, form.id);
              form.sort = maxSort + 1;
              console.log(`✓ 学生 ${form.studentId} 的最大排序值为 ${maxSort}，新记录排序值设置为 ${form.sort}`);
            } catch (error) {
              console.error('✗ 获取学生最大排序值失败:', error);
              // 如果查询失败（包括401错误），使用默认值 1，不阻止保存
              form.sort = 1;
            }
          } else {
            console.log('跳过查询 - isNewRecord:', isNewRecord, 'studentId:', form?.studentId);
          }
          
          // 确保 sort 是数字类型且不为 null
          if (form.sort === undefined || form.sort === null || form.sort === '') {
            console.log('sort值为空，设置为默认值1');
            form.sort = 1;
          } else {
            form.sort = Number(form.sort);
            console.log('最终sort值:', form.sort);
          }
        } else {
          console.warn('form对象为空！');
        }
        
        console.log('=== 准备调用原始_confirm方法 ===');
        
        // 调用原始的确认方法
        const result = await originalConfirm.call(simpleDialog, option, type, formData);
        
        console.log('保存结果:', result);
        console.log('currentFormData:', currentFormData);
        
        // 如果保存成功且有实习项目ID，更新实习项目的学生人数
        if (result && result.message === 'successful') {
          // 使用form对象获取最新的数据（可能包含保存后的id）
          const form = simpleDialog.form || currentFormData;
          const internshipId = form?.internshipId || currentFormData?.internshipId;
          
          if (internshipId) {
            // 判断是新增还是编辑（通过检查form.id是否存在且不为0）
            const isNewRecord = !form.id || form.id === 0;
            console.log('保存成功，是否为新增记录:', isNewRecord, '实习项目ID:', internshipId);
            
            if (isNewRecord) {
              // 新增记录，学生人数 +1
              try {
                console.log(`开始更新实习项目 ${internshipId} 的学生人数 +1`);
                await updateInternshipStudentCount(internshipId, 1);
                console.log(`✓ 实习项目 ${internshipId} 的学生人数已更新`);
              } catch (countError) {
                // 更新人数失败不影响主流程，只记录错误
                console.error('更新实习项目学生人数失败:', countError);
              }
            } else {
              console.log('编辑记录，不需要更新学生人数');
            }
          } else {
            console.warn('保存成功但没有实习项目ID，无法更新学生人数');
          }
        } else {
          console.warn('保存失败或结果异常:', result);
        }
        
        return result;
      } catch (error) {
        // 401 错误通常是认证问题，让错误正常抛出，由全局拦截器处理
        console.error('保存失败:', error);
        throw error;
      }
    };
  }
});

// 处理保存成功后的更新
function handleUpdateRecord(form) {
  console.log('=== handleUpdateRecord 被调用 ===');
  console.log('保存成功后的form:', form);
  console.log('保存前的currentFormData:', currentFormData);
  
  // 使用保存前的currentFormData来判断是否是新增记录
  // 因为保存成功后form.id已经被设置了
  const isNewRecord = !currentFormData || !currentFormData.id || currentFormData.id === 0;
  const internshipId = form?.internshipId || currentFormData?.internshipId;
  
  console.log('是否为新增记录:', isNewRecord, '实习项目ID:', internshipId);
  
  if (isNewRecord && internshipId) {
    // 新增记录，学生人数 +1
    console.log(`开始更新实习项目 ${internshipId} 的学生人数 +1`);
    updateInternshipStudentCount(internshipId, 1)
      .then(() => {
        console.log(`✓ 实习项目 ${internshipId} 的学生人数已更新`);
      })
      .catch((countError) => {
        // 更新人数失败不影响主流程，只记录错误
        console.error('更新实习项目学生人数失败:', countError);
      });
  } else {
    console.log('编辑记录或没有实习项目ID，不需要更新学生人数');
  }
  
  // 清空currentFormData，为下次保存做准备
  currentFormData = null;
}

// 处理删除学生选择记录
async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];
  // 统计每个实习项目需要删除的记录数
  const internshipDeleteCount = new Map(); // Map<internshipId, count>
  // 收集受影响的学生ID（用于重新排序）
  const affectedStudentIds = new Set(); // Set<studentId>
  
  // 统计要删除记录的实习项目ID和数量，同时收集受影响的学生ID
  rowsToDelete.forEach(row => {
    if (row.internshipId) {
      const currentCount = internshipDeleteCount.get(row.internshipId) || 0;
      internshipDeleteCount.set(row.internshipId, currentCount + 1);
    }
    if (row.studentId) {
      affectedStudentIds.add(row.studentId);
    }
  });
  
  try {
    // 执行删除操作
    const ids = rowsToDelete.map(item => item.id);
    const deleteResp = await listAPI.delOneOrManyNodes('RelStuInternship', ids);
    
    if (deleteResp && deleteResp.message === 'successful') {
      ElMessage.success('删除成功！');
      
      // 更新受影响实习项目的学生人数统计
      // 每个实习项目减去对应的删除记录数
      for (const [internshipId, deleteCount] of internshipDeleteCount.entries()) {
        try {
          await updateInternshipStudentCount(internshipId, -deleteCount);
          console.log(`实习项目 ${internshipId} 删除了 ${deleteCount} 条记录，学生人数 -${deleteCount}`);
        } catch (countError) {
          // 更新人数失败不影响主流程，只记录错误
          console.error(`更新实习项目 ${internshipId} 学生人数失败:`, countError);
        }
      }
      
      // 重新排序受影响学生的剩余记录
      for (const studentId of affectedStudentIds) {
        try {
          await reorderStudentRecords(studentId);
        } catch (reorderError) {
          // 重新排序失败不影响主流程，只记录错误
          console.error(`重新排序学生 ${studentId} 的记录失败:`, reorderError);
        }
      }
      
      // 刷新列表
      baseListRef.value?.initDataList();
      
      return true;
    } else {
      ElMessage.warning(deleteResp?.message || '删除失败');
      return false;
    }
  } catch (error) {
    console.error('删除学生选择记录失败:', error);
    ElMessage.error('删除失败，请重试');
    return false;
  }
}

// 重新排序指定学生的记录
async function reorderStudentRecords(studentId) {
  try {
    console.log(`开始重新排序学生 ${studentId} 的记录`);
    
    // 查询该学生的所有剩余记录
    const resp = await listAPI.getSomeRecords({
      keyWords: 'RelStuInternship',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { studentId: studentId },
      reg: { studentId: '=' }
    });
    
    if (resp && resp.data && resp.data.content) {
      const records = resp.data.content;
      
      if (records.length === 0) {
        console.log(`学生 ${studentId} 没有剩余记录，无需重新排序`);
        return;
      }
      
      // 按照当前的sort值排序
      const sortedRecords = [...records].sort((a, b) => {
        const sortA = Number(a.sort) || 0;
        const sortB = Number(b.sort) || 0;
        return sortA - sortB;
      });
      
      console.log(`学生 ${studentId} 有 ${sortedRecords.length} 条记录需要重新排序`);
      
      // 重新分配连续的排序值（1, 2, 3...）
      let hasChange = false;
      for (let i = 0; i < sortedRecords.length; i++) {
        const record = sortedRecords[i];
        const newSort = i + 1;
        const oldSort = Number(record.sort) || 0;
        
        if (oldSort !== newSort) {
          hasChange = true;
          // 更新记录的sort值
          const updateData = {
            id: record.id,
            sort: newSort
          };
          
          try {
            await listAPI.editOneNode('RelStuInternship', updateData);
            console.log(`记录 ID: ${record.id} 的排序值从 ${oldSort} 更新为 ${newSort}`);
          } catch (updateError) {
            console.error(`更新记录 ID: ${record.id} 的排序值失败:`, updateError);
          }
        }
      }
      
      if (hasChange) {
        console.log(`学生 ${studentId} 的记录重新排序完成`);
      } else {
        console.log(`学生 ${studentId} 的记录排序已经是连续的，无需更新`);
      }
    }
  } catch (error) {
    console.error(`重新排序学生 ${studentId} 的记录失败:`, error);
    throw error;
  }
}

// 更新实习项目的学生人数统计
// delta: 变化量，+1 表示增加，-1 表示减少
async function updateInternshipStudentCount(internshipId, delta) {
  try {
    // 先获取当前实习项目的学生人数
    const resp = await listAPI.getSomeRecords({
      keyWords: 'MainInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: internshipId },
      reg: { id: '=' }
    });
    
    if (resp && resp.data && resp.data.content && resp.data.content.length > 0) {
      const internship = resp.data.content[0];
      const currentStudentNum = internship.studentNum || 0;
      const newStudentNum = Math.max(0, currentStudentNum + delta); // 确保不会小于0
      
      // 更新实习项目的 studentNum 字段
      const updateData = {
        id: internshipId,
        studentNum: newStudentNum
      };
      
      const updateResp = await listAPI.editOneNode('MainInternship', updateData);
      
      if (updateResp && updateResp.message === 'successful') {
        console.log(`实习项目 ${internshipId} 的学生人数已更新为 ${newStudentNum}`);
      } else {
        console.error('更新实习项目学生人数失败:', updateResp?.message);
      }
    }
  } catch (error) {
    console.error('更新实习项目学生人数统计失败:', error);
    // 这里不显示错误消息给用户，避免影响主流程
    // 但会在控制台记录错误信息以便调试
  }
}
</script>

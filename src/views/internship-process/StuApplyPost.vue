<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生岗位申请'"
    :no-project-message="'当前没有可申请岗位的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @edit-click="handleEditClick"
    @project-selected="handleProjectSelected"
  >
    <!-- 岗位详情对话框（查看） -->
    <template #dialogs>
      <DlgPostDetail 
        ref="dlgPostDetail" 
        :current-internship="currentInternship" 
        @close-dialog="handlePostDetailClose" 
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';

defineOptions({
  name: 'StuApplyPost',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgPostDetail = ref(null);

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: '学生岗位申请'
});

// 存储当前已选岗位信息
const currentSelectedPost = ref(null);

// 保存当前实习项目信息（避免在操作过程中值丢失）
const savedCurrentInternship = ref(null);

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 获取 isMore1Disabled（从 headerPageRef）
const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

// 流程类型代码（用于获取实习项目列表）
const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELECT_POST;

// 实习项目选择对话框的查询关键字（用于 getSomeRecords，包含时间条件）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime
  };
  // 如果用户有专业ID，添加专业过滤条件
  if (userInfo.value?.majorId) {
    searchKey.majorIds = userInfo.value.majorId;
  }
  return searchKey;
});

// 实习项目选择对话框的查询操作符（用于 getSomeRecords）
const projectSelectRegKey = computed(() => {
  const regKey = {
    startTime: CONSTANT.SEARCH_OPERATOR.LE, // startTime <= 当前时间
    endTime: CONSTANT.SEARCH_OPERATOR.GE    // endTime >= 当前时间
  };
  // 如果用户有专业ID，添加专业过滤操作符
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});


// 构建查询条件（只查询"审核通过"的岗位）
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.PASS // 只查询"审核通过"状态的记录
  };
}

// 查询已选岗位信息
async function querySelectedPost(internshipId, studentId) {
  if (!internshipId || !studentId) {
    return null;
  }
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPost',
      searchKey: {
        internshipId: internshipId,
        studentId: studentId
      }
    });
    if (response && response.data) {
      const dataList = response.data.content || response.data || [];
      if (dataList.length > 0) {
        return dataList[0];
      }
    }
    return null;
  } catch (error) {
    console.error('查询已选岗位失败:', error);
    return null;
  }
}


// 生成完整的标题（包含已选岗位信息）
async function generateFullTitle(baseTitle, internshipId, studentId) {
  if (!baseTitle) {
    return baseTitle;
  }  
  let selectedPostText = '无';  
  // 优先使用 currentSelectedPost.value（如果已有值）
  if (currentSelectedPost.value && currentSelectedPost.value.companyName) {
    const companyName = currentSelectedPost.value.companyName || '';
    const postName = currentSelectedPost.value.internshipPostName || '';
    if (companyName || postName) {
      selectedPostText = `${companyName}：${postName}`;
    }
  } else {
    // 如果 currentSelectedPost.value 没有值，查询数据库
    const selectedPost = await querySelectedPost(internshipId, studentId);
    currentSelectedPost.value = selectedPost;
    
    if (selectedPost) {
      const companyName = selectedPost.companyName || '';
      const postName = selectedPost.internshipPostName || '';
      if (companyName || postName) {
        selectedPostText = `${companyName}：${postName}`;
      }
    }
  }
  
  return `${baseTitle}。已选岗位：${selectedPostText}`;
}

// 处理项目选择后的回调
// 注意：InternshipPostHeaderPage 调用时只传2个参数 (internship, title)
// 内部调用时也只传2个参数 (internship, title)
async function handleProjectSelected(internship, title) {
  // 保存实习项目信息
  if (internship) {
    savedCurrentInternship.value = internship;
  }
  
  if (title) {
    // 如果实习项目尚未选择，直接使用原始标题，不添加"已选岗位"信息
    if (!internship || (!internship.internshipId && !internship.id)) {
      titleObj.mainTitle = title;
      return;
    }
    // 获取当前实习项目ID和用户ID
    const internshipId = internship.internshipId || internship.id;
    const studentId = userInfo.value?.id;
    // 生成包含已选岗位信息的完整标题
    const fullTitle = await generateFullTitle(title, internshipId, studentId);
    titleObj.mainTitle = fullTitle;
  }
}

// 查看按钮点击（显示岗位详情，只读模式）
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  dlgPostDetail.value?.showDialog(true, {}, row);
}

// 执行选择岗位操作（公共函数）
async function executeSelectPost(studentId, oldPostId, newPostId, needConfirm = false, confirmMessage = '') {
  try {
    // 如果需要确认，先显示确认对话框
    if (needConfirm) {
      await ElMessageBox.confirm(confirmMessage, '提示', {confirmButtonText: '确定',cancelButtonText: '取消',type: 'warning'});
    }
    
    // 调用API选择岗位
    const response = await otherAPI.stuSelPost(studentId, oldPostId, newPostId);
    if (response && response.message === 'successful') {
      // 使用后端返回的数据更新 currentSelectedPost
      if (response.data) {
        currentSelectedPost.value = response.data;
      }
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消，返回取消标识
      return { success: false, cancelled: true };
    }
    // 其他错误，记录并显示错误信息
    console.error('操作失败:', error);
    ElMessage.error('操作失败');
    return { success: false, cancelled: false };
  }
}

// 选定/取消按钮点击
async function handleEditClick(row) {
  // row 可能是数组（多选）或单个对象（单选）
  const selectedRow = Array.isArray(row) ? row[0] : row;
  // 使用存储的已选岗位信息
  const selectedPost = currentSelectedPost.value;
  const currentUserId = userInfo.value?.id;
  const studentId = userInfo.value?.id;
  const currentPostId = Number(selectedRow.internshipPostId) || 0;
  const selectedPostId = selectedPost ? (Number(selectedPost.internshipPostId) || 0) : 0;
  let operationSuccess = false; // 操作是否成功
  
  // 判断0：首先判断肯定不能修改的情况
  // 如果selectedPost有值，且isAudit=1（审核通过）或者createUserId和当前用户id不相等，不能修改
  if (selectedPost) {
    const isAudit = selectedPost.isAudit;
    if (isAudit === CONSTANT.AUDIT_STATUS.PASS || selectedPost.createUserId !== currentUserId) {
      ElMessage.warning('岗位选择已经进入审核流程，不能修改！');
      return;
    }
  }  
  // 判断1：如果已选岗位的postId和当前选中行的postId相等，执行取消选择
  if (selectedPost && selectedPostId && currentPostId && selectedPostId === currentPostId) {
    // 已经选择了这个岗位，执行取消选择
    try {
      await ElMessageBox.confirm('确认取消该岗位的选择吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });
      const studentId = userInfo.value?.id;
      const response = await otherAPI.stuSelPost(studentId, selectedPost.internshipPostId, 0);
      if (response && response.message === 'successful') {
        operationSuccess = true;
        // 清除已选岗位信息
        currentSelectedPost.value = null;
      }
    } catch (error) {
      // 用户取消，不做任何操作
      return;
    }
  }
  else {
    // 判断2：如果当前选中行的nowPersonNum=allPersonNum，岗位已选满
    const nowPersonNum = selectedRow.nowPersonNum || 0;
    const allPersonNum = selectedRow.allPersonNum || 0;
    if (nowPersonNum >= allPersonNum) {
      ElMessage.warning('当前岗位已经选满，无法选择！');
      return;
    }    
    // 判断3：如果已选岗位存在，提示是否更换（走到这里时，isAudit只能是0或2，且createUserId一定等于currentUserId）
    if (selectedPost) {
      // 用户确认更换，执行更换岗位操作
      const result = await executeSelectPost(studentId,selectedPostId,currentPostId,true,'你已经选择了岗位，确定更换新的岗位吗？');
      if (result.cancelled) {
        // 用户取消，不做任何操作
        return;
      }
      if (result.success) {
        operationSuccess = true;
      }
    } else {
      // 没有已选岗位，直接执行选定操作
      const result = await executeSelectPost(studentId, 0, currentPostId, false);
      if (result.success) {
        operationSuccess = true;
      }
    }
}  
  // 统一刷新数据列表和标题
  if (operationSuccess) {
    ElMessage.success('操作成功');
    // 等待数据列表刷新完成
    await headerPageRef.value?.baseListRef?.initDataList(true);
    // 更新标题（包含已选岗位信息）- 使用保存的 internship 值
    const internshipToUse = savedCurrentInternship.value;
    if (internshipToUse) {
      const baseTitle = generateTitleWithDate(internshipToUse);
      await handleProjectSelected(internshipToUse, baseTitle);
    }
  } else {
    ElMessage.success('操作失败');
  }
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  // 可以在这里处理关闭后的逻辑
}

// 生成带日期的标题（辅助函数）
function generateTitleWithDate(internship) {
  if (!internship) return '';
  const name = internship.internshipName || internship.name;
  if (!name) return '';
  const start = internship.startTime ? moment(internship.startTime).format('YYYY-MM-DD') : '';
  const end = internship.endTime ? moment(internship.endTime).format('YYYY-MM-DD') : '';
  if (start && end) {
    return `当前实习项目：${name}（${start}到${end}）`;
  }
  return `当前实习项目：${name}`;
}

// 更新标题（包含已选岗位信息）
async function updateTitleWithSelectedPost() {
  const internship = currentInternship.value;
  if (internship) {
    const baseTitle = generateTitleWithDate(internship);
    await handleProjectSelected(internship, baseTitle);
  }
}

// 监听当前实习项目变化，更新标题
watch(currentInternship, async () => {
  await updateTitleWithSelectedPost();
}, { immediate: true });

// 构建 defaultDTLProps（包含按钮和列配置）
const buttonPropsComputed = computed(() => {
  return {
    visible: { show: true, type: 'primary', name: '查看' },
    update: { show: true, type: 'primary', name: '选定/取消' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value }
  };
});

// 判断行是否是已选岗位
const getRowClassName = ({ row }) => {
  const selectedPost = currentSelectedPost.value;
  if (selectedPost && selectedPost.internshipPostId && row.internshipPostId) {
    // 将 internshipPostId 转换为字符串进行比较，因为可能一个是数字一个是字符串
    if (String(selectedPost.internshipPostId) === String(row.internshipPostId)) {
      return 'selected-post-row';
    }
  }
  return '';
};

const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
      checkFlag: false, // 设置为单选模式
    },
    enableAuditStatusCustom: true,
    rowClassName: getRowClassName,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPost' },
      allTableColumns: [
        { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 2, showName: '岗位编码', tableColumnName: 'internshipPostCode', sortable: true },
        { id: 3, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
        { id: 4, showName: '岗位总人数', tableColumnName: 'allPersonNum', sortable: true },
        { id: 5, showName: '已选人数', tableColumnName: 'nowPersonNum' }
      ],
    },
    defaultDBIProps: {},
  };
});

// 暴露给父组件的方法和属性
defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  dlgPostDetail,
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh()
});
</script>

<style scoped>
:deep(.selected-post-row) {
  background-color: #e6f7ff !important;
  font-weight: bold !important;
}
:deep(.selected-post-row:hover) {
  background-color: #bae7ff !important;
}
:deep(.selected-post-row td) {
  font-weight: bold !important;
}
</style>

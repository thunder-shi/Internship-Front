<template>
  <div class="internship-verify-container">
    <BaseList :default-props="defaultProps" ref="baseList" :baselist-confirm="handleConfirm" :client-filter-fn="clientFilterFn" @audit-click="handleAuditClick" />
    <!-- 审核对话框 -->
    <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
  </div>
</template>
<script setup>
import { reactive, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import CONSTANT from '@/utils/constant';
import moment from 'moment';


defineOptions({
  name: 'InternshipPlanVerify',
});

const store = useStore();
const baseList = ref(null);

const dlgInternshipVerify = ref(null);

// 精确检查 verifyUserId 是否包含指定的用户ID
// verifyUserId 格式是 "Id1|Id2|Id3..."，需要精确匹配，避免误匹配
// 例如：ID=3 不应该匹配 "|33|"
const isUserIdInVerifyUserId = (verifyUserId, userId) => {
  if (!verifyUserId || !userId) return false;
  const userIdStr = String(userId);
  const verifyUserIdStr = String(verifyUserId);

  // 将 verifyUserId 按 | 分割，检查是否包含精确的用户ID
  const ids = verifyUserIdStr.split('|').filter(id => id !== '');
  return ids.includes(userIdStr);
};

// 获取初始查询条件
const getInitSearchWords = () => {
  const searchKey = {};
  const regKey = {};
  const andor = {};

  // 注意：verifyUserId 字段不在这里查询，因为 LIKE 查询会有误匹配问题（如 ID=3 会匹配 "|33|"）
  // verifyUserId 的精确过滤将在 clientFilterFn 中进行

  // 获取当前时间字符串（格式：YYYY-MM-DD HH:mm:ss）
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  // 条件1: isAudit 等于"提交待审核"状态 (CONSTANT.AUDIT_STATUS.SUBMIT = 0)
  searchKey.isAudit = CONSTANT.AUDIT_STATUS.SUBMIT;
  regKey.isAudit = CONSTANT.SEARCH_OPERATOR.EQ;
  // 条件2: startTime <= 当前时间
  searchKey.startTime = currentTime;
  regKey.startTime = CONSTANT.SEARCH_OPERATOR.LE;
  // 条件3: endTime >= 当前时间
  searchKey.endTime = currentTime;
  regKey.endTime = CONSTANT.SEARCH_OPERATOR.GE;

  return {
    searchKey,
    regKey,
    andor, // AND 关系
  };
};

// 客户端过滤函数：精确过滤 verifyUserId 包含当前用户ID 的记录
const clientFilterFn = (dataList) => {
  const userInfo = store.getters.userInfo;
  const userId = userInfo?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  // 精确过滤：只保留 verifyUserId 中精确包含当前用户ID 的记录
  // 这样可以避免误匹配（如 ID=3 不会匹配 "|33|"）
  return dataList.filter(item => {
    if (!item || !item.verifyUserId) return false;
    return isUserIdInVerifyUserId(item.verifyUserId, userId);
  });
};

// 自定义确认函数，添加 creator 字段（用于新增）
const handleConfirm = async (option, type, form) => {
  // 添加当前用户 ID 作为 creator
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  // 调用 BaseList 暴露的原有保存逻辑
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 处理审核按钮点击事件
const handleAuditClick = (row) => {
  // row 可能是数组（多选）或单个对象（单选）
  // 取第一个选中的项目进行审核
  console.log(row)
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgInternshipVerify.value?.showDialog(true, selectedRow);
  }
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgInternshipVerify.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    defaultDTHProps: {
      buttonProps: { audit: { show: true, showPass: true, showNotPass: true, showBack: true } },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目编码', theOrder: 1, tableColumnName: 'internshipCode' },
        { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
        { id: 3, showName: '提交人', theOrder: 3, width: 100, tableColumnName: 'createUserName' },
        { id: 4, showName: '流程开始时间', theOrder: 4, width: 160, tableColumnName: 'startTime' },
        { id: 5, showName: '流程结束时间', theOrder: 5, width: 160, tableColumnName: 'endTime' },
        { id: 6, showName: '当前状态', theOrder: 6, width: 100, tableColumnName: 'isAudit' },
        { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' }
      ],
    },
    // 设置初始查询条件
    initSearchWords: getInitSearchWords(),
  }
});
</script>

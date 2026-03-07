<template>
  <div class="internship-verify-container">
    <BaseList :default-props="defaultProps" ref="baseList" :baselist-confirm="handleConfirm" @audit-click="handleAuditClick" />
    <!-- 审核对话框 -->
    <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
  </div>
</template>
<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import moment from 'moment';


defineOptions({
  name: 'InternshipPlanVerify',
});

const store = useStore();
const baseList = ref(null);

const dlgInternshipVerify = ref(null);

// 流程配置缓存（processId → 流程配置），从 ViewRelProcessInternship 加载
// 流程配置包含每个审核级别对应的角色 ID（verifyFirstRoleId 等）
const processConfigMap = ref(new Map());

// 角色名称缓存（roleId → roleName），从 SysRole 表加载（用于将角色ID解析为名称）
const roleNameMap = ref(new Map());

// 预加载流程配置（包含审核角色 ID）
async function loadProcessConfigs() {
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 500 },
    });
    if (res?.data?.content) {
      res.data.content.forEach(config => {
        processConfigMap.value.set(config.id, config);
      });
    }
  } catch (error) {
    console.error('加载流程配置失败:', error);
  }
}

// 预加载角色名称（将角色 ID 解析为角色名称）
async function loadRoleNames() {
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'SysRole',
      pageInfo: { page: 1, size: 100 },
    });
    if (res?.data?.content) {
      res.data.content.forEach(role => {
        roleNameMap.value.set(role.id, role.name);
      });
    }
  } catch (error) {
    console.error('加载角色名称失败:', error);
  }
}

// 通过 processId 和审核级别索引（0-based）获取角色名称
// 先从流程配置中查找角色名称，再回退到 SysRole 解析角色 ID
function getRoleNameByLevel(processId, levelIndex) {
  const config = processConfigMap.value.get(processId);
  if (!config) return '';

  const roleNameFields = [
    'verifyFirstRoleName', 'verifySecondRoleName', 'verifyThirdRoleName',
    'verifyFourthRoleName', 'verifyFifthRoleName'
  ];
  const roleIdFields = [
    'verifyFirstRoleId', 'verifySecondRoleId', 'verifyThirdRoleId',
    'verifyFourthRoleId', 'verifyFifthRoleId'
  ];

  if (levelIndex < 0 || levelIndex >= roleNameFields.length) return '';

  // 优先使用 VIEW 中的角色名称
  const roleName = config[roleNameFields[levelIndex]];
  if (roleName && roleName !== '--' && roleName.trim() !== '') {
    return roleName;
  }

  // 回退：通过 SysRole 解析角色 ID
  const roleId = config[roleIdFields[levelIndex]];
  if (roleId && roleNameMap.value.has(roleId)) {
    return roleNameMap.value.get(roleId);
  }

  return '';
}

// 获取当前审核角色名称（用于 customize-status 列显示"待XX审核"）
const getVerifyRoleName = (row) => {
  if (row._currentRoleName) {
    return row._currentRoleName;
  }
  return '';
};

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
  // 条件1: isAudit IN (0, 1)，同时查询"待审核"和"审核通过"状态
  // 审核通过的记录用于最后一级审核人在截止时间内退回
  searchKey.isAudit = `${CONSTANT.AUDIT_STATUS.SUBMIT},${CONSTANT.AUDIT_STATUS.PASS}`;
  regKey.isAudit = CONSTANT.SEARCH_OPERATOR.IN;
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
// 同时支持最后一级审核人查看已通过的记录（用于退回操作）
// 同时计算 _currentRoleName 用于状态列显示
const clientFilterFn = (dataList) => {
  const userInfo = store.getters.userInfo;
  const userId = userInfo?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  // 按 processId 分组，区分待审核和已通过的记录
  const processGroups = {};
  dataList.forEach(item => {
    if (!item) return;
    const key = item.processId || item.id;
    if (!processGroups[key]) processGroups[key] = [];
    processGroups[key].push(item);
  });

  const result = [];

  Object.values(processGroups).forEach(group => {
    const pendingRecords = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
    const approvedRecords = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS);

    // 待审核记录：精确匹配 verifyUserId（原有逻辑）+ 计算当前审核角色名
    pendingRecords.forEach(record => {
      if (isUserIdInVerifyUserId(record.verifyUserId, userId)) {
        // 计算当前审核级别的角色名（从流程配置中获取）
        const passedCount = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS).length;
        const roleName = getRoleNameByLevel(record.processId, passedCount);
        if (roleName) {
          record._currentRoleName = roleName;
        }
        result.push(record);
      }
    });

    // 已全部通过的流程（无待审核记录）：仅最后一级审核人可看到，用于退回
    if (pendingRecords.length === 0 && approvedRecords.length > 0) {
      // 取最高 ID 的记录 = 最后一级审核人的审核记录
      const lastLevelRecord = approvedRecords.reduce((latest, r) =>
        (!latest || r.id > latest.id) ? r : latest, null
      );

      if (lastLevelRecord && isUserIdInVerifyUserId(lastLevelRecord.verifyUserId, userId)) {
        result.push(lastLevelRecord);
      }
    }
  });

  return result;
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

// 预加载流程配置和角色名称，加载完成后刷新列表以应用角色名解析
onMounted(async () => {
  await Promise.all([loadProcessConfigs(), loadRoleNames()]);
  baseList.value?.initDataList();
});

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgInternshipVerify.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    // 客户端过滤函数
    clientFilterFn: clientFilterFn,
    // 启用审核状态自定义显示（配合 customize-status 列，显示"待XX审核"）
    enableAuditStatusCustom: true,
    // 获取审核角色名称函数
    getVerifyRoleName: getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { audit: { show: true, showPass: true, showNotPass: true, showBack: true } },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目编码', theOrder: 1, tableColumnName: 'internshipCode' },
        { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
        { id: 3, showName: '提交人', theOrder: 3, width: 100, tableColumnName: 'createUserName' },
        { id: 4, showName: '流程开始时间', theOrder: 4, width: 160, tableColumnName: 'startTime' },
        { id: 5, showName: '流程结束时间', theOrder: 5, width: 160, tableColumnName: 'endTime' },
        { id: 6, showName: '当前状态', theOrder: 6, width: 120, tableColumnName: 'customize-status' },
        { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' }
      ],
    },
    // 设置初始查询条件
    initSearchWords: getInitSearchWords(),
  }
});
</script>

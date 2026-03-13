<template>
  <div class="internship-verify-container">
    <InternshipPostHeaderPage
      ref="headerPageRef"
      :page-title="'学生实习项目安排审核'"
      :no-project-message="'当前没有需要审核的学生实习项目'"
      :project-select-search-key="projectSelectSearchKey"
      :project-select-reg-key="projectSelectRegKey"
      :default-d-t-l-props="defaultDTLProps"
      :build-search-key="buildSearchKey"
      :is-company-user="isCompanyUser"
      @audit-click="handleAuditClick"
      @project-selected="handleProjectSelected"
    >
      <!-- 审核对话框 -->
      <template #dialogs>
        <DlgStudentVerify ref="dlgStudentVerify" @update-record="handleUpdateRecord" />
      </template>
    </InternshipPostHeaderPage>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgStudentVerify from '@/views/internship-process/components/DlgStudentVerify.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import moment from 'moment';

defineOptions({
  name: 'StudentAssignmentVerify',
});

const store = useStore();
const headerPageRef = ref(null);

const dlgStudentVerify = ref(null);

// 用户与角色信息
const roles = computed(() => store.getters.roles || []);
const userInfo = computed(() => store.getters.userInfo || {});

// 是否企业用户
const isCompanyUser = computed(() =>
  roles.value.some(
    (r) =>
      r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  )
);

// 头部显示的标题（随项目选择变化）
const titleObj = reactive({
  mainTitle: '学生实习项目安排审核',
});

// 当前选中的实习项目
const currentInternship = computed(
  () => headerPageRef.value?.currentInternship?.value || null
);

// 实习项目选择按钮是否禁用
const isMore1Disabled = computed(
  () => headerPageRef.value?.isMore1Disabled?.value || false
);

// 流程类型：学生实习项目安排
const processTypeCode = CONSTANT.PROCESS_TYPE.STUDENT_SELECT_INTERNSHIP;

// 流程配置缓存（processId → 流程配置），从 ViewRelProcessInternship 加载
const processConfigMap = ref(new Map());

// 角色名称缓存（roleId → roleName）
const roleNameMap = ref(new Map());

// 预加载流程配置
async function loadProcessConfigs() {
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 500 },
    });
    if (res?.data?.content) {
      res.data.content.forEach(config => {
        processConfigMap.value.set(String(config.id), config);
      });
    }
  } catch (error) {
    console.error('加载流程配置失败:', error);
  }
}

// 预加载角色名称
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
function getRoleNameByLevel(processId, levelIndex) {
  const config = processConfigMap.value.get(String(processId));
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

  const roleName = config[roleNameFields[levelIndex]];
  if (roleName && roleName !== '--' && roleName.trim() !== '') {
    return roleName;
  }

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
const isUserIdInVerifyUserId = (verifyUserId, userId) => {
  if (!verifyUserId || !userId) return false;
  const userIdStr = String(userId);
  const verifyUserIdStr = String(verifyUserId);
  const ids = verifyUserIdStr.split('|').filter(id => id !== '');
  return ids.includes(userIdStr);
};

// 获取初始查询条件（公共时间 / 状态过滤）
const getInitSearchWords = () => {
  const searchKey = {};
  const regKey = {};
  const andor = {};

  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  searchKey.isAudit = `${CONSTANT.AUDIT_STATUS.SUBMIT},${CONSTANT.AUDIT_STATUS.PASS},${CONSTANT.AUDIT_STATUS.BACK}`;
  regKey.isAudit = CONSTANT.SEARCH_OPERATOR.IN;
  searchKey.startTime = currentTime;
  regKey.startTime = CONSTANT.SEARCH_OPERATOR.LE;
  searchKey.endTime = currentTime;
  regKey.endTime = CONSTANT.SEARCH_OPERATOR.GE;

  return {
    searchKey,
    regKey,
    andor,
  };
};

// 判断当前用户是否拥有指定流程最后一级审核角色
const userHasLastLevelRole = (processId) => {
  const config = processConfigMap.value.get(String(processId));
  const userRoles = store.getters.roles || [];

  if (!config || !config.verifyTypeId) return false;

  const lastLevelIndex = config.verifyTypeId - 2; // 0-based
  if (lastLevelIndex < 0) return false;

  const roleIdFields = [
    'verifyFirstRoleId', 'verifySecondRoleId', 'verifyThirdRoleId',
    'verifyFourthRoleId', 'verifyFifthRoleId'
  ];
  if (lastLevelIndex >= roleIdFields.length) return false;

  const lastLevelRoleId = config[roleIdFields[lastLevelIndex]];
  if (!lastLevelRoleId) return false;

  return userRoles.some(role => String(role) === String(lastLevelRoleId));
};

// 客户端过滤函数：同 TeacherAssignmentVerify 逻辑
const clientFilterFn = (dataList) => {
  const userInfoStore = store.getters.userInfo;
  const userId = userInfoStore?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  dataList = dataList.filter(item => {
    return !item.reason || !item.reason.includes('系统自动通过');
  });

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

    pendingRecords.forEach(record => {
      if (isUserIdInVerifyUserId(record.verifyUserId, userId)) {
        const passedCount = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS).length;
        const roleName = getRoleNameByLevel(record.processId, passedCount);
        if (roleName) {
          record._currentRoleName = roleName;
        }
        result.push(record);
      }
    });

    if (pendingRecords.length === 0 && approvedRecords.length > 0) {
      const latestOverall = group.reduce((latest, r) =>
        (!latest || r.id > latest.id) ? r : latest, null
      );
      if (latestOverall && (
        latestOverall.isAudit === CONSTANT.AUDIT_STATUS.BACK ||
        latestOverall.isAudit === CONSTANT.AUDIT_STATUS.SAVE
      )) {
        return;
      }

      const lastLevelRecord = approvedRecords.reduce((latest, r) =>
        (!latest || r.id > latest.id) ? r : latest, null
      );

      if (lastLevelRecord && (
        userHasLastLevelRole(lastLevelRecord.processId) ||
        isUserIdInVerifyUserId(lastLevelRecord.verifyUserId, userId)
      )) {
        result.push(lastLevelRecord);
      }
    }
  });

  return result;
};

// 实习项目选择对话框查询关键字
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime,
  };
});

// 实习项目选择对话框查询操作符
const projectSelectRegKey = computed(() => ({
  startTime: CONSTANT.SEARCH_OPERATOR.LE,
  endTime: CONSTANT.SEARCH_OPERATOR.GE,
}));

// 处理项目选择后的回调：更新标题
function handleProjectSelected(internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
}

// 为当前页面构建额外查询条件
function buildSearchKey(baseSearchKey) {
  return {
    processTypeCode,
    internshipId: baseSearchKey.internshipId,
    tableName: 'RelIntershipUser',
  };
}

// 按钮配置
const buttonPropsComputed = computed(() => ({
  more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
  audit: { show: true, showPass: true, showNotPass: true, showBack: true },
}));

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  clientFilterFn: clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName: getVerifyRoleName,
  initSearchWords: getInitSearchWords(),
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    keyWord: { edit: 'RelIntershipUser', view: 'ViewRelIntershipUser' },
    allTableColumns: [
      { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
      { id: 3, showName: '学生姓名', theOrder: 3, tableColumnName: 'userName' },
      { id: 4, showName: '流程开始时间', theOrder: 4, tableColumnName: 'startTime' },
      { id: 5, showName: '流程结束时间', theOrder: 5, tableColumnName: 'endTime' },
      { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
      { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
    ],
  },
}));

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  headerPageRef.value?.updateSearchWordsAndRefresh();
};

// 处理审核按钮点击事件
const handleAuditClick = (row) => {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgStudentVerify.value?.showDialog(true, selectedRow);
  }
};

onMounted(async () => {
  await Promise.all([loadProcessConfigs(), loadRoleNames()]);
});

onBeforeUnmount(() => {
  dlgStudentVerify.value?.closeAllDialogs?.();
});
</script>


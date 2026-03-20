<template>
  <div class="internal-tutor-assignment">
    <InternshipPostHeaderPage
      ref="headerPageRef"
      page-title="校内导师分配"
      no-project-message="当前没有可分配的实习项目"
      pending-select-message="当前实习项目：待选择"
      :project-select-search-key="projectSelectSearchKey"
      :project-select-reg-key="projectSelectRegKey"
      :default-d-t-l-props="defaultDTLProps"
      :build-search-key="buildSearchKey"
      :is-company-user="isCompanyUser"
      :process-type-code="processTypeCode"
      @project-selected="handleProjectSelectedLocal"
      @append-click="handleSubmitClick"
      @more2-click="handleSystemAssign"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';

defineOptions({
  name: 'InternalTutorAssignment',
});
const store = useStore();

// 校内实习-分配指导老师
const processTypeCode = CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_SELECT_PROJECT;

const {
  headerPageRef,
  isCompanyUser,
  projectSelectSearchKey,
  projectSelectRegKey,
  handleProjectSelected,
  isMore1Disabled,
  buildSearchKey: baseBuildSearchKey,
} = useAssignmentPageConfig({
  processTypeCode,
  mainTitle: '校内导师分配',
  withMajorFilter: false,
});

// 当前选中的实习项目（本地缓存一份，避免 expose ref 的时序问题）
const selectedInternship = ref(null);
const currentInternship = computed(
  () => selectedInternship.value || headerPageRef.value?.currentInternship?.value || null
);
const currentInternshipId = computed(() => {
  const v = currentInternship.value?.internshipId ?? currentInternship.value?.id;
  return v != null ? Number(v) : 0;
});
const currentInternshipName = computed(
  () => currentInternship.value?.internshipName ?? currentInternship.value?.name ?? ''
);

const assigning = ref(false);

// 导师列表（展示在表格中）
const defaultDTLProps = computed(() => ({
  title: { mainTitle: '导师列表' },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: true,
    autoInit: false, // 等到实习项目选择后再加载
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelIntershipUser', view: 'ViewVerifyProcessRelTeacherStudentMerge' },
    buttonProps: {
      // 顶部 CRUD / 导出默认隐藏，只保留“提交”（复用顶部 create 按钮的位置）
      create: { show: true, name: '提交', type: 'primary' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      more2: {
        show: true,
        name: '系统分配',
        type: 'warning',
        disabled: !currentInternshipId.value || assigning.value,
      },
      update: { show: false },
      delete: { show: false },
      export: { show: false },
      up: { show: false },
      down: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '导师名称', tableColumnName: 'userName', sortable: true },
      { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
      // 如果 ViewRelIntershipUser 没有该字段会自动显示为 `--`
      { id: 3, showName: '部门/单位', tableColumnName: 'departmentName', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

// 列表查询条件：同一个实习项目下的 jobId=3 导师
function buildSearchKey(baseSearchKey) {
  return {
    ...baseBuildSearchKey(baseSearchKey),
    internshipId: baseSearchKey?.internshipId,
    jobId: '3',
  };
}

function handleProjectSelectedLocal(internship, title) {
  selectedInternship.value = internship || null;
  handleProjectSelected(internship, title);
}

// 参考“校内导师项目安排新增”逻辑：为每条业务记录创建 MainVerifyProcess（待提交）
async function saveRelTeacherStudentVerifyProcess(relRes) {
  const processId = currentInternship.value?.realId ?? currentInternship.value?.id;
  const relationId = relRes?.data?.id;
  const createUserId = store.getters.userInfo?.id;
  const verifyRoleId = currentInternship.value?.verifyFirstRoleId;
  if (!processId || !relationId || !createUserId) {
    return { success: false, message: '缺少流程参数' };
  }

  let verifyUserIds = [];
  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
    });
    verifyUserIds = verifyResp?.data || [];
  } catch (e) {
    console.error('查询审核人失败:', e);
    return { success: false, message: '查询审核人失败' };
  }

  const activateParams = {
    processId,
    relationId,
    tableName: 'RelTeacherStudent',
    createUserId,
    isAudit: CONSTANT.AUDIT_STATUS.SAVE,
    verifyUserId: verifyUserIds,
  };

  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        processId: activateParams.processId,
        relationId: activateParams.relationId,
        tableName: activateParams.tableName,
      },
    });
    const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
    if (existingRecords.length === 0) {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', activateParams);
      if (!resInfo || resInfo.message !== 'successful') {
        return { success: false, message: resInfo?.message || '创建审核流程失败' };
      }
    }
    return { success: true };
  } catch (error) {
    console.error('创建 MainVerifyProcess 失败:', error);
    return { success: false, message: '创建审核流程失败' };
  }
}

function getVerifyTypeForNewRecord(internshipSrc) {
  const verifyTypeId = internshipSrc?.verifyTypeId;
  return verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
    ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
    : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
}

function pickTeacherIdFromViewRow(row) {
  // ViewRelIntershipUser 里通常是 userId / user_id
  const raw = row?.userId ?? row?.user_id ?? row?.teacherId ?? row?.teacher_id;
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function pickPostIdAndSeatCount(postRow) {
  const postId = Number(postRow?.id);
  const allPersonNum = Number(postRow?.allPersonNum ?? postRow?.all_person_num);
  return {
    postId: Number.isFinite(postId) ? postId : 0,
    allPersonNum: Number.isFinite(allPersonNum) ? allPersonNum : 0,
  };
}

function pickExistingRelInternshipId(row) {
  const raw = row?.relInternshipId ?? row?.rel_internship_id;
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// 系统分配：按每个岗位的 allPersonNum 创建 RelTeacherStudent 记录
async function handleSystemAssign() {
  const internshipId = currentInternshipId.value;
  if (!internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }

  if (assigning.value) return;

  try {
    await ElMessageBox.confirm(
      '确定执行“系统分配”吗？该操作会按岗位人数创建/重置 `RelTeacherStudent` 记录。',
      '系统分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch (e) {
    // 用户取消
    return;
  }

  assigning.value = true;
  try {
    const internshipSrc = currentInternship.value || {};
    const currentVerifyTypeId = getVerifyTypeForNewRecord(internshipSrc);

    // 1) 查询该实习项目下的导师列表：ViewRelIntershipUser + jobId=3
    const mentorResp = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelIntershipUserMerge',
      searchKey: { internshipId: currentInternshipId.value, jobId: '3' },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const mentorList = mentorResp?.data?.content ?? mentorResp?.data ?? [];

    const teacherIdSet = new Set();
    for (const row of mentorList) {
      const tid = pickTeacherIdFromViewRow(row);
      if (tid) teacherIdSet.add(tid);
    }
    const teacherIds = Array.from(teacherIdSet);

    if (teacherIds.length === 0) {
      ElMessage.warning('当前实习项目下未找到导师（jobId=3）');
      return;
    }

    // 2) 查询 MainInternshipPost：同一 internshipId 下的岗位与学生数量(allPersonNum)
    // let postResp = await listAPI.getSomeRecords({
    //   keyWords: 'ViewVerifyProcessInternshipPostMerge',
    //   searchKey: { internshipId },
    //   pageInfo: { page: 1, size: 1000 },
    //   sort: { properties: 'id', direction: 'ASC' },
    // });
    // let postList = postResp?.data?.content ?? postResp?.data ?? [];
    const postList = [
      {
        id: 1,
        postTypeId: 1,
        allPersonNum: 10,
        internshipId: 123,
      },
    ];
    const posts = postList
      .map((p) => pickPostIdAndSeatCount(p))
      .filter((p) => p.postId && p.allPersonNum > 0);

    if (posts.length === 0) {
      ElMessage.warning('当前实习项目下没有岗位或岗位人数为 0');
      return;
    }
    console.log(posts);
    const postIdSet = new Set(posts.map((p) => p.postId));

    // 3) 按岗位重置 RelTeacherStudent：删除 relInternshipId 在这些岗位范围内的记录
    // const existResp = await listAPI.getSomeRecords({
    //   keyWords: 'ViewVerifyProcessRelTeacherStudentMerge',
    //   searchKey: { internshipId },
    //   pageInfo: { page: 1, size: 5000 },
    //   sort: { properties: 'id', direction: 'DESC' },
    // });
    // const existList = existResp?.data?.content ?? existResp?.data ?? [];
    // const deleteIds = existList
    //   .filter((r) => postIdSet.has(pickExistingRelInternshipId(r)))
    //   .map((r) => r.id)
    //   .filter(Boolean);

    // if (deleteIds.length > 0) {
    //   await listAPI.delOneOrManyNodes('RelTeacherStudent', deleteIds);
    // }

    // 4) 计算每个老师分配人数差不多：始终给“当前已分配最少”的老师（随机在并列最少中选择）
    const assignedCountMap = new Map();
    teacherIds.forEach((tid) => assignedCountMap.set(tid, 0));

    let createdCount = 0;
    const chunkSize = 50;
    let chunk = [];

    // 简单的小工具：找当前最小值
    const findMinCount = () => {
      let min = Infinity;
      for (const tid of teacherIds) {
        const c = assignedCountMap.get(tid) ?? 0;
        if (c < min) min = c;
      }
      return min;
    };

    for (const post of posts) {
      for (let i = 0; i < post.allPersonNum; i++) {
        const minCount = findMinCount();
        const candidates = teacherIds.filter(
          (tid) => (assignedCountMap.get(tid) ?? 0) === minCount
        );
        const chosenTeacherId = candidates[Math.floor(Math.random() * candidates.length)];

        chunk.push({
          teacherId: chosenTeacherId,
          relInternshipId: post.postId,
          internshipId,
          currentVerifyTypeId,
        });
        assignedCountMap.set(chosenTeacherId, (assignedCountMap.get(chosenTeacherId) ?? 0) + 1);
        createdCount += 1;

        if (chunk.length >= chunkSize) {
          // const batchResults = await Promise.all(
          //   chunk.map(async (rec) => {
          //     const relRes = await listAPI.editOneNode('RelTeacherStudent', rec);
          //     if (!relRes || relRes.message !== 'successful') {
          //       throw new Error(relRes?.message || '创建 RelTeacherStudent 失败');
          //     }
          //     const verifyRes = await saveRelTeacherStudentVerifyProcess(relRes);
          //     if (!verifyRes.success) {
          //       throw new Error(verifyRes.message || '创建 MainVerifyProcess 失败');
          //     }
          //     return relRes;
          //   })
          // );
          // if (!batchResults.length) {
          //   throw new Error('批量创建失败');
          // }
          chunk = [];
        }
      }
    }

    // if (chunk.length > 0) {
    //   await Promise.all(
    //     chunk.map(async (rec) => {
    //       const relRes = await listAPI.editOneNode('RelTeacherStudent', rec);
    //       if (!relRes || relRes.message !== 'successful') {
    //         throw new Error(relRes?.message || '创建 RelTeacherStudent 失败');
    //       }
    //       const verifyRes = await saveRelTeacherStudentVerifyProcess(relRes);
    //       if (!verifyRes.success) {
    //         throw new Error(verifyRes.message || '创建 MainVerifyProcess 失败');
    //       }
    //     })
    //   );
    // }

    // 5) 提示分配结果（只展示前 10 个老师，避免信息过长）
    const summary = teacherIds
      .map((tid) => `${tid}：${assignedCountMap.get(tid) ?? 0}`)
      .slice(0, 10);

    ElMessage.success(
      `系统分配完成：已创建 ${createdCount} 条 RelTeacherStudent 记录。各老师分配：${summary.join('，')}${teacherIds.length > 10 ? '，...' : ''}`
    );

    // 6) 如需立即刷新导师表格可取消注释；当前页面主要是展示导师列表，数据通常不变
    // await headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('系统分配失败:', error);
    ElMessage.error(error?.message || '系统分配失败');
  } finally {
    assigning.value = false;
  }
}

function handleSubmitClick() {
  // 顶部“提交”（复用 create 按钮）= 执行系统分配
  void handleSystemAssign();
}
</script>

<style scoped>
.internal-tutor-assignment {
  padding: 8px 0;
}
</style>

<template>
  <InternshipPostHeaderPage
    v-if="ready"
    ref="headerPageRef"
    :page-title="'学生自主选择题目'"
    :no-project-message="'当前没有可选题目的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_STUDENT_TEACHER_MATCH"
    @project-selected="handleProjectSelected"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @submit-click="handleSubmitClick"
  >
    <template #rightOperate="{ row }">
      <el-button type="info" size="small" title="题目详情" @click="handleViewTopicDetail(row)">
        <el-icon><InfoFilled /></el-icon>
      </el-button>
      <el-button
        v-if="!hasSelection"
        type="success"
        size="small"
        title="选择题目"
        @click="handleSelectTopic(row)"
      >
        <el-icon><Check /></el-icon>
      </el-button>
      <el-button
        v-else-if="canCancelSelection"
        type="warning"
        size="small"
        title="取消选题"
        @click="handleCancelSelection()"
      >
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
    </template>
    <template #dialogs>
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="progressMainInternshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelTitleStudent"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick, unref } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled, Check, RefreshLeft } from '@element-plus/icons-vue';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from '@/views/internship-process/components/DlgTopicDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';

defineOptions({ name: 'StuSelectTopic' });

const store = useStore();
const { getVerifyRoleName } = useVerifyFilter();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const titleObj = reactive({ mainTitle: '学生自主选择题目' });

// 学生已分配的实习项目 ID 列表（从 RelIntershipUser 查询）
const studentInternshipIds = ref([]);
const ready = ref(false);

async function loadStudentAssignment() {
  const userId = userInfo.value?.id;
  if (!userId) {
    ready.value = true;
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'RelIntershipUser',
      searchKey: { userId },
    });
    const records = res?.data?.content || res?.data || [];
    studentInternshipIds.value = records.map((r) => r.internshipId).filter(Boolean);
  } catch (e) {
    console.error('查询学生分配记录失败:', e);
  }
  ready.value = true;
}

onMounted(() => {
  loadStudentAssignment();
});

// 当前实习项目：必须以 @project-selected 传入的对象为准。
// 直接 computed 读 headerPageRef.currentInternship 常常无法建立对子组件 ref 的响应式依赖，导致标题已更新而 internshipId 仍为 0，选题时报「缺少必要参数」。
const internshipContext = ref(null);
const currentInternship = computed(() => internshipContext.value);

// 当前已选择的题目（仅用于判断模式与取消）
const currentSelectedTopic = ref(null);
const hasSelection = computed(() => !!currentSelectedTopic.value);

const canCancelSelection = computed(() => {
  if (!currentSelectedTopic.value || !hasSelection.value) return false;
  const audit = rowAuditStatus(currentSelectedTopic.value);
  return (
    audit === CONSTANT.AUDIT_STATUS.SAVE ||
    audit === CONSTANT.AUDIT_STATUS.BACK
  );
});

const progressMainInternshipId = computed(
  () =>
    currentRow.value?.m_internship_id ??
    currentRow.value?.internshipId ??
    currentRow.value?.internship_id ??
    0
);

function resolveInternshipId(internship) {
  if (!internship || typeof internship !== 'object') return 0;
  const raw =
    internship.internshipId ??
    internship.id ??
    internship.mainInternshipId ??
    internship.main_internship_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 优先已同步的 context，否则读子组件最新 ref（避免 emit 与 ref 时序导致 internshipId 为 0） */
function getEffectiveInternship() {
  if (internshipContext.value && resolveInternshipId(internshipContext.value)) {
    return internshipContext.value;
  }
  return unref(headerPageRef.value?.currentInternship) ?? null;
}

function resolveVerifyTypeIdFromRow(row) {
  const v =
    row?.verifyTypeId ??
    row?.verify_type_id ??
    row?.currentVerifyTypeId ??
    row?.current_verify_type_id;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 视图中 isAudit / is_audit 可能是字符串，与常量比较前统一为数字 */
function rowAuditStatus(row) {
  const raw = row?.isAudit ?? row?.is_audit;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Merge 行里 id 不一定是 MainVerifyProcess 主键（可能与题目申报视图不一致），按 relationId+tableName 解析流程表 id。
 */
async function resolveStudentTopicMainVerifyProcessId(row) {
  const fromRow =
    row?.mainVerifyProcessId ??
    row?.main_verify_process_id ??
    row?.mvpId ??
    row?.mvp_id ??
    row?.verifyProcessId ??
    row?.verify_process_id;
  if (fromRow != null && fromRow !== '') {
    const n = Number(fromRow);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const rid =
    Number(
      row?.relationId ??
        row?.relation_id ??
        currentSelectedTopic.value?.relTitleStudentId ??
        currentSelectedTopic.value?.id ??
        0
    ) || 0;
  if (!rid) {
    const fallback = Number(row?.id);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }

  try {
    const internship = getEffectiveInternship();
    const processId = internship?.realId ?? internship?.processId ?? internship?.id;
    const searchKey = { relationId: rid, tableName: 'RelTitleStudent' };
    if (processId != null && processId !== '') {
      searchKey.processId = processId;
    }
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey,
      pageInfo: { page: 1, size: 5 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const rows = queryRes?.data?.records ?? queryRes?.data?.content ?? queryRes?.data ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;
    if (first?.id != null) return Number(first.id);
  } catch (e) {
    console.error('解析学生选题 MainVerifyProcess.id 失败:', e);
  }
  const fallback = Number(row?.id);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

async function syncRelTitleStudentIsAudit(relationId, isAudit) {
  const rid = Number(relationId);
  if (!rid || !Number.isFinite(isAudit)) return;
  try {
    await listAPI.editOneNode('RelTitleStudent', { id: rid, isAudit, is_audit: isAudit });
  } catch (e) {
    console.error('同步 RelTitleStudent 审核状态失败:', e);
  }
}

/** 已选题列表：与审核页时间窗一致，但 isAudit 含 SAVE（待提交），学生才能看到未提交行 */
function buildStuTopicMergeInitSearchWords() {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return {
    searchKey: {
      isAudit: `${CONSTANT.AUDIT_STATUS.SAVE},${CONSTANT.AUDIT_STATUS.SUBMIT},${CONSTANT.AUDIT_STATUS.PASS},${CONSTANT.AUDIT_STATUS.BACK},${CONSTANT.AUDIT_STATUS.NOTPASS}`,
      startTime: currentTime,
      endTime: currentTime,
    },
    regKey: {
      isAudit: CONSTANT.SEARCH_OPERATOR.IN,
      startTime: CONSTANT.SEARCH_OPERATOR.LE,
      endTime: CONSTANT.SEARCH_OPERATOR.GE,
    },
    andor: {},
  };
}

function getTopicId(row) {
  return (
    Number(
      row?.relationId ??
        row?.relation_id ??
        row?.titleId ??
        row?.title_id ??
        row?.relTitleTeacherId ??
        row?.rel_title_teacher_id ??
        row?.ID ??
        row?.id ??
        0
    ) || 0
  );
}

async function queryTitleStudentByTitleId(titleId) {
  if (!titleId) return null;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'RelTitleStudent',
      searchKey: { titleId: Number(titleId) },
      pageInfo: { page: 1, size: 1 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    return list[0] || null;
  } catch (e) {
    console.error('查询题目占用失败:', e);
    return null;
  }
}

async function deleteMainVerifyProcessByRelation(relationId) {
  if (!relationId) return;
  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: { relationId: Number(relationId), tableName: 'RelTitleStudent' },
      pageInfo: { page: 1, size: 50 },
    });
    const rows = queryRes?.data?.records ?? queryRes?.data?.content ?? queryRes?.data ?? [];
    const vpIds = (Array.isArray(rows) ? rows : []).map((r) => r.id).filter(Boolean);
    if (vpIds.length) {
      await listAPI.delOneOrManyNodes('MainVerifyProcess', vpIds);
    }
  } catch (e) {
    console.error('删除选题审核流程记录失败:', e);
  }
}

/**
 * 调用后端 internshipProcess/activateProcess（与 createFirstVerifyProcessForRelTitleStudent 等配套）。
 * 若服务端已在 editOneNode(RelTitleStudent) 保存后自动生成 MainVerifyProcess，则此处查询已存在即跳过，避免重复。
 * process_id = rel_process_internship.id，relation_id = rel_title_student.id，table_name = 'RelTitleStudent'。
 */
async function ensureStudentTopicVerifyProcess(relationId, createUserId) {
  const internship = getEffectiveInternship();
  const processId = internship?.realId ?? internship?.processId ?? internship?.id;
  if (processId == null || processId === '') {
    return { ok: false, message: '未获取到实习流程（rel_process_internship）ID，无法激活审核' };
  }

  const rid = Number(relationId);
  if (!rid) {
    return { ok: false, message: '选题关系 ID 无效' };
  }

  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        processId,
        relationId: rid,
        tableName: 'RelTitleStudent',
      },
      pageInfo: { page: 1, size: 1 },
    });
    const existing =
      queryRes?.data?.records ?? queryRes?.data?.content ?? queryRes?.data ?? [];
    if (Array.isArray(existing) && existing.length > 0) {
      return { ok: true };
    }

    const activateRes = await internshipProcessAPI.activateProcess({
      processId,
      relationId: rid,
      tableName: 'RelTitleStudent',
      createUserId,
    });
    if (!activateRes || activateRes.message !== 'successful') {
      return { ok: false, message: activateRes?.message || '激活审核流程失败' };
    }
    return { ok: true };
  } catch (e) {
    console.error('activateProcess 选题审核失败:', e);
    return { ok: false, message: '激活审核流程异常' };
  }
}

/**
 * 后端未提供 /internshipPost/StuSelTopic，与「老师指定学生选题」相同走 dataList + 流程激活。
 */
async function persistStudentTopicSelection(stuId, topicId) {
  // 学生自主选题一律提交老师审核（不继承实习项目「无需审核」配置）
  const noVerify = false;

  const relationPayload = {
    stuId,
    stu_id: stuId,
    titleId: Number(topicId),
    isAudit: CONSTANT.AUDIT_STATUS.SAVE,
    is_audit: CONSTANT.AUDIT_STATUS.SAVE,
    currentVerifyTypeId: noVerify
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY,
  };
  // Merge 视图若展示 RelTitleStudent.is_audit，需与 MainVerifyProcess 一致：新建为待提交；正式送审在 handleSubmitClick 双写

  const createRes = await listAPI.editOneNode('RelTitleStudent', relationPayload);
  if (!createRes || createRes.message !== 'successful') {
    return { ok: false, message: createRes?.message || '保存选题失败' };
  }
  const relationId = createRes?.data?.id;

  if (!noVerify) {
    const act = await ensureStudentTopicVerifyProcess(relationId, stuId);
    if (!act.ok) {
      if (relationId) {
        await listAPI.delOneOrManyNodes('RelTitleStudent', [Number(relationId)]);
      }
      return act;
    }
  }

  return { ok: true };
}

async function removeStudentTopicSelection(relationId, topicId) {
  const rid = Number(relationId);
  const tid = Number(topicId);
  if (!rid || !tid) {
    return { ok: false, message: '缺少选题记录信息' };
  }
  await deleteMainVerifyProcessByRelation(rid);
  const delRes = await listAPI.delOneOrManyNodes('RelTitleStudent', [rid]);
  if (!delRes || delRes.message !== 'successful') {
    return { ok: false, message: delRes?.message || '取消选题失败' };
  }
  return { ok: true };
}

async function querySelectedTopic(internshipId, stuId) {
  if (!internshipId || !stuId) return null;
  try {
    const relRes = await listAPI.getSomeRecords({
      keyWords: 'RelTitleStudent',
      searchKey: { stuId, stu_id: stuId },
      pageInfo: { page: 1, size: 200 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const relList = relRes?.data?.content ?? relRes?.data ?? [];
    if (!relList.length) return null;

    for (const rel of relList) {
      const titleId = rel?.titleId ?? rel?.title_id;
      if (!titleId) continue;

      const titleRes = await listAPI.getSomeRecords({
        keyWords: 'RelTitleTeacher',
        searchKey: {
          id: Number(titleId),
          internshipId,
          is_deleted: 0,
          isDeleted: 0,
        },
        pageInfo: { page: 1, size: 1 },
      });
      const titleRow = (titleRes?.data?.content ?? titleRes?.data ?? [])[0];
      if (titleRow) {
        return {
          ...rel,
          topicId: Number(titleId),
          relTitleStudentId: rel?.id,
          name: titleRow.name,
          remarks: titleRow.remarks,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('查询学生已选题目失败:', e);
    return null;
  }
}

/** 学生已选题后，与「老师申报题目」一致使用 Merge 视图行（含 MainVerifyProcess.id、isAudit） */
async function queryStudentTopicMergeRow(internshipId, stuId, relationId) {
  if (!internshipId || !stuId) return null;
  try {
    const searchKey = { internshipId, stuId, stu_id: stuId };
    if (relationId) {
      searchKey.relationId = Number(relationId);
      searchKey.relation_id = Number(relationId);
    }
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelTitleStudentMerge',
      searchKey,
      pageInfo: { page: 1, size: 50 },
      sort: { properties: 'updateTime', direction: 'DESC' },
    });
    const rows = res?.data?.content ?? res?.data ?? [];
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return null;
    if (relationId) {
      const exact = list.find(
        (r) => Number(r?.relationId ?? r?.relation_id ?? 0) === Number(relationId)
      );
      if (exact) return exact;
    }
    return list[0] || null;
  } catch (e) {
    console.error('查询学生选题审核行失败:', e);
    return null;
  }
}

async function enrichSelectedTopicWithMerge(internshipId, stuId) {
  const rel = await querySelectedTopic(internshipId, stuId);
  if (!rel) {
    currentSelectedTopic.value = null;
    return;
  }
  const merge = await queryStudentTopicMergeRow(
    internshipId,
    stuId,
    rel?.relTitleStudentId ?? rel?.id
  );
  currentSelectedTopic.value = {
    ...rel,
    ...(merge || {}),
    topicId: rel.topicId,
    relTitleStudentId: rel.relTitleStudentId ?? rel.id,
  };
}

// 实习项目选择：与审核页相同不按时间筛（避免 ViewRelProcessInternship 无数据）；学生在有关联实习时限制为已分配项目
const projectSelectSearchKey = computed(() => {
  const searchKey = {};
  if (studentInternshipIds.value.length > 0) {
    searchKey.internshipId = studentInternshipIds.value.join(',');
  }
  return searchKey;
});

const projectSelectRegKey = computed(() => {
  const regKey = {};
  if (studentInternshipIds.value.length > 0) {
    regKey.internshipId = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});

// 查询条件：浏览模式=全部通过审核且非限选且未删除；已选择模式=仅显示自己选的题目
function buildSearchKey(baseSearchKey) {
  if (hasSelection.value) {
    return {
      internshipId: baseSearchKey.internshipId,
      stuId: userInfo.value?.id,
      stu_id: userInfo.value?.id,
    };
  }
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.PASS,
    isLimit: 0,
    is_limit: 0,
    is_deleted: 0,
    isDeleted: 0,
  };
}

function clientFilterFn(list) {
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const uid = Number(userInfo.value?.id || 0);
  if (!Array.isArray(list)) return list || [];

  const isTopicOccupiedByAnyStudent = (row) => {
    const stuId = Number(row?.stuId ?? row?.stu_id ?? 0);
    if (stuId > 0) return true;
    const studentName = row?.student_name ?? row?.studentName;
    if (studentName && studentName !== '--') return true;
    const relStuId = Number(
      row?.relTitleStudentId ??
        row?.rel_title_student_id ??
        row?.titleStudentId ??
        row?.title_student_id ??
        0
    );
    return relStuId > 0;
  };

  return (list || [])
    .filter((row) => {
      // 只要当前项目的数据
      if (internshipId) {
        const rowIid = Number(row?.internshipId ?? row?.internship_id ?? 0);
        if (rowIid && rowIid !== internshipId) return false;
      }

      // 未删除
      const isDeleted = Number(row?.is_deleted ?? row?.isDeleted ?? 0);
      if (isDeleted !== 0) return false;

      if (hasSelection.value) {
        const stuId = Number(row?.stuId ?? row?.stu_id ?? 0);
        if (uid && stuId !== uid) return false;
        return true;
      }

      // 浏览：审核通过 + 非限选（可选）
      const isAudit = row?.isAudit ?? row?.is_audit;
      if (isAudit != null && isAudit !== CONSTANT.AUDIT_STATUS.PASS) return false;
      const isLimitValue = Number(row?.isLimit ?? row?.is_limit ?? 0);
      if (isLimitValue !== 0) return false;
      // 被任何学生占用的题目，不应继续出现在“可选题目”列表
      if (isTopicOccupiedByAnyStudent(row)) return false;
      return true;
    })
    .map((row) => {
      const isLimitValue = Number(row?.isLimit ?? row?.is_limit ?? 0);
      return {
        ...row,
        isLimit: isLimitValue,
        is_limit: isLimitValue,
        isLimitText: isLimitValue === 1 ? '是' : '否',
      };
    });
}

async function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;
  await nextTick();
  const fromHeader = unref(headerPageRef.value?.currentInternship);
  const resolved =
    internship && resolveInternshipId(internship)
      ? internship
      : fromHeader && resolveInternshipId(fromHeader)
        ? fromHeader
        : null;
  if (resolved) {
    internshipContext.value = resolved;
  } else if (internship == null) {
    internshipContext.value = null;
  }
  const internshipId = resolveInternshipId(resolved ?? internship);
  if (!internshipId) {
    currentSelectedTopic.value = null;
    return;
  }
  await enrichSelectedTopicWithMerge(internshipId, userInfo.value?.id);
  await headerPageRef.value?.updateSearchWordsAndRefresh?.();
}

const defaultDTLProps = computed(() => {
  const base = {
    title: titleObj,
    someFlags: { autoInit: false },
    clientFilterFn,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDBIProps: {},
  };
  const more1Disabled = headerPageRef.value?.isMore1Disabled?.value ?? false;

  if (hasSelection.value) {
    return {
      ...base,
      initSearchWords: buildStuTopicMergeInitSearchWords(),
      defaultDTHProps: {
        buttonProps: {
          more1: { show: true, name: '实习项目选择', disabled: more1Disabled },
          update: { show: true, type: 'primary', name: '取消选择' },
          visible: { show: true, type: 'primary', name: '查看进度' },
          submit: { show: true, name: '提交', type: 'warning' },
          buttonGroup: { show: true },
        },
        buttonCondition: {
          submit: (row) => {
            const isAudit = rowAuditStatus(row);
            return (
              isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
              isAudit === CONSTANT.AUDIT_STATUS.BACK ||
              (isAudit === CONSTANT.AUDIT_STATUS.PASS &&
                resolveVerifyTypeIdFromRow(row) === CONSTANT.VERIFY_LEVEL.NO_VERIFY)
            );
          },
        },
        keyWord: {
          edit: 'MainVerifyProcess',
          view: 'ViewVerifyProcessRelTitleStudentMerge',
        },
        allTableColumns: [
          { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
          { id: 2, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
          { id: 3, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
          { id: 4, showName: '状态', tableColumnName: 'customize-status' },
        ],
      },
    };
  }

  return {
    ...base,
    defaultDTHProps: {
      buttonProps: {
        more1: { show: true, name: '实习项目选择', disabled: more1Disabled },
        update: { show: true, type: 'primary', name: '选择题目' },
        visible: { show: true, type: 'primary', name: '题目详情' },
        buttonGroup: { show: true },
      },
      keyWord: {
        edit: 'RelTitleStudent',
        view: 'ViewRelTitleTeacherStudent',
      },
      allTableColumns: [
        { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
        { id: 2, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
        { id: 3, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
        { id: 4, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      ],
    },
  };
});

function handleViewTopicDetail(row) {
  if (!row) return;
  const topicId = getTopicId(row);
  const topicRow = { ...row, id: topicId };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, getEffectiveInternship(), true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (hasSelection.value) {
    currentRow.value = row ? { ...row } : {};
    showProgressDialog.value = true;
    return;
  }
  handleViewTopicDetail(row);
}

async function handleSubmitClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;

  const mvpId = await resolveStudentTopicMainVerifyProcessId(row);
  if (!mvpId) {
    ElMessage.error('未找到选题审核流程记录，请刷新后重试');
    return;
  }

  const relRowId =
    Number(
      row?.relationId ??
        row?.relation_id ??
        currentSelectedTopic.value?.relTitleStudentId ??
        currentSelectedTopic.value?.id ??
        0
    ) || 0;

  const vtidNo = CONSTANT.VERIFY_LEVEL.NO_VERIFY;
  const rowIsAudit = rowAuditStatus(row);
  if (rowIsAudit === CONSTANT.AUDIT_STATUS.NOTPASS) {
    ElMessage.warning('该选题已审核不通过，不允许修改选题');
    return;
  }
  if (
    rowIsAudit === CONSTANT.AUDIT_STATUS.PASS &&
    resolveVerifyTypeIdFromRow(row) === vtidNo
  ) {
    try {
      await ElMessageBox.confirm(
        '该记录为自动通过，是否退回以重新选题？',
        '提示',
        { confirmButtonText: '退回', cancelButtonText: '取消', type: 'warning' }
      );
    } catch {
      return;
    }
    try {
      const res = await listAPI.editOneNode('MainVerifyProcess', {
        id: mvpId,
        isAudit: CONSTANT.AUDIT_STATUS.SAVE,
        reason: null,
        verifyUserName: null,
        verifyUserId: null,
      });
      if (res?.message === 'successful') {
        if (relRowId) await syncRelTitleStudentIsAudit(relRowId, CONSTANT.AUDIT_STATUS.SAVE);
        ElMessage.success('退回成功，可修改后重新提交');
        const iid = resolveInternshipId(getEffectiveInternship());
        await enrichSelectedTopicWithMerge(iid, userInfo.value?.id);
        await headerPageRef.value?.baseListRef?.initDataList?.(true);
      } else {
        ElMessage.error(res?.message || '退回失败');
      }
    } catch (e) {
      console.error(e);
    }
    return;
  }

  if (
    rowIsAudit !== CONSTANT.AUDIT_STATUS.SAVE &&
    rowIsAudit !== CONSTANT.AUDIT_STATUS.BACK
  ) {
    ElMessage.warning('该记录已提交或已审核，不能再次提交');
    return;
  }

  const vtid = resolveVerifyTypeIdFromRow(row);
  const STATUS =
    vtid === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.AUDIT_STATUS.PASS
      : CONSTANT.AUDIT_STATUS.SUBMIT;

  try {
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: mvpId,
      isAudit: STATUS,
    });
    if (resInfo?.message === 'successful') {
      if (relRowId) await syncRelTitleStudentIsAudit(relRowId, STATUS);
      ElMessage.success('提交成功');
      const iid = resolveInternshipId(getEffectiveInternship());
      await enrichSelectedTopicWithMerge(iid, userInfo.value?.id);
      await headerPageRef.value?.baseListRef?.initDataList?.(true);
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
    }
  } catch (e) {
    console.error('更新审核状态失败:', e);
  }
}

async function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  if (hasSelection.value) {
    if (!canCancelSelection.value) {
      ElMessage.warning('当前选题已提交审核，无法在此取消，请待老师处理或退回后再操作');
      return;
    }
    await handleCancelSelection();
  } else {
    await handleSelectTopic(row);
  }
}

async function handleSelectTopic(row) {
  const topicId = getTopicId(row);
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const stuId = Number(userInfo.value?.id || 0);
  if (!stuId) {
    ElMessage.warning('未获取到登录用户 ID，请使用学生账号登录后再选题');
    return;
  }
  if (!internshipId) {
    ElMessage.warning('未获取到当前实习项目，请先点击「实习项目选择」并确认');
    return;
  }
  if (!topicId) {
    ElMessage.warning('无法解析题目 ID，请从列表中选择一行后再操作');
    return;
  }

  const existingForStu = await querySelectedTopic(internshipId, stuId);
  if (existingForStu) {
    ElMessage.warning('请先取消当前选题后再选择新题目');
    return;
  }

  const titleTaken = await queryTitleStudentByTitleId(topicId);
  if (titleTaken) {
    const owner = Number(titleTaken?.stuId ?? titleTaken?.stu_id ?? 0);
    if (owner && owner !== stuId) {
      ElMessage.warning('该题目已被其他学生选择');
      return;
    }
  }

  try {
    await ElMessageBox.confirm(`确定选择题目「${row?.name || ''}」吗？`, '确认选择', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });
  } catch {
    return;
  }

  try {
    const result = await persistStudentTopicSelection(stuId, topicId);
    if (result.ok) {
      ElMessage.success('选择成功，请及时点击「提交」送审');
      await enrichSelectedTopicWithMerge(internshipId, stuId);
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(result.message || '选择失败');
    }
  } catch (e) {
    console.error('选择题目失败:', e);
    ElMessage.error('选择失败');
  }
}

async function handleCancelSelection() {
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const stuId = Number(userInfo.value?.id || 0);
  const currentRelId =
    Number(
      currentSelectedTopic.value?.relTitleStudentId ??
        currentSelectedTopic.value?.relationId ??
        currentSelectedTopic.value?.relation_id ??
        0
    ) || 0;
  const mergeFresh = await queryStudentTopicMergeRow(internshipId, stuId, currentRelId);
  const audit = mergeFresh ? rowAuditStatus(mergeFresh) : null;
  if (
    audit != null &&
    audit !== CONSTANT.AUDIT_STATUS.SAVE &&
    audit !== CONSTANT.AUDIT_STATUS.BACK
  ) {
    ElMessage.warning('当前选题已提交或审核中，无法取消，请待老师退回后再操作');
    return;
  }

  // 退回后可能存在视图字段映射差异：优先用最新 merge/relation 兜底解析，避免拿到 MainVerifyProcess.id 当作关系 id
  const relFresh = await querySelectedTopic(internshipId, stuId);
  const relationId =
    Number(
      mergeFresh?.relationId ??
        mergeFresh?.relation_id ??
        currentSelectedTopic.value?.relTitleStudentId ??
        currentSelectedTopic.value?.relationId ??
        currentSelectedTopic.value?.relation_id ??
        relFresh?.relTitleStudentId ??
        relFresh?.id ??
        0
    ) || 0;
  const topicId =
    Number(
      mergeFresh?.titleId ??
        mergeFresh?.title_id ??
        currentSelectedTopic.value?.topicId ??
        currentSelectedTopic.value?.titleId ??
        currentSelectedTopic.value?.title_id ??
        relFresh?.topicId ??
        relFresh?.titleId ??
        relFresh?.title_id ??
        0
    ) || 0;

  if (!internshipId || !stuId || !topicId || !relationId) {
    ElMessage.warning('当前选题信息不完整，请刷新后重试');
    return;
  }

  try {
    await ElMessageBox.confirm('确定取消当前选择的题目吗？取消后可重新选择。', '确认取消', {
      confirmButtonText: '确定取消',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    const result = await removeStudentTopicSelection(relationId, topicId);
    if (result.ok) {
      ElMessage.success('取消成功');
      currentSelectedTopic.value = null;
      currentRow.value = {};
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(result.message || '取消失败');
    }
  } catch (e) {
    console.error('取消选择失败:', e);
    ElMessage.error('取消失败');
  }
}
</script>


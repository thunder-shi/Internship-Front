<template>
  <el-result
    v-if="internshipType === null"
    icon="info"
    title="未到时间，请等候学校通知"
  />
  <template v-else-if="ready">
    <el-card shadow="never" class="topic-tab-card">
      <div class="topic-tab-inner">
        <el-radio-group v-model="activeTab">
          <el-radio-button value="available">可选题目</el-radio-button>
          <el-radio-button value="selected">已选题目（{{ selectedTopics.length }}）</el-radio-button>
        </el-radio-group>
        <span v-if="hasFinalTopic" class="final-tip">
          已有最终确认题目，不能继续选择候选
        </span>
      </div>
    </el-card>

    <InternshipPostHeaderPage
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
      @more2-click="handleMore2Click"
      @more3-click="handleMore3Click"
      @after-init-data="handleAfterTopicListInit"
    >
      <template #rightOperate="{ row }">
        <el-button type="info" size="small" title="题目详情" @click="handleViewTopicDetail(row)">
          <el-icon><InfoFilled /></el-icon>
        </el-button>
        <el-button
          v-if="activeTab === 'available'"
          type="success"
          size="small"
          title="选择题目"
          @click="handleSelectTopic(row)"
        >
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button
          v-else-if="canCancelSelection(row)"
          type="warning"
          size="small"
          title="取消选题"
          @click="handleCancelSelection(row)"
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
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick, unref, watch } from 'vue';
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
import { runSubmitAllByQuery } from '@/utils/submitAllByQuery';

defineOptions({ name: 'StuSelectTopic' });

const SOURCE_TYPE = Object.freeze({
  STUDENT_CANDIDATE: 'STUDENT_CANDIDATE',
  TEACHER_ASSIGN: 'TEACHER_ASSIGN',
});

const SELECTED_STATUSES = [
  CONSTANT.AUDIT_STATUS.SAVE,
  CONSTANT.AUDIT_STATUS.SUBMIT,
  CONSTANT.AUDIT_STATUS.PASS,
  CONSTANT.AUDIT_STATUS.BACK,
  CONSTANT.AUDIT_STATUS.NOTPASS,
];

const store = useStore();
const { getVerifyRoleName } = useVerifyFilter();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const internshipType = computed(() => store.getters.studentInternshipType);
const titleObj = reactive({ mainTitle: '学生自主选择题目' });

const studentInternshipIds = ref([]);
const ready = ref(false);
const activeTab = ref('available');
const internshipContext = ref(null);
const selectedTopics = ref([]);
const latestRejectedSelection = ref(null);

const currentInternship = computed(() => internshipContext.value);
const hasFinalTopic = computed(() => selectedTopics.value.some(isFinalSelection));

const selectedTopicIds = computed(
  () =>
    new Set(
      selectedTopics.value
        .map((row) => resolveTopicId(row))
        .filter(Boolean)
        .map(String)
    )
);

const showAcknowledgeToolbar = computed(
  () => activeTab.value === 'selected' && !!resolveNotPassRejectRow()
);

const progressMainInternshipId = computed(
  () =>
    currentRow.value?.m_internship_id ??
    currentRow.value?.internshipId ??
    currentRow.value?.internship_id ??
    resolveInternshipId(getEffectiveInternship()) ??
    0
);

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

function getEffectiveInternship() {
  if (internshipContext.value && resolveInternshipId(internshipContext.value)) {
    return internshipContext.value;
  }
  return unref(headerPageRef.value?.currentInternship) ?? null;
}

function isCurrentProcessNoVerify() {
  const internship = getEffectiveInternship();
  const raw = internship?.verifyTypeId ?? internship?.verify_type_id;
  const n = Number(raw);
  return Number.isFinite(n) && n === CONSTANT.VERIFY_LEVEL.NO_VERIFY;
}

function rowAuditStatus(row) {
  const raw = row?.isAudit ?? row?.is_audit;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isFinalSelection(row) {
  const audit = rowAuditStatus(row);
  if (audit === CONSTANT.AUDIT_STATUS.PASS) return true;
  if (
    audit === CONSTANT.AUDIT_STATUS.SAVE ||
    audit === CONSTANT.AUDIT_STATUS.SUBMIT ||
    audit === CONSTANT.AUDIT_STATUS.BACK ||
    audit === CONSTANT.AUDIT_STATUS.NOTPASS
  ) {
    return false;
  }
  const finalValue = row?.isFinal ?? row?.is_final;
  if (Number(finalValue) === 1) return true;
  return row?.isAllVerified === true || row?.is_all_verified === true;
}

function resolveRelationId(row) {
  if (!row || typeof row !== 'object') return 0;
  const candidates = [
    row.relationId,
    row.relation_id,
    row.relTitleStudentId,
    row.rel_title_student_id,
    row.titleStudentId,
    row.title_student_id,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function resolveVerifyProcessId(row) {
  if (!row || typeof row !== 'object') return 0;
  const candidates = [
    row.verifyProcessId,
    row.verify_process_id,
    row.mainVerifyProcessId,
    row.main_verify_process_id,
    row.mvpId,
    row.mvp_id,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function resolveTopicId(row) {
  if (!row || typeof row !== 'object') return 0;
  const candidates = [
    row.titleId,
    row.title_id,
    row.relTitleTeacherId,
    row.rel_title_teacher_id,
    row.topicId,
    row.topic_id,
    row.ID,
    row.id,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function normalizeSelectedTopic(row) {
  const isAudit = rowAuditStatus(row);
  const topicReasons = row?.topicReasons ?? row?.topic_reasons ?? '';
  const isFinal = isFinalSelection(row) ? 1 : 0;
  const sourceType = row?.sourceType ?? row?.source_type ?? SOURCE_TYPE.STUDENT_CANDIDATE;
  return {
    ...row,
    isAudit,
    is_audit: isAudit,
    isFinal,
    is_final: isFinal,
    isFinalText: isFinal === 1 ? '是' : '否',
    sourceType,
    source_type: sourceType,
    relationId: resolveRelationId(row),
    relTitleStudentId: row?.relTitleStudentId ?? row?.rel_title_student_id ?? resolveRelationId(row),
    verifyProcessId: resolveVerifyProcessId(row),
    titleId: resolveTopicId(row),
    topicReasons,
    topic_reasons: topicReasons,
  };
}

function normalizeAvailableTopic(row) {
  const isLimitValue = Number(row?.isLimit ?? row?.is_limit ?? 0);
  return {
    ...row,
    isLimit: isLimitValue,
    is_limit: isLimitValue,
    isLimitText: isLimitValue === 1 ? '是' : '否',
  };
}

function isTopicFinalOccupied(row) {
  if (Number(row?.isFinal ?? row?.is_final ?? 0) === 1) return true;
  const stuId = Number(row?.stuId ?? row?.stu_id ?? 0);
  if (stuId > 0) return true;
  const relId = Number(
    row?.relTitleStudentId ??
      row?.rel_title_student_id ??
      row?.titleStudentId ??
      row?.title_student_id ??
      0
  );
  if (relId > 0) return true;
  const studentName = row?.student_name ?? row?.studentName;
  return !!studentName && studentName !== '--';
}

function canCancelSelection(row) {
  if (!row || isFinalSelection(row)) return false;
  const audit = rowAuditStatus(row);
  return audit === CONSTANT.AUDIT_STATUS.SAVE || audit === CONSTANT.AUDIT_STATUS.BACK;
}

function canSubmitSelection(row) {
  if (!row || isFinalSelection(row)) return false;
  const audit = rowAuditStatus(row);
  return audit === CONSTANT.AUDIT_STATUS.SAVE || audit === CONSTANT.AUDIT_STATUS.BACK;
}

function resolveNotPassRejectRow() {
  const latest = latestRejectedSelection.value;
  if (latest && rowAuditStatus(latest) === CONSTANT.AUDIT_STATUS.NOTPASS) {
    return latest;
  }
  return selectedTopics.value.find((row) => rowAuditStatus(row) === CONSTANT.AUDIT_STATUS.NOTPASS) || null;
}

function buildStuTopicMergeInitSearchWords() {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return {
    searchKey: {
      isAudit: SELECTED_STATUSES.join(','),
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

async function querySelectedTopics(internshipId, stuId) {
  if (!internshipId || !stuId) return [];
  try {
    const [candidateRes, finalRes] = await Promise.all([
      listAPI.getSomeRecords({
        keyWords: 'ViewVerifyProcessRelTitleStudentMerge',
        searchKey: {
          internshipId,
          stuId,
          stu_id: stuId,
        },
        pageInfo: { page: 1, size: 500 },
        sort: { properties: 'vpUpdateTime', direction: 'DESC' },
      }),
      listAPI.getSomeRecords({
        keyWords: 'ViewRelTitleTeacherStudent',
        searchKey: {
          internshipId,
          stuId,
          stu_id: stuId,
        },
        pageInfo: { page: 1, size: 50 },
        sort: { properties: 'id', direction: 'DESC' },
      }),
    ]);

    const candidateRows = candidateRes?.data?.content ?? candidateRes?.data ?? [];
    const finalRows = finalRes?.data?.content ?? finalRes?.data ?? [];
    const resultMap = new Map();

    const findExistingSelection = (relationId, titleId) => {
      const relationKey = relationId ? `rel:${relationId}` : '';
      if (relationKey && resultMap.has(relationKey)) {
        return { key: relationKey, row: resultMap.get(relationKey) };
      }
      const titleKey = titleId ? `title:${titleId}` : '';
      if (titleKey && resultMap.has(titleKey)) {
        return { key: titleKey, row: resultMap.get(titleKey) };
      }
      for (const [key, row] of resultMap.entries()) {
        if (titleId && Number(row?.titleId ?? row?.title_id ?? 0) === Number(titleId)) {
          return { key, row };
        }
      }
      return null;
    };

    (Array.isArray(candidateRows) ? candidateRows : []).forEach((row) => {
      const normalized = normalizeSelectedTopic(row);
      const key = normalized.relationId ? `rel:${normalized.relationId}` : `title:${normalized.titleId}`;
      resultMap.set(key, normalized);
    });
    (Array.isArray(finalRows) ? finalRows : []).forEach((row) => {
      const relationId = resolveRelationId(row);
      const titleId = resolveTopicId(row);
      const normalized = normalizeSelectedTopic({
        ...row,
        relationId,
        relTitleStudentId: relationId,
        titleId,
        isAudit: row?.isAudit ?? CONSTANT.AUDIT_STATUS.PASS,
        is_audit: row?.is_audit ?? CONSTANT.AUDIT_STATUS.PASS,
        isFinal: 1,
        is_final: 1,
        sourceType: row?.sourceType ?? row?.source_type ?? SOURCE_TYPE.TEACHER_ASSIGN,
        source_type: row?.sourceType ?? row?.source_type ?? SOURCE_TYPE.TEACHER_ASSIGN,
        verifyProcessId: row?.verifyProcessId ?? row?.verify_process_id ?? 0,
      });
      const existing = findExistingSelection(normalized.relationId, normalized.titleId);
      // 审核流状态优先：若候选视图已显示退回/待提交/待审/不通过，就不能再被正式占用视图的旧 isFinal 覆盖。
      if (existing && !isFinalSelection(existing.row)) return;
      const key = existing?.key || (normalized.relationId ? `rel:${normalized.relationId}` : `title:${normalized.titleId}`);
      resultMap.set(key, { ...existing?.row, ...normalized });
    });
    return Array.from(resultMap.values());
  } catch (e) {
    console.error('查询学生选题候选失败:', e);
    return [];
  }
}

async function queryStudentTopicMergeRow(internshipId, stuId, relationId) {
  if (!internshipId || !stuId || !relationId) return null;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelTitleStudentMerge',
      searchKey: {
        internshipId,
        stuId,
        stu_id: stuId,
        relationId: Number(relationId),
        relation_id: Number(relationId),
      },
      pageInfo: { page: 1, size: 5 },
      sort: { properties: 'vpUpdateTime', direction: 'DESC' },
    });
    const rows = res?.data?.content ?? res?.data ?? [];
    const list = Array.isArray(rows) ? rows : [];
    const exact = list.find((r) => Number(r?.relationId ?? r?.relation_id ?? 0) === Number(relationId));
    return exact ? normalizeSelectedTopic(exact) : list[0] ? normalizeSelectedTopic(list[0]) : null;
  } catch (e) {
    console.error('查询学生选题审核行失败:', e);
    return null;
  }
}

async function refreshSelectedTopics(internshipId = resolveInternshipId(getEffectiveInternship())) {
  const stuId = Number(userInfo.value?.id || 0);
  if (!internshipId || !stuId) {
    selectedTopics.value = [];
    latestRejectedSelection.value = null;
    return;
  }
  selectedTopics.value = await querySelectedTopics(internshipId, stuId);
}

async function fetchSelectedTopicRecords(params = {}) {
  await refreshSelectedTopics();
  const pageInfo = params?.pageInfo || { page: 1, size: selectedTopics.value.length || 10 };
  const page = Number(pageInfo.page || 1);
  const size = Number(pageInfo.size || selectedTopics.value.length || 10);
  const start = Math.max(page - 1, 0) * size;
  const content = selectedTopics.value.slice(start, start + size);
  return {
    data: {
      content,
      totalElements: selectedTopics.value.length,
      page: {
        ...pageInfo,
        totalElements: selectedTopics.value.length,
      },
    },
    message: 'successful',
  };
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

async function persistStudentTopicSelection(stuId, topicId) {
  const createRes = await listAPI.editOneNode('RelTitleStudent', {
    stuId,
    titleId: Number(topicId),
    topicReasons: '',
  });
  if (!createRes || createRes.message !== 'successful') {
    return { ok: false, message: createRes?.message || '保存选题失败' };
  }
  return { ok: true };
}

async function removeStudentTopicSelection(relationId) {
  const rid = Number(relationId);
  if (!rid) {
    return { ok: false, message: '缺少选题记录信息' };
  }
  await deleteMainVerifyProcessByRelation(rid);
  const delRes = await listAPI.delOneOrManyNodes('RelTitleStudent', [rid]);
  if (!delRes || delRes.message !== 'successful') {
    return { ok: false, message: delRes?.message || '取消选题失败' };
  }
  return { ok: true };
}

function unwrapLatestRejectedRecord(res) {
  const raw = res?.data;
  if (raw == null || raw === '') return null;
  const pickFirst = (v) => {
    if (v == null) return null;
    if (Array.isArray(v)) return v.length ? v[0] : null;
    return v;
  };
  let cur = raw;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i += 1) {
    if (cur === null || Array.isArray(cur)) break;
    if (
      cur.relationId != null ||
      cur.relation_id != null ||
      cur.relTitleStudentId != null ||
      cur.isAudit != null ||
      cur.is_audit != null
    ) {
      return normalizeSelectedTopic(cur);
    }
    const next =
      pickFirst(cur.content) ??
      pickFirst(cur.records) ??
      pickFirst(cur.list) ??
      pickFirst(cur.rows) ??
      cur.data ??
      cur.node ??
      cur.result;
    if (next === cur) break;
    cur = next;
  }
  if (cur && typeof cur === 'object' && !Array.isArray(cur)) return normalizeSelectedTopic(cur);
  return null;
}

async function queryLatestRejectedSelection(stuId) {
  const sid = Number(stuId || 0);
  if (!sid) return null;
  try {
    const res = await internshipProcessAPI.getLatestRejectedTitleSelection({ stuId: sid });
    return unwrapLatestRejectedRecord(res);
  } catch (e) {
    console.error('查询最近不通过选题失败:', e);
    return null;
  }
}

async function refreshLatestRejectedSelection(stuId) {
  latestRejectedSelection.value = await queryLatestRejectedSelection(stuId);
}

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

function buildSearchKey(baseSearchKey) {
  if (activeTab.value === 'selected') {
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

  if (activeTab.value === 'selected') {
    return list
      .map(normalizeSelectedTopic)
      .filter((row) => {
        if (internshipId) {
          const rowIid = Number(row?.internshipId ?? row?.internship_id ?? 0);
          if (rowIid && rowIid !== internshipId) return false;
        }
        const stuId = Number(row?.stuId ?? row?.stu_id ?? 0);
        if (uid && stuId && stuId !== uid) return false;
        return SELECTED_STATUSES.includes(rowAuditStatus(row));
      });
  }

  if (hasFinalTopic.value) return [];

  return list
    .filter((row) => {
      if (internshipId) {
        const rowIid = Number(row?.internshipId ?? row?.internship_id ?? 0);
        if (rowIid && rowIid !== internshipId) return false;
      }

      const isDeleted = Number(row?.is_deleted ?? row?.isDeleted ?? 0);
      if (isDeleted !== 0) return false;

      const isAudit = Number(row?.isAudit ?? row?.is_audit ?? CONSTANT.AUDIT_STATUS.PASS);
      if (isAudit !== CONSTANT.AUDIT_STATUS.PASS) return false;

      const isLimitValue = Number(row?.isLimit ?? row?.is_limit ?? 0);
      if (isLimitValue !== 0) return false;

      const topicId = resolveTopicId(row);
      if (topicId && selectedTopicIds.value.has(String(topicId))) return false;
      if (isTopicFinalOccupied(row)) return false;
      return true;
    })
    .map(normalizeAvailableTopic);
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
    selectedTopics.value = [];
    latestRejectedSelection.value = null;
    currentRow.value = {};
    return;
  }

  await refreshSelectedTopics(internshipId);
  await refreshLatestRejectedSelection(userInfo.value?.id);
  await tryShowAutoRejectDialog();
  await headerPageRef.value?.updateSearchWordsAndRefresh?.();
}

watch(activeTab, () => {
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
});

const defaultDTLProps = computed(() => {
  const selected = activeTab.value === 'selected';
  const more1Disabled = headerPageRef.value?.isMore1Disabled?.value ?? false;

  return {
    title: titleObj,
    someFlags: { autoInit: false },
    clientFilterFn,
    fetchRecords: selected ? fetchSelectedTopicRecords : null,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    initSearchWords: selected ? buildStuTopicMergeInitSearchWords() : undefined,
    defaultDTHProps: {
      buttonProps: selected
        ? {
            more1: { show: true, name: '实习项目选择', disabled: more1Disabled },
            more2: {
              show: showAcknowledgeToolbar.value,
              name: '确认不通过并删除',
              type: 'danger',
            },
            update: { show: true, type: 'primary', name: '取消选择' },
            visible: { show: true, type: 'primary', name: '查看进度' },
            submit: { show: true, name: '提交', type: 'warning' },
            more3: { show: true, name: '批量提交', type: 'warning' },
            more5: {
              show: true,
              name: '全部提交',
              type: 'warning',
              submitAll: { handler: handleSubmitAllSelections },
            },
            buttonGroup: { show: true },
          }
        : {
            more1: { show: true, name: '实习项目选择', disabled: more1Disabled },
            more2: { show: true, name: '批量选择题目', type: 'success' },
            update: { show: true, type: 'primary', name: '选择题目' },
            visible: { show: true, type: 'primary', name: '题目详情' },
            buttonGroup: { show: true },
          },
      buttonCondition: selected
        ? {
            submit: canSubmitSelection,
            update: canCancelSelection,
            visible: (row) => resolveVerifyProcessId(row) > 0,
          }
        : {},
      keyWord: selected
        ? {
            edit: 'MainVerifyProcess',
            view: 'ViewVerifyProcessRelTitleStudentMerge',
          }
        : {
            edit: 'RelTitleStudent',
            view: 'ViewRelTitleTeacherStudent',
          },
      allTableColumns: selected
        ? [
            { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
            { id: 2, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
            { id: 3, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
            { id: 4, showName: '状态', tableColumnName: 'customize-status' },
            { id: 5, showName: '是否最终题目', tableColumnName: 'isFinalText' },
            { id: 6, showName: '不通过理由', tableColumnName: 'topicReasons', sortable: false },
          ]
        : [
            { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
            { id: 2, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
            { id: 3, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
            { id: 4, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
          ],
    },
    defaultDBIProps: {},
  };
});

function handleViewTopicDetail(row) {
  if (!row) return;
  const topicId = resolveTopicId(row);
  const topicRow = { ...row, id: topicId };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, getEffectiveInternship(), true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (activeTab.value === 'selected') {
    currentRow.value = row ? normalizeSelectedTopic(row) : {};
    showProgressDialog.value = true;
    return;
  }
  handleViewTopicDetail(row);
}

async function handleSubmitClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  if (activeTab.value !== 'selected') return;

  const normalized = normalizeSelectedTopic(row);
  if (!canSubmitSelection(normalized)) {
    ElMessage.warning('该记录已提交或已审核，不能再次提交');
    return;
  }

  const verifyProcessId = resolveVerifyProcessId(normalized);
  if (!verifyProcessId) {
    ElMessage.error('未找到选题审核流程记录，请刷新后重试');
    return;
  }

  try {
    const resInfo = await internshipProcessAPI.auditProcess({
      id: verifyProcessId,
      isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
    });
    if (resInfo?.message === 'successful') {
      ElMessage.success('提交成功');
      await refreshSelectedTopics();
      await refreshLatestRejectedSelection(userInfo.value?.id);
      await headerPageRef.value?.baseListRef?.initDataList?.(true);
    } else {
      ElMessage.warning(resInfo?.message || '提交失败');
    }
  } catch (e) {
    console.error('提交选题失败:', e);
    ElMessage.error('提交失败');
  }
}

async function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  if (activeTab.value === 'selected') {
    await handleCancelSelection(row);
    return;
  }
  await handleSelectTopic(row);
}

async function handleSelectTopic(row) {
  const topicId = resolveTopicId(row);
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
  if (hasFinalTopic.value) {
    ElMessage.warning('你已有最终确认题目，不能继续选择候选');
    return;
  }
  if (selectedTopicIds.value.has(String(topicId))) {
    ElMessage.warning('你已选择过该题目，请勿重复选择');
    return;
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
      ElMessage.success('选择成功，可继续选择或切到「已选题目」提交');
      await refreshSelectedTopics(internshipId);
      await refreshLatestRejectedSelection(stuId);
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(result.message || '选择失败');
    }
  } catch (e) {
    console.error('选择题目失败:', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '选择失败');
  }
}

function normalizeRowList(rowOrArray) {
  if (Array.isArray(rowOrArray)) return rowOrArray.filter(Boolean);
  return rowOrArray ? [rowOrArray] : [];
}

async function handleBatchSelectTopics(rowOrArray) {
  const rows = normalizeRowList(rowOrArray);
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const stuId = Number(userInfo.value?.id || 0);

  if (!rows.length) {
    ElMessage.warning('请至少勾选一个题目后再批量选择');
    return;
  }
  if (!stuId) {
    ElMessage.warning('未获取到登录用户 ID，请使用学生账号登录后再选题');
    return;
  }
  if (!internshipId) {
    ElMessage.warning('未获取到当前实习项目，请先点击「实习项目选择」并确认');
    return;
  }
  if (hasFinalTopic.value) {
    ElMessage.warning('你已有最终确认题目，不能继续选择候选');
    return;
  }

  const seenTopicIds = new Set();
  const validRows = [];
  let skippedCount = 0;

  rows.forEach((row) => {
    const topicId = resolveTopicId(row);
    if (!topicId || selectedTopicIds.value.has(String(topicId)) || seenTopicIds.has(String(topicId)) || isTopicFinalOccupied(row)) {
      skippedCount += 1;
      return;
    }
    seenTopicIds.add(String(topicId));
    validRows.push({ row, topicId });
  });

  if (!validRows.length) {
    ElMessage.warning('勾选的题目均不可选择，请检查是否已选择过或已被最终占用');
    return;
  }

  try {
    const skippedText = skippedCount > 0 ? `，将自动跳过 ${skippedCount} 个不可选题目` : '';
    await ElMessageBox.confirm(
      `确定批量选择 ${validRows.length} 个题目吗？${skippedText}`,
      '确认批量选择',
      {
        confirmButtonText: '确定选择',
        cancelButtonText: '取消',
        type: 'info',
      }
    );
  } catch {
    return;
  }

  const failures = [];
  let successCount = 0;
  for (const item of validRows) {
    try {
      const result = await persistStudentTopicSelection(stuId, item.topicId);
      if (result.ok) {
        successCount += 1;
      } else {
        failures.push(`${item.row?.name || `题目 ${item.topicId}`}：${result.message || '选择失败'}`);
      }
    } catch (e) {
      failures.push(`${item.row?.name || `题目 ${item.topicId}`}：${e?.response?.data?.message || e?.message || '选择失败'}`);
    }
  }

  await refreshSelectedTopics(internshipId);
  await refreshLatestRejectedSelection(stuId);
  await headerPageRef.value?.updateSearchWordsAndRefresh?.();

  if (successCount > 0 && failures.length === 0) {
    ElMessage.success(`批量选择成功，共选择 ${successCount} 个题目，可切到「已选题目」提交`);
    return;
  }
  if (successCount > 0) {
    console.warn('批量选择题目部分失败:', failures);
    ElMessage.warning(`已成功选择 ${successCount} 个题目，${failures.length} 个失败；详情可查看控制台`);
    return;
  }
  console.warn('批量选择题目失败:', failures);
  ElMessage.error(failures[0] || '批量选择失败');
}

async function handleBatchSubmitSelections(rowOrArray) {
  const rows = normalizeRowList(rowOrArray);
  if (!rows.length) {
    ElMessage.warning('请至少勾选一个已选题目后再批量提交');
    return;
  }

  const submitRows = [];
  const seenVerifyProcessIds = new Set();
  let skippedCount = 0;

  rows.forEach((row) => {
    const normalized = normalizeSelectedTopic(row);
    const verifyProcessId = resolveVerifyProcessId(normalized);
    if (!canSubmitSelection(normalized) || !verifyProcessId || seenVerifyProcessIds.has(String(verifyProcessId))) {
      skippedCount += 1;
      return;
    }
    seenVerifyProcessIds.add(String(verifyProcessId));
    submitRows.push({ row: normalized, verifyProcessId });
  });

  if (!submitRows.length) {
    ElMessage.warning('勾选的记录没有可提交项，请选择“待提交”或“审核退回”的候选题目');
    return;
  }
  let noVerifySkippedCount = 0;
  if (isCurrentProcessNoVerify() && submitRows.length > 1) {
    noVerifySkippedCount = submitRows.length - 1;
    submitRows.splice(1);
  }

  try {
    const skippedMessages = [];
    if (skippedCount > 0) {
      skippedMessages.push(`将自动跳过 ${skippedCount} 条不可提交记录`);
    }
    if (noVerifySkippedCount > 0) {
      skippedMessages.push(`当前流程无需审核，只会确认 1 个最终题目，并跳过 ${noVerifySkippedCount} 个候选题目`);
    }
    const skippedText = skippedMessages.length ? `，${skippedMessages.join('，')}` : '';
    await ElMessageBox.confirm(
      `确定批量提交 ${submitRows.length} 个候选题目吗？${skippedText}`,
      '确认批量提交',
      {
        confirmButtonText: '确定提交',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  const failures = [];
  let successCount = 0;
  for (const item of submitRows) {
    try {
      const resInfo = await internshipProcessAPI.auditProcess({
        id: item.verifyProcessId,
        isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
      });
      if (resInfo?.message === 'successful') {
        successCount += 1;
      } else {
        failures.push(`${item.row?.name || `流程 ${item.verifyProcessId}`}：${resInfo?.message || '提交失败'}`);
      }
    } catch (e) {
      failures.push(`${item.row?.name || `流程 ${item.verifyProcessId}`}：${e?.response?.data?.message || e?.message || '提交失败'}`);
    }
  }

  await refreshSelectedTopics();
  await refreshLatestRejectedSelection(userInfo.value?.id);
  await headerPageRef.value?.baseListRef?.initDataList?.(true);

  if (successCount > 0 && failures.length === 0) {
    ElMessage.success(`批量提交成功，共提交 ${successCount} 个候选题目`);
    return;
  }
  if (successCount > 0) {
    console.warn('批量提交选题部分失败:', failures);
    ElMessage.warning(`已成功提交 ${successCount} 个，${failures.length} 个失败；详情可查看控制台`);
    return;
  }
  console.warn('批量提交选题失败:', failures);
  ElMessage.error(failures[0] || '批量提交失败');
}

async function handleSubmitAllSelections({ initDataList } = {}) {
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const stuId = Number(userInfo.value?.id || 0);
  const noVerify = isCurrentProcessNoVerify();
  const localSubmitCount = selectedTopics.value
    .map(normalizeSelectedTopic)
    .filter((row) => canSubmitSelection(row) && resolveVerifyProcessId(row) > 0)
    .length;

  await runSubmitAllByQuery(
    {
      guard: () => {
        if (activeTab.value !== 'selected') {
          ElMessage.warning('请先切换到“已选题目”后再全部提交');
          return false;
        }
        if (!internshipId) {
          ElMessage.warning('请先选择实习项目');
          return false;
        }
        if (!stuId) {
          ElMessage.warning('未获取到登录学生信息，请重新登录后再试');
          return false;
        }
        return true;
      },
      keyWords: 'ViewVerifyProcessRelTitleStudentMerge',
      searchKey: {
        internshipId,
        stuId,
        tableName: 'RelTitleStudent',
        isAudit: `${CONSTANT.AUDIT_STATUS.SAVE},${CONSTANT.AUDIT_STATUS.BACK}`,
      },
      reg: {
        internshipId: '=',
        stuId: '=',
        tableName: '=',
        isAudit: CONSTANT.SEARCH_OPERATOR.IN,
      },
      filterRows: (row) => {
        const normalized = normalizeSelectedTopic(row);
        return canSubmitSelection(normalized) && resolveVerifyProcessId(normalized) > 0;
      },
      // 无审核流程只允许最终确认 1 个题目，其余候选会被后端释放
      maxRows: noVerify ? 1 : undefined,
      mapNode: (row) => ({
        id: resolveVerifyProcessId(row),
        isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
      }),
      buildConfirmText: (n) =>
        noVerify && localSubmitCount > 1
          ? '当前流程无需审核，将只提交 1 个候选题目并自动确认最终题目，其余候选题目会被释放，确定继续吗？'
          : `确定提交当前项目下全部 ${n} 个候选题目吗？`,
    },
    {
      initDataList: async (force) => {
        await refreshSelectedTopics(internshipId);
        await refreshLatestRejectedSelection(stuId);
        await (initDataList || headerPageRef.value?.baseListRef?.initDataList)?.(force ?? true);
      },
    }
  );
}

async function handleCancelSelection(row) {
  const internshipId = resolveInternshipId(getEffectiveInternship());
  const stuId = Number(userInfo.value?.id || 0);
  const normalized = normalizeSelectedTopic(row);
  const relationId = resolveRelationId(normalized);
  if (!internshipId || !stuId || !relationId) {
    ElMessage.warning('当前选题信息不完整，请刷新后重试');
    return;
  }

  const mergeFresh = await queryStudentTopicMergeRow(internshipId, stuId, relationId);
  const latest = mergeFresh || normalized;
  if (!canCancelSelection(latest)) {
    ElMessage.warning('当前选题已提交或已审核，无法取消，请待老师处理或退回后再操作');
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
    const result = await removeStudentTopicSelection(relationId);
    if (result.ok) {
      ElMessage.success('取消成功');
      currentRow.value = {};
      await refreshSelectedTopics(internshipId);
      await refreshLatestRejectedSelection(stuId);
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(result.message || '取消失败');
    }
  } catch (e) {
    console.error('取消选择失败:', e);
    ElMessage.error('取消失败');
  }
}

const AUTO_REJECT_PROMPT_PREFIX = 'stuSelectTopic.autoRejectPrompt.';

async function tryShowAutoRejectDialog() {
  if (typeof sessionStorage === 'undefined') return;
  const stuId = Number(userInfo.value?.id || 0);
  if (!stuId) return;

  const row = resolveNotPassRejectRow();
  if (!row) return;

  const relationId = resolveRelationId(row);
  if (!relationId || rowAuditStatus(row) !== CONSTANT.AUDIT_STATUS.NOTPASS) return;

  const key = `${AUTO_REJECT_PROMPT_PREFIX}${stuId}.${relationId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const reason = row?.topicReasons ?? row?.topic_reasons ?? row?.reason ?? '';

  try {
    await ElMessageBox.confirm(
      `您的选题未通过审核。\n\n原因：${reason || '未填写'}\n\n确认后将清除本条候选记录，您可重新选择题目。也可稍后点击上方「确认不通过并删除」处理。`,
      '选题审核不通过',
      {
        confirmButtonText: '确认并删除',
        cancelButtonText: '稍后处理',
        type: 'warning',
        distinguishCancelAndClose: true,
      }
    );
    await handleAcknowledgeNotPass(row, { skipConfirm: true });
  } catch {
    // 稍后处理 / 关闭
  }
}

async function handleAfterTopicListInit() {
  const stuId = Number(userInfo.value?.id || 0);
  if (!stuId) return;
  if (!resolveInternshipId(getEffectiveInternship())) return;
  await refreshLatestRejectedSelection(stuId);
  await tryShowAutoRejectDialog();
}

async function handleAcknowledgeNotPass(rowFromTable, options = {}) {
  const { skipConfirm = false } = options;
  const stuId = Number(userInfo.value?.id || 0);

  let candidate =
    rowFromTable && typeof rowFromTable === 'object' && !Array.isArray(rowFromTable)
      ? normalizeSelectedTopic(rowFromTable)
      : null;

  if (!candidate || rowAuditStatus(candidate) !== CONSTANT.AUDIT_STATUS.NOTPASS) {
    candidate = resolveNotPassRejectRow();
  }

  if (!candidate) {
    const latestRejected = await queryLatestRejectedSelection(stuId);
    latestRejectedSelection.value = latestRejected;
    candidate =
      latestRejected && rowAuditStatus(latestRejected) === CONSTANT.AUDIT_STATUS.NOTPASS
        ? latestRejected
        : null;
  }

  if (!candidate) {
    latestRejectedSelection.value = null;
    ElMessage.warning('当前没有可确认的不通过记录，请刷新后重试');
    return;
  }

  const relationId = resolveRelationId(candidate);
  if (!relationId || rowAuditStatus(candidate) !== CONSTANT.AUDIT_STATUS.NOTPASS) {
    ElMessage.warning('无法解析选题记录编号或状态异常，请刷新后重试');
    return;
  }

  const reason = candidate?.topicReasons ?? candidate?.topic_reasons ?? candidate?.reason ?? '';
  if (!skipConfirm) {
    try {
      await ElMessageBox.confirm(
        `审核不通过原因：\n${reason || '未填写'}\n\n确认后将清理当前候选记录，你可以重新选择题目。`,
        '审核不通过',
        {
          confirmButtonText: '确认并删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    } catch {
      return;
    }
  }

  try {
    const res = await internshipProcessAPI.acknowledgeRejectedTitleSelection({
      relationId,
      stuId,
    });
    if (res?.message === 'successful') {
      ElMessage.success('已确认不通过原因，可重新选择题目');
      currentRow.value = {};
      await refreshSelectedTopics();
      await refreshLatestRejectedSelection(stuId);
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(res?.message || '确认失败');
    }
  } catch (e) {
    console.error('确认审核不通过失败:', e);
    ElMessage.error('确认失败');
  }
}

function handleToolbarAcknowledgeNotPass() {
  handleAcknowledgeNotPass(resolveNotPassRejectRow());
}

function handleMore2Click(rows) {
  if (activeTab.value === 'available') {
    handleBatchSelectTopics(rows);
    return;
  }
  handleToolbarAcknowledgeNotPass();
}

function handleMore3Click(rows) {
  if (activeTab.value !== 'selected') return;
  handleBatchSubmitSelections(rows);
}
</script>

<style scoped>
.topic-tab-card {
  margin-bottom: 12px;
}

.topic-tab-card :deep(.el-card__body) {
  padding: 10px 16px;
}

.topic-tab-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.final-tip {
  color: var(--el-color-success);
  font-size: 13px;
}
</style>

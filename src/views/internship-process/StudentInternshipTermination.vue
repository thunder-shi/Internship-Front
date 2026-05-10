<template>
  <div class="termination-page">
    <el-card shadow="never" class="filter-card">
      <el-form :model="filterForm" label-width="86px" class="filter-form">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="实习类型">
              <el-select v-model="filterForm.internshipMode" clearable placeholder="全部类型" style="width: 100%">
                <el-option label="校内实习" value="INTERNAL" />
                <el-option label="校外实习" value="EXTERNAL" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="状态">
              <el-select v-model="filterForm.internshipStatus" clearable placeholder="全部状态" style="width: 100%">
                <el-option label="正常实习" :value="INTERNSHIP_STATUS.ACTIVE" />
                <el-option label="终止审核中" :value="INTERNSHIP_STATUS.TERMINATING" />
                <el-option label="已终止" :value="INTERNSHIP_STATUS.TERMINATED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6" class="filter-actions-col">
            <el-form-item label-width="0">
              <div class="filter-actions">
                <el-button type="primary" :icon="Search" @click="searchCandidates">查询</el-button>
                <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <DataTableList
      ref="dtlRef"
      :default-props="defaultDTLProps"
      :fetch-records="fetchCandidateRecords"
    >
      <template #mode="{ row }">
        <el-tag :type="row.internshipMode === 'EXTERNAL' ? 'primary' : 'success'" effect="light">
          {{ modeText(row.internshipMode) }}
        </el-tag>
      </template>
      <template #subject="{ row }">
        {{ row.postName || row.internshipPostName || row.titleName || row.name || '--' }}
      </template>
      <template #internshipStatus="{ row }">
        <el-tag :type="internshipStatusTag(row.internshipStatus)">
          {{ internshipStatusText(row.internshipStatus) }}
        </el-tag>
      </template>
      <template #rightOperate="{ row }">
        <el-button
          v-if="canCreateTermination(row)"
          type="danger"
          size="small"
          title="发起终止"
          @click.stop="openTerminationDialog(row)"
        >
          <el-icon><CircleClose /></el-icon>
        </el-button>
        <el-button
          v-if="hasTerminationRecord(row)"
          type="primary"
          size="small"
          title="查看终止记录"
          @click.stop="openDetail(row)"
        >
          <el-icon><View /></el-icon>
        </el-button>
        <el-button
          v-if="canCancelTermination(row)"
          type="warning"
          size="small"
          title="取消终止申请"
          @click.stop="handleCancelTermination(row)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </template>
    </DataTableList>

    <el-dialog
      v-model="terminationDialogVisible"
      title="发起终止学生实习"
      width="640px"
      destroy-on-close
      @closed="resetTerminationForm"
    >
      <el-descriptions :column="2" border class="candidate-summary">
        <el-descriptions-item label="学生">{{ selectedCandidate.studentName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ selectedCandidate.studentAccount || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习项目">{{ selectedCandidate.internshipName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习类型">{{ modeText(selectedCandidate.internshipMode) }}</el-descriptions-item>
        <el-descriptions-item label="岗位/题目" :span="2">
          {{ selectedCandidate.postName || selectedCandidate.titleName || selectedCandidate.name || '--' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-form ref="terminationFormRef" :model="terminationForm" :rules="terminationRules" label-width="110px">
        <el-form-item label="终止日期" prop="terminateDate">
          <el-date-picker
            v-model="terminationForm.terminateDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择终止日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="原因类型" prop="reasonType">
          <el-select v-model="terminationForm.reasonType" placeholder="请选择原因类型" style="width: 100%">
            <el-option v-for="item in reasonOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细原因" prop="reason">
          <el-input
            v-model.trim="terminationForm.reason"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="请填写终止当前实习的详细原因"
          />
        </el-form-item>
        <el-form-item label="附件材料">
          <el-upload
            v-model:file-list="terminationFileList"
            drag
            multiple
            :auto-upload="false"
            :limit="8"
            :on-exceed="handleUploadExceed"
          >
            <el-icon class="el-icon--upload"><Upload /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或点击选择附件</div>
            <template #tip>
              <div class="upload-tip">附件可选，单个文件不超过 {{ CONSTANT.FILE_MAX_SIZE }}MB。</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="terminationDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitTermination">提交申请</el-button>
      </template>
    </el-dialog>

    <DlgInternshipTerminationDetail
      v-model="detailDialogVisible"
      :loading="detailLoading"
      :detail="detailInfo"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { useStore } from 'vuex';
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus';
import { CircleClose, Close, Refresh, Search, Upload, View } from '@element-plus/icons-vue';
import moment from 'moment';
import DataTableList from '@/components/DataTableList.vue';
import DlgInternshipTerminationDetail from '@/views/internship-process/components/DlgInternshipTerminationDetail.vue';
import terminationAPI from '@/api/internshipTermination';
import fileAPI from '@/api/file';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'StudentInternshipTermination' });

const INTERNSHIP_STATUS = Object.freeze({
  ACTIVE: 0,
  TERMINATING: 1,
  TERMINATED: 2,
});

const REL_EXTERNAL = 'RelStuInternshipPost';
const REL_INTERNAL = 'RelTitleStudent';
const TERMINATION_TABLE_NAME = 'MainInternshipTermination';

const reasonOptions = ['入伍', '身体原因', '退学', '转专业', '其他'];

const store = useStore();
const dtlRef = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});
const currentStudentId = computed(() => userInfo.value?.id || null);
const currentStudentAccount = computed(() => userInfo.value?.account || userInfo.value?.studentAccount || '');

const filterForm = reactive({
  internshipMode: '',
  internshipStatus: INTERNSHIP_STATUS.ACTIVE,
});

const titleObj = reactive({ mainTitle: '终止实习申请' });

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: true,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: true,
  },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'internshipName', direction: 'ASC' },
  bottomOffset: 16,
  defaultDTHProps: {
    showTopButtons: false,
    keyWord: { edit: TERMINATION_TABLE_NAME, view: 'ViewStudentInternshipTerminationCandidate' },
    buttonProps: {
      buttonGroup: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 2, showName: '实习类型', tableColumnName: 'customize-mode', width: 100 },
      { id: 3, showName: '岗位/题目', tableColumnName: 'customize-subject' },
      { id: 4, showName: '导师', tableColumnName: 'teacherName', sortable: true, width: 120 },
      { id: 5, showName: '状态', tableColumnName: 'customize-internshipStatus', width: 120 },
    ],
  },
}));

const terminationDialogVisible = ref(false);
const terminationFormRef = ref(null);
const selectedCandidate = ref({});
const submitting = ref(false);
const terminationFileList = ref([]);

const terminationForm = reactive({
  terminateDate: moment().format('YYYY-MM-DD'),
  reasonType: '',
  reason: '',
});

const terminationRules = {
  terminateDate: [{ required: true, message: '请选择终止日期', trigger: 'change' }],
  reasonType: [{ required: true, message: '请选择原因类型', trigger: 'change' }],
  reason: [{ required: true, message: '请填写详细原因', trigger: 'blur' }],
};

const detailDialogVisible = ref(false);
const detailLoading = ref(false);
const detailInfo = ref({});

function cleanPayload(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') acc[key] = value;
    return acc;
  }, {});
}

function normalizePageResponse(res, mapper) {
  const data = res?.data;
  const contentRaw = Array.isArray(data)
    ? data
    : data?.content || data?.records || data?.list || [];
  const content = contentRaw.map(mapper);
  const totalElements = Number(
    data?.page?.totalElements ?? data?.totalElements ?? data?.total ?? content.length
  );
  return {
    ...(res || {}),
    data: {
      ...(Array.isArray(data) ? {} : data || {}),
      content,
      totalElements,
      page: {
        ...(data?.page || {}),
        totalElements,
      },
    },
  };
}

function normalizeInternshipStatus(value) {
  if (value === null || value === undefined || value === '') return INTERNSHIP_STATUS.ACTIVE;
  const normalized = String(value).toUpperCase();
  if (normalized === 'ACTIVE') return INTERNSHIP_STATUS.ACTIVE;
  if (normalized === 'TERMINATING') return INTERNSHIP_STATUS.TERMINATING;
  if (normalized === 'TERMINATED') return INTERNSHIP_STATUS.TERMINATED;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function normalizeCandidateRow(row) {
  const relationTable = row.relationTable || row.relation_table || inferRelationTable(row);
  const relationId =
    row.relationId ??
    row.relation_id ??
    row.relStuInternshipPostId ??
    row.relTitleStudentId ??
    row.id;
  const internshipMode = normalizeMode(row.internshipMode || row.internship_mode, relationTable);
  const terminationId = row.terminationId ?? row.termination_id;
  return {
    ...row,
    id: row.id ?? `${relationTable || internshipMode}_${relationId}`,
    internshipId: row.internshipId ?? row.internship_id,
    studentId: row.studentId ?? row.stuId ?? row.student_id,
    studentName: row.studentName ?? row.stuName ?? row.student_name,
    studentAccount: row.studentAccount ?? row.account ?? row.student_account,
    departmentId: row.departmentId ?? row.department_id,
    departmentName: row.departmentName ?? row.department_name,
    majorId: row.majorId ?? row.major_id,
    majorName: row.majorName ?? row.major_name,
    relationTable,
    relationId,
    internshipMode,
    internshipStatus: resolveCandidateInternshipStatus(row),
    terminationId,
    tableName: TERMINATION_TABLE_NAME,
  };
}

function resolveCandidateInternshipStatus(row) {
  const terminationStatus = row.terminationStatus ?? row.termination_status ?? row.status;
  const terminationId = row.terminationId ?? row.termination_id;
  if (terminationId != null && Number(terminationStatus) === 1) {
    return INTERNSHIP_STATUS.TERMINATED;
  }
  return normalizeInternshipStatus(row.internshipStatus ?? row.internship_status);
}

function isCurrentStudentRow(row) {
  const studentId = currentStudentId.value;
  const studentAccount = currentStudentAccount.value;
  if (studentId && row.studentId != null) {
    return String(row.studentId) === String(studentId);
  }
  if (studentAccount && row.studentAccount) {
    return String(row.studentAccount) === String(studentAccount);
  }
  return false;
}

function matchesCurrentFilters(row) {
  if (!isCurrentStudentRow(row)) return false;
  if (filterForm.internshipMode && row.internshipMode !== filterForm.internshipMode) return false;
  if (
    filterForm.internshipStatus !== null &&
    filterForm.internshipStatus !== undefined &&
    filterForm.internshipStatus !== '' &&
    normalizeInternshipStatus(row.internshipStatus) !== Number(filterForm.internshipStatus)
  ) {
    return false;
  }
  return true;
}

function normalizeMode(value, relationTable) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'INTERNAL' || normalized === 'EXTERNAL') return normalized;
  if (relationTable === REL_INTERNAL) return 'INTERNAL';
  if (relationTable === REL_EXTERNAL) return 'EXTERNAL';
  return normalized || '';
}

function inferRelationTable(row) {
  const mode = String(row.internshipMode || row.internship_mode || '').toUpperCase();
  if (mode === 'INTERNAL') return REL_INTERNAL;
  if (mode === 'EXTERNAL') return REL_EXTERNAL;
  if (row.titleName || row.relTitleStudentId) return REL_INTERNAL;
  return REL_EXTERNAL;
}

function modeText(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'INTERNAL') return '校内实习';
  if (normalized === 'EXTERNAL') return '校外实习';
  return value || '--';
}

function internshipStatusText(value) {
  const status = normalizeInternshipStatus(value);
  const map = {
    [INTERNSHIP_STATUS.ACTIVE]: '正常实习',
    [INTERNSHIP_STATUS.TERMINATING]: '终止审核中',
    [INTERNSHIP_STATUS.TERMINATED]: '已终止',
  };
  return map[status] || value || '--';
}

function internshipStatusTag(value) {
  const status = normalizeInternshipStatus(value);
  const map = {
    [INTERNSHIP_STATUS.ACTIVE]: 'success',
    [INTERNSHIP_STATUS.TERMINATING]: 'warning',
    [INTERNSHIP_STATUS.TERMINATED]: 'info',
  };
  return map[status] || 'info';
}

function hasTerminationRecord(row) {
  return row?.terminationId != null && row.terminationId !== '';
}

function canCreateTermination(row) {
  return normalizeInternshipStatus(row?.internshipStatus) === INTERNSHIP_STATUS.ACTIVE;
}

function canCancelTermination(row) {
  return (
    normalizeInternshipStatus(row?.internshipStatus) === INTERNSHIP_STATUS.TERMINATING &&
    hasTerminationRecord(row)
  );
}

function buildFilterNode(params = {}) {
  const studentId = currentStudentId.value;
  const pageInfo = {
    ...(params.pageInfo || {}),
    page: 1,
    size: Math.max(Number(params.pageInfo?.size || 0), 5000),
  };
  if (!studentId) {
    return {
      pageInfo,
      sort: params.sort,
      studentId: -1,
    };
  }

  const node = cleanPayload({
    studentId,
    studentAccount: currentStudentAccount.value,
    account: currentStudentAccount.value,
    internshipMode: filterForm.internshipMode,
    internshipStatus: filterForm.internshipStatus,
    pageInfo,
    sort: params.sort,
  });
  return node;
}

async function fetchCandidateRecords(params) {
  const res = await terminationAPI.listCandidates(buildFilterNode(params));
  const normalized = normalizePageResponse(res, normalizeCandidateRow);
  const filtered = (normalized.data.content || []).filter(matchesCurrentFilters);
  const sorted = sortRows(filtered, params?.sort);
  const page = Number(params?.pageInfo?.page || 1);
  const size = Number(params?.pageInfo?.size || 20);
  const start = Math.max(page - 1, 0) * size;
  const content = sorted.slice(start, start + size);
  return {
    ...normalized,
    data: {
      ...normalized.data,
      content,
      totalElements: filtered.length,
      page: {
        ...(normalized.data.page || {}),
        totalElements: filtered.length,
      },
    },
  };
}

function sortRows(rows, sort = {}) {
  const field = sort?.properties;
  if (!field) return rows;
  const direction = sort.direction === 'ASC' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return direction;
    if (bv == null) return -direction;
    if (av < bv) return -direction;
    if (av > bv) return direction;
    return 0;
  });
}

function searchCandidates() {
  dtlRef.value?.initDataList?.(true);
}

function resetFilters() {
  filterForm.internshipMode = '';
  filterForm.internshipStatus = INTERNSHIP_STATUS.ACTIVE;
  nextTick(searchCandidates);
}

function openTerminationDialog(row) {
  if (!canCreateTermination(row)) {
    ElMessage.warning('只能对正常实习状态的学生发起终止申请');
    return;
  }
  selectedCandidate.value = { ...row };
  terminationForm.terminateDate = moment().format('YYYY-MM-DD');
  terminationForm.reasonType = '';
  terminationForm.reason = '';
  terminationFileList.value = [];
  terminationDialogVisible.value = true;
}

function resetTerminationForm() {
  terminationFormRef.value?.clearValidate?.();
  selectedCandidate.value = {};
  terminationFileList.value = [];
}

function handleUploadExceed() {
  ElMessage.warning('最多上传 8 个附件');
}

function parseFileIdsFromUpload(res) {
  const data = res?.data;
  if (data == null) return [];
  if (typeof data === 'number') return [data];
  if (typeof data === 'string') {
    return data
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(data)) {
    return data
      .map((item) => (typeof item === 'object' ? item.id ?? item.ossFileId ?? item.fileId : item))
      .filter((item) => item != null && item !== '');
  }
  if (typeof data === 'object') {
    const list = data.content || data.records || data.list || data.files;
    if (Array.isArray(list)) {
      return list
        .map((item) => (typeof item === 'object' ? item.id ?? item.ossFileId ?? item.fileId : item))
        .filter((item) => item != null && item !== '');
    }
    const id = data.id ?? data.ossFileId ?? data.fileId;
    return id != null ? [id] : [];
  }
  return [];
}

function validateUploadFiles() {
  const maxSize = CONSTANT.FILE_MAX_SIZE;
  const invalid = terminationFileList.value.find((file) => {
    const size = file.size ?? file.raw?.size ?? 0;
    return size / 1024 / 1024 > maxSize;
  });
  if (invalid) {
    ElMessage.warning(`附件“${invalid.name}”超过 ${maxSize}MB，请移除后再提交`);
    return false;
  }
  return true;
}

async function uploadAttachments() {
  const rawFiles = terminationFileList.value.map((file) => file.raw).filter(Boolean);
  if (!rawFiles.length) return '';
  const res = await fileAPI.upload({
    files: rawFiles,
    tableName: 'main_internship_termination',
  });
  return parseFileIdsFromUpload(res).join(',');
}

function buildCreatePayload(attachmentIds) {
  const row = selectedCandidate.value || {};
  const payload = {
    internshipId: row.internshipId,
    studentId: currentStudentId.value,
    relationTable: row.relationTable || inferRelationTable(row),
    relationId: row.relationId,
    terminateDate: terminationForm.terminateDate,
    reasonType: terminationForm.reasonType,
    reason: terminationForm.reason,
    attachmentIds,
  };

  if (!payload.internshipId || !payload.studentId || !payload.relationTable || !payload.relationId) {
    throw new Error('候选学生信息不完整，无法发起终止申请');
  }
  return payload;
}

async function submitTermination() {
  try {
    await terminationFormRef.value?.validate();
  } catch {
    return;
  }
  if (!validateUploadFiles()) return;

  try {
    await ElMessageBox.confirm('发起后学生实习关系将进入“终止审核中”，确定提交吗？', '确认终止申请', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  submitting.value = true;
  const loading = ElLoading.service({ text: '提交终止申请中...', background: 'rgba(0, 0, 0, 0.35)' });
  try {
    const attachmentIds = await uploadAttachments();
    const res = await terminationAPI.create(buildCreatePayload(attachmentIds));
    if (res?.message === 'successful') {
      ElMessage.success('终止申请已提交');
      terminationDialogVisible.value = false;
      filterForm.internshipStatus = INTERNSHIP_STATUS.TERMINATING;
      searchCandidates();
    } else {
      ElMessage.warning(res?.message || '终止申请提交失败');
    }
  } catch (error) {
    if (error?.message) ElMessage.warning(error.message);
  } finally {
    submitting.value = false;
    loading.close();
  }
}

async function handleCancelTermination(row) {
  try {
    await ElMessageBox.confirm('取消后该学生实习关系将恢复为正常实习，确定取消该终止申请吗？', '取消终止申请', {
      confirmButtonText: '确定取消',
      cancelButtonText: '返回',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    const res = await terminationAPI.cancel({
      terminationId: row.terminationId,
      internshipId: row.internshipId,
      studentId: currentStudentId.value,
      relationTable: row.relationTable,
      relationId: row.relationId,
    });
    if (res?.message === 'successful') {
      ElMessage.success('终止申请已取消');
      searchCandidates();
    } else {
      ElMessage.warning(res?.message || '取消失败');
    }
  } catch (error) {
    console.error('取消终止申请失败:', error);
  }
}

async function openDetail(row) {
  if (!hasTerminationRecord(row)) {
    ElMessage.warning('当前学生暂无终止记录');
    return;
  }
  detailDialogVisible.value = true;
  detailLoading.value = true;
  detailInfo.value = { ...row, status: row.status ?? 0 };
  try {
    const res = await terminationAPI.detail({
      terminationId: row.terminationId,
      relationTable: row.relationTable,
      relationId: row.relationId,
    });
    const data = res?.data;
    detailInfo.value = buildDetailInfo(row, data);
  } catch (error) {
    console.error('加载终止详情失败:', error);
  } finally {
    detailLoading.value = false;
  }
}

function buildDetailInfo(row, data) {
  if (!data || typeof data !== 'object') return { termination: row };
  const termination = data.termination || data.node || data;
  return {
    ...data,
    termination: {
      ...row,
      ...termination,
      studentName: termination.studentName ?? row.studentName,
      studentAccount: termination.studentAccount ?? row.studentAccount,
      internshipName: termination.internshipName ?? row.internshipName,
      internshipMode: termination.internshipMode ?? row.internshipMode,
      postName: termination.postName ?? row.postName,
      titleName: termination.titleName ?? row.titleName,
      teacherName: termination.teacherName ?? row.teacherName,
    },
  };
}
</script>

<style scoped>
.termination-page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-card :deep(.el-card__body) {
  padding: 14px 16px 2px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.filter-actions-col {
  display: flex;
  align-items: flex-start;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.candidate-summary {
  margin-bottom: 18px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
</style>

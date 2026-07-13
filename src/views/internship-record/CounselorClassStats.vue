<template>
  <div class="counselor-class-stats" v-loading="loading">
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <div class="filter-item class-filter">
          <span class="filter-label">班级</span>
          <el-select v-model="selectedClassId" placeholder="全部所辖班级" clearable @change="handleClassChange">
            <el-option v-for="item in classOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="filter-item mode-filter">
          <span class="filter-label">实习类型</span>
          <el-select v-model="internshipMode" @change="refreshTable">
            <el-option label="全部" value="" />
            <el-option label="校外实习" value="EXTERNAL" />
            <el-option label="校内实习" value="INTERNAL" />
          </el-select>
        </div>
        <div class="filter-item keyword-item">
          <span class="filter-label">关键词</span>
          <el-input
            v-model.trim="keyword"
            clearable
            placeholder="姓名、学号、项目、岗位/题目或导师"
            @input="refreshTable"
          />
        </div>
        <el-button type="primary" :icon="Refresh" :loading="loading" @click="refreshAll">刷新统计</el-button>
      </div>
    </el-card>

    <el-alert
      v-if="failedSources.length"
      class="source-alert"
      type="warning"
      show-icon
      :closable="false"
      :title="`以下数据未能完整加载：${failedSources.join('、')}。对应统计不应视为 0。`"
    />

    <el-empty v-if="!loading && !classOptions.length" description="当前账号尚未配置所辖班级" />

    <template v-else>
      <div class="summary-grid">
        <el-card shadow="never" class="summary-card">
          <el-statistic title="统计班级" :value="summary.classCount" suffix="个" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="学生人数" :value="summary.studentCount" suffix="人" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="实习记录" :value="summary.internshipCount" suffix="条" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="打卡记录" :value="summary.signCount" suffix="次" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="请假记录" :value="summary.leaveCount" suffix="次" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="任务提交" :value="summary.taskSubmitted" :suffix="` / ${summary.taskTotal}`" />
        </el-card>
      </div>

      <div class="table-card">
        <div class="table-tip">打卡、请假为“审核通过/总数”，任务为“已提交/总数”</div>
        <DataTableList
          :key="tableKey"
          ref="tableRef"
          :default-props="tableProps"
          :fetch-records="fetchTableRecords"
          @view-click="handleViewClick"
        >
          <template #auditStatus="{ row }">
            <el-tag :type="auditTagType(row.auditStatus)" effect="plain">{{ row.auditStatus }}</el-tag>
          </template>
          <template #signStat="{ row }">{{ row.signPassed }}/{{ row.signCount }}</template>
          <template #leaveStat="{ row }">{{ row.leavePassed }}/{{ row.leaveCount }}</template>
          <template #taskStat="{ row }">{{ row.taskSubmitted }}/{{ row.taskTotal }}</template>
        </DataTableList>
      </div>
    </template>

    <el-dialog v-model="detailVisible" title="学生实习统计明细" width="1100px" append-to-body>
      <template v-if="detailRow">
        <el-descriptions :column="3" border class="detail-summary">
          <el-descriptions-item label="班级">{{ display(detailRow.className) }}</el-descriptions-item>
          <el-descriptions-item label="学生">{{ display(detailRow.studentName) }}</el-descriptions-item>
          <el-descriptions-item label="学号">{{ display(detailRow.studentAccount) }}</el-descriptions-item>
          <el-descriptions-item label="实习类型">{{ display(detailRow.internshipModeName) }}</el-descriptions-item>
          <el-descriptions-item label="实习项目">{{ display(detailRow.internshipName) }}</el-descriptions-item>
          <el-descriptions-item label="岗位/题目">{{ display(detailRow.subjectName) }}</el-descriptions-item>
          <el-descriptions-item label="校内指导老师">{{ display(detailRow.schoolTeacherName) }}</el-descriptions-item>
          <el-descriptions-item label="企业导师">{{ display(detailRow.companyTeacherName) }}</el-descriptions-item>
          <el-descriptions-item label="实习状态">{{ display(detailRow.auditStatus) }}</el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="detailTab">
          <el-tab-pane :label="`打卡记录（${detailRow.signCount}）`" name="sign">
            <el-table :data="detailRow.signRows" border stripe max-height="420" empty-text="暂无打卡记录">
              <el-table-column label="类型" width="80">
                <template #default="{ row }">{{ signTypeText(row) }}</template>
              </el-table-column>
              <el-table-column label="打卡时间" min-width="165">
                <template #default="{ row }">{{ display(row.createTime ?? row.signTime) }}</template>
              </el-table-column>
              <el-table-column label="地址" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">{{ display(row.address) }}</template>
              </el-table-column>
              <el-table-column label="审核状态" width="100">
                <template #default="{ row }">{{ auditStatusText(row) }}</template>
              </el-table-column>
              <el-table-column label="审核意见" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ display(row.reason) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane :label="`请假记录（${detailRow.leaveCount}）`" name="leave">
            <el-table :data="detailRow.leaveRows" border stripe max-height="420" empty-text="暂无请假记录">
              <el-table-column label="开始时间" min-width="165">
                <template #default="{ row }">{{ display(row.startTime) }}</template>
              </el-table-column>
              <el-table-column label="结束时间" min-width="165">
                <template #default="{ row }">{{ display(row.endTime) }}</template>
              </el-table-column>
              <el-table-column label="请假原因" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ display(row.remarks ?? row.reason) }}</template>
              </el-table-column>
              <el-table-column label="审核状态" width="100">
                <template #default="{ row }">{{ auditStatusText(row) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane :label="`任务提交（${detailRow.taskSubmitted}/${detailRow.taskTotal}）`" name="task">
            <el-table :data="detailRow.taskRows" border stripe max-height="420" empty-text="暂无任务期次">
              <el-table-column prop="periodIndex" label="期次" width="75" />
              <el-table-column prop="beginTime" label="开始时间" min-width="150" />
              <el-table-column prop="endTime" label="结束时间" min-width="150" />
              <el-table-column label="任务标题" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">{{ display(row.diary?.title) }}</template>
              </el-table-column>
              <el-table-column label="提交状态" width="100">
                <template #default="{ row }">{{ taskStatusText(row) }}</template>
              </el-table-column>
              <el-table-column label="成绩" width="80">
                <template #default="{ row }">{{ display(row.diary?.totalScore) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import DataTableList from '@/components/DataTableList.vue';
import listAPI from '@/api/list';
import { getStudentPeriods } from '@/api/diary';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'CounselorClassStats' });

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});
const loading = ref(false);
const classOptions = ref([]);
const selectedClassId = ref('');
const internshipMode = ref('');
const keyword = ref('');
const reportRows = ref([]);
const failedSources = ref([]);
const tableRef = ref(null);
const tableKey = ref(0);
const detailVisible = ref(false);
const detailRow = ref(null);
const detailTab = ref('sign');
let loadVersion = 0;

const STATUS_TEXT = {
  [-1]: '待提交',
  0: '待审核',
  1: '已通过',
  2: '不通过',
  3: '已退回',
};

const tableProps = reactive({
  title: { mainTitle: '所辖班级学生实习全量统计' },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'className', direction: 'ASC' },
  bottomOffset: 24,
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    autoInit: false,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: true,
    operateShow: true,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'CounselorClassStats' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      export: { show: false },
      visible: { show: true, type: 'primary', name: '查看明细' },
      buttonGroup: { show: false },
      search: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '班级', tableColumnName: 'className', sortable: true, width: 150 },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true, width: 110 },
      { id: 3, showName: '学号', tableColumnName: 'studentAccount', sortable: true, width: 135 },
      { id: 4, showName: '实习类型', tableColumnName: 'internshipModeName', sortable: true, width: 100 },
      { id: 5, showName: '实习项目', tableColumnName: 'internshipName', sortable: true, width: 180 },
      { id: 6, showName: '岗位/题目', tableColumnName: 'subjectName', sortable: true, width: 170 },
      { id: 7, showName: '校内指导老师', tableColumnName: 'schoolTeacherName', sortable: true, width: 130 },
      { id: 8, showName: '企业导师', tableColumnName: 'companyTeacherName', sortable: true, width: 110 },
      { id: 9, showName: '实习状态', tableColumnName: 'customize-auditStatus', width: 100 },
      { id: 10, showName: '打卡', tableColumnName: 'customize-signStat', width: 80 },
      { id: 11, showName: '请假', tableColumnName: 'customize-leaveStat', width: 80 },
      { id: 12, showName: '任务提交', tableColumnName: 'customize-taskStat', width: 95 },
    ],
  },
});

const selectedClassIds = computed(() => {
  if (selectedClassId.value !== '' && selectedClassId.value != null) {
    return [selectedClassId.value];
  }
  return classOptions.value.map((item) => item.id);
});

const filteredRows = computed(() => {
  const query = keyword.value.toLowerCase();
  return reportRows.value.filter((row) => {
    if (internshipMode.value && row.internshipMode !== internshipMode.value) return false;
    if (!query) return true;
    return [
      row.studentName,
      row.studentAccount,
      row.className,
      row.internshipName,
      row.subjectName,
      row.schoolTeacherName,
      row.companyTeacherName,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });
});

const summary = computed(() => {
  const rows = reportRows.value;
  const studentIds = new Set(rows.map((row) => String(row.studentId)));
  return {
    classCount: selectedClassIds.value.length,
    studentCount: studentIds.size,
    internshipCount: rows.filter((row) => row.hasInternship).length,
    signCount: rows.reduce((sum, row) => sum + row.signCount, 0),
    leaveCount: rows.reduce((sum, row) => sum + row.leaveCount, 0),
    taskSubmitted: rows.reduce((sum, row) => sum + row.taskSubmitted, 0),
    taskTotal: rows.reduce((sum, row) => sum + row.taskTotal, 0),
  };
});

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return String(left).localeCompare(String(right), 'zh-CN', { numeric: true });
}

async function fetchTableRecords(params = {}) {
  const sort = params.sort || {};
  const field = sort.properties || 'className';
  const direction = sort.direction === 'DESC' ? -1 : 1;
  const rows = [...filteredRows.value].sort((left, right) => {
    const primary = compareValues(left[field], right[field]);
    if (primary !== 0) return primary * direction;
    return compareValues(left.studentAccount, right.studentAccount);
  });
  const page = Number(params.pageInfo?.page) || 1;
  const size = Number(params.pageInfo?.size) || 20;
  const start = (page - 1) * size;
  return {
    data: {
      content: rows.slice(start, start + size),
      totalElements: rows.length,
      page: { totalElements: rows.length },
    },
    message: 'successful',
  };
}

async function refreshTable() {
  tableKey.value += 1;
  await nextTick();
  await tableRef.value?.initDataList?.(true);
}

function responseRows(res) {
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data?.records)) return res.data.records;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

async function fetchAll(keyWords, searchKey = {}, reg = {}) {
  const res = await listAPI.getSomeRecords({
    keyWords,
    pageInfo: { page: 1, size: 5000 },
    searchKey,
    reg,
    andor: {},
    sort: { properties: 'Id', direction: 'DESC' },
  });
  return responseRows(res);
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function studentIdOf(row) {
  return firstValue(row, ['studentId', 'stuId', 'userId', 'id']);
}

function internshipIdOf(row) {
  return firstValue(row, ['internshipId', 'mainInternshipId']);
}

function uniqueRows(rows, keyFn) {
  const map = new Map();
  rows.forEach((row, index) => {
    const key = keyFn(row) ?? `row-${index}`;
    if (!map.has(String(key))) map.set(String(key), row);
  });
  return Array.from(map.values());
}

function isTrue(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function auditStatusValue(row) {
  return firstValue(row, ['isAudit', 'auditStatus', 'status']);
}

function isAuditPassed(row) {
  return isTrue(row?.isAllVerified ?? row?.is_all_verified) || Number(auditStatusValue(row)) === 1;
}

function auditStatusText(row) {
  if (isTrue(row?.isAllVerified ?? row?.is_all_verified)) return '已通过';
  const status = Number(auditStatusValue(row));
  return STATUS_TEXT[status] || '未知';
}

function auditTagType(status) {
  if (status === '已通过') return 'success';
  if (status === '待审核') return 'warning';
  if (status === '不通过') return 'danger';
  return 'info';
}

function teacherMap(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const studentId = studentIdOf(row);
    const internshipId = internshipIdOf(row);
    const teacherName = firstValue(row, ['teacherName', 'userName', 'name']);
    if (studentId == null || internshipId == null || !teacherName) return;
    const key = `${studentId}_${internshipId}`;
    const names = map.get(key) || new Set();
    names.add(String(teacherName));
    map.set(key, names);
  });
  return new Map(Array.from(map.entries()).map(([key, names]) => [key, Array.from(names).join('、')]));
}

function buildRelationRows(
  students,
  assignmentRows,
  extRows,
  intRows,
  intVerifyRows,
  schoolTutorRows,
  companyTutorRows
) {
  const studentMap = new Map(students.map((student) => [String(student.studentId), student]));
  const schoolTutorMap = teacherMap(schoolTutorRows);
  const companyTutorMap = teacherMap(companyTutorRows);
  const intVerifyMap = new Map();
  intVerifyRows.forEach((row) => {
    const relationId = firstValue(row, ['relationId', 'relTitleStudentId']);
    if (relationId != null && !intVerifyMap.has(String(relationId))) {
      intVerifyMap.set(String(relationId), row);
    }
  });

  const relationsByStudent = new Map();
  const addRelation = (studentId, relation) => {
    if (studentId == null || !studentMap.has(String(studentId))) return;
    const list = relationsByStudent.get(String(studentId)) || [];
    list.push(relation);
    relationsByStudent.set(String(studentId), list);
  };

  const uniqueExtRows = uniqueRows(extRows, (row) => firstValue(row, ['relationId', 'relStuInternshipPostId']));
  uniqueExtRows.forEach((row) => {
    const studentId = studentIdOf(row);
    const internshipId = internshipIdOf(row);
    const relationId = firstValue(row, ['relationId', 'relStuInternshipPostId']);
    const teacherKey = `${studentId}_${internshipId}`;
    addRelation(studentId, {
      relationId,
      relationTable: 'RelStuInternshipPost',
      hasInternship: true,
      internshipMode: 'EXTERNAL',
      internshipModeName: '校外实习',
      internshipId,
      internshipName: firstValue(row, ['internshipName', 'mainInternshipName']),
      subjectName: firstValue(row, ['internshipPostName', 'postName', 'selfPostName']),
      schoolTeacherName: schoolTutorMap.get(teacherKey) || firstValue(row, ['teacherName']),
      companyTeacherName: companyTutorMap.get(teacherKey) || firstValue(row, ['companyTeacherName', 'enterpriseTeacherName']),
      auditSource: row,
    });
  });

  const uniqueIntRows = uniqueRows(intRows, (row) => firstValue(row, ['relTitleStudentId', 'relationId']));
  uniqueIntRows.forEach((row) => {
    const studentId = studentIdOf(row);
    const relationId = firstValue(row, ['relTitleStudentId', 'relationId']);
    addRelation(studentId, {
      relationId,
      relationTable: 'RelTitleStudent',
      hasInternship: true,
      internshipMode: 'INTERNAL',
      internshipModeName: '校内实习',
      internshipId: internshipIdOf(row),
      internshipName: firstValue(row, ['internshipName', 'mainInternshipName']),
      subjectName: firstValue(row, ['titleName', 'name']),
      schoolTeacherName: firstValue(row, ['teacherName']),
      companyTeacherName: null,
      auditSource: intVerifyMap.get(String(relationId)) || null,
    });
  });

  const uniqueAssignmentRows = uniqueRows(
    assignmentRows,
    (row) => firstValue(row, ['relationId', 'relIntershipUserId', 'relInternshipUserId'])
  );
  uniqueAssignmentRows.forEach((row) => {
    const studentId = studentIdOf(row);
    const internshipId = internshipIdOf(row);
    if (studentId == null || internshipId == null) return;
    const currentRelations = relationsByStudent.get(String(studentId)) || [];
    if (currentRelations.some((item) => sameId(item.internshipId, internshipId))) return;
    const typeName = String(firstValue(row, ['intTypeName', 'internshipTypeName', 'typeName']) || '');
    const isExternal = typeName.includes('校外');
    const isInternal = typeName.includes('校内');
    const teacherKey = `${studentId}_${internshipId}`;
    addRelation(studentId, {
      relationId: null,
      relationTable: null,
      hasInternship: true,
      internshipMode: isExternal ? 'EXTERNAL' : isInternal ? 'INTERNAL' : '',
      internshipModeName: typeName || '已安排',
      internshipId,
      internshipName: firstValue(row, ['internshipName', 'mainInternshipName']),
      subjectName: null,
      schoolTeacherName: schoolTutorMap.get(teacherKey) || null,
      companyTeacherName: companyTutorMap.get(teacherKey) || null,
      auditSource: row,
    });
  });

  const result = [];
  students.forEach((student) => {
    const relations = relationsByStudent.get(String(student.studentId)) || [];
    if (!relations.length) {
      result.push({
        ...student,
        id: `student-${student.studentId}`,
        relationId: null,
        relationTable: null,
        hasInternship: false,
        internshipMode: '',
        internshipModeName: '未安排',
        internshipId: null,
        internshipName: null,
        subjectName: null,
        schoolTeacherName: null,
        companyTeacherName: null,
        auditStatus: '未安排',
      });
      return;
    }
    relations.forEach((relation, index) => {
      result.push({
        ...student,
        ...relation,
        id: `${relation.internshipMode}-${relation.relationId ?? student.studentId}-${index}`,
        auditStatus: relation.auditSource ? auditStatusText(relation.auditSource) : '未知',
      });
    });
  });
  return result;
}

function recordBelongsToRelation(record, relation, relationCount) {
  if (!sameId(studentIdOf(record), relation.studentId)) return false;
  const recordInternshipId = internshipIdOf(record);
  if (recordInternshipId != null && relation.internshipId != null) {
    return sameId(recordInternshipId, relation.internshipId);
  }
  const recordRelationId = firstValue(record, ['stuInternshipId', 'relStuInternshipPostId', 'internshipRelationId']);
  if (recordRelationId != null && relation.relationId != null) {
    return sameId(recordRelationId, relation.relationId);
  }
  return relationCount === 1;
}

function attachRecordStats(rows, signRows, leaveRows) {
  const relationCountMap = new Map();
  rows.forEach((row) => {
    const key = String(row.studentId);
    relationCountMap.set(key, (relationCountMap.get(key) || 0) + 1);
  });
  rows.forEach((row) => {
    const relationCount = relationCountMap.get(String(row.studentId)) || 1;
    row.signRows = uniqueRows(
      signRows.filter((item) => recordBelongsToRelation(item, row, relationCount)),
      (item) => firstValue(item, ['relationId', 'mainSignId', 'signId', 'id'])
    );
    row.leaveRows = uniqueRows(
      leaveRows.filter((item) => recordBelongsToRelation(item, row, relationCount)),
      (item) => firstValue(item, ['leaveId', 'mainLeaveId', 'relationId', 'id'])
    );
    row.signCount = row.signRows.length;
    row.signPassed = row.signRows.filter(isAuditPassed).length;
    row.leaveCount = row.leaveRows.length;
    row.leavePassed = row.leaveRows.filter(isAuditPassed).length;
  });
}

function isTaskSubmitted(row) {
  return isTrue(row?.diary?.submit);
}

async function loadTasks(rows) {
  const targets = rows.filter((row) => row.relationId != null && row.relationTable);
  let nextIndex = 0;
  let failedCount = 0;
  const worker = async () => {
    while (nextIndex < targets.length) {
      const index = nextIndex;
      nextIndex += 1;
      const row = targets[index];
      try {
        const res = await getStudentPeriods({
          relationId: row.relationId,
          tableName: row.relationTable,
        });
        row.taskRows = Array.isArray(res?.data) ? res.data : [];
      } catch {
        row.taskRows = [];
        row.taskLoadFailed = true;
        failedCount += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, targets.length) }, worker));
  rows.forEach((row) => {
    row.taskRows = row.taskRows || [];
    row.taskTotal = row.taskRows.length;
    row.taskSubmitted = row.taskRows.filter(isTaskSubmitted).length;
    row.signRows = row.signRows || [];
    row.leaveRows = row.leaveRows || [];
    row.signCount = row.signCount || 0;
    row.signPassed = row.signPassed || 0;
    row.leaveCount = row.leaveCount || 0;
    row.leavePassed = row.leavePassed || 0;
  });
  return failedCount;
}

function normalizeStudents(rows, classMap) {
  return uniqueRows(rows, (row) => firstValue(row, ['id', 'userId'])).map((row) => {
    const studentId = firstValue(row, ['id', 'userId']);
    const classId = firstValue(row, ['departmentId', 'classId']);
    return {
      studentId,
      studentName: firstValue(row, ['name', 'userName', 'studentName']),
      studentAccount: firstValue(row, ['studentAccount', 'account', 'studentNo']),
      classId,
      className: classMap.get(String(classId)) || firstValue(row, ['departmentName', 'className']),
    };
  });
}

async function loadClassOptions() {
  const counselorId = userInfo.value?.id;
  if (!counselorId) {
    classOptions.value = [];
    reportRows.value = [];
    ElMessage.warning('无法获取当前辅导员信息');
    return;
  }
  try {
    const rows = await fetchAll(
      'ViewRelCounselorClass',
      { counselorId },
      { counselorId: CONSTANT.SEARCH_OPERATOR.EQ }
    );
    const map = new Map();
    rows.forEach((row) => {
      if (row.classId != null && !map.has(String(row.classId))) {
        map.set(String(row.classId), { id: row.classId, name: row.className || `班级 #${row.classId}` });
      }
    });
    classOptions.value = Array.from(map.values());
  } catch {
    classOptions.value = [];
    reportRows.value = [];
    ElMessage.error('获取所辖班级失败');
  }
}

async function loadReport() {
  const version = ++loadVersion;
  const classIds = selectedClassIds.value;
  failedSources.value = [];
  reportRows.value = [];
  if (!classIds.length) {
    await refreshTable();
    return;
  }

  loading.value = true;
  try {
    const studentsRaw = await fetchAll(
      'ViewBaseUser',
      { departmentId: classIds.join(','), jobCode: 'STUDENT' },
      { departmentId: CONSTANT.SEARCH_OPERATOR.IN, jobCode: CONSTANT.SEARCH_OPERATOR.EQ }
    );
    if (version !== loadVersion) return;

    const classMap = new Map(classOptions.value.map((item) => [String(item.id), item.name]));
    const students = normalizeStudents(studentsRaw, classMap);
    const studentIds = students.map((item) => item.studentId).filter((id) => id != null);
    if (!studentIds.length) {
      reportRows.value = [];
      return;
    }

    const idList = studentIds.join(',');
    const sources = [
      ['学生实习安排', 'ViewVerifyProcessRelIntershipUserMerge', 'userId'],
      ['校外实习', 'ViewVerifyProcessRelStuInternshipPostMerge', 'studentId'],
      ['校内实习', 'ViewRelTitleTeacherStudent', 'stuId'],
      ['校内实习审核状态', 'ViewVerifyProcessRelTitleStudentMerge', 'stuId'],
      ['校内指导老师', 'ViewVerifyProcessRelIntTeacherStudentMerge', 'studentId'],
      ['企业导师', 'ViewVerifyProcessRelEntTeacherStudentMerge', 'studentId'],
      ['打卡', 'ViewVerifyMainSignMerge', 'studentId'],
      ['请假', 'ViewLeaveUniversalDetails', 'studentId'],
    ];
    const results = await Promise.allSettled(
      sources.map(([, keyWords, field]) =>
        fetchAll(keyWords, { [field]: idList }, { [field]: CONSTANT.SEARCH_OPERATOR.IN })
      )
    );
    if (version !== loadVersion) return;

    const data = results.map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      failedSources.value.push(sources[index][0]);
      return [];
    });
    const rows = buildRelationRows(
      students,
      data[0],
      data[1],
      data[2],
      data[3],
      data[4],
      data[5]
    );
    attachRecordStats(rows, data[6], data[7]);
    const taskFailedCount = await loadTasks(rows);
    if (version !== loadVersion) return;
    if (taskFailedCount > 0) failedSources.value.push(`任务提交（${taskFailedCount} 条实习记录）`);
    reportRows.value = rows;
  } catch (error) {
    console.error('加载辅导员班级统计失败:', error);
    reportRows.value = [];
    ElMessage.error('加载班级统计失败');
  } finally {
    if (version === loadVersion) {
      loading.value = false;
      await refreshTable();
    }
  }
}

async function refreshAll() {
  await loadClassOptions();
  if (selectedClassId.value && !classOptions.value.some((item) => sameId(item.id, selectedClassId.value))) {
    selectedClassId.value = '';
  }
  await loadReport();
}

async function handleClassChange() {
  await loadReport();
}

function openDetail(row) {
  detailRow.value = row;
  detailTab.value = 'sign';
  detailVisible.value = true;
}

function handleViewClick(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row) openDetail(row);
}

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function signTypeText(row) {
  const value = Number(firstValue(row, ['signType', 'type']));
  if (value === 1) return '签到';
  if (value === 2) return '签退';
  return '打卡';
}

function taskStatusText(row) {
  if (!isTaskSubmitted(row)) return '未提交';
  if (auditStatusValue(row.diary || {}) == null) return '已提交';
  return auditStatusText(row.diary || {});
}

onMounted(refreshAll);
</script>

<style scoped>
.counselor-class-stats {
  padding: 16px;
}

.filter-card,
.source-alert,
.summary-grid {
  margin-bottom: 16px;
}

.filter-row {
  display: grid;
  grid-template-columns: 320px 230px minmax(360px, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.filter-item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item .el-select,
.filter-item .el-input {
  width: 100%;
}

.keyword-item {
  min-width: 0;
}

.filter-label {
  flex: none;
  color: #606266;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  gap: 12px;
}

.summary-card {
  text-align: center;
}

.table-tip {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
  margin: 0 0 8px 2px;
}

.detail-summary {
  margin-bottom: 16px;
}

@media (max-width: 1200px) {
  .filter-row {
    grid-template-columns: minmax(260px, 1fr) minmax(210px, 0.7fr) auto;
  }

  .keyword-item {
    grid-column: 1 / 3;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }
}

@media (max-width: 760px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .keyword-item {
    grid-column: auto;
  }
}
</style>

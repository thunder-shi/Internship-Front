<template>
  <div class="stu-internship-sign">
    <el-card class="block-card" shadow="never">
      <template #header>
        <span class="card-title">实习岗位</span>
      </template>
      <div class="selector-row">
        <el-select
          v-if="externalPosts.length > 1"
          v-model="selectedPostKey"
          placeholder="请选择校外实习岗位"
          style="width: min(420px, 100%)"
          :loading="postsLoading"
          @change="onPostChange"
        >
          <el-option
            v-for="post in externalPosts"
            :key="post._key"
            :label="postLabel(post)"
            :value="post._key"
          />
        </el-select>
        <span v-else-if="externalPosts.length === 1" class="single-post">
          {{ postLabel(externalPosts[0]) }}
        </span>
        <span v-else-if="!postsLoading" class="empty-hint">
          暂无校外实习岗位，请完成岗位报名并通过审核后再试
        </span>
      </div>
    </el-card>

    <el-card class="block-card sign-tabs-card" shadow="never">
      <el-tabs v-model="activeTab" class="sign-tabs" @tab-change="onTabChange">
        <el-tab-pane label="提交记录" name="submit">
          <template v-if="currentPost">
            <el-alert
              v-if="currentPost.isAllVerified !== true"
              type="warning"
              :closable="false"
              show-icon
              class="mb-16"
              title="该岗位流程尚未全部通过审核，打卡可能受限；如有疑问请联系管理员。"
            />
            <el-alert
              v-if="hasCheckedInToday"
              type="info"
              :closable="false"
              show-icon
              class="mb-16"
              title="今日已在该岗位完成签到，无需重复签到；如需离开可提交签退。"
            />
            <el-alert
              v-if="hasCheckedOutToday"
              type="info"
              :closable="false"
              show-icon
              class="mb-16"
              title="今日已在该岗位完成签退，无需重复签退。"
            />
            <el-alert
              v-if="hasRejectedSignToday"
              type="warning"
              :closable="false"
              show-icon
              class="mb-16"
              title="检测到你今天有审核退回的打卡记录，请重新提交一次打卡。"
            />
            <el-form
              ref="formRef"
              :model="form"
              :rules="formRules"
              label-width="100px"
              class="sign-form"
            >
              <el-form-item label="学生">
                <span>{{ displayStudentName }}</span>
              </el-form-item>
              <el-form-item label="岗位">
                <span>{{ displayPostName }}</span>
              </el-form-item>
              <el-form-item label="打卡类型" prop="signType">
                <el-radio-group v-model="form.signType">
                  <el-radio
                    v-for="opt in signTypeOptions"
                    :key="opt.value"
                    :label="opt.value"
                    :disabled="
                      (opt.value === SIGN_IN && hasCheckedInToday) ||
                      (opt.value === SIGN_OUT && hasCheckedOutToday)
                    "
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="打卡地址" prop="address">
                <div class="address-row">
                  <el-input
                    v-model="form.address"
                    type="textarea"
                    :rows="2"
                    maxlength="500"
                    show-word-limit
                    readonly
                    placeholder="请点击下方获取定位"
                  />
                  <el-button :loading="locLoading" @click="fillLocation"> 获取定位 </el-button>
                </div>
              </el-form-item>
              <el-form-item label="现场照片">
                <div class="photo-block">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden-input"
                    @change="onPhotoChange"
                  />
                  <el-button type="primary" plain @click="fileInputRef?.click()">
                    选择照片
                  </el-button>
                  <span class="photo-hint"
                    >需上传一张现场照片（将保存为打卡凭证）；选择后下方可预览，点击缩略图可放大查看。</span
                  >
                  <div v-if="photoPreviewUrl" class="preview-wrap">
                    <div
                      class="preview-thumb"
                      title="点击放大预览"
                      role="button"
                      tabindex="0"
                      @click="previewDialogVisible = true"
                      @keydown.enter="previewDialogVisible = true"
                    >
                      <img :src="photoPreviewUrl" alt="已选照片预览" class="preview-img" />
                      <span class="preview-thumb-mask">
                        <el-icon :size="22"><ZoomIn /></el-icon>
                        <span>预览</span>
                      </span>
                    </div>
                    <el-button type="danger" plain class="remove-photo-btn" @click="clearPhoto">
                      移除
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="submitting"
                  :disabled="!canSubmit"
                  @click="handleSubmit"
                >
                  提交打卡
                </el-button>
              </el-form-item>
            </el-form>
          </template>
          <el-empty v-else description="请先在上方选择实习岗位" :image-size="100" />
        </el-tab-pane>
        <el-tab-pane label="打卡记录" name="history">
          <div v-if="currentPost" class="sign-history-dtl">
            <DataTableList
              ref="historyListRef"
              :default-props="defaultHistoryDTLProps"
              @view-click="onHistoryViewClick"
            >
              <template #signType="{ row }">
                {{ signTypeLabel(row.signType ?? row.type) }}
              </template>
              <template #reason="{ row }">
                {{ row.reason || row.rejectReason || '—' }}
              </template>
              <template #photo="{ row }">
                <el-button
                  v-if="row.imgId"
                  link
                  type="primary"
                  size="small"
                  @click.stop="previewSignImage(row.imgId)"
                >
                  查看
                </el-button>
                <span v-else>—</span>
              </template>
            </DataTableList>
          </div>
          <el-empty v-else description="请先在上方选择实习岗位" :image-size="100" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="progressProcessInfo.internshipId ?? null"
      :process-info="progressProcessInfo"
      key-words="MainVerifyProcess"
    />

    <el-dialog
      v-model="previewDialogVisible"
      title="照片预览"
      width="min(92vw, 720px)"
      append-to-body
      destroy-on-close
      class="sign-photo-preview-dialog"
      @closed="previewDialogVisible = false"
    >
      <div v-if="photoPreviewUrl" class="preview-dialog-body">
        <img :src="photoPreviewUrl" alt="大图预览" class="preview-dialog-img" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ZoomIn } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import listAPI from '@/api/list';
import fileAPI from '@/api/file';
import { submitSignAudit } from '@/api/mainSign';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DataTableList from '@/components/DataTableList.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';

defineOptions({ name: 'StuInternshipSign' });

/** 供提交页「今日是否已打卡 / 退回」判断：单独拉取足够多的记录，与列表分页请求分离 */
const HISTORY_ROWS_SYNC_PAGE_SIZE = 500;

const HISTORY_SIGN_COLUMNS = [
  { id: 1, showName: '岗位', tableColumnName: 'internshipPostName', sortable: false },
  { id: 2, showName: '类型', tableColumnName: 'customize-signType', sortable: false, width: 100 },
  { id: 3, showName: '审核状态', tableColumnName: 'customize-status', sortable: false, width: 120 },
  { id: 4, showName: '审核意见', tableColumnName: 'customize-reason', sortable: false },
  { id: 5, showName: '地址', tableColumnName: 'address', sortable: false },
  { id: 6, showName: '照片', tableColumnName: 'customize-photo', sortable: false, width: 88 },
  { id: 7, showName: '时间', tableColumnName: 'createTime', sortable: false, width: 170 },
];

/**
 * 是否启用「同一岗位当天仅能签到一次」（提示、禁用签到、提交校验）
 */
const ENFORCE_ONE_SIGN_IN_PER_DAY = true;

/** 与后端 Byte signType / 视图列 type 对应：1 签到 2 签退（可按后端字典调整） */
const SIGN_IN = 1;
const SIGN_OUT = 2;
const signTypeOptions = [
  { value: SIGN_IN, label: '签到' },
  { value: SIGN_OUT, label: '签退' },
];

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

const postsLoading = ref(false);
const externalPosts = ref([]);
const selectedPostKey = ref(null);
const currentPost = computed(
  () => externalPosts.value.find((p) => p._key === selectedPostKey.value) ?? null
);

const formRef = ref(null);
const fileInputRef = ref(null);
const form = reactive({
  signType: 1,
  address: '',
});
const photoRaw = ref(null);
const photoPreviewUrl = ref(null);
const previewDialogVisible = ref(false);

const formRules = {
  signType: [{ required: true, message: '请选择打卡类型', trigger: 'change' }],
  address: [{ required: true, message: '请填写打卡地址', trigger: 'blur' }],
};

const locLoading = ref(false);
const submitting = ref(false);

const historyRows = ref([]);
const historyListRef = ref(null);
const historySearchWords = reactive({
  searchKey: {},
  regKey: {},
  andor: {},
});
const historyTitleObj = reactive({ mainTitle: '' });

const { getVerifyRoleName } = useVerifyFilter();

const defaultHistoryDTLProps = computed(() => ({
  title: historyTitleObj,
  someFlags: {
    autoInit: false,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: true,
    noAdvancedSearch: true,
    operateShow: true,
  },
  sortStr: { properties: 'id', direction: 'DESC' },
  nowSearchWords: historySearchWords,
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  bottomOffset: 24,
  defaultDTHProps: {
    buttonProps: {
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      update: { show: false },
      create: { show: false },
      delete: { show: false },
      audit: { show: false },
      submit: { show: false },
      more1: { show: false },
      buttonGroup: { show: false },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyMainSignMerge' },
    allTableColumns: HISTORY_SIGN_COLUMNS,
  },
}));

const showProgressDialog = ref(false);
const progressProcessInfo = ref({});

/** 提交记录 | 打卡记录 */
const activeTab = ref('submit');

function applyHistorySearchWords() {
  const uid = userInfo.value?.id;
  const post = currentPost.value;
  if (!uid || !post?.relationId) {
    historySearchWords.searchKey = {};
    historySearchWords.regKey = {};
    historySearchWords.andor = {};
    return;
  }
  historySearchWords.searchKey = {
    studentId: uid,
    stuInternshipId: post.relationId,
  };
  historySearchWords.regKey = {
    studentId: '=',
    stuInternshipId: '=',
  };
  historySearchWords.andor = {};
}

/** 列表未挂载时（仅提交页）仍须拉取同一数据源，供今日签到/退回判断 */
async function syncHistoryRowsFromApi() {
  const uid = userInfo.value?.id;
  if (!uid || !currentPost.value?.relationId) {
    historyRows.value = [];
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyMainSignMerge',
      pageInfo: { page: 1, size: HISTORY_ROWS_SYNC_PAGE_SIZE },
      searchKey: {
        studentId: uid,
        stuInternshipId: currentPost.value.relationId,
      },
      reg: {
        studentId: '=',
        stuInternshipId: '=',
      },
      sort: { properties: 'id', direction: 'DESC' },
    });
    historyRows.value = res?.data?.content || res?.data || [];
    await nextTick();
    syncFormSignTypeToPriorityRejected();
  } catch (e) {
    console.error(e);
    historyRows.value = [];
  }
}

async function refreshHistoryList() {
  applyHistorySearchWords();
  await nextTick();
  await syncHistoryRowsFromApi();
  if (historyListRef.value?.initDataList) {
    await historyListRef.value.initDataList(true);
  }
}

function onHistoryViewClick(val) {
  const row = Array.isArray(val) ? val[0] : val;
  if (row) openSignVerifyProgress(row);
}

function onTabChange(name) {
  if (name === 'history') {
    refreshHistoryList();
  }
}

const displayStudentName = computed(() => userInfo.value?.name || '—');
const displayPostName = computed(() => {
  const p = currentPost.value;
  if (!p) return '—';
  return p.internshipPostName || p.postName || '—';
});

function getRowSignType(row) {
  return Number(row.signType ?? row.type ?? 0);
}

/** 记录创建时间是否为当天（本地日历日） */
function isRecordCreateTimeToday(row) {
  const t = row.createTime ?? row.create_time;
  if (!t) return false;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** 打卡合并视图中：-1 表示退回待重提（待提交）；3 为审核退回；此类记录不占「当日已成功签到/签退」，且重新提交时按 MainSign.id 编辑 */
function isAuditBack(row) {
  const status = Number(row?.isAudit);
  return status === CONSTANT.AUDIT_STATUS.SAVE || status === CONSTANT.AUDIT_STATUS.BACK;
}

/** 当前岗位下今日是否已有签到记录 */
const hasCheckedInToday = computed(() => {
  if (!ENFORCE_ONE_SIGN_IN_PER_DAY) return false;
  const post = currentPost.value;
  if (!post) return false;
  const rid = Number(post.relationId);
  return historyRows.value.some(
    (row) =>
      Number(row.stuInternshipId ?? row.stu_internship_id) === rid &&
      getRowSignType(row) === SIGN_IN &&
      isRecordCreateTimeToday(row) &&
      !isAuditBack(row)
  );
});

/** 当前岗位下今日是否已有签退记录 */
const hasCheckedOutToday = computed(() => {
  if (!ENFORCE_ONE_SIGN_IN_PER_DAY) return false;
  const post = currentPost.value;
  if (!post) return false;
  const rid = Number(post.relationId);
  return historyRows.value.some(
    (row) =>
      Number(row.stuInternshipId ?? row.stu_internship_id) === rid &&
      getRowSignType(row) === SIGN_OUT &&
      isRecordCreateTimeToday(row) &&
      !isAuditBack(row)
  );
});

const hasRejectedSignToday = computed(() => {
  const post = currentPost.value;
  if (!post) return false;
  const rid = Number(post.relationId);
  return historyRows.value.some(
    (row) =>
      Number(row.stuInternshipId ?? row.stu_internship_id) === rid &&
      isRecordCreateTimeToday(row) &&
      isAuditBack(row)
  );
});

/** 当日退回记录：签到退回优先于签退退回（优先处理被退回的签到） */
function getTodayRejectedRowsForCurrentPostSorted() {
  const post = currentPost.value;
  if (!post) return [];
  const rid = Number(post.relationId);
  const rows = historyRows.value.filter(
    (row) =>
      Number(row.stuInternshipId ?? row.stu_internship_id) === rid &&
      isRecordCreateTimeToday(row) &&
      isAuditBack(row)
  );
  return rows.sort((a, b) => {
    const ta = getRowSignType(a);
    const tb = getRowSignType(b);
    if (ta === SIGN_IN && tb !== SIGN_IN) return -1;
    if (tb === SIGN_IN && ta !== SIGN_IN) return 1;
    return 0;
  });
}

/** 优先选用与当前选择一致的退回行；否则选用签到退回优先的一条（避免误用另一条 MainSign.id） */
function pickRejectedRecordForResubmit(formSignType) {
  const sorted = getTodayRejectedRowsForCurrentPostSorted();
  if (!sorted.length) return null;
  const hit = sorted.find((r) => getRowSignType(r) === Number(formSignType));
  return hit ?? sorted[0];
}

function syncFormSignTypeToPriorityRejected() {
  const sorted = getTodayRejectedRowsForCurrentPostSorted();
  if (!sorted.length) return;
  if (!sorted.some((r) => getRowSignType(r) === form.signType)) {
    form.signType = getRowSignType(sorted[0]);
  }
}

/** ViewVerifyMainSignMerge 行：MainVerifyProcess.id（与 StuSignAudit / BaseList 审核行一致；relationId 为 MainSign.id） */
function resolveMainVerifyProcessIdFromSignHistoryRow(row) {
  if (!row) return null;
  const raw = row.auditId ?? row.id ?? row.verifyProcessId ?? row.mainVerifyProcessId ?? row.mvpId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const canSubmit = computed(() => {
  if (!currentPost.value) return false;
  if (form.signType === SIGN_IN && hasCheckedInToday.value) return false;
  if (form.signType === SIGN_OUT && hasCheckedOutToday.value) return false;
  if (!form.address?.trim()) return false;
  if (!photoRaw.value) return false;
  return true;
});

function postLabel(post) {
  const name = post.internshipPostName || '';
  return post.internshipName
    ? `${post.internshipName} — ${name}`
    : name || `岗位 #${post.relationId}`;
}

function signTypeLabel(v) {
  const n = v != null ? Number(v) : null;
  const hit = signTypeOptions.find((o) => o.value === n);
  return hit ? hit.label : v != null ? String(v) : '—';
}

async function loadExternalPosts() {
  const userId = userInfo.value?.id;
  if (!userId) return;
  postsLoading.value = true;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
      searchKey: { studentId: userId },
      reg: { studentId: '=' },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content || res?.data || [];
    externalPosts.value = list.map((item) => ({
      ...item,
      _key: `ext_${item.relationId}`,
    }));
    if (externalPosts.value.length === 1) {
      selectedPostKey.value = externalPosts.value[0]._key;
    }
  } catch (e) {
    console.error(e);
    ElMessage.error('获取实习岗位失败');
  } finally {
    postsLoading.value = false;
  }
}

function onPostChange() {
  refreshHistoryList();
}

function onPhotoChange(e) {
  const file = e.target?.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return;
  }
  const maxMb = CONSTANT.IMAGE_MAX_SIZE;
  if (file.size / 1024 / 1024 > maxMb) {
    ElMessage.warning(`图片大小不能超过 ${maxMb}MB`);
    return;
  }
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
  }
  photoRaw.value = file;
  photoPreviewUrl.value = URL.createObjectURL(file);
}

function clearPhoto() {
  previewDialogVisible.value = false;
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
  }
  photoPreviewUrl.value = null;
  photoRaw.value = null;
}

async function fillLocation() {
  if (!navigator.geolocation) {
    ElMessage.warning('当前浏览器不支持定位');
    return;
  }
  locLoading.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      form.address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      locLoading.value = false;
    },
    () => {
      locLoading.value = false;
      ElMessage.error('获取定位失败，请检查浏览器定位权限后重试');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

/** 从上传接口解析 SysOssFile.id，兼容多种返回结构 */
function parseImgIdFromUpload(res) {
  const d = res?.data;
  if (d == null) return null;
  if (typeof d === 'number') return d;
  if (typeof d === 'string') {
    const n = Number(d.split(/[,;]/)[0]?.trim());
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(d)) {
    const first = d[0];
    if (typeof first === 'number') return first;
    if (first && typeof first.id === 'number') return first.id;
    if (first && typeof first === 'string') {
      const n = Number(first);
      return Number.isFinite(n) ? n : null;
    }
  }
  if (typeof d === 'object' && d.id != null) {
    const n = Number(d.id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function querySignProcessVerifyRoles(internshipId) {
  if (!internshipId) return null;
  try {
    const processTypeCode =
      CONSTANT?.PROCESS_TYPE?.STUDENT_SIGN ?? CONSTANT?.PROCESS_TYPE?.STU_SIGN ?? 'STUDENT_SIGN';
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { internshipId, processTypeCode },
      reg: { internshipId: '=', processTypeCode: '=' },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const first = res?.data?.content?.[0] ?? res?.data?.[0];
    if (!first) return null;
    return {
      verifyFirstRoleId: first.verifyFirstRoleId ?? null,
      verifyFirstRoleName: first.verifyFirstRoleName ?? null,
      verifySecondRoleId: first.verifySecondRoleId ?? null,
      verifySecondRoleName: first.verifySecondRoleName ?? null,
      verifyThirdRoleId: first.verifyThirdRoleId ?? null,
      verifyThirdRoleName: first.verifyThirdRoleName ?? null,
      verifyFourthRoleId: first.verifyFourthRoleId ?? null,
      verifyFourthRoleName: first.verifyFourthRoleName ?? null,
      verifyFifthRoleId: first.verifyFifthRoleId ?? null,
      verifyFifthRoleName: first.verifyFifthRoleName ?? null,
    };
  } catch (error) {
    console.error('查询打卡流程角色失败:', error);
    return null;
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!currentPost.value) {
    ElMessage.warning('请选择实习岗位');
    return;
  }
  if (!photoRaw.value) {
    ElMessage.warning('请上传现场照片');
    return;
  }
  const pendingRejected = pickRejectedRecordForResubmit(form.signType);
  const effectiveSignType = pendingRejected ? getRowSignType(pendingRejected) : form.signType;

  if (effectiveSignType === SIGN_IN && hasCheckedInToday.value) {
    ElMessage.warning('今日已签到，无需重复签到');
    return;
  }
  if (effectiveSignType === SIGN_OUT && hasCheckedOutToday.value) {
    ElMessage.warning('今日已签退，无需重复签退');
    return;
  }
  const uid = userInfo.value?.id;
  if (!uid) {
    ElMessage.error('用户信息缺失，请重新登录');
    return;
  }

  submitting.value = true;
  try {
    const post = currentPost.value;
    const node = {
      stuInternshipId: post.relationId,
      studentId: uid,
      signType: effectiveSignType,
      address: form.address.trim(),
    };
    // 合并视图行里 relationId 即 MainSign.id
    const pendingMainSignId =
      pendingRejected?.relationId ?? pendingRejected?.id ?? pendingRejected?.mainSignId;
    if (pendingMainSignId != null && pendingMainSignId !== '') {
      node.id = Number(pendingMainSignId);
    }
    const internshipId = post?.internshipId ?? post?.mainInternshipId ?? post?.internship_id;
    const verifyRoleInfo = await querySignProcessVerifyRoles(internshipId);
    if (verifyRoleInfo) {
      Object.keys(verifyRoleInfo).forEach((k) => {
        if (verifyRoleInfo[k] != null && verifyRoleInfo[k] !== '') {
          node[k] = verifyRoleInfo[k];
        }
      });
    }

    const saveRes = await listAPI.editOneNode('MainSign', node);
    if (saveRes?.message !== 'successful') {
      ElMessage.warning(saveRes?.message || '保存失败');
      return;
    }
    const signId = saveRes?.data?.id ?? saveRes?.data?.nodeInfo?.id ?? node.id;
    if (signId == null || signId === '') {
      ElMessage.error('保存成功但未返回打卡记录编号，无法上传照片');
      return;
    }

    const uploadRes = await fileAPI.upload({
      files: [photoRaw.value],
      relationIds: signId,
      tableName: 'MainSign',
    });
    const imgId = parseImgIdFromUpload(uploadRes);
    if (imgId != null) {
      await listAPI.editOneNode('MainSign', { id: signId, imgId });
    }

    let auditIdForSubmit = null;
    if (pendingRejected) {
      auditIdForSubmit = resolveMainVerifyProcessIdFromSignHistoryRow(pendingRejected);
      if (auditIdForSubmit != null) {
        const vpRes = await listAPI.editOneNode('MainVerifyProcess', {
          id: auditIdForSubmit,
          isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
        });
        if (vpRes?.message !== 'successful') {
          ElMessage.warning(vpRes?.message || '更新审核流程状态失败');
          return;
        }
      }
    }

    const auditRes = await submitSignAudit(signId, internshipId);
    if (!auditRes || auditRes.message !== 'successful') {
      ElMessage.warning(auditRes?.message || '打卡已保存，但审核提交失败，请联系管理员处理');
    } else {
      ElMessage.success('打卡成功');
    }
    clearPhoto();
    form.address = '';
    form.signType = 1;
    await refreshHistoryList();
    activeTab.value = 'history';
  } catch (e) {
    if (!e?.response) {
      // HTTP 错误由 request 拦截器统一弹窗，此处只处理网络/逻辑异常
      ElMessage.error('提交失败：' + (e?.message || ''));
    }
  } finally {
    submitting.value = false;
  }
}

async function previewSignImage(imgId) {
  try {
    await fileAPI.downloadFile(imgId);
  } catch {
    ElMessage.error('打开照片失败');
  }
}

/** MainSign 审核轨迹：relationId 为打卡主表 id，与 DlgVerifyProgress 基表查询一致 */
function openSignVerifyProgress(row) {
  const relationId = row?.relationId ?? row?.relation_id;
  if (relationId == null || relationId === '') {
    ElMessage.warning('无法查看审核进度：缺少关联编号');
    return;
  }
  progressProcessInfo.value = {
    ...row,
    relationId,
    tableName: 'MainSign',
  };
  showProgressDialog.value = true;
}

watch(currentPost, () => {
  refreshHistoryList();
});

watch(hasCheckedInToday, (checked) => {
  if (checked && form.signType === SIGN_IN) {
    form.signType = SIGN_OUT;
  }
});

watch(hasCheckedOutToday, (checked) => {
  if (checked && form.signType === SIGN_OUT) {
    form.signType = SIGN_IN;
  }
});

onMounted(async () => {
  await loadExternalPosts();
  if (currentPost.value?.relationId) {
    await refreshHistoryList();
  }
});

onBeforeUnmount(() => {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
  }
});
</script>

<style scoped>
.stu-internship-sign {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sign-tabs-card :deep(.el-card__body) {
  padding-top: 8px;
}

.sign-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.sign-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
}

.sign-history-dtl {
  min-height: 200px;
}

.sign-history-dtl :deep(.el-card) {
  border: none;
}

.sign-history-dtl :deep(.el-card__header) {
  display: none;
}

.block-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.card-title {
  font-weight: 600;
  color: #303133;
}

.selector-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.single-post {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
}

.mb-16 {
  margin-bottom: 16px;
}

.sign-form {
  max-width: 640px;
}

.address-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.photo-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.hidden-input {
  display: none;
}

.photo-hint {
  font-size: 12px;
  color: #909399;
}

.preview-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.remove-photo-btn {
  font-weight: 600;
  font-size: 13px;
  min-height: 32px;
  padding: 8px 14px;
  color: #fff;
  border-color: var(--el-color-danger);
  background: var(--el-color-danger);
}

.remove-photo-btn:hover,
.remove-photo-btn:focus-visible {
  color: #fff;
  border-color: var(--el-color-danger-dark-2);
  background: var(--el-color-danger-dark-2);
}

.preview-thumb {
  position: relative;
  width: 148px;
  height: 148px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  overflow: hidden;
  cursor: zoom-in;
  background: var(--el-fill-color-light);
  flex-shrink: 0;
}

.preview-thumb:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.preview-thumb-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
}

.preview-thumb:hover .preview-thumb-mask,
.preview-thumb:focus-visible .preview-thumb-mask {
  opacity: 1;
}

.preview-dialog-body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.preview-dialog-img {
  max-width: 100%;
  max-height: min(72vh, 640px);
  object-fit: contain;
  border-radius: 4px;
}
</style>

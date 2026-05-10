<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'自主实习申请审核'"
    :no-project-message="'当前没有可审核的自主实习申请'"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELF_DECLARATION"
    @audit-click="handleAuditClick"
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgSelfDeclarationView ref="dlgViewRef" />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelStuInternshipPost"
      />
      <DlgVerify
        ref="dlgVerifyRef"
        dlg-title="自主实习申请审核"
        recall-title="退回已通过的自主实习申请"
        @success="handleVerifySuccess"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, unref } from 'vue'
import { ElMessage } from 'element-plus'
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue'
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue'
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue'
import DlgSelfDeclarationView from './components/DlgSelfDeclarationView.vue'
import CONSTANT from '@/utils/constant'
import { useVerifyFilter } from '@/utils/useVerifyFilter'
import { buildVerifySearchWords } from '@/utils/verify'

defineOptions({ name: 'StuSelfDeclarationVerify' })

const headerPageRef = ref(null)
const dlgViewRef = ref(null)
const dlgVerifyRef = ref(null)
const showProgressDialog = ref(false)
const currentRow = ref({})

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter()

const titleObj = reactive({
  mainTitle: '自主实习申请审核',
})

const isMore1Disabled = computed(() => unref(headerPageRef.value?.isMore1Disabled) ?? false)

/**
 * 除了 useVerifyFilter 的审核角色过滤外，再加一道岗位码过滤：
 * 视图返回的行里只有 code === SELF_INTERNSHIP 的才是自主实习申请，
 * 避免后端万一误把别的岗位记录带进来
 */
function selfFilter(dataList) {
  const afterVerify = clientFilterFn ? clientFilterFn(dataList) : dataList
  return (afterVerify || []).filter(
    (row) => row?.internshipPostCode === CONSTANT.SELF_INTERNSHIP.POST_CODE
  )
}

function buildSearchKey(baseSearchKey) {
  // 走 processTypeCode 筛选后基本就是自主实习了，保险起见再加一道岗位码过滤
  return {
    ...baseSearchKey,
    internshipPostCode: CONSTANT.SELF_INTERNSHIP.POST_CODE,
  }
}

function handleProjectSelected(_internship, title) {
  if (title) titleObj.mainTitle = title
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  clientFilterFn: selfFilter,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看申请详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelStuInternshipPostMerge' },
    allTableColumns: [
      { id: 1, showName: '学号', tableColumnName: 'studentAccount', sortable: true },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      { id: 3, showName: '实习单位', tableColumnName: 'selfCompanyName', sortable: true },
      { id: 4, showName: '实习岗位', tableColumnName: 'selfPostName', sortable: false },
      { id: 5, showName: '当前状态', tableColumnName: 'customize-status' },
      { id: 6, showName: '审核意见', tableColumnName: 'reason' },
    ],
  },
  initSearchWords: buildVerifySearchWords(),
  defaultDBIProps: {},
}))

const lastBatchAuditCommand = ref(null)

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row : row ? [row] : []
  if (rows.length === 0) return
  if (rows.length === 1) {
    dlgVerifyRef.value?.showDialog(true, rows[0])
  } else {
    const preSelected = lastBatchAuditCommand.value
    const targetStatus =
      preSelected === CONSTANT.AUDIT_STATUS.BACK
        ? CONSTANT.AUDIT_STATUS.PASS
        : CONSTANT.AUDIT_STATUS.SUBMIT
    const targetRows = rows.filter((r) => r && r.isAudit === targetStatus)
    if (!targetRows.length) {
      ElMessage.warning(
        preSelected === CONSTANT.AUDIT_STATUS.BACK
          ? '选中的记录中没有已通过的数据可退回'
          : '选中的记录中没有待审核的数据'
      )
      return
    }
    dlgVerifyRef.value?.showDialog(true, targetRows[0], targetRows, preSelected)
    lastBatchAuditCommand.value = null
  }
}

function handleBatchAuditCommand(command) {
  lastBatchAuditCommand.value = command
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row
  if (selectedRow) dlgViewRef.value?.open(selectedRow)
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray
  currentRow.value = row ? { ...row } : {}
  showProgressDialog.value = true
}

function handleVerifySuccess() {
  headerPageRef.value?.baseListRef?.initDataList?.(true)
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
})
</script>

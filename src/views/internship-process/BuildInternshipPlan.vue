<template>
  <div class="build-internship-plan-container">
    <BaseList
      :default-props="defaultProps"
      :button-condition="buttonCondition"
      ref="baseList"
      @edit-click="editClick"
      @view-click="viewClick"
    >
      <!-- 自定义操作按钮：查看进度 -->
      <template #rightOperate="{ row }">
        <el-button
          v-if="row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE && row.isAudit !== null && row.isAudit !== undefined"
          type="primary"
          size="small"
          title="查看进度"
          @click="viewClick(row)"
        >
          <el-icon><View /></el-icon>
        </el-button>
      </template>
    </BaseList>

    <!-- 编辑对话框 -->
    <DlgBasic
      ref="dlgBasicRef"
      v-model:default-props="dlgProps"
      :dlgbasic-confirm="handleSave"
      :dlgbasic-spec-submit="handleSubmit"
    >
      <template #mainForm>
        <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="100px">
          <el-form-item label="实习项目">
            <span>{{ form.internshipName || form.name }}</span>
          </el-form-item>
          <el-form-item label="备注" prop="remarks">
            <el-input v-model="form.remarks" type="textarea" :rows="4" placeholder="请输入备注" />
          </el-form-item>
          <!-- TODO: 后续添加更多字段和文件上传 -->
        </el-form>
      </template>
    </DlgBasic>

    <!-- 审核进度查看对话框 -->
    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="currentRow.internshipId"
      :process-info="currentRow"
    />
  </div>
</template>

<script setup>
/**
 * 实习计划制定页面
 *
 * 功能说明：
 * - 显示正在"实习计划制定"流程时间内的实习项目
 * - 项目创建者可以编辑计划信息
 * - 暂存：保存但不提交（isAudit = -1）
 * - 提交：提交审核（isAudit = 0）
 * - 提交后显示查看进度按钮
 */
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Edit, View } from '@element-plus/icons-vue';
import moment from 'moment';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'BuildInternshipPlan',
});

const store = useStore();
const baseList = ref(null);
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);

// 当前时间
const currentTime = computed(() => moment().format('YYYY-MM-DD HH:mm:ss'));

// 表单数据
const form = reactive({});

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// 表单验证规则
const formRules = {};

// 按钮条件配置：编辑按钮只在未提交状态显示
const buttonCondition = {
  update: (row) => row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === null || row.isAudit === undefined
};

// 编辑对话框配置
const dlgProps = reactive({
  form: {},
  width: '50%',
  dlgTitle: '编辑实习计划',
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '暂 存', type: 'primary' },
    submit: { show: true, name: '提 交', type: 'success' }
  },
  someFlags: {
    noFooter: false,
    needValidate: true,
    validate: false
  }
});

/**
 * 列表查询条件：
 * - 从 ViewVerifyInternshipPlanProcess 查询数据
 * - 筛选正在流程时间内的项目
 */
const initSearchWords = computed(() => ({
  searchKey: {
    startTime: currentTime.value,
    endTime: currentTime.value
  },
  regKey: {
    startTime: CONSTANT.SEARCH_OPERATOR.LE,
    endTime: CONSTANT.SEARCH_OPERATOR.GE
  }
}));

// 编辑按钮点击
const editClick = (row) => {
  // 清空表单
  Object.keys(form).forEach(key => delete form[key]);
  Object.assign(form, row);

  dlgBasicRef.value?.showDialog(true, form, 'edit');
};

// 查看进度按钮点击
const viewClick = (row) => {
  currentRow.value = row;
  showProgressDialog.value = true;
};

/**
 * 暂存：保存但不提交
 * isAudit = -1（保存未提交）
 */
const handleSave = async (option, type) => {
  form.isAudit = CONSTANT.AUDIT_STATUS.SAVE; // -1

  try {
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: form.id,
      remarks: form.remarks,
      isAudit: form.isAudit
    });

    if (resInfo && resInfo.message === 'successful') {
      ElMessage.success('暂存成功');
      baseList.value?.initDataList();
      if (type === 'stop') {
        dlgBasicRef.value?.showDialog(false, form);
      }
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试');
  }
};

/**
 * 提交：提交审核
 * isAudit = 0（提交待审核）
 */
const handleSubmit = async () => {
  try {
    await ElMessageBox.confirm(
      '提交后将进入审核流程，届时将不可修改，确定提交吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }

  form.isAudit = CONSTANT.AUDIT_STATUS.SUBMIT; // 0

  try {
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: form.id,
      remarks: form.remarks,
      isAudit: form.isAudit
    });

    if (resInfo && resInfo.message === 'successful') {
      ElMessage.success('提交成功，等待审核');
      baseList.value?.initDataList();
      dlgBasicRef.value?.showDialog(false, form);
    } else {
      ElMessage.warning(resInfo?.message || '提交失败');
    }
  } catch (error) {
    ElMessage.error('提交失败，请重试');
  }
};

// 列表配置
const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: initSearchWords.value,
    defaultDTHProps: {
      buttonProps: {
        create: { show: false },
        update: { show: true },  // 编辑按钮，通过 buttonCondition 控制显示条件
        delete: { show: false }
      },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyInternshipPlanProcess' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'internshipName' },
        { id: 2, showName: '创建人', theOrder: 2, tableColumnName: 'createUserName', width: 100 },
        { id: 3, showName: '开始时间', theOrder: 3, tableColumnName: 'startTime', width: 160 },
        { id: 4, showName: '结束时间', theOrder: 4, tableColumnName: 'endTime', width: 160 },
        { id: 5, showName: '状态', theOrder: 5, tableColumnName: 'isAudit', width: 120 }
      ]
    }
  }
}));
</script>

<style lang="scss" scoped>
.build-internship-plan-container {
  height: 100%;
}
</style>

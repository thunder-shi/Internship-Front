<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-confirm="handleConfirm" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="120px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="项目名称：">
              <span>{{ internshipName || '--' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业信息：">
              <span>{{ majorNames || '--' }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="单位部门：">
              <!-- 如果是企业导师或企业管理员，显示label -->
              <span v-if="isCompanyUser">{{ userDepartmentName || '--' }}</span>
              <!-- 其他情况，显示树型选择框 -->
              <SimpleTreeSelect v-else ref="departmentSelectRef" v-model="form.departmentId" key-words="BaseDepartment" :search-keys="{ typeId: 1 }" placeholder="请选择单位部门" @update-value="handleDepartmentChange" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位类型：">
              <SimpleSelect ref="postTypeSelectRef" v-model="form.postTypeId" key-words="ViewBasePostType" :search-key="postTypeSearchKey" :reg-key="postTypeRegKey" :auto-init="hasValidSchoolId" :disabled="!hasValidSchoolId" :client-filter-fn="postTypeClientFilterFn" placeholder="请选择岗位类型" @init-finish="handlePostTypeInitFinish" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 岗位详细信息 -->
        <el-row>
          <el-col :span="24">
            <div class="post-type-info">
              <div class="info-header">岗位类型详细信息</div>
              <el-row class="info-content">
                <el-col :span="12">
                  <div class="info-item">
                    <span class="info-label">类型编码：</span>
                    <span class="info-value">{{ selectedPostTypeInfo?.code || '--' }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="info-item">
                    <span class="info-label">类型名称：</span>
                    <span class="info-value">{{ selectedPostTypeInfo?.name || '--' }}</span>
                  </div>
                </el-col>
              </el-row>
              <el-row class="info-content">
                <el-col :span="12">
                  <div class="info-item">
                    <span class="info-label">适合专业：</span>
                    <span class="info-value">{{ selectedPostTypeInfo?.majorNames || '--' }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="info-item">
                    <span class="info-label">薪资水平：</span>
                    <span class="info-value">{{ selectedPostTypeInfo?.salary || '--' }}</span>
                  </div>
                </el-col>
              </el-row>
              <el-row class="info-content">
                <el-col :span="24">
                  <div class="info-item">
                    <span class="info-label">岗位地址：</span>
                    <span class="info-value">{{ selectedPostTypeInfo?.address || '--' }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-col>
        </el-row>
        <!-- 具体岗位信息 -->
        <el-row class="specific-post-section">
          <el-col :span="24">
            <el-form-item label="具体岗位编码：">
              <el-input v-model="form.code" placeholder="请输入具体岗位编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="具体岗位名称：">
              <el-input v-model="form.name" placeholder="请输入具体岗位名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="预计需要人数：" prop="allPersonNum">
              <el-input v-model="form.allPersonNum" type="number" placeholder="请输入预计需要人数" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import SimpleSelect from '@/components/SimpleSelect.vue';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';
import treeAPI from '@/api/tree';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'DlgNewPost',
});

const props = defineProps({
  // 当前选中的实习项目对象
  currentInternship: {
    type: Object,
    default: null,
  },
});

// 计算属性：项目名称
const internshipName = computed(() => {
  return props.currentInternship?.internshipName || props.currentInternship?.name || '';
});

// 计算属性：专业信息
const majorNames = computed(() => {
  return props.currentInternship?.majorNames || '';
});

const emit = defineEmits(['close-dialog', 'success']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const form = reactive({});

// 表单验证规则
const formRules = reactive({
  allPersonNum: [
    { required: true, message: '请输入预计需要人数', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (value === undefined || value === null || value === '') {
        callback(new Error('请输入预计需要人数'));
        return;
      }
      const numValue = Number(value);
      if (isNaN(numValue)) {
        callback(new Error('预计需要人数必须为数字'));
      } else if (numValue <= 0) {
        callback(new Error('预计需要人数必须大于0'));
      } else {
        callback();
      }
    }, trigger: 'blur' }
  ]
});

// 获取当前用户信息
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 判断是否是企业导师或企业管理员
const isCompanyUser = computed(() => {
  return roles.value.some(role => 
    role === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || role === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  );
});

// 获取用户单位名称
const userDepartmentName = computed(() => {
  return userInfo.value.departmentName || userInfo.value.department?.name || '--';
});

// 岗位类型的查询条件（动态计算）
const postTypeSearchKey = ref({});
const postTypeRegKey = ref({});

// 判断是否有有效的schoolId
const hasValidSchoolId = computed(() => {
  if (isCompanyUser.value) {
    return !!(userInfo.value.schoolId || userInfo.value.departmentId);
  } else {
    return !!form.departmentId;
  }
});

// 获取项目的专业ID数组
function getInternshipMajorIds() {
  const majorIds = props.currentInternship?.majorIds || '';
  if (!majorIds) return [];
  // 将 "1|2|3" 格式的字符串拆分成数组，过滤空值
  return majorIds.split('|').filter(id => id && id.trim() !== '');
}

// 判断两个专业ID集合是否有交集
function hasMajorIntersection(internshipMajorIds, postTypeMajorIds) {
  if (!internshipMajorIds || internshipMajorIds.length === 0) return false;
  if (!postTypeMajorIds || postTypeMajorIds === '') return false;
  
  // 将岗位类型的 majorIds 字符串拆分成数组
  const postTypeIds = postTypeMajorIds.split('|').filter(id => id && id.trim() !== '');
  
  // 检查是否有交集
  return internshipMajorIds.some(id => postTypeIds.includes(String(id)));
}

// 更新岗位类型的查询条件
async function updatePostTypeSearchKey() {
  let schoolId = null;
  
  if (isCompanyUser.value) {
    // 如果是企业用户，使用用户的 schoolId（如果存在）或 departmentId
    schoolId = userInfo.value.schoolId || userInfo.value.departmentId;
  } else {
    // 如果不是企业用户，使用单位部门选择框的值作为 schoolId
    schoolId = form.departmentId;
  }
  
  if (!schoolId) {
    // 如果没有 schoolId，清空查询条件（不显示任何岗位类型）
    postTypeSearchKey.value = {};
    postTypeRegKey.value = {};
    return;
  }
  
  try {
    // 调用新接口获取所有子节点ID
    const response = await treeAPI.getAllChildIndex('BaseDepartment', schoolId);
    
    if (response && response.data && Array.isArray(response.data)) {
      const allNodeIds = response.data;
      // 设置查询条件：BasePostType 中的 companyId 在 allNodeIds 中（使用 IN 操作符）
      // 注意：专业过滤通过 clientFilterFn 在前端处理
      if (allNodeIds.length > 0) {
        postTypeSearchKey.value = {
          companyId: allNodeIds.join(',')
        };
        postTypeRegKey.value = {
          companyId: '()' // IN 操作符
        };
      } else {
        postTypeSearchKey.value = {};
        postTypeRegKey.value = {};
      }
    } else {
      postTypeSearchKey.value = {};
      postTypeRegKey.value = {};
    }
  } catch (error) {
    console.error('获取子节点失败:', error);
    postTypeSearchKey.value = {};
    postTypeRegKey.value = {};
  }
}

// 岗位类型选项的引用（用于过滤）
const postTypeSelectRef = ref(null);

// 单位部门选择框的引用
const departmentSelectRef = ref(null);

// 选中的岗位类型详细信息
const selectedPostTypeInfo = ref(null);

// 选中的单位名称
const selectedDepartmentName = ref('');

// 获取当前年份
function getCurrentYear() {
  return new Date().getFullYear();
}

// 获取单位名称
function getDepartmentName() {
  if (isCompanyUser.value) {
    return userDepartmentName.value;
  } else {
    return selectedDepartmentName.value;
  }
}

// 处理单位部门选择变化
async function handleDepartmentChange(val, field, nodes) {
  if (val && nodes && nodes.length > 0) {
    // 获取最后一个节点（选中的节点）
    const selectedNode = nodes[nodes.length - 1];
    selectedDepartmentName.value = selectedNode?.name || '';
  } else {
    selectedDepartmentName.value = '';
  }
  
  // 如果已选中岗位类型，重新生成岗位名称
  if (form.postTypeId && selectedPostTypeInfo.value) {
    const generatedName = generatePostName();
    if (generatedName) {
      form.name = generatedName;
    }
  }
}

// 生成具体岗位名称
function generatePostName() {
  const year = getCurrentYear();
  const departmentName = getDepartmentName();
  const postTypeName = selectedPostTypeInfo.value?.name || '';
  
  if (departmentName && postTypeName) {
    return `${year}年-${departmentName}-${postTypeName}`;
  }
  return '';
}

// 加载岗位类型详细信息
async function loadPostTypeInfo(postTypeId) {
  if (!postTypeId) {
    selectedPostTypeInfo.value = null;
    // 清空具体岗位编码和名称
    form.code = '';
    form.name = '';
    return;
  }
  
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewBasePostType',
      searchKey: { id: postTypeId },
      reg: { id: '=' },
      pageInfo: { page: 1, size: 1 }
    });
    
    if (response && response.data && response.data.content && response.data.content.length > 0) {
      selectedPostTypeInfo.value = response.data.content[0];
      
      // 自动填充具体岗位编码（从岗位类型编码）
      if (selectedPostTypeInfo.value.code) {
        form.code = selectedPostTypeInfo.value.code;
      }
      
      // 自动生成具体岗位名称
      const generatedName = generatePostName();
      if (generatedName) {
        form.name = generatedName;
      }
    } else {
      selectedPostTypeInfo.value = null;
      form.code = '';
      form.name = '';
    }
  } catch (error) {
    console.error('加载岗位类型信息失败:', error);
    selectedPostTypeInfo.value = null;
    form.code = '';
    form.name = '';
  }
}

// 监听岗位类型选择变化
watch(() => form.postTypeId, async (newVal) => {
  await loadPostTypeInfo(newVal);
  // 更新验证状态
  updateValidateState();
});

// 更新验证状态（检查表单是否通过验证，不显示错误信息）
function updateValidateState() {
  if (!formPanelRef.value || !dlgBasicRef.value) return;
  
  nextTick(() => {
    if (formPanelRef.value && dlgBasicRef.value) {
      // 手动检查验证规则，不显示错误信息
      const rules = formRules;
      const fields = Object.keys(rules);
      let hasError = false;
      
      // 遍历所有规则字段，手动检查必填规则
      for (const field of fields) {
        const ruleArray = rules[field];
        if (Array.isArray(ruleArray)) {
          const value = form[field];
          // 检查必填规则
          const requiredRule = ruleArray.find((r) => r.required === true);
          if (requiredRule) {
            // 检查值是否为空
            if (
              value === undefined ||
              value === null ||
              value === '' ||
              (Array.isArray(value) && value.length === 0)
            ) {
              hasError = true;
              break; // 找到错误就退出
            }
          }
          // 检查自定义验证器（同步检查）
          for (const rule of ruleArray) {
            if (rule.validator && typeof rule.validator === 'function') {
              let validatorError = false;
              try {
                rule.validator(rule, value, (error) => {
                  if (error) {
                    validatorError = true;
                  }
                });
                if (validatorError) {
                  hasError = true;
                  break;
                }
              } catch (e) {
                // 验证器执行出错，认为有错误
                hasError = true;
                break;
              }
            }
          }
          if (hasError) break;
        }
      }
      
      // 设置按钮状态：hasError 为 true 时禁用按钮（validate = true）
      dlgBasicRef.value.validate = hasError;
    }
  });
}

// 监听表单字段变化，更新验证状态
watch(() => [form.allPersonNum, form.code, form.name, form.postTypeId], () => {
  updateValidateState();
}, { deep: true });

// 岗位类型的客户端过滤函数
function postTypeClientFilterFn(options) {
  if (!options || !Array.isArray(options)) return options;
  
  const internshipMajorIds = getInternshipMajorIds();
  if (internshipMajorIds.length === 0) {
    // 如果项目没有专业信息，不进行过滤
    return options;
  }
  
  // 过滤：只保留与项目专业有交集的岗位类型
  const filtered = options.filter(option => {
    const postTypeMajorIds = option.majorIds || '';
    return hasMajorIntersection(internshipMajorIds, postTypeMajorIds);
  });
  
  // 如果当前选中的值不在过滤后的列表中，清空选中值
  if (form.postTypeId) {
    const exists = filtered.some(opt => opt.id === form.postTypeId);
    if (!exists) {
      form.postTypeId = null;
    }
  }
  
  return filtered;
}

// 处理岗位类型初始化完成事件
function handlePostTypeInitFinish(field, options) {
  // 过滤逻辑已经在 clientFilterFn 中处理
}

// 监听单位部门变化（非企业用户）
watch(() => form.departmentId, async (newVal, oldVal) => {
  if (!isCompanyUser.value) {
    if (newVal) {
      // 如果单位部门变化了，清空之前选中的岗位类型
      if (oldVal !== undefined && oldVal !== null && oldVal !== newVal) {
        form.postTypeId = null;
      }
      // 查询单位名称
      try {
        const response = await listAPI.getSomeRecords({
          keyWords: 'BaseDepartment',
          searchKey: { id: newVal },
          reg: { id: '=' },
          pageInfo: { page: 1, size: 1 }
        });
        if (response && response.data && response.data.content && response.data.content.length > 0) {
          selectedDepartmentName.value = response.data.content[0].name || '';
        }
      } catch (error) {
        console.error('获取单位名称失败:', error);
      }
      await updatePostTypeSearchKey();
    } else {
      // 如果清空了选择，清空查询条件和岗位类型
      postTypeSearchKey.value = {};
      postTypeRegKey.value = {};
      form.postTypeId = null;
      selectedDepartmentName.value = '';
    }
  }
});

// 监听用户信息变化（企业用户）
watch(() => {
  const schoolId = userInfo.value.schoolId || userInfo.value.departmentId;
  return schoolId;
}, async (newVal, oldVal) => {
  if (isCompanyUser.value) {
    if (newVal) {
      // 如果schoolId变化了，清空之前选中的岗位类型
      if (oldVal !== undefined && oldVal !== null && oldVal !== newVal) {
        form.postTypeId = null;
      }
      // 企业用户的单位名称从 userDepartmentName 获取
      selectedDepartmentName.value = userDepartmentName.value;
      await updatePostTypeSearchKey();
    } else {
      // 如果没有schoolId，清空查询条件和岗位类型
      postTypeSearchKey.value = {};
      postTypeRegKey.value = {};
      form.postTypeId = null;
      selectedDepartmentName.value = '';
    }
  }
});

// 对话框配置
const defaultProps = reactive({
  dlgTitle: '新增实习岗位',
  width: '50%',
  formRules: formRules,
  footButtons: {
    confirm: { show: true, name: '保 存', type: 'primary' },
    cancel: { show: true, name: '取 消', type: '' },
  },
  someFlags: {
    needValidate: true, // 启用表单校验
  },
});

// 处理确认保存
async function handleConfirm() {
  try {
    // 表单验证
    if (formPanelRef.value) {
      const valid = await formPanelRef.value.validate();
      if (!valid) {
        ElMessage.warning('请填写完整信息');
        return false;
      }
    }
    
    // 如果有实习项目ID，添加到表单数据中
    const internshipId = props.currentInternship?.id;
    if (!internshipId) {
      ElMessage.warning('请先选择实习项目');
      return false;
    }

    // 构建保存的数据对象
    const saveData = {
      internshipId: internshipId,
      code: form.code || '',
      name: form.name || '',
      allPersonNum: form.allPersonNum,
      postTypeId: form.postTypeId
    };

    // 如果是企业用户，自动设置单位ID
    if (isCompanyUser.value && userInfo.value.departmentId) {
      saveData.departmentId = userInfo.value.departmentId;
    } else if (form.departmentId) {
      saveData.departmentId = form.departmentId;
    }

    // 调用保存接口，保存到 MainInternshipPost 表
    const response = await listAPI.editOneNode({
      keyWords: 'MainInternshipPost',
      form: saveData,
    });

    if (response && response.data) {
      ElMessage.success('保存成功');
      emit('success', saveData);
      emit('close-dialog');
      return true; // 返回 true 表示保存成功，允许关闭对话框
    } else {
      ElMessage.error('保存失败');
      return false;
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
    return false;
  }
}

// 处理关闭对话框
function handleCloseDialog() {
  emit('close-dialog');
}

// 显示对话框
async function showDialog(val, formData = {}) {
  // 重置表单
  Object.keys(form).forEach(key => {
    delete form[key];
  });
  // 赋值新数据
  Object.assign(form, formData);
  
  // 如果是企业用户，自动设置单位ID和单位名称
  if (val && isCompanyUser.value && userInfo.value.departmentId) {
    form.departmentId = userInfo.value.departmentId;
    selectedDepartmentName.value = userDepartmentName.value;
  } else {
    selectedDepartmentName.value = '';
  }
  
  // 只有在有schoolId的情况下才更新岗位类型的查询条件
  const schoolId = isCompanyUser.value 
    ? (userInfo.value.schoolId || userInfo.value.departmentId)
    : form.departmentId;
  
  if (schoolId) {
    await updatePostTypeSearchKey();
    // 如果不是企业用户，查询单位名称
    if (!isCompanyUser.value && form.departmentId) {
      try {
        const response = await listAPI.getSomeRecords({
          keyWords: 'BaseDepartment',
          searchKey: { id: form.departmentId },
          reg: { id: '=' },
          pageInfo: { page: 1, size: 1 }
        });
        if (response && response.data && response.data.content && response.data.content.length > 0) {
          selectedDepartmentName.value = response.data.content[0].name || '';
        }
      } catch (error) {
        console.error('获取单位名称失败:', error);
      }
    }
  } else {
    // 如果没有schoolId，清空查询条件
    postTypeSearchKey.value = {};
    postTypeRegKey.value = {};
  }
  
  // 如果表单中有岗位类型ID，加载详细信息
  if (form.postTypeId) {
    await loadPostTypeInfo(form.postTypeId);
  } else {
    selectedPostTypeInfo.value = null;
    form.code = '';
    form.name = '';
  }
  
  // 清空表单验证状态
  await nextTick();
  if (formPanelRef.value) {
    formPanelRef.value.clearValidate();
  }
  
  // 调用 DlgBasic 的 showDialog 方法
  dlgBasicRef.value?.showDialog(val, form);
  
  // 对话框打开后，延迟更新验证状态（确保DOM已渲染）
  await nextTick();
  setTimeout(() => {
    updateValidateState();
  }, 100);
}

// 暴露方法给父组件
defineExpose({
  showDialog,
});
</script>

<style scoped>
.post-type-info {
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%);
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-header {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.info-content {
  margin-bottom: 8px;
}

.info-content:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  min-width: 80px;
  margin-right: 8px;
}

.info-value {
  font-size: 13px;
  color: #303133;
  flex: 1;
}

.specific-post-section {
  margin-top: 20px;
}

/* 防止label换行 */
:deep(.el-form-item__label) {
  white-space: nowrap;
}
</style>

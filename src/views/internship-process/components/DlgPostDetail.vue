<template>
  <DlgBasic
    ref="dlgBasicRef"
    :default-props="defaultProps"
    :dlgbasic-confirm="handleConfirm"
    :dlgbasic-spec-submit="handleSubmit"
    @close-dialog="handleCloseDialog"
  >
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
            <el-form-item label="企业名称：">
              <!-- 如果是企业导师或企业管理员，或者编辑模式，或者审核模式，显示label -->
              <span v-if="isCompanyUser || isEditMode">{{ displayDepartmentName || '--' }}</span>
              <!-- 其他情况（新增模式且非企业用户），显示树型选择框 -->
              <SimpleTreeSelect
                v-else
                ref="departmentSelectRef"
                v-model="form.departmentId"
                key-words="BaseDepartment"
                :search-keys="{ typeId: 1 }"
                placeholder="请选择单位部门"
                @update-value="handleDepartmentChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位类型：">
              <!-- 编辑模式或审核模式下显示label -->
              <span v-if="isEditMode">{{ displayPostTypeName || '--' }}</span>
              <!-- 新增模式下显示选择框 -->
              <SimpleSelect
                v-else
                ref="postTypeSelectRef"
                v-model="form.postTypeId"
                key-words="ViewBasePostType"
                :search-key="postTypeSearchKey"
                :reg-key="postTypeRegKey"
                :auto-init="hasValidSchoolId"
                :disabled="!hasValidSchoolId"
                :client-filter-fn="postTypeClientFilterFn"
                placeholder="请选择岗位类型"
                @init-finish="handlePostTypeInitFinish"
              />
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
              <el-input v-model="form.code" placeholder="请输入具体岗位编码" :disabled="!canEdit" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="具体岗位名称：">
              <el-input v-model="form.name" placeholder="请输入具体岗位名称" :disabled="!canEdit" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="!isReadOnlyMode">
          <el-col :span="24">
            <el-form-item label="预计需要人数：" prop="allPersonNum">
              <el-input
                v-model="form.allPersonNum"
                type="number"
                placeholder="请输入预计需要人数"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="!isReadOnlyMode">
          <el-col :span="24">
            <el-form-item label="已经报名人数：">
              <span>{{ form.nowPersonNum ?? '--' }}</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>
    <template v-if="showCustomFootButton" #otherBtn>
      <el-button :type="customFootButton.type || 'warning'" @click="handleCustomFootButton">
        {{ customFootButton.name || '操作' }}
      </el-button>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import SimpleSelect from '@/components/SimpleSelect.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import listAPI from '@/api/list';
import treeAPI from '@/api/tree';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import _ from 'lodash';

defineOptions({
  name: 'DlgPostDetail',
});

const props = defineProps({
  // 当前选中的实习项目对象
  currentInternship: {
    type: Object,
    default: null,
  },
  // 自定义底部按钮：{ show: (rowData) => boolean, name: string, type: string, action: (rowData) => Promise }
  customFootButton: {
    type: Object,
    default: null,
  },
});

// 计算属性：项目名称
// 优先从 currentRowData 中获取（如果是从行数据传入的），否则从 props.currentInternship 中获取
const internshipName = computed(() => {
  return (
    currentRowData.value?.internshipName ||
    currentRowData.value?.name ||
    props.currentInternship?.internshipName ||
    props.currentInternship?.name ||
    ''
  );
});

// 计算属性：专业信息
// 优先从 currentRowData 中获取（如果是从行数据传入的），否则从 props.currentInternship 中获取
const majorNames = computed(() => {
  return currentRowData.value?.majorNames || props.currentInternship?.majorNames || '';
});

const emit = defineEmits(['close-dialog', 'success']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const form = reactive({});

// 是否为编辑模式
const isEditMode = ref(false);
// 当前编辑的岗位ID（MainInternshipPost表的主键）
const currentPostId = ref(null);
// 当前行数据（用于获取companyName等字段）
const currentRowData = ref(null);
// 当前行的审核状态
const currentAuditStatus = ref(null);
/** MainVerifyProcess 主键（与列表行 id 一致；新增保存创建流程后写入） */
const mainVerifyProcessRecordId = ref(null);

// 表单验证规则
const formRules = computed(() => ({
  allPersonNum: [
    { required: true, message: '请输入预计需要人数', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
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
      },
      trigger: 'blur',
    },
  ],
}));

// 获取当前用户信息
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 通过部门类型判断是否为企业用户（typeId=1 表示企业）
const isCompanyUser = computed(() => userInfo.value.departmentTypeId === 1);

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

// 缓存的项目专业ID（从 MainInternship 补充获取）
const cachedInternshipMajorIds = ref('');

// 获取项目的专业ID数组
function getInternshipMajorIds() {
  const majorIds = props.currentInternship?.majorIds || cachedInternshipMajorIds.value || '';
  if (!majorIds) return [];
  // 将 "1|2|3" 格式的字符串拆分成数组，过滤空值
  return majorIds.split('|').filter((id) => id && id.trim() !== '');
}

// 从 MainInternship 加载项目的专业ID（当 currentInternship 没有 majorIds 时）
async function loadInternshipMajorIds() {
  const internshipId = props.currentInternship?.internshipId || props.currentInternship?.id;
  if (!internshipId) return;
  // 如果 currentInternship 已有 majorIds，无需额外查询
  if (props.currentInternship?.majorIds) {
    cachedInternshipMajorIds.value = props.currentInternship.majorIds;
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewMainInternship',
      searchKey: { id: internshipId },
      reg: { id: '=' },
      pageInfo: { page: 1, size: 1 },
    });
    const records = res?.data?.content || res?.data?.records || [];
    if (records.length > 0 && records[0].majorIds) {
      cachedInternshipMajorIds.value = records[0].majorIds;
    }
  } catch (error) {
    console.error('加载项目专业信息失败:', error);
  }
}

// 专业树缓存（用于多层级匹配）
const majorTreeCache = ref(null);

// 递归展开嵌套树为扁平数组（树接口返回嵌套结构）
function flattenTree(nodes, parentId = null) {
  const result = [];
  if (!nodes || !Array.isArray(nodes)) return result;
  nodes.forEach((node) => {
    result.push({ id: node.id, parentId: parentId });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, node.id));
    }
  });
  return result;
}

// 加载专业树数据并构建父子关系映射
async function loadMajorTree() {
  if (majorTreeCache.value) return majorTreeCache.value;
  try {
    const response = await treeAPI.getAllNodes({ keyWords: 'BaseMajor' });
    if (!response || !response.data) return null;
    // getAllNodes 返回嵌套树结构（含 children），需要递归展开为扁平数组
    const flatNodes = flattenTree(response.data);
    const parentMap = new Map();
    const childrenMap = new Map();
    flatNodes.forEach((node) => {
      const id = String(node.id);
      const parentId = node.parentId != null ? String(node.parentId) : null;
      parentMap.set(id, parentId);
      if (!childrenMap.has(id)) childrenMap.set(id, new Set());
      if (parentId != null) {
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, new Set());
        childrenMap.get(parentId).add(id);
      }
    });
    majorTreeCache.value = { parentMap, childrenMap };
    return majorTreeCache.value;
  } catch (error) {
    console.error('加载专业树失败:', error);
    return null;
  }
}

// 获取一个专业ID的所有祖先ID（向上遍历）
function getAllAncestors(id, parentMap) {
  const ancestors = new Set();
  let current = String(id);
  while (parentMap.has(current)) {
    const parent = parentMap.get(current);
    if (!parent || parent === '-1' || parent === '0' || ancestors.has(parent)) break;
    ancestors.add(parent);
    current = parent;
  }
  return ancestors;
}

// 获取一个专业ID的所有后代ID（向下遍历）
function getAllDescendants(id, childrenMap) {
  const descendants = new Set();
  const queue = [String(id)];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = childrenMap.get(current);
    if (children) {
      children.forEach((child) => {
        if (!descendants.has(child)) {
          descendants.add(child);
          queue.push(child);
        }
      });
    }
  }
  return descendants;
}

// 扩展专业ID集合：包含自身、所有祖先和所有后代
function expandMajorIds(majorIds, treeData) {
  if (!treeData) return new Set(majorIds.map(String));
  const { parentMap, childrenMap } = treeData;
  const expanded = new Set();
  majorIds.forEach((id) => {
    const strId = String(id);
    expanded.add(strId);
    getAllAncestors(strId, parentMap).forEach((a) => expanded.add(a));
    getAllDescendants(strId, childrenMap).forEach((d) => expanded.add(d));
  });
  return expanded;
}

// 判断两个专业ID集合是否有交集（支持多层级匹配）
function hasMajorIntersection(internshipMajorIds, postTypeMajorIds) {
  if (!internshipMajorIds || internshipMajorIds.length === 0) return false;
  if (!postTypeMajorIds || postTypeMajorIds === '') return false;

  const postTypeIds = postTypeMajorIds.split('|').filter((id) => id && id.trim() !== '');

  // 如果专业树已加载，使用层级匹配：扩展项目专业ID到所有祖先和后代
  if (majorTreeCache.value) {
    const expandedInternshipIds = expandMajorIds(internshipMajorIds, majorTreeCache.value);
    return postTypeIds.some((id) => expandedInternshipIds.has(String(id)));
  }

  // 降级：精确匹配
  return internshipMajorIds.some((id) => postTypeIds.includes(String(id)));
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
          companyId: allNodeIds.join(','),
        };
        postTypeRegKey.value = {
          companyId: '()', // IN 操作符
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

// 显示的单位部门名称（用于编辑模式）
const displayDepartmentName = computed(() => {
  if (isCompanyUser.value) {
    return userDepartmentName.value;
  }
  // 编辑模式下，优先使用rowData中的companyName，其次使用currentInternship中的companyName
  if (isEditMode.value) {
    return (
      currentRowData.value?.companyName ||
      props.currentInternship?.companyName ||
      selectedDepartmentName.value
    );
  }
  return selectedDepartmentName.value;
});

// 显示的岗位类型名称（用于编辑模式）
const displayPostTypeName = computed(() => {
  return selectedPostTypeInfo.value?.name || '';
});

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

  // 如果已选中岗位类型，重新生成岗位名称（仅在新增模式下）
  if (!isEditMode.value && form.postTypeId && selectedPostTypeInfo.value) {
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
    // 仅在新增模式下自动填充
    if (!isEditMode.value) {
      form.code = '';
      form.name = '';
    }
    return;
  }

  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewBasePostType',
      searchKey: { id: postTypeId },
      reg: { id: '=' },
      pageInfo: { page: 1, size: 1 },
    });

    if (response && response.data && response.data.content && response.data.content.length > 0) {
      selectedPostTypeInfo.value = response.data.content[0];

      // 仅在新增模式下自动填充
      if (!isEditMode.value) {
        // 自动填充具体岗位编码（从岗位类型编码）
        if (selectedPostTypeInfo.value.code) {
          form.code = selectedPostTypeInfo.value.code;
        }

        // 自动生成具体岗位名称
        const generatedName = generatePostName();
        if (generatedName) {
          form.name = generatedName;
        }
      }
    } else {
      selectedPostTypeInfo.value = null;
      if (!isEditMode.value) {
        form.code = '';
        form.name = '';
      }
    }
  } catch (error) {
    console.error('加载岗位类型信息失败:', error);
    selectedPostTypeInfo.value = null;
    if (!isEditMode.value) {
      form.code = '';
      form.name = '';
    }
  }
}

// 监听岗位类型选择变化
watch(
  () => form.postTypeId,
  async (newVal) => {
    await loadPostTypeInfo(newVal);
    // 更新验证状态
    updateValidateState();
  }
);

// 更新验证状态（检查表单是否通过验证，不显示错误信息）
function updateValidateState() {
  if (!formPanelRef.value || !dlgBasicRef.value) return;

  nextTick(() => {
    if (formPanelRef.value && dlgBasicRef.value) {
      // 手动检查验证规则，不显示错误信息
      const rules = formRules.value;
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
watch(
  () => [form.allPersonNum, form.code, form.name, form.postTypeId],
  () => {
    updateValidateState();
  },
  { deep: true }
);

// 岗位类型的客户端过滤函数
function postTypeClientFilterFn(options) {
  if (!options || !Array.isArray(options)) return options;

  const internshipMajorIds = getInternshipMajorIds();
  if (internshipMajorIds.length === 0) {
    // 如果项目没有专业信息，不进行过滤
    return options;
  }

  // 过滤：只保留与项目专业有交集的岗位类型
  const filtered = options.filter((option) => {
    const postTypeMajorIds = option.majorIds || '';
    return hasMajorIntersection(internshipMajorIds, postTypeMajorIds);
  });

  // 如果当前选中的值不在过滤后的列表中，清空选中值
  if (form.postTypeId) {
    const exists = filtered.some((opt) => opt.id === form.postTypeId);
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
watch(
  () => form.departmentId,
  async (newVal, oldVal) => {
    if (!isCompanyUser.value) {
      if (newVal) {
        // 如果单位部门变化了，清空之前选中的岗位类型（仅在新增模式下）
        if (!isEditMode.value && oldVal !== undefined && oldVal !== null && oldVal !== newVal) {
          form.postTypeId = null;
        }
        // 查询单位名称
        try {
          const response = await listAPI.getSomeRecords({
            keyWords: 'BaseDepartment',
            searchKey: { id: newVal },
            reg: { id: '=' },
            pageInfo: { page: 1, size: 1 },
          });
          if (
            response &&
            response.data &&
            response.data.content &&
            response.data.content.length > 0
          ) {
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
        if (!isEditMode.value) {
          form.postTypeId = null;
        }
        selectedDepartmentName.value = '';
      }
    }
  }
);

// 监听用户信息变化（企业用户）
watch(
  () => {
    const schoolId = userInfo.value.schoolId || userInfo.value.departmentId;
    return schoolId;
  },
  async (newVal, oldVal) => {
    if (isCompanyUser.value) {
      if (newVal) {
        // 如果schoolId变化了，清空之前选中的岗位类型（仅在新增模式下）
        if (!isEditMode.value && oldVal !== undefined && oldVal !== null && oldVal !== newVal) {
          form.postTypeId = null;
        }
        // 企业用户的单位名称从 userDepartmentName 获取
        selectedDepartmentName.value = userDepartmentName.value;
        await updatePostTypeSearchKey();
      } else {
        // 如果没有schoolId，清空查询条件和岗位类型
        postTypeSearchKey.value = {};
        postTypeRegKey.value = {};
        if (!isEditMode.value) {
          form.postTypeId = null;
        }
        selectedDepartmentName.value = '';
      }
    }
  }
);

// 是否为只读模式
const isReadOnlyMode = ref(false);

// 自定义底部按钮：根据当前行数据判断是否显示
const showCustomFootButton = computed(() => {
  if (!props.customFootButton || !isReadOnlyMode.value) return false;
  if (typeof props.customFootButton.show === 'function') {
    return props.customFootButton.show(currentRowData.value);
  }
  return true;
});

async function handleCustomFootButton() {
  if (props.customFootButton?.action) {
    const result = await props.customFootButton.action(currentRowData.value);
    if (result) {
      dlgBasicRef.value?.beforeCloseDlg?.();
      emit('success');
    }
  }
}

// 判断是否可以编辑：只有待提交(SAVE=-1)或审核退回(BACK=3)状态可以编辑，且不是只读模式
const canEdit = computed(() => {
  if (isReadOnlyMode.value) {
    return false; // 只读模式下不能编辑
  }
  return (
    currentAuditStatus.value === null ||
    currentAuditStatus.value === undefined ||
    currentAuditStatus.value === CONSTANT.AUDIT_STATUS.SAVE ||
    currentAuditStatus.value === CONSTANT.AUDIT_STATUS.BACK
  );
});

// 对话框配置
const defaultProps = reactive({
  dlgTitle: computed(() => {
    if (false) {
      // 审核模式
      return '审核实习岗位';
    } else if (isEditMode.value) {
      // 编辑模式：根据是否可以编辑决定标题
      return canEdit.value ? '编辑实习岗位' : '查看实习岗位';
    } else {
      // 新增模式
      return '新增实习岗位';
    }
  }),
  width: '50%',
  formRules: formRules,
  footButtons: computed(() => {
    return {
      confirm: { show: canEdit.value, name: '保 存', type: 'primary' },
      cancel: { show: true, name: '取 消', type: '' },
      submit: { show: canEdit.value, name: '提 交', type: 'warning' },
      repeatAdd: { show: false }, // 隐藏继续添加按钮
    };
  }),
});

/**
 * 与 DlgTeacherSelect.saveRelIntershipUserData / 校内导师安排一致：
 * 通过 listAPI.editOneNode 写入 MainVerifyProcess（待提交），并带上审核人
 */
async function ensureMainVerifyProcessForNewPost(relationId) {
  const processId = props.currentInternship?.realId ?? '';
  const verifyRoleId = props.currentInternship?.verifyFirstRoleId;
  const createUserId = store.getters.userInfo?.id;
  if (!processId || !relationId || !createUserId) {
    return { success: false, message: '缺少流程参数', mainVerifyProcessId: null };
  }

  let verifyResp;
  try {
    verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
      internshipId: props.currentInternship?.internshipId,
    });
  } catch (e) {
    console.error('查询审核人失败:', e);
    return { success: false, message: '查询审核人失败', mainVerifyProcessId: null };
  }

  const activateParams = {
    processId,
    relationId,
    tableName: 'MainInternshipPost',
    createUserId,
    isAudit: CONSTANT.AUDIT_STATUS.SAVE,
    verifyUserId: verifyResp?.data ?? verifyResp,
  };

  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        processId: activateParams.processId,
        relationId: activateParams.relationId,
        tableName: activateParams.tableName,
      },
      pageInfo: { page: 1, size: 1 },
    });
    const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
    if (existingRecords.length > 0) {
      return { success: true, mainVerifyProcessId: existingRecords[0].id };
    }
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', activateParams);
    if (!resInfo || resInfo.message !== 'successful') {
      return {
        success: false,
        message: resInfo?.message || '创建审核流程失败',
        mainVerifyProcessId: null,
      };
    }
    return { success: true, mainVerifyProcessId: resInfo.data?.id };
  } catch (error) {
    console.error('创建 MainVerifyProcess 失败:', error);
    return { success: false, message: '创建审核流程失败', mainVerifyProcessId: null };
  }
}

/** 与 useAssignmentActions.handleSubmitClick 一致：无需审核则直接通过，否则进入待审核 */
function getSubmitAuditStatus() {
  const verifyTypeId = currentRowData.value?.verifyTypeId ?? props.currentInternship?.verifyTypeId;
  return verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
    ? CONSTANT.AUDIT_STATUS.PASS
    : CONSTANT.AUDIT_STATUS.SUBMIT;
}

// 保存数据到 MainInternshipPost 表（公共方法）
async function savePostData() {
  try {
    // 表单验证
    if (formPanelRef.value) {
      const valid = await formPanelRef.value.validate();
      if (!valid) {
        ElMessage.warning('请填写完整信息');
        return { success: false };
      }
    }

    // 如果有实习项目ID，添加到表单数据中
    // 编辑模式下优先从 currentRowData 获取，否则从 props.currentInternship 获取
    const internshipId = isEditMode.value
      ? currentRowData.value?.internshipId || props.currentInternship?.internshipId
      : props.currentInternship?.internshipId;
    if (!internshipId) {
      ElMessage.warning('请先选择实习项目');
      return { success: false };
    }

    // 构建保存的数据对象
    const saveData = {
      internshipId: internshipId,
      code: form.code || '',
      name: form.name || '',
      allPersonNum: form.allPersonNum,
      postTypeId: form.postTypeId,
      // 新增时设置 currentVerifyTypeId（Merge 视图从此表读取以计算 currentRoleName）
      ...(!isEditMode.value
        ? {
            currentVerifyTypeId:
              props.currentInternship?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
                ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
                : CONSTANT.VERIFY_LEVEL.ONE_VERIFY,
          }
        : {}),
    };

    // MainInternshipPost 主键：编辑模式 / 新增后同一会话再次保存
    if (isEditMode.value) {
      const postId = currentPostId.value || currentRowData.value?.internshipPostId;
      if (postId) {
        saveData.id = postId;
      }
    } else if (currentPostId.value) {
      saveData.id = currentPostId.value;
    }

    // 调用保存接口，保存到 MainInternshipPost 表
    const response = await listAPI.editOneNode('MainInternshipPost', saveData);

    if (response && response.message === 'successful' && response.data?.id) {
      if (!isEditMode.value) {
        currentPostId.value = response.data.id;
      }
    }

    // 新增保存成功后，确保 MainVerifyProcess 有一条待提交记录（与 DlgTeacherSelect 一致）
    if (
      !isEditMode.value &&
      response &&
      response.message === 'successful' &&
      response.data &&
      response.data.id
    ) {
      const verifyRes = await ensureMainVerifyProcessForNewPost(response.data.id);
      if (!verifyRes.success) {
        ElMessage.error(verifyRes.message || '保存失败');
        return { success: false };
      }
      if (verifyRes.mainVerifyProcessId != null) {
        mainVerifyProcessRecordId.value = verifyRes.mainVerifyProcessId;
      }
    }

    if (response && response.data) {
      return { success: true, saveData }; // 返回成功状态和数据
    } else {
      ElMessage.error('保存失败');
      return { success: false };
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
    return { success: false };
  }
}

// 处理确认保存
async function handleConfirm() {
  const result = await savePostData();
  if (result.success) {
    ElMessage.success(isEditMode.value ? '修改成功' : '保存成功');
    emit('success', result.saveData);
    emit('close-dialog');
    return true; // 返回 true 表示保存成功，允许关闭对话框
  }
  return false;
}

// 处理关闭对话框
function handleCloseDialog() {
  emit('close-dialog');
}

// 更新 MainVerifyProcess 表的审核状态（与 useAssignmentActions.updateVerifyProcess 一致）
async function updateVerifyProcess(isAudit) {
  try {
    const id = currentRowData.value?.id ?? mainVerifyProcessRecordId.value;
    if (!id) {
      ElMessage.warning('无法获取流程记录ID');
      return false;
    }

    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id,
      isAudit,
    });
    if (resInfo && resInfo.message === 'successful') {
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
      return false;
    }
  } catch (error) {
    console.error('更新审核状态失败:', error);
    return false;
  }
}

// 处理提交按钮点击
async function handleSubmit() {
  try {
    await ElMessageBox.confirm('提交后将进入审核流程，信息将不可修改，确定提交吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return false; // 用户取消提交
  }

  // 先调用保存功能（直接调用 savePostData，不关闭对话框）
  const saveResult = await savePostData();
  if (!saveResult.success) {
    return false;
  }

  const submitStatus = getSubmitAuditStatus();
  const updateSuccess = await updateVerifyProcess(submitStatus);
  if (updateSuccess) {
    ElMessage.success(
      submitStatus === CONSTANT.AUDIT_STATUS.PASS
        ? `提交成功，${CONSTANT.AUDIT_STATUS.PASSNAME}`
        : `提交成功，${CONSTANT.AUDIT_STATUS.SUBMITNAME}`
    );
    emit('success', saveResult.saveData);
    emit('close-dialog');
    return true; // 返回 true，DlgBasic 会自动关闭对话框
  }
  return false;
}

// 显示对话框
async function showDialog(val, formData = {}, rowData = null, readOnly = false) {
  // 设置只读模式
  isReadOnlyMode.value = readOnly;
  // 判断是否为编辑模式
  isEditMode.value = !!(rowData && (rowData.id || rowData.relationId || rowData.internshipPostId));
  // 保存当前行数据（用于获取companyName等字段）
  currentRowData.value = rowData;
  // 保存当前行的审核状态
  currentAuditStatus.value = rowData?.isAudit;
  mainVerifyProcessRecordId.value = rowData?.id ?? null;

  // 重置表单
  Object.keys(form).forEach((key) => {
    delete form[key];
  });

  // 加载专业树和项目专业ID（用于多层级匹配）
  await Promise.all([loadMajorTree(), loadInternshipMajorIds()]);

  // 如果是编辑模式或审核模式，从当前行数据加载岗位信息
  if (isEditMode.value && rowData) {
    // 获取岗位ID（优先使用internshipPostId，其次relationId）
    const postId = rowData.internshipPostId || rowData.relationId;
    currentPostId.value = postId;

    if (postId) {
      try {
        // 从MainInternshipPost表加载完整数据
        const response = await listAPI.getSomeRecords({
          keyWords: 'MainInternshipPost',
          searchKey: { id: postId },
          reg: { id: '=' },
          pageInfo: { page: 1, size: 1 },
        });

        if (
          response &&
          response.data &&
          response.data.content &&
          response.data.content.length > 0
        ) {
          const postData = response.data.content[0];
          // 填充表单数据
          form.code = postData.code || '';
          form.name = postData.name || '';
          form.allPersonNum = postData.allPersonNum;
          form.postTypeId = postData.postTypeId;
          form.departmentId = postData.departmentId;
          // 从 rowData 中获取已经报名人数
          form.nowPersonNum = rowData.nowPersonNum;

          // 加载岗位类型信息（用于显示岗位类型名称）
          if (postData.postTypeId) {
            await loadPostTypeInfo(postData.postTypeId);
          }

          // 如果不是企业用户，查询单位名称（用于显示）
          if (!isCompanyUser.value && postData.departmentId) {
            try {
              const deptResponse = await listAPI.getSomeRecords({
                keyWords: 'BaseDepartment',
                searchKey: { id: postData.departmentId },
                reg: { id: '=' },
                pageInfo: { page: 1, size: 1 },
              });
              if (
                deptResponse &&
                deptResponse.data &&
                deptResponse.data.content &&
                deptResponse.data.content.length > 0
              ) {
                selectedDepartmentName.value = deptResponse.data.content[0].name || '';
              }
            } catch (error) {
              console.error('获取单位名称失败:', error);
            }
          }
        }
      } catch (error) {
        console.error('加载岗位数据失败:', error);
        ElMessage.error('加载岗位数据失败');
        return;
      }
    }
  } else {
    // 新增模式：使用传入的formData
    Object.assign(form, formData);
    currentPostId.value = null;
    // 新增模式下，审核状态为 null，可以编辑
    currentAuditStatus.value = null;

    // 如果是企业用户，自动设置单位ID和单位名称
    if (val && isCompanyUser.value && userInfo.value.departmentId) {
      form.departmentId = userInfo.value.departmentId;
      selectedDepartmentName.value = userDepartmentName.value;
    } else {
      selectedDepartmentName.value = '';
    }

    // 只有在有schoolId的情况下才更新岗位类型的查询条件
    const schoolId = isCompanyUser.value
      ? userInfo.value.schoolId || userInfo.value.departmentId
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
            pageInfo: { page: 1, size: 1 },
          });
          if (
            response &&
            response.data &&
            response.data.content &&
            response.data.content.length > 0
          ) {
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
  }

  // 清空表单验证状态
  await nextTick();
  if (formPanelRef.value) {
    formPanelRef.value.clearValidate();
  }

  // 调用 DlgBasic 的 showDialog 方法
  dlgBasicRef.value?.showDialog(val, form);

  // 对话框打开后，等待DOM完全渲染
  await nextTick();
  await nextTick();

  // 如果是编辑模式且非企业用户，确保SimpleTreeSelect组件已正确初始化
  if (isEditMode.value && !isCompanyUser.value && form.departmentId && departmentSelectRef.value) {
    // 等待SimpleTreeSelect组件初始化完成
    setTimeout(async () => {
      // 可能需要手动触发组件的更新
      if (departmentSelectRef.value) {
        // SimpleTreeSelect组件应该会自动响应form.departmentId的变化
        // 这里只是确保有足够的时间让组件初始化
      }
    }, 200);
  }

  // 延迟更新验证状态（确保DOM已渲染）
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
  margin-top: 16px;
  padding: 12px;
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
  margin-top: 16px;
}

/* 防止label换行 */
:deep(.el-form-item__label) {
  white-space: nowrap;
}

.audit-section-top {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

/* 减少一些间距，让内容更紧凑 */
.specific-post-section {
  margin-top: 16px;
}

.post-type-info {
  margin-top: 16px;
  padding: 12px;
}

/* 非审核模式下，增加对话框内容区域的最大高度，避免出现滚动条 */
/* 当对话框高度设置为 80vh 时，增加 body 的最大高度 */
:deep(.el-dialog[style*='height']) .el-dialog__body {
  max-height: calc(80vh - 120px) !important; /* 减去 header 和 footer 的高度 */
}
</style>

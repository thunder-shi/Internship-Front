<template>
  <div class="cascader-wrapper" v-loading="loading">
    <el-cascader v-if="!isInitializing" :key="componentKey" ref="cascaderRef" v-model="currentVal" class="cascader" :options="options" :props="cascaderProps" :placeholder="placeholder" :disabled="disabled" :size="size" :show-all-levels="true" clearable @change="handleChange" @visible-change="handleVisibleChange">
      <template #default="{ node, data }">
        <span>{{ data.name }}</span>
      </template>
    </el-cascader>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import treeAPI from '@/api/tree';
import _ from 'lodash';

const props = defineProps({
  modelValue: { type: [Number, Array], default: () => null },
  value: { type: [Number, Array], default: () => null },
  field: { type: String, default: '' },
  keyWords: { type: String, default: '' },
  placeholder: { type: String, default: '请选择' },
  checkStrictly: { type: Boolean, default: true },
  size: { type: String, default: '' },
  searchKeys: { type: Object, default: () => ({}) },
  lazy: { type: Boolean, default: true },
  multiple: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'update-value']);

const cascaderRef = ref(null);
const options = ref([]);
const loading = ref(false);
const isInitializing = ref(true); // 新增：专门用于控制初始化状态
const componentKey = ref(0);
const currentVal = ref([]);
const isDropdownVisible = ref(false); // 跟踪下拉框是否打开
const pendingUpdate = ref(false); // 标记是否有待处理的更新
const isFirstInit = ref(true); // 标记是否是第一次初始化

const actualValue = computed(() => (props.modelValue != null ? props.modelValue : props.value));

const cascaderProps = computed(() => ({
  label: 'name',
  value: 'id',
  children: 'children',
  checkStrictly: props.checkStrictly,
  lazy: props.lazy,
  lazyLoad: onLazyLoad,
  multiple: props.multiple,
  emitPath: true
}));

// --- 核心逻辑 ---

async function initData() {
  if (loading.value) return;
  loading.value = true;
  isInitializing.value = true; // 开始初始化，组件暂时隐藏

  try {
    const targetValue = actualValue.value;
    
    // 2. 加载树结构（这里会请求一次根节点，填充 options）
    if (!props.lazy) {
      await loadFullTree();
    } else {
      // 多选模式下，需要加载所有选中项的路径
      if (props.multiple && Array.isArray(targetValue) && targetValue.length > 0) {
        // 加载第一个选中项的路径，其他路径会在懒加载时自动加载
        const firstId = targetValue[0];
        const res = await treeAPI.getAllParentIndex(props.keyWords, firstId);
        if (res.data && res.data.length > 0) {
          const firstPathIds = res.data.map((item) => item.id).reverse();
          await loadPartialTree(firstPathIds);
        } else {
          await loadPartialTree([]);
        }
      } else if (!props.multiple && targetValue) {
        // 单选模式
        const res = await treeAPI.getAllParentIndex(props.keyWords, targetValue);
        if (res.data && res.data.length > 0) {
          const pathIds = res.data.map((item) => item.id).reverse();
      await loadPartialTree(pathIds);
        } else {
          await loadPartialTree([]);
        }
      } else {
        await loadPartialTree([]);
      }
    }

    // 3. 设置选中值
    if (props.multiple) {
      // 多选模式：需要为每个选中的ID获取路径
      if (Array.isArray(targetValue) && targetValue.length > 0) {
        const pathPromises = targetValue.map(async (id) => {
          try {
            const res = await treeAPI.getAllParentIndex(props.keyWords, id);
            if (res.data && res.data.length > 0) {
              return res.data.map((item) => item.id).reverse();
            }
            return [id]; // 如果获取路径失败，至少返回ID本身
          } catch (error) {
            console.error(`Failed to get path for id ${id}:`, error);
            return [id];
          }
        });
        const paths = await Promise.all(pathPromises);
        currentVal.value = paths;
      } else {
        currentVal.value = [];
      }
    } else {
      // 单选模式
      if (targetValue) {
        const res = await treeAPI.getAllParentIndex(props.keyWords, targetValue);
        if (res.data && res.data.length > 0) {
          currentVal.value = res.data.map((item) => item.id).reverse();
        } else {
          currentVal.value = [targetValue];
        }
      } else {
        currentVal.value = [];
      }
    }

    // 4. (可选) 只有在某些极端情况下才需要更新 Key
    // componentKey.value++;

  } catch (error) {
    console.error('Cascader init failed:', error);
  } finally {
    // 关键：数据准备好了，loading 结束，isInitializing 设为 false
    // 此时 el-cascader 会被 v-if 渲染出来，并触发它的第一次 lazyLoad
    loading.value = false;
    isInitializing.value = false;
  }
}

/**
 * 懒加载回调
 */
async function onLazyLoad(node, resolve) {
  const { level, value } = node;
  const parentId = level === 0 ? -1 : value;

  // 关键修改 2: 拦截根节点请求
  // 当 v-if 变为 true，组件渲染触发 lazyLoad(level 0)。
  // 此时 initData 已经把 options 填满了。
  // 我们直接返回 options.value，避免再次发请求。
  if (level === 0 && options.value.length > 0) {
    return resolve(options.value);
  }

  // 正常加载子节点
  const nodes = await fetchNodes(parentId);
  resolve(nodes);
}

// --- 下面是辅助函数，逻辑保持不变 ---

async function loadFullTree() {
  const res = await treeAPI.getAllNodes({
    keyWords: props.keyWords,
    virtualRootFlag: false,
    searchKey: props.searchKeys,
    lazy: false,
  });
  options.value = res.data || [];
}

async function loadPartialTree(pathIds) {
  // 加载根节点
  const rootRes = await fetchNodes(-1);
  let currentLevelOptions = rootRes;
  options.value = currentLevelOptions;

  if (!pathIds || pathIds.length === 0) return;

  for (let i = 0; i < pathIds.length; i++) {
    const currentNodeId = pathIds[i];
    const targetNode = currentLevelOptions.find(opt => String(opt.id) === String(currentNodeId));

    if (!targetNode) break;

    if (i < pathIds.length - 1) {
       const children = await fetchNodes(currentNodeId);
       targetNode.children = children;
       currentLevelOptions = children;
    }
  }
}

async function fetchNodes(parentId) {
  try {
    const res = await treeAPI.getAllNodes({
      keyWords: props.keyWords,
      virtualRootFlag: false,
      searchKey: props.searchKeys,
      lazy: true,
      parentId: parentId
    });
    return (res.data || []).map(item => ({
      ...item,
      leaf: item.childNum === 0
    }));
  } catch (e) {
    return [];
  }
}

function handleChange(val) {
  if (!val || val.length === 0) {
    const emptyValue = props.multiple ? [] : null;
    emit('update:modelValue', emptyValue);
    emit('update-value', emptyValue, props.field, []);
    return;
  }
  
  if (props.multiple) {
    // 多选模式：val 是二维数组，每个元素是一个路径数组
    // 提取每个路径的最后一个ID
    const selectedIds = val.map(path => path[path.length - 1]);
    const checkedNodes = cascaderRef.value?.getCheckedNodes() || [];
    emit('update:modelValue', selectedIds);
    emit('update-value', selectedIds, props.field, checkedNodes);
    // 多选模式下，currentVal 已经由 el-cascader 自动更新，不需要手动更新
  } else {
    // 单选模式：val 是单个路径数组
  const lastId = val[val.length - 1];
  const checkedNodes = cascaderRef.value?.getCheckedNodes();
  emit('update:modelValue', lastId);
  emit('update-value', lastId, props.field, checkedNodes);
  }
}

function handleVisibleChange(visible) {
  isDropdownVisible.value = visible;
  
  // 下拉框关闭时，如果有待处理的更新，则执行更新
  if (!visible && pendingUpdate.value) {
    pendingUpdate.value = false;
    // 延迟一下，确保 el-cascader 已经完成内部状态更新
    setTimeout(() => {
      syncCurrentVal();
    }, 100);
  }
}

// 同步 currentVal 到实际值（不触发 watch）
async function syncCurrentVal() {
  const targetValue = actualValue.value;
  
  if (props.multiple) {
    // 多选模式：需要为每个选中的ID获取路径
    if (Array.isArray(targetValue) && targetValue.length > 0) {
      const pathPromises = targetValue.map(async (id) => {
        try {
          const res = await treeAPI.getAllParentIndex(props.keyWords, id);
          if (res.data && res.data.length > 0) {
            return res.data.map((item) => item.id).reverse();
          }
          return [id]; // 如果获取路径失败，至少返回ID本身
        } catch (error) {
          console.error(`Failed to get path for id ${id}:`, error);
          return [id];
        }
      });
      const paths = await Promise.all(pathPromises);
      currentVal.value = paths;
    } else {
      currentVal.value = [];
    }
  } else {
    // 单选模式
    if (targetValue) {
      const res = await treeAPI.getAllParentIndex(props.keyWords, targetValue);
      if (res.data && res.data.length > 0) {
        currentVal.value = res.data.map((item) => item.id).reverse();
      } else {
        currentVal.value = [targetValue];
      }
    } else {
      currentVal.value = [];
    }
  }
}

watch(
  [() => actualValue.value, () => props.searchKeys],
  async ([newVal, newParams], [oldVal, oldParams]) => {
    // searchKeys 变化时，总是需要重新初始化
    if (!_.isEqual(newParams, oldParams)) {
      isFirstInit.value = false;
      await initData();
      return;
    }
    
    // 值变化时
    if (newVal === oldVal) return;
    
    // 如果是第一次初始化，且值从 undefined/null 变为数组（多选模式）或值（单选模式）
    // 说明是初始加载数据，直接初始化，不跳过
    if (isFirstInit.value) {
      isFirstInit.value = false;
      await initData();
      return;
    }
    
    // 如果是多选模式且下拉框正在打开，不重新初始化（避免下拉框关闭）
    // el-cascader 会自己维护选中状态，我们只需要在关闭时同步一次
    if (props.multiple && isDropdownVisible.value) {
      pendingUpdate.value = true;
      // 不调用任何更新函数，让 el-cascader 自己处理
      return;
    }
    
    // 否则立即更新（单选模式或下拉框关闭时）
    await initData();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.cascader-wrapper {
  width: 100%;
}
.cascader {
  width: 100%;
}
</style>

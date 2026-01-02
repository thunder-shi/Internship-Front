<template>
  <div class="cascader-wrapper" v-loading="loading">
    <el-cascader
      v-if="!isInitializing"
      :key="componentKey"
      ref="cascaderRef"
      v-model="currentVal"
      class="cascader"
      :options="options"
      :props="cascaderProps"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="size"
      :show-all-levels="true"
      clearable
      @change="handleChange"
      @visible-change="handleVisibleChange"
    >
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
  modelValue: { type: Number, default: () => null },
  value: { type: Number, default: () => null },
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
    const targetId = actualValue.value;
    let pathIds = [];

    // 1. 获取路径
    if (targetId) {
      const res = await treeAPI.getAllParentIndex(props.keyWords, targetId);
      if (res.data && res.data.length > 0) {
        pathIds = res.data.map((item) => item.id).reverse();
      }
    }

    // 2. 加载树结构（这里会请求一次根节点，填充 options）
    if (!props.lazy) {
      await loadFullTree();
    } else {
      await loadPartialTree(pathIds);
    }

    // 3. 设置选中值
    currentVal.value = pathIds;

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
    emit('update:modelValue', null);
    emit('update-value', null, props.field, []);
    return;
  }
  const lastId = val[val.length - 1];
  const checkedNodes = cascaderRef.value?.getCheckedNodes();
  emit('update:modelValue', lastId);
  emit('update-value', lastId, props.field, checkedNodes);
}

function handleVisibleChange(visible) {
    //
}

watch(
  [() => actualValue.value, () => props.searchKeys],
  async ([newVal, newParams], [oldVal, oldParams]) => {
    if (newVal === oldVal && _.isEqual(newParams, oldParams)) return;
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

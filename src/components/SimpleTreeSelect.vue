<template>
  <div v-loading="loading" class="cascader-wrapper">
    <el-cascader
      v-if="isShowInfo"
      ref="cascader"
      v-model="arrVal"
      class="cascader"
      :multiple="multiple"
      :append-to-body="false"
      :size="size"
      :options="options"
      :props="cascaderProps"
      :placeholder="placeholder"
      :disabled="disabled"
      clearable=""
      @change="handleChange"
    />
  </div>
</template>
<script setup>
// cascader没有loading属性
import { ref, watch, nextTick, computed } from 'vue';
import treeAPI from '@/api/tree';
import _ from 'lodash';

const props = defineProps({
  modelValue: { type: Number, default: () => null }, // Vue 3 v-model 标准 prop
  value: { type: Number, default: () => null }, // 父级 v-model 绑定值（后端返回的 id 值，兼容旧代码）
  field: { type: String, default: '' },
  keyWords: { type: String, default: '' }, // 搜索级联选项关键字
  placeholder: { type: String, default: '请选择' },
  checkStrictly: { type: Boolean, default: true }, // 是否严格的遵守父子节点不互相关联
  size: { type: String, default: '' },
  searchKeys: { type: Object, default: () => ({}) },
  lazy: { type: Boolean, default: true },
  multiple: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'update-value']);

const cascader = ref(null);
const isShowInfo = ref(true);
const arrVal = ref([]);
const valTemp = ref([]);
const options = ref([]); // 回显备选项
const loading = ref(true);

const cascaderProps = computed(() => ({
  label: 'name',
  value: 'id',
  children: 'children',
  checkStrictly: props.checkStrictly,
  lazy: props.lazy,
  lazyLoad: lazyLoad,
}));

// 获取实际的值：优先使用 modelValue（Vue 3 v-model），否则使用 value（兼容旧代码）
const actualValue = computed(() => (props.modelValue != null ? props.modelValue : props.value));

async function changeSelection() {
  loading.value = true;
  if (actualValue.value) {
    const res = await treeAPI.getAllParentIndex(props.keyWords, actualValue.value);
    if (res.data && res.data.length > 0) {
      valTemp.value = res.data.map((item) => item.id).reverse();
    } else {
      valTemp.value = [];
    }
  } else {
    valTemp.value = [];
  }
  await initOptions();

  // 设置 arrVal，确保 options 加载完成后再设置
  await nextTick();

  if (props.lazy) {
    isShowInfo.value = false;
    arrVal.value = [...valTemp.value];
    await nextTick();
    isShowInfo.value = true;
  } else {
    // 非懒加载模式下，也需要先隐藏再显示来强制重新渲染
    isShowInfo.value = false;
    arrVal.value = [...valTemp.value];
    await nextTick();
    isShowInfo.value = true;
  }

  // 再次等待 DOM 更新，确保 cascader 能正确显示
  await nextTick();
  loading.value = false;
}

async function initOptions(searchKey, sort) {
  const searchKeysToUse = searchKey != null ? searchKey : props.searchKeys;
  const sortToUse = sort != null ? sort : props.sort;
  try {
    if (!props.lazy) {
      // 不是懒加载
      // 非懒加载模式下，如果 options 为空，就重新加载
      // 为了确保数据完整，每次 changeSelection 时都重新加载
      const res = await treeAPI.getAllNodes({
        keyWords: props.keyWords,
        virtualRootFlag: false,
        searchKey: searchKeysToUse,
        lazy: false,
        sort: sortToUse
      });
      options.value = res.data || [];
    } else {
      // 懒加载
      var arrNow = _.cloneDeep(valTemp.value);
      arrNow.unshift(-1);
      arrNow.pop();
      arrNow.reverse();
      var res = [];
      var lastRes = [];
      var lastParent = 0;
      options.value = [];
      for (const element of arrNow) {
        res = await treeAPI.getAllNodes({
          keyWords: props.keyWords,
          virtualRootFlag: false,
          searchKey: searchKeysToUse,
          lazy: true,
          parentId: element,
        });
        res = res.data;
        if (lastParent !== 0) {
          res.forEach((el) => {
            if (el.id === element) {
              el.children.push(lastRes);
            }
          });
        }
        lastRes = _.cloneDeep(res);
        lastParent = element;
      }
      options.value = res;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getCurrentLevels(parentId) {
  try {
    const res = await treeAPI.getAllNodes({
      keyWords: props.keyWords,
      virtualRootFlag: false,
      searchKey: props.searchKeys,
      lazy: props.lazy,
      parentId: parentId,
    });
    const nodes = res.data.map((item) => ({
      ...item,
      id: item.id,
      name: item.name,
      parentId: parentId,
      leaf: item.childNum === 0, // 判断是否为末尾节点
    }));
    return nodes;
  } catch (error) {
    return [];
  }
}

// 懒加载
async function lazyLoad(node, resolve) {
  const { level } = node;
  const parentId = level ? node.value : -1;
  try {
    const nodes = await getCurrentLevels(parentId);
    resolve(nodes);
    // changeSelection()
  } catch (error) {
    resolve([]);
  }
}

// 接口入参需求为最后一级 id
function handleChange(val) {
  const lastId = val[val.length - 1];
  // 同时触发 update:modelValue（Vue 3 v-model）和 update-value（兼容旧代码）
  const node = cascader.value.getCheckedNodes();
  emit('update:modelValue', lastId);
  emit('update-value', lastId, props.field, node);
}

function handleFocus(val) {
  console.log(val);
}

// Watch value prop (同时监听 modelValue 和 value)
watch(
  () => actualValue.value,
  async (val) => {
    await changeSelection();
  },
  { deep: true, immediate: true }
);

defineOptions({
  name: 'SimpleTreeSelect',
});
</script>

<style scoped>
.cascader-wrapper {
  width: 100%;
}
.cascader {
  width: 100%;
}
</style>

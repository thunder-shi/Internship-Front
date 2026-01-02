<template>
  <div class="simple-select-wrapper">
    <el-select
      v-model="selectValue"
      v-loading="loading"
      class="simple-select"
      :placeholder="placeholder"
      :size="size"
      :multiple="multiple"
      :disabled="disabled"
      :filterable="filterable"
      @change="handleChange"
    >
      <el-option
        v-for="item in options"
        :key="item.id"
        :label="item.name"
        :value="item.id"
        :value-key="item.id"
      />
    </el-select>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue' // 删除 onMounted, nextTick
import listAPI from '@/api/list'
import _ from 'lodash'

const props = defineProps({
  modelValue: { type: [Number, String, Array], default: () => null },
  value: { type: [Number, String, Array], default: () => null },
  field: { type: String, default: '' },
  keyWords: { type: String, default: '' },
  multiple: { type: Boolean, default: () => false },
  placeholder: { type: String, default: '请选择' },
  searchKey: { type: Object, default: () => ({}) },
  regKey: { type: Object, default: () => ({}) },
  sortJson: { type: Object, default: () => ({ properties: 'TheOrder', direction: 'ASC' }) },
  size: { type: String, default: '' },
  filterable: { type: Boolean, default: false },
  autoInit: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  autoSelect: { type: Boolean, default: true },
  changeLabel: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'update-value', 'init-finish'])

const options = ref([])
const loading = ref(false)

// 获取实际的值
const actualValue = computed(() => props.modelValue != null ? props.modelValue : props.value)
const selectValue = ref(props.multiple && actualValue.value == null ? [] : actualValue.value)

// 辅助函数：判断两个值是否相等（深度比较）
const isEqual = (a, b) => {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => item === b[index])
  }
  return false
}

async function changeSelection(val) {
  // 1. 如果 options 为空且没在加载，尝试加载 (防止死循环调用)
  if (options.value.length === 0 && !loading.value && props.autoInit) {
    await initOptions()
  }

  // 如果加载后依然为空，直接返回，避免后续报错
  if (options.value.length === 0) return

  let targetVal = val
  if (targetVal === undefined || targetVal === null) {
    targetVal = actualValue.value
  }

  if (targetVal != null) {
    if (props.multiple && Array.isArray(targetVal)) {
      // 多选模式：匹配并转换类型
      const optionIds = options.value.map(item2 => String(item2.id))
      const matchedValues = targetVal.filter(item => {
        return optionIds.includes(String(item))
      }).map(item => {
        const matchedOption = options.value.find(opt => String(opt.id) === String(item))
        return matchedOption ? matchedOption.id : item
      })
      selectValue.value = matchedValues
    } else {
      // 单选模式
      const optionIds = options.value.map(item => String(item.id))
      const valueStr = String(targetVal)
      if (optionIds.includes(valueStr)) {
        const matchedOption = options.value.find(item => String(item.id) === valueStr)
        selectValue.value = matchedOption ? matchedOption.id : targetVal
      } else {
        selectValue.value = targetVal
      }
    }
  } else {
    // 处理 null 情况
    if (props.multiple) {
      selectValue.value = []
    } else {
      selectValue.value = null
    }
  }
}

async function initOptions() {
  // 【关键修改1】请求锁：如果正在加载，阻止重复请求
  if (loading.value) return

  loading.value = true
  try {
    const resp = await listAPI.getSomeRecords({
      keyWords: props.keyWords,
      searchKey: props.searchKey,
      sort: props.sortJson,
      reg: props.regKey
    })
    options.value = _.cloneDeep(resp.data.content)
    if (props.changeLabel !== '') {
      options.value.forEach(item => {
        item.name = item[props.changeLabel]
      })
    }
    emit('init-finish', props.field, options.value)

    // 数据加载回来后，立即进行一次值的匹配
    // 这里直接调用逻辑，不需要再去触发 changeSelection 导致潜在的递归
    if (actualValue.value != null || (props.multiple && options.value.length > 0)) {
        // 复用 changeSelection 的核心匹配逻辑，或者简单地调用它
        // 由于 options 已经有值了，调用 changeSelection 不会再次触发 initOptions
        await changeSelection(actualValue.value)
    }

    // AutoSelect 逻辑
    if (props.autoSelect) {
      if (!props.multiple) {
        if ((selectValue.value == null || selectValue.value === '') && options.value.length > 0) {
          selectValue.value = options.value[0].id
          handleChange(selectValue.value) // 触发更新
        }
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

function handleChange(val) {
  emit('update:modelValue', val)
  if (props.multiple && Array.isArray(val)) {
    const matchedOptions = options.value.filter(opt => val.includes(opt.id))
    emit('update-value', val, props.field, matchedOptions)
  } else {
    const matchedOptions = options.value.filter(opt => opt.id === val)
    emit('update-value', val, props.field, matchedOptions)
  }
}

// Watch modelValue/value
// 【关键修改2】移除 immediate: true
// 初始值的匹配由 initOptions 完成后的回调处理，这里只监听后续变化
watch(() => actualValue.value, async (val, oldVal) => {
  if (isEqual(val, oldVal)) return

  // 如果 options 还没加载且允许自动加载，则加载（针对后续动态改变 value 的情况）
  if (options.value.length === 0 && props.autoInit) {
      await initOptions()
  } else {
      await changeSelection(val)
  }
}, { deep: true }) // 移除 immediate: true

// Watch searchKey prop
// 【关键修改3】保持 immediate: true，作为组件初始化的唯一入口
// 当 props.searchKey 初始化时，触发第一次请求
watch(() => props.searchKey, async () => {
  if (props.autoInit) {
    await initOptions()
    // initOptions 内部会处理赋值，这里不需要再调用 changeSelection
  }
}, { deep: true, immediate: true })

// 【关键修改4】移除 onMounted
// 因为 searchKey 的 watcher 带有 immediate: true，组件挂载时会自动执行一次
// 删除 onMounted 避免双重触发
</script>

<style scoped>
.simple-select-wrapper {
  width: 100%;
}
.simple-select {
  width: 100%;
}
</style>

<template>
  <div class="simple-select-wrapper">
    <el-select v-model="selectValue" v-loading="loading" class="simple-select" :placeholder="placeholder" :size="size" :multiple="multiple" :disabled="disabled" :filterable="filterable" @change="handleChange">
      <el-option v-for="item in options" :key="item.id" :label="item.name" :value="item.id" :value-key="item.id" />
    </el-select>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
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
// 获取实际的值：优先使用 modelValue（v-model），否则使用 value
const actualValue = computed(() => props.modelValue != null ? props.modelValue : props.value)
// 多选模式下，如果初始值为 null，应该设置为空数组
const selectValue = ref(props.multiple && actualValue.value == null ? [] : actualValue.value)

async function changeSelection(val) {
  // 如果 options 为空，先加载 options
  if (options.value.length === 0) {
    await initOptions()
  }
  
  if (val != null) {
    // 如果传入了明确的 val，直接使用（但需要确保类型匹配）
    if (props.multiple && Array.isArray(val) && options.value.length > 0) {
      // 多选模式：匹配并转换类型
      const optionIds = options.value.map(item2 => String(item2.id))
      const matchedValues = val.filter(item => {
        return optionIds.includes(String(item))
      }).map(item => {
        const matchedOption = options.value.find(opt => String(opt.id) === String(item))
        return matchedOption ? matchedOption.id : item
      })
      selectValue.value = matchedValues
    } else {
      selectValue.value = val
    }
  } else if (actualValue.value != null) {
    if (props.multiple && Array.isArray(actualValue.value)) {
      // 多选模式：只有在 options 已加载时才进行匹配
      if (options.value.length > 0) {
        const optionIds = options.value.map(item2 => String(item2.id))
        const matchedValues = actualValue.value.filter(item => {
          return optionIds.includes(String(item))
        }).map(item => {
          // 转换为 options 中的实际类型
          const matchedOption = options.value.find(opt => String(opt.id) === String(item))
          return matchedOption ? matchedOption.id : item
        })
        selectValue.value = matchedValues
      } else {
        // options 还没加载，先设置原值（会在 initOptions 完成后重新匹配）
        selectValue.value = actualValue.value
      }
    } else {
      // 单选模式
      if (options.value.length > 0) {
        const optionIds = options.value.map(item => String(item.id))
        const valueStr = String(actualValue.value)
        if (optionIds.includes(valueStr)) {
          const matchedOption = options.value.find(item => String(item.id) === valueStr)
          selectValue.value = matchedOption ? matchedOption.id : actualValue.value
        } else {
          selectValue.value = actualValue.value
        }
      } else {
        // options 还没加载，先保持原值
        selectValue.value = actualValue.value
      }
    }
  } else {
    // 多选模式下，null 应该转换为空数组
    if (props.multiple) {
      selectValue.value = []
    } else {
      selectValue.value = null
    }
  }
}

async function initOptions() {
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
    
    // options 加载完成后，如果 actualValue 有值，重新匹配并设置
    // 注意：即使 actualValue 是 null，如果是多选模式，也应该检查一下（可能后续会被设置）
    if (actualValue.value != null || (props.multiple && options.value.length > 0)) {
      if (props.multiple && Array.isArray(actualValue.value)) {
        // 多选模式：匹配并转换类型
        const optionIds = options.value.map(item2 => String(item2.id))
        const matchedValues = actualValue.value.filter(item => {
          return optionIds.includes(String(item))
        }).map(item => {
          // 转换为 options 中的实际类型
          const matchedOption = options.value.find(opt => String(opt.id) === String(item))
          return matchedOption ? matchedOption.id : item
        })
        selectValue.value = matchedValues
      } else if (props.multiple && actualValue.value == null) {
        // 多选模式但 actualValue 是 null，保持空数组
        selectValue.value = []
      } else {
        // 单选模式：匹配并转换类型
        const optionIds = options.value.map(item => String(item.id))
        const valueStr = String(actualValue.value)
        if (optionIds.includes(valueStr)) {
          const matchedOption = options.value.find(item => String(item.id) === valueStr)
          selectValue.value = matchedOption ? matchedOption.id : actualValue.value
        } else {
          selectValue.value = actualValue.value
        }
      }
    } else if (props.multiple) {
      // 多选模式但 actualValue 是 null，延迟检查一次（可能 form.roleIds 会在稍后设置）
      // 延迟检查，给 form.roleIds 设置的时间
      setTimeout(() => {
        if (actualValue.value != null && Array.isArray(actualValue.value) && actualValue.value.length > 0) {
          const optionIds = options.value.map(item2 => String(item2.id))
          const matchedValues = actualValue.value.filter(item => {
            return optionIds.includes(String(item))
          }).map(item => {
            const matchedOption = options.value.find(opt => String(opt.id) === String(item))
            return matchedOption ? matchedOption.id : item
          })
          selectValue.value = matchedValues
        }
      }, 200)
    }
  } catch (error) {
    loading.value = false
  }
  if (props.autoSelect) {
    // 多选模式下，如果值为 null，应该设置为空数组，而不是自动选择第一个
    if (props.multiple) {
      if (selectValue.value == null) {
        selectValue.value = []
      }
    } else {
      // 单选模式下，如果值为 null，自动选择第一个
      if (selectValue.value == null && options.value.length > 0) {
        selectValue.value = options.value[0].id
        emit('update-value', selectValue.value, props.field, options.value.filter((value, index) => { return value.id === selectValue.value }))
      }
    }
  }
  loading.value = false
}

function handleChange(val) {
  // 同时触发 update:modelValue（v-model）和 update-value（兼容旧代码）
  emit('update:modelValue', val)
  if (props.multiple && Array.isArray(val)) {
    // 多选模式：返回匹配的选项数组
    const matchedOptions = options.value.filter(opt => val.includes(opt.id))
    emit('update-value', val, props.field, matchedOptions)
  } else {
    // 单选模式：返回匹配的单个选项
    const matchedOptions = options.value.filter(opt => opt.id === val)
    emit('update-value', val, props.field, matchedOptions)
  }
}

// Watch value prop (同时监听 modelValue 和 value)
watch(() => actualValue.value, async (val, oldVal) => {
  // 如果值没有变化，不处理（使用深度比较）
  const isEqual = (a, b) => {
    if (a === b) return true
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => item === b[index])
    }
    return false
  }
  
  if (isEqual(val, oldVal)) {
    return
  }
  
  await nextTick() // 等待 DOM 更新
  
  if (props.autoInit) {
    if (!options.value || options.value.length === 0) {
      await initOptions()
    } else {
      // options 已加载，直接进行匹配
      await changeSelection()
    }
  } else {
    // 即使不自动初始化，如果 options 已存在，也应该尝试匹配
    if (options.value && options.value.length > 0) {
      await changeSelection()
    }
  }
}, { immediate: true, deep: true })

// Watch searchKey prop
watch(() => props.searchKey, async (val) => {
  await initOptions()
  await changeSelection()
}, { deep: true, immediate: true })

// Initialize on mount
onMounted(() => {
  if (props.autoInit) {
    initOptions()
  }
})
</script>

<style scoped>
.simple-select-wrapper {
  width: 100%;
}
.simple-select {
  width: 100%;
}
</style>

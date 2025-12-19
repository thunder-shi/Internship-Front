<template>
  <div id="search-box"> <!-- class="search-wrapper" -->
    <div v-if="noAdvancedSearch" class="no-advanced-search">
      <el-input ref="inputInfo" v-model.trim="input" size="small" :placeholder="placeholder" clearable />
      <el-button size="small" type="primary" icon="Search" @click="searchClick('common')">搜索</el-button>
    </div>
    <div v-else class="advanced-search-field-box">
      <div v-for="(item, index) in searchItems" :key="index" class="search-item">
        <slot v-if="item.type.startsWith('customize')" :name="item.slot" />
        <el-cascader v-if="item.type==='cascader'" v-model="waitSearch[item.field]" size="small" :loading="loading" :options="item.options" :props="{
          label: 'name', value: 'id', checkStrictly: item.checkStrictly
        }" :placeholder="item.placeholder" clearable />
        <el-select v-if="item.type==='select'" v-model="waitSearch[item.field]" size="small" :placeholder="item.placeholder?item.placeholder:item.name" :loading="loading" clearable>
          <el-option v-for="citem in item.options" :key="citem.id" :label="citem.name" :value="citem.id" />
        </el-select>
        <el-input v-if="item.type==='input'" v-model="waitSearch[item.field]" size="small" :placeholder="item.placeholder?item.placeholder:item.name" clearable />
        <el-date-picker v-if="item.type==='date'" v-model="waitSearch[item.field]" size="small" type="daterange" :start-placeholder="item.placeholder?item.placeholder:item.name+'：从'" :end-placeholder="item.placeholder?item.placeholder:item.name+'：到'" />
      </div>
      <div class="search-item search-button">
        <el-button size="small" type="success" icon="Search" @click="searchClick('notCommon')">搜索</el-button>
        <el-button size="small" plain icon="RefreshLeft" @click="reset()">重置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { resetForm } from '@/utils/common'
import _ from 'lodash'

defineOptions({
  name: 'BtnSearch'
})

// Props - 为了兼容 Vue 2 的 v-model，同时支持 value 和 modelValue
const props = defineProps({
  modelValue: { type: [Object, String], default: '' }, // Vue 3 中 v-model 默认使用 modelValue
  value: { type: [Object, String], default: '' }, // Vue 2 兼容
  // 不显示高级搜索
  noAdvancedSearch: { type: Boolean, default: false },
  searchItems: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请输入名称' },
  searchName: { type: [String, Array], default: '' }
})

// Emits
const emit = defineEmits(['update:modelValue', 'update:value', 'input', 'search-click', 'advanced-search-click', 'focus'])

// 为了兼容旧的 v-model:value，也支持 value prop
const value = computed(() => props.modelValue || props.value)

// 响应式数据
const inputInfo = ref(null)
const waitSearch = reactive({})
const input = ref('')
const options = ref([])
const currentField = ref('')
const loading = ref(false)

// 初始化 waitSearch
onMounted(() => {
  if (props.modelValue) {
    Object.assign(waitSearch, _.cloneDeep(props.modelValue))
  }
})

// watch
// waitSearch: {
//   handler(newVal) {
//     // 父组件有 v-model 时的操作
//     emit('update:modelValue', newVal)
//     // 是否是空字符串（no-advanced-search === true）
//     const blankString = getValueType(newVal) === 'string' && newVal === ''
//     // 是否是对象并且对象中的值全为空（no-advanced-search === false）
//     const blankStringObject = getValueType(newVal) === 'object' && isObjEmpty(newVal)
//     if (blankString || blankStringObject) {
//       emit('search', newVal)
//     }
//   },
//   deep: true
// }

// Methods
const handleFocus = async (val) => {
  // if (currentField.value === val.field) return
  // currentField.value = val.field
  // const index = props.searchItems.findIndex(item => item.field === val.field)
  // if (index >= 0) {
  //   try {
  //     if (val.type === 'cascader') {
  //       const res = await treeAPI.getAllNodes({
  //         keyWords: val.keyWords,
  //         virtualRootFlag: false
  //       })
  //       // 除去children
  //       props.searchItems[index].options = JSON.parse(
  //         JSON.stringify(res.data).replace(/\"children"\:\[]/g, '"no":0')
  //       )
  //     } else if (val.type === 'select') {
  //       const res = await listAPI.getSomeRecords({
  //         keyWords: val.keyWords, pageInfo: { page: -1 }
  //       })
  //       props.searchItems[index].options = res.data.content
  //     }
  //     loading.value = false
  //   } catch (error) {
  //     loading.value = false
  //   }
  // }
  // emit('focus', val.field)
}

const searchClick = (type) => {
  // emit('search-click', waitSearch)
  if (type === 'common') {
    emit('search-click', input.value)
  } else {
    emit('advanced-search-click', waitSearch)
  }
}

const reset = () => {
  Object.assign(waitSearch, resetForm(waitSearch))
  // emit('search-click', waitSearch)
}
</script>

<style lang="scss" scoped>
@import "@/assets/css/variables.module.scss";
#search-box {
  margin-bottom: 20px;
}
.no-advanced-search {
  display: flex;
  .el-button {
    margin-left: 10px;
  }
}
.advanced-search-field-box {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  .el-button + .el-button {
    margin-left: 10px;
  }
}
// .el-button.is-plain:hover {
  // border-color: $--color-subsidiary;
  // color: $--color-subsidiary;
// }
</style>

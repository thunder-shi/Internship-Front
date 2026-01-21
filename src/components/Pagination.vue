<template>
  <footer id="vpage-footer">
    <el-pagination background :current-page="currentPage" :page-sizes="pageSizes" :page-size="pageSize" :layout="layout" :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    <span v-if="selectedColumns.length>0" class="public-footer">当前选中：{{ selectedColumns.length }}条</span>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

defineOptions({
  name: 'Pagination'
})

// Props
const props = defineProps({
  pageSize: { type: Number, default: 25 },
  pageSizes: { type: Array, default: () => [25, 50, 75, 100] },
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  layout: { type: String, default: 'total, sizes, prev, pager, next, jumper' },
  selectedColumns: { type: Array, default: () => [] }
})

// Emits
const emit = defineEmits(['size-change', 'current-change'])

// Store
const store = useStore()

// Computed
const isCollapsed = computed(() => {
  return store.getters.collapsed
})

// Methods
// 分页大小改变
const handleSizeChange = (val) => {
  // 事件传递
  emit('size-change', val)
}

// 当前页
const handleCurrentChange = (val) => {
  // 事件传递
  emit('current-change', val)
}
</script>

<style lang="scss" scoped>
@import "@/assets/css/variables.module.scss";
#vpage-footer {
  background-color: #fff;
  height: fit-content;
  display: flex;
  justify-content: center;
  align-content: center;
}
.el-pagination {
  padding: 10px 0;
}
.public-footer {
  // position: fixed;
  z-index: 99;
  right: 24px;
  bottom: 0px;
  padding-left:10px;
  line-height: 48px !important;
  height: 40px !important;
  text-align: center;
}
.private-footer {
  position: static;
}

</style>

<style lang="scss">
// 全局样式，确保分页器下拉框宽度生效，覆盖 test.scss 中的 100px 设置
#vpage-footer {
  .el-pagination {
    .el-pagination__sizes {
      .el-select {
        width: 100px !important;
        min-width: 100px !important;
        .el-input {
          width: 100px !important;
          min-width: 100px !important;
          margin: 0 5px !important;
          .el-input__inner {
            width: 100% !important;
            min-width: 100px !important;
            padding-right: 25px !important;
          }
        }
      }
    }
    // 直接针对 .el-select 的选择器，覆盖全局样式
    .el-select {
      width: 100px !important;
      min-width: 100px !important;
      .el-input {
        width: 100px !important;
        min-width: 100px !important;
      }
    }
  }
}
</style>
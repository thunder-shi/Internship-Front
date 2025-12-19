<template>
  <div class="icon-body">
    <el-input v-model="name" style="position: relative" clearable placeholder="请输入图标名称" @clear="filterIcons" @input="filterIcons">
      <template #suffix>
        <el-icon class="el-input__icon"><Search /></el-icon>
      </template>
    </el-input>
    <div class="icon-list">
      <div v-for="(item, index) in iconList" :key="index" class="icon-select" :title="item" @click="selectedIcon(item)">
        <svg-icon :icon-class="item" />
        <span class="icon-class-name">{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import icons from './requireIcons'

const emit = defineEmits(['selected'])

const name = ref('')
const iconList = ref(icons)

function filterIcons() {
  iconList.value = icons
  if (name.value) {
    iconList.value = iconList.value.filter(item => item.includes(name.value))
  }
}

function selectedIcon(iconName) {
  emit('selected', iconName)
  document.body.click()
}

function reset() {
  name.value = ''
  iconList.value = icons
}

// Expose reset method for parent component
defineExpose({
  reset
})

defineOptions({
  name: 'IconSelect'
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@use "@/assets/css/variables.module.scss" as *;
.icon-body {
  width: 100%;
  padding: 15px;
  .icon-list {
    height: 250px;
    overflow-y: scroll;
    padding-top: 5px;
    div {
      height: 36px;
      line-height: 36px;
      margin-bottom: 8px;
      padding: 4px 8px;
      cursor: pointer;
      width: 33%;
      float: left;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 4px;
      transition: background-color 0.2s;
      &:hover {
        background-color: #f5f7fa;
      }
    }
    span {
      display: inline-block;
      vertical-align: -0.15em;
      fill: currentColor;
      overflow: hidden;
      margin-left: 8px;
    }
  }
  .svg-icon {
    vertical-align: 0.45em;
    margin-right: 6px;
  }
  .icon-select:hover {
    color: $color-primary;
  }
  .icon-class-name {
    max-width: 120px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
  }
}
</style>

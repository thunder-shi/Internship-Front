<template>
  <el-scrollbar ref="scrollContainer" :vertical="false" class="scroll-container" @wheel.prevent="handleScroll">
    <slot />
  </el-scrollbar>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'

const tagAndTagSpacing = 4 // tagAndTagSpacing

const scrollContainer = ref(null)
const left = ref(0)

const scrollWrapper = computed(() => {
  return scrollContainer.value?.$refs?.wrap
})

const handleScroll = (e) => {
  const eventDelta = e.wheelDelta || -e.deltaY * 40
  const $scrollWrapper = scrollWrapper.value
  if ($scrollWrapper) {
    $scrollWrapper.scrollLeft = $scrollWrapper.scrollLeft + eventDelta / 4
  }
}

const moveToTarget = (currentTag) => {
  const $container = scrollContainer.value?.$el
  if (!$container) return
  
  const $containerWidth = $container.offsetWidth
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return

  // 在 Vue3 中，需要通过 getCurrentInstance 获取父组件实例
  // 尝试多种方式获取 tagList，以兼容不同的 Vue 版本和写法
  const instance = getCurrentInstance()
  const parent = instance?.parent
  let tagList = []
  
  // 尝试从父组件的 refs 中获取 tagList
  if (parent?.refs) {
    tagList = parent.refs.tagRefs || parent.refs.tag || []
  }
  
  // 如果 tagList 是 ref 对象，需要访问 .value
  if (tagList && typeof tagList === 'object' && 'value' in tagList) {
    tagList = tagList.value
  }
  
  // 确保 tagList 是数组
  if (!Array.isArray(tagList)) {
    tagList = []
  }

  let firstTag = null
  let lastTag = null

  // find first tag and last tag
  if (tagList.length > 0) {
    firstTag = tagList[0]
    lastTag = tagList[tagList.length - 1]
  }

  if (firstTag === currentTag) {
    $scrollWrapper.scrollLeft = 0
  } else if (lastTag === currentTag) {
    $scrollWrapper.scrollLeft =
      $scrollWrapper.scrollWidth - $containerWidth
  } else {
    // find preTag and nextTag
    const currentIndex = tagList.findIndex(item => item === currentTag)
    if (currentIndex === -1) return
    
    const prevTag = tagList[currentIndex - 1]
    const nextTag = tagList[currentIndex + 1]

    // the tag's offsetLeft after of nextTag
    // 在 Vue3 中，组件实例的 DOM 元素通过 $el 或 el 访问
    if (nextTag) {
      const nextTagEl = nextTag?.$el || nextTag?.el || nextTag
      const afterNextTagOffsetLeft =
        nextTagEl.offsetLeft + nextTagEl.offsetWidth + tagAndTagSpacing

      if (
        afterNextTagOffsetLeft >
        $scrollWrapper.scrollLeft + $containerWidth
      ) {
        $scrollWrapper.scrollLeft = afterNextTagOffsetLeft - $containerWidth
      }
    }
    
    // the tag's offsetLeft before of prevTag
    if (prevTag) {
      const prevTagEl = prevTag?.$el || prevTag?.el || prevTag
      const beforePrevTagOffsetLeft =
        prevTagEl.offsetLeft - tagAndTagSpacing

      if (beforePrevTagOffsetLeft < $scrollWrapper.scrollLeft) {
        $scrollWrapper.scrollLeft = beforePrevTagOffsetLeft
      }
    }
  }
}

// 暴露方法给父组件使用
defineExpose({
  moveToTarget
})

defineOptions({
  name: 'ScrollPane'
})
</script>

<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  width: 100%;
  :deep() {
    .el-scrollbar__bar {
      bottom: 0px;
    }
    .el-scrollbar__wrap {
      height: 52px;
    }
  }
}
</style>

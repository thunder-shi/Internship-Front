<template>
  <div v-if="isExternalIcon" :style="styleExternalIcon" class="svg-external-icon svg-icon" v-bind="attrs" />
  <svg v-else :class="svgClass" aria-hidden="true" v-bind="attrs">
    <use :xlink:href="iconName" />
  </svg>
</template>
<script setup>
import { computed, useAttrs } from 'vue'
import { isExternal } from '@/utils/validate'

const props = defineProps({
  iconClass: { type: String, required: true },
  className: { type: String, default: '' }
})

const attrs = useAttrs()

const isExternalIcon = computed(() => isExternal(props.iconClass))
const iconName = computed(() => `#icon-${props.iconClass}`)
const svgClass = computed(() => {
  return props.className
    ? `svg-icon ${props.className} ${props.iconClass}`
    : `svg-icon ${props.iconClass}`
})
const styleExternalIcon = computed(() => ({
  mask: `url(${props.iconClass}) no-repeat 50% 50%`,
  WebkitMask: `url(${props.iconClass}) no-repeat 50% 50%`
}))
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}

.svg-external-icon {
  background-color: currentColor;
  mask-size: cover !important;
  display: inline-block;
}
</style>

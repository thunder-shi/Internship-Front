<template>
  <el-row class="password" type="flex">
    <div class="input-password-box">
      <el-input v-model="password" type="password" :maxlength="CONSTANT.INFO_MAX_LENGTH" :placeholder="placeholder" :disabled="props.disabled" />
    </div>
    <div class="reset" style="text-align: right"><span @click="reset">重置</span></div>
  </el-row>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import CONSTANT from '@/utils/constant';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' }, // Vue 3 使用 modelValue
  value: { type: [String, Number], default: '' }, // 兼容 Vue 2 的 value
  placeholder: { type: String, default: '请输入' },
  disabled: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue', 'update:value', 'input']);

// 兼容 Vue 2 的 value 和 Vue 3 的 modelValue
const currentValue = computed(() => props.modelValue || props.value);
const password = ref(currentValue.value || '');
// const disabled = ref(true)

// Watch props changes
watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined && val !== null) {
      password.value = val;
    }
  }
);

watch(
  () => props.value,
  (val) => {
    if (val !== undefined && val !== null && !props.modelValue) {
      password.value = val;
    }
  }
);

// 用户输入时同步给父组件（仅 v-model 绑定，不触发 input 事件，input 事件专用于重置按钮）
watch(password, (val) => {
  emit('update:modelValue', val);
});

const DEFAULT_RESET = '000000';

async function reset() {
  if (props.disabled) {
    // 编辑模式：只触发重置接口，等父组件回写库中加密 password
    emit('input', DEFAULT_RESET);
    return;
  }
  password.value = DEFAULT_RESET;
  emit('update:modelValue', DEFAULT_RESET);
  emit('update:value', DEFAULT_RESET);
}

defineOptions({
  name: 'Password',
});
</script>

<style lang="scss" scoped>
@use '@/assets/css/variables.module.scss' as *;
@use '@/assets/css/element-variables.scss' as *;
.password {
  width: 100%;

  .input-password-box {
    flex: 1;
    min-width: 0;
  }
  .reset {
    flex-shrink: 0;
    padding-left: 8px;
    cursor: pointer;
    color: $color-primary;
    text-decoration: underline;
    display: flex;
    align-items: center;
  }
  .reset.disabled {
    cursor: not-allowed;
    color: grey;
  }
}
</style>

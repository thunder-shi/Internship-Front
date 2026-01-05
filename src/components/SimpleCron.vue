<template>
  <div class="simple-cron">
    <el-select v-model="cycleType" placeholder="选择周期" class="cron-select" @change="handleChange">
      <el-option label="无" value="none" />
      <el-option label="每天" value="daily" />
      <el-option label="每周" value="weekly" />
      <el-option label="每月" value="monthly" />
    </el-select>

    <!-- 每周选择星期几 -->
    <el-select
      v-if="cycleType === 'weekly'"
      v-model="weekDay"
      placeholder="选择星期"
      class="cron-select"
      @change="handleChange"
    >
      <el-option v-for="item in weekDays" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>

    <!-- 每月选择日期 -->
    <el-select
      v-if="cycleType === 'monthly'"
      v-model="monthDay"
      placeholder="选择日期"
      class="cron-select"
      @change="handleChange"
    >
      <el-option v-for="day in 31" :key="day" :label="`${day}号`" :value="day" />
    </el-select>

    <!-- 时间选择（选择"无"时隐藏） -->
    <el-time-picker
      v-if="cycleType !== 'none'"
      v-model="time"
      format="HH:mm"
      value-format="HH:mm"
      placeholder="选择时间"
      class="cron-time"
      @change="handleChange"
    />

    <!-- 显示生成的 cron 表达式（可选） -->
    <span v-if="showExpression && cronExpression" class="cron-expression">
      {{ cronExpression }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  showExpression: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const cycleType = ref('none');
const weekDay = ref(1);
const monthDay = ref(1);
const time = ref('09:00');

const weekDays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 0 }
];

// 周几转换为 cron 格式（Quartz: 1=SUN, 2=MON, ..., 7=SAT）
const weekDayToCron = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT'
};

// 生成 cron 表达式
const cronExpression = computed(() => {
  if (!time.value) return '';

  const [hour, minute] = time.value.split(':');
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);

  // Quartz cron 格式: 秒 分 时 日 月 周
  switch (cycleType.value) {
    case 'daily':
      // 每天的指定时间: 0 分 时 * * ?
      return `0 ${m} ${h} * * ?`;
    case 'weekly':
      // 每周指定天的指定时间: 0 分 时 ? * 周
      return `0 ${m} ${h} ? * ${weekDayToCron[weekDay.value]}`;
    case 'monthly':
      // 每月指定日的指定时间: 0 分 时 日 * ?
      return `0 ${m} ${h} ${monthDay.value} * ?`;
    default:
      return '';
  }
});

// 解析 cron 表达式
const parseCron = (cron) => {
  // 空值或无效值时设为"无"
  if (!cron) {
    cycleType.value = 'none';
    return;
  }

  const parts = cron.split(' ');
  if (parts.length < 6) {
    cycleType.value = 'none';
    return;
  }

  const [, minute, hour, day, , week] = parts;

  // 设置时间
  time.value = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  // 判断周期类型
  if (week !== '?' && week !== '*') {
    // 每周
    cycleType.value = 'weekly';
    const weekCronToDay = Object.entries(weekDayToCron).find(([, v]) => v === week);
    if (weekCronToDay) {
      weekDay.value = parseInt(weekCronToDay[0], 10);
    }
  } else if (day !== '?' && day !== '*') {
    // 每月
    cycleType.value = 'monthly';
    monthDay.value = parseInt(day, 10);
  } else {
    // 每天
    cycleType.value = 'daily';
  }
};

// 处理变更
const handleChange = () => {
  // 选择"无"时，传递空字符串
  emit('update:modelValue', cronExpression.value);
  emit('change', cronExpression.value);
};

// 监听外部值变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== cronExpression.value) {
      parseCron(newVal);
    }
  },
  { immediate: true }
);

// 初始化时如果没有值，默认选择"无"
onMounted(() => {
  if (!props.modelValue) {
    cycleType.value = 'none';
    handleChange();
  }
});
</script>

<style scoped>
.simple-cron {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
  width: 100%;
}

/* 第一个选择框（周期类型）自动扩展填满剩余空间 */
.simple-cron :deep(.el-select:first-child) {
  flex: 1;
  min-width: 120px;
}

.simple-cron :deep(.el-select:first-child .el-input) {
  width: 100% !important;
}

/* 其他选择框固定宽度 */
.simple-cron :deep(.el-select:not(:first-child)) {
  width: 120px !important;
  min-width: 120px !important;
  flex-shrink: 0;
}

.simple-cron :deep(.el-select:not(:first-child) .el-input) {
  width: 120px !important;
}

.simple-cron :deep(.el-select .el-input__wrapper) {
  width: 100% !important;
}

.simple-cron :deep(.el-date-editor) {
  width: 120px !important;
  min-width: 120px !important;
  flex-shrink: 0;
}

.cron-expression {
  color: #909399;
  font-size: 12px;
  font-family: monospace;
}
</style>

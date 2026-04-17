<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" @close-dialog="onCloseDialog">
    <template #mainForm>
      <div class="dlg-detail-body">
        <IntInternshipProjectDetailPanel
          v-if="openedId != null && openedId !== ''"
          :key="`${openedId}-${openedDepartmentId ?? 'd'}`"
          :internship-id="openedId"
          :internship-name="openedName"
          :department-id="openedDepartmentId"
        />
      </div>
    </template>
  </DlgBasic>
</template>

<script setup>
import { reactive, ref, nextTick } from 'vue';
import DlgBasic from '@/components/DlgBasic.vue';
import IntInternshipProjectDetailPanel from './IntInternshipProjectDetailPanel.vue';

defineOptions({
  name: 'DlgIntInternshipProjectDetail',
});

const dlgBasicRef = ref(null);

const defaultProps = reactive({
  form: {},
  width: '96%',
  dlgTitle: '校内实习项目详情',
  footButtons: {
    cancel: { show: false },
    close: { show: false },
    confirm: { show: false },
    submit: { show: false },
  },
  someFlags: {
    noFooter: true,
    autoMax: true,
    needMaxBtn: true,
    needValidate: false,
    validate: false,
    needVerifyUpdate: false,
  },
});

const openedId = ref(null);
const openedName = ref('');
const openedDepartmentId = ref(null);

function show(row, options = {}) {
  const id = row?.internshipId ?? row?.id;
  if (id == null || id === '') {
    return;
  }
  openedId.value = id;
  openedName.value = row?.internshipName ?? '';
  let deptRaw;
  if (Object.prototype.hasOwnProperty.call(options, 'departmentId')) {
    deptRaw = options.departmentId;
  } else {
    deptRaw = row?.departmentId;
  }
  if (deptRaw == null || deptRaw === '') {
    openedDepartmentId.value = null;
  } else {
    const n = Number(deptRaw);
    openedDepartmentId.value = Number.isFinite(n) ? n : null;
  }
  defaultProps.dlgTitle = openedName.value
    ? `校内实习项目详情 — ${openedName.value}`
    : '校内实习项目详情';
  nextTick(() => {
    dlgBasicRef.value?.showDialog(true, {});
  });
}

function onCloseDialog() {
  openedId.value = null;
  openedName.value = '';
  openedDepartmentId.value = null;
}

defineExpose({
  show,
});
</script>

<style scoped>
.dlg-detail-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 20px 28px 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" @close-dialog="onCloseDialog">
    <template #mainForm>
      <div class="dlg-detail-body">
        <ExtInternshipProjectDetailPanel
          v-if="openedId != null && openedId !== ''"
          :key="String(openedId)"
          :internship-id="openedId"
          :internship-name="openedName"
        />
      </div>
    </template>
  </DlgBasic>
</template>

<script setup>
import { reactive, ref, nextTick } from 'vue';
import DlgBasic from '@/components/DlgBasic.vue';
import ExtInternshipProjectDetailPanel from './ExtInternshipProjectDetailPanel.vue';

defineOptions({
  name: 'DlgExtInternshipProjectDetail',
});

const dlgBasicRef = ref(null);

const defaultProps = reactive({
  form: {},
  width: '96%',
  dlgTitle: '校外实习项目详情',
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

/**
 * @param {Object} row — 列表行，需含 internshipId / internshipName
 */
function show(row) {
  const id = row?.internshipId ?? row?.id;
  if (id == null || id === '') {
    return;
  }
  openedId.value = id;
  openedName.value = row?.internshipName ?? '';
  const title = openedName.value
    ? `校外实习项目详情 — ${openedName.value}`
    : '校外实习项目详情';
  defaultProps.dlgTitle = title;
  nextTick(() => {
    dlgBasicRef.value?.showDialog(true, {});
  });
}

function onCloseDialog() {
  openedId.value = null;
  openedName.value = '';
}

defineExpose({
  show,
});
</script>

<style scoped>
/* 全屏弹窗 body 在 dialog.scss 中为 padding:0，在此补留白，避免贴边、过挤 */
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
